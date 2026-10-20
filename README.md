# BrainMelter

A multi-voice audio mixer and streamer that takes speech input from IRC or local files and creates a surreal audio experience with parallel voices, effects, and harbors.

## Web installation (40C3)

`brainmelter-web` follows brockman's `#all` channel on `brockman.news` and plays it in a fullscreen browser page.
Whole headlines float upright through a 3D tunnel, each in a random legible font with a dark outline, while the picture behind them melts; the raw IRC stream types along at the bottom.
At the same time the headlines are read aloud by many overlapping voices, each placed where its headline floats. Live headlines jump the queue to be read next.
Nothing flashes: everything fades in and out.

- **Voices**: [piper](https://github.com/OHF-Voice/piper1-gpl) neural TTS, 26 models in 22 languages with 1509 speakers between them (`en_US-libritts_r-medium` has 904; `de_DE-thorsten_emotional` is angry, drunk, whispering…).
  espeak-ng robots cover the remaining languages and take a share of utterances. Some utterances are deliberately read by a voice for the wrong language.
  `en_US-libritts-high` (the same 904 speakers, about 3× slower) is pinned but not bundled by default.
- **Fonts**: 26 Google Fonts for headlines (see `nix/fonts.nix`), with Noto/Rubik fallbacks for Greek, Cyrillic, Hebrew, CJK and Arabic. Nosifer is used only for the start screen title.
- **Dramaturgy**: each cycle runs drift → build → melt → void, with smooth transitions. A live headline lifts the intensity a little.
- **Persistence**: every headline is appended to `~/.local/state/brainmelter/headlines.jsonl` and replayed, so the pool keeps growing and still works when the venue network is down.

```sh
nix run .#web                  # serves http://127.0.0.1:8080/
chromium --kiosk --autoplay-policy=no-user-gesture-required 'http://127.0.0.1:8080/?autostart'
```

The first build downloads about 1.9 GB of voice models (pinned in `nix/voices.nix`). Pass `voiceNames = [ … ]` to `nix/web.nix` to bundle a different set.

The defaults target a ThinkPad X220 (2 cores / 4 threads, 1366×768):

- the server runs `--workers` = half the CPU threads, one onnxruntime thread each. It keeps as many piper models in memory as fit in 40% of the free RAM (about 100 MB each; all 26 take about 2.1 GB) and loads them at startup. Loading a model that had to be evicted pauses the server for a second or two, so give the machine RAM rather than lowering `--max-models`.
- the page renders at CSS resolution, capped at 30 fps, at most 12 voices, with cheap equal-power panning. Text is rasterized once into sprites and then only blitted.

Other server flags (`brainmelter-web --help`): `--robot-share`, `--irc-host/--irc-port/--tls`, `--channel`, `--state`.
`brockman.news` only accepts plain-text connections on 6667 from outside.

Page parameters:

| parameter | effect |
|---|---|
| `?autostart` | skip the "press any key" gate (browser must allow autoplay) |
| `?audio=0` | silent screen, for extra projectors |
| `?synth=1` | add a low synth drone under the voices (off by default) |
| `?cycle=300` | seconds per dramaturgy cycle |
| `?intensity=0.7` | pin the intensity instead of cycling |
| `?voices=12` | maximum simultaneous voices |
| `?pan=HRTF` | binaural panning for headphones (costs CPU; default `equalpower`) |
| `?dpr=1` | canvas resolution relative to CSS pixels (`0.75` for slower machines) |
| `?fps=30` | frame rate cap |

Keys: `f` fullscreen, `m` mute, `h` hide the IRC stream, `1`–`9` pin the intensity, `0` go back to cycling.

## Overview

BrainMelter is a suite of tools for creating layered speech audio experiences. It combines:

- A Liquidsoap server for multi-channel audio mixing
- Text-to-speech synthesis (espeak and flite support)
- Audio effects (echo, reverb, pitch shifting, vocoder)
- IRC connectivity for remote control
- Multiple audio harbors for parallel audio streams

## Setup

### Prerequisites

- Liquidsoap (for audio mixing)
- espeak and/or flite (for text-to-speech)
- ffmpeg (for audio processing)
- netcat (for IRC connectivity)
- bc (for calculations)

### Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/brainmelter.git
cd brainmelter
```

2. Make scripts executable:
```bash
chmod +x *.sh
```

3. Start the Liquidsoap server:
```bash
liquidsoap brainmelter.liq
```

## Usage

### Basic Text-to-Speech

Send speech directly to BrainMelter:

```bash
./espeak-direct.sh "Your text here" --harbor main --effect none
```

### IRC Connection

Connect to an IRC server and send messages to BrainMelter:

```bash
./irc-to-brainmelter.sh --server irc.example.com --channel "#mychannel"
```

### Testing with Text Files

Process a text file with sample phrases:

```bash
./irc-to-brainmelter.sh --test-file test_phrases.txt --delay 3
```

### Parallel Speech

Play multiple speech streams simultaneously:

```bash
./parallel-speech-irc.sh --local
```

## Script Documentation

### espeak-direct.sh

Direct streaming of text-to-speech to Liquidsoap:

```bash
./espeak-direct.sh "Text to speak" [--harbor HARBOR] [--voice VOICE] [--effect EFFECT] [--volume VOLUME]
```

### irc-to-brainmelter.sh

Connect to IRC and stream messages to BrainMelter:

```bash
./irc-to-brainmelter.sh [--server HOST] [--port PORT] [--channel CHANNEL] [--nick NAME]
```

### parallel-speech-irc.sh

Play multiple voices in parallel through different harbors:

```bash
./parallel-speech-irc.sh [--local] [--tts ENGINE] [--duration SECONDS]
```

## Audio Harbors

BrainMelter uses multiple "harbors" for audio streams:

- `main` - Primary audio channel
- `fx1` - Effects channel 1
- `fx2` - Effects channel 2
- `ambient` - Background ambient sounds
- `drums` - Rhythmic sounds

## Audio Effects

Available effects:

- `none` - No effect
- `echo` - Simple echo effect
- `reverb` - Reverberation effect
- `pitch` - Pitch shifting
- `vocoder` - Voice modulation effect

## License

MIT License

## Acknowledgments

- Inspired by kmein's brainmelter.nix from the niveum project