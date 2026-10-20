"""Speech synthesis: piper neural voices (thousands of speakers), espeak-ng for everything piper can't speak."""

import asyncio
import io
import json
import logging
import math
import random
import shutil
import subprocess
import tempfile
import threading
import wave
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import onnxruntime
from piper import PiperConfig, PiperVoice, SynthesisConfig

log = logging.getLogger(__name__)

# espeak-ng language names differ from the ISO codes the detector produces
ESPEAK_NAMES = {"zh": "cmn", "no": "nb", "pt": "pt-br", "fr": "fr-fr", "en": "en-us"}

# piper phonemizes through a process-global espeak-ng instance, which is not thread-safe
PHONEMIZE_LOCK = threading.Lock()

# resident size of one loaded medium model with the onnxruntime arena disabled
MODEL_MEMORY = 100 * 2**20


def models_that_fit(total: int) -> int:
    """As many models as fit in 40% of the available RAM: every reload of an evicted model stalls the server."""
    try:
        with open("/proc/meminfo") as meminfo:
            available = next(int(line.split()[1]) * 1024 for line in meminfo if line.startswith("MemAvailable:"))
    except (OSError, StopIteration, ValueError):
        return total
    return max(4, min(total, int(available * 0.4 // MODEL_MEMORY)))


class Busy(Exception):
    """Synthesis backlog is full; the client should drop this utterance."""


@dataclass
class PiperModel:
    name: str
    path: Path
    config: dict
    lang: str
    speakers: int
    speaker_names: dict[int, str]


@dataclass
class Utterance:
    wav: bytes
    voice: str


def wav_bytes(samples: np.ndarray, sample_rate: int) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes((np.clip(samples, -1.0, 1.0) * 32767).astype(np.int16).tobytes())
    return buffer.getvalue()


class Speech:
    def __init__(
        self,
        voices_dir: Path | None,
        workers: int,
        threads_per_job: int,
        robot_share: float,
        max_loaded: int,
        cache_size: int = 256,
    ) -> None:
        self.models: list[PiperModel] = []
        if voices_dir:
            for onnx in sorted(voices_dir.glob("*.onnx")):
                config = json.loads(onnx.with_name(onnx.name + ".json").read_text())
                lang = config.get("language", {}).get("family") or config["espeak"]["voice"].split("-")[0]
                speaker_ids = config.get("speaker_id_map") or {}
                self.models.append(
                    PiperModel(
                        onnx.name.removesuffix(".onnx"),
                        onnx,
                        config,
                        lang,
                        max(1, config.get("num_speakers", 1)),
                        {sid: name for name, sid in speaker_ids.items()},
                    )
                )
        self.by_lang: dict[str, list[PiperModel]] = {}
        for model in self.models:
            self.by_lang.setdefault(model.lang, []).append(model)
        self.loaded: OrderedDict[str, PiperVoice] = OrderedDict()
        self.max_loaded = max_loaded
        self.load_lock = threading.Lock()
        self.download_dir = Path(tempfile.mkdtemp(prefix="brainmelter-"))

        self.espeak = shutil.which("espeak-ng")
        self.espeak_langs: set[str] = set()
        self.espeak_variants: list[str] = []
        if self.espeak:
            voices = subprocess.run([self.espeak, "--voices"], capture_output=True, text=True).stdout
            self.espeak_langs = {line.split()[1] for line in voices.splitlines()[1:] if line.split()}
            variants = subprocess.run([self.espeak, "--voices=variant"], capture_output=True, text=True).stdout
            self.espeak_variants = [
                line.split()[4].removeprefix("!v/") for line in variants.splitlines()[1:] if len(line.split()) > 4
            ]
        if not self.models and not self.espeak:
            raise RuntimeError("no piper voices and no espeak-ng: nothing can speak")

        self.robot_share = robot_share if self.espeak else 0.0
        self.threads_per_job = threads_per_job
        self.pool = ThreadPoolExecutor(max_workers=workers, thread_name_prefix="tts")
        self.max_backlog = workers * 4
        self.pending = 0
        self.cache: OrderedDict[tuple, Utterance] = OrderedDict()
        self.cache_size = cache_size
        self.inflight: dict[tuple, asyncio.Future] = {}

        if self.max_loaded <= 0:
            self.max_loaded = models_that_fit(len(self.models))
        total = sum(m.speakers for m in self.models)
        log.info(
            "%d piper models (%d speakers, languages: %s, %d kept in memory), espeak-ng: %s (%d variants)",
            len(self.models),
            total,
            " ".join(sorted(self.by_lang)),
            self.max_loaded,
            "yes" if self.espeak else "no",
            len(self.espeak_variants),
        )

    def preload(self) -> None:
        """Load the models with the most speakers so the first utterances don't stall."""
        biggest = sorted(self.models, key=lambda m: m.speakers, reverse=True)[: self.max_loaded]
        for model in biggest:
            self._voice(model)
        log.info("preloaded %d of %d piper models", len(biggest), len(self.models))

    def _voice(self, model: PiperModel) -> PiperVoice:
        """Loaded models are kept in an LRU of `max_loaded` entries (~100 MB each)."""
        with self.load_lock:
            voice = self.loaded.get(model.name)
            if voice is not None:
                self.loaded.move_to_end(model.name)
                return voice
        options = onnxruntime.SessionOptions()
        options.intra_op_num_threads = self.threads_per_job
        options.inter_op_num_threads = 1
        # the arena keeps every model's peak buffers forever: 8 models use 2.6 GB with it, 0.8 GB without (~9% slower)
        options.enable_cpu_mem_arena = False
        voice = PiperVoice(
            config=PiperConfig.from_dict(model.config),
            session=onnxruntime.InferenceSession(str(model.path), sess_options=options, providers=["CPUExecutionProvider"]),
            download_dir=self.download_dir,
        )
        with self.load_lock:
            self.loaded[model.name] = voice
            while len(self.loaded) > self.max_loaded:
                # a synthesis still using an evicted voice keeps its own reference
                self.loaded.popitem(last=False)
        return voice

    def _choose(self, lang: str, rng: random.Random):
        """Pick ("piper", model, speaker) or ("espeak", language, variant)."""
        native = self.by_lang.get(lang, [])
        if native and rng.random() >= self.robot_share:
            # big multi-speaker models dominate, but single-speaker voices still get airtime
            weights = [math.sqrt(m.speakers) for m in native]
            model = rng.choices(native, weights)[0]
            return "piper", model, rng.randrange(model.speakers)
        espeak_lang = ESPEAK_NAMES.get(lang, lang)
        if espeak_lang not in self.espeak_langs:
            espeak_lang = "en-us"
        if self.espeak:
            return "espeak", espeak_lang, rng.choice(self.espeak_variants or ["m1"])
        model = rng.choice(self.models)
        return "piper", model, rng.randrange(model.speakers)

    def _piper(self, model: PiperModel, speaker: int, text: str, rng: random.Random) -> Utterance:
        voice = self._voice(model)
        config = SynthesisConfig(
            speaker_id=speaker,
            length_scale=rng.uniform(0.75, 1.35),
            noise_scale=rng.uniform(0.4, 1.0),
            noise_w_scale=rng.uniform(0.5, 1.1),
        )
        with PHONEMIZE_LOCK:
            sentences = voice.phonemize(text)
        chunks = []
        for phonemes in sentences:
            if not phonemes:
                continue
            audio = voice.phoneme_ids_to_audio(voice.phonemes_to_ids(phonemes), config)
            peak = float(np.max(np.abs(audio))) if audio.size else 0.0
            chunks.append(audio / peak if peak > 1e-8 else audio)
        samples = np.concatenate(chunks) if chunks else np.zeros(1, dtype=np.float32)
        label = model.speaker_names.get(speaker) or (f"#{speaker}" if model.speakers > 1 else "")
        return Utterance(wav_bytes(samples, model.config["audio"]["sample_rate"]), f"{model.name} {label}".strip())

    def _espeak(self, lang: str, variant: str, text: str, rng: random.Random) -> Utterance:
        result = subprocess.run(
            [
                self.espeak,
                "-v", f"{lang}+{variant}",
                "-s", str(rng.randint(120, 260)),
                "-p", str(rng.randint(10, 90)),
                "--stdout",
                "--", text,
            ],
            capture_output=True,
            timeout=30,
            check=True,
        )
        return Utterance(result.stdout, f"espeak-ng {lang}+{variant}")

    def _synthesize(self, text: str, lang: str, nick: str) -> Utterance:
        # the feed's name seeds everything (model, speaker, robot or not, tempo, pitch): one feed, one voice
        rng = random.Random(f"{nick}\0{lang}")
        engine, a, b = self._choose(lang, rng)
        if engine == "piper":
            return self._piper(a, b, text, rng)
        return self._espeak(a, b, text, rng)

    async def speak(self, key: str, text: str, lang: str, nick: str) -> Utterance:
        cache_key = (key, lang)
        if cached := self.cache.get(cache_key):
            self.cache.move_to_end(cache_key)
            return cached
        if running := self.inflight.get(cache_key):
            return await asyncio.shield(running)
        if self.pending >= self.max_backlog:
            raise Busy()
        self.pending += 1
        future = asyncio.get_running_loop().run_in_executor(self.pool, self._synthesize, text, lang, nick)
        self.inflight[cache_key] = future

        def finished(done: asyncio.Future) -> None:
            # runs even when every waiting request was cancelled (client went away)
            self.pending -= 1
            del self.inflight[cache_key]
            if not done.cancelled() and done.exception() is None:
                self.cache[cache_key] = done.result()
                while len(self.cache) > self.cache_size:
                    self.cache.popitem(last=False)

        future.add_done_callback(finished)
        return await asyncio.shield(future)
