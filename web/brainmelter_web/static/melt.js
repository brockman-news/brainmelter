// BRAINMELTER — brockman.news firehose as an overwhelming wall of type and voices.
//
// Nothing flashes: every change in brightness is a fade. Only two layers carry text: whole headlines scrolling
// from right to left, and the raw IRC stream at the bottom.
//
// URL parameters:
//   ?autostart        start without the click gate (run chromium with --autoplay-policy=no-user-gesture-required)
//   ?audio=0          silent screen (for extra projectors; let one screen do the sound)
//   ?synth=1          add the low synth drone under the voices (off by default)
//   ?cycle=300        seconds per dramaturgy cycle (drift → build → melt → void)
//   ?intensity=0.7    pin intensity instead of cycling
//   ?voices=12        maximum simultaneous voices
//   ?pan=HRTF         panning model (HRTF sounds best on headphones but costs CPU; default equalpower)
//   ?dpr=1            canvas resolution relative to CSS pixels (0.75 for very slow machines)
//   ?fps=30           frame rate cap
// Keys: f fullscreen · m mute · h hide overlays · 1–9 pin intensity · 0 back to cycle

const params = new URLSearchParams(location.search);
const opt = {
  audio: params.get("audio") !== "0",
  synth: params.get("synth") === "1",
  autostart: params.has("autostart"),
  cycle: Number(params.get("cycle")) || 300,
  intensity: params.has("intensity") ? Number(params.get("intensity")) : null,
  maxVoices: Number(params.get("voices")) || 12,
  pan: params.get("pan") || "equalpower",
  dpr: Math.min(window.devicePixelRatio || 1, Number(params.get("dpr")) || 1),
  fps: Number(params.get("fps")) || 30,
};

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------------------------------------------------------------- headlines
//
// Only what actually comes in: every live headline is read once and scrolls by once; nothing is replayed.

const MAX_QUEUE = 200; // a safety bound only; bursts of ~50 headlines drain within a minute
const liveQueue = [];

function connect() {
  const ws = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "item") onLive(msg.item);
  };
  ws.onclose = () => setTimeout(connect, 2000);
}

// ---------------------------------------------------------------- fonts

let readableFonts = ["sans-serif", "serif", "monospace"];
let fallbackStack = "sans-serif";

async function loadFonts() {
  const list = await fetch("/fonts.json").then((r) => r.json()).catch(() => []);
  if (!list.length) return;
  await Promise.all(
    list.map(async ({ family, file }) => {
      const face = new FontFace(family, `url(/fonts/${encodeURIComponent(file)})`);
      document.fonts.add(face);
      await face.load().catch(() => console.warn("font failed", family));
    }),
  );
  // decor faces (the gate title) are never used for headlines: every headline has to stay readable
  const readable = list.filter((f) => !f.fallback && !f.decor).map((f) => f.family);
  if (readable.length) readableFonts = readable;
  fallbackStack = list.filter((f) => f.fallback).map((f) => `"${f.family}"`).concat("sans-serif").join(", ");
}

const font = (family, px) => `${Math.round(px)}px "${family}", ${fallbackStack}`;
const randomColor = (hue, light = 60) => `hsl(${(hue + rand(-50, 50) + 360) % 360} 100% ${light}%)`;

// ---------------------------------------------------------------- text sprites
//
// Text is rasterized once into a small canvas and then only blitted (scaled, faded). Re-rendering glyphs at a new
// size every frame is what makes software-rendered canvases (e.g. an X220's Chromium) crawl.

const MAX_SPRITE_WIDTH = 4096;

function textSprite(text, family, px, fill, outline = false) {
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = font(family, px);
  let width = measure.measureText(text).width;
  if (width > MAX_SPRITE_WIDTH - px) {
    px = Math.max(8, px * ((MAX_SPRITE_WIDTH - px) / width));
    measure.font = font(family, px);
    width = measure.measureText(text).width;
  }
  const pad = Math.ceil(px * 0.25);
  const sprite = document.createElement("canvas");
  sprite.width = Math.ceil(width) + pad * 2;
  sprite.height = Math.ceil(px * 1.45) + pad * 2;
  const x = sprite.getContext("2d");
  x.font = font(family, px);
  x.textBaseline = "middle";
  if (outline) {
    x.lineJoin = "round";
    x.lineWidth = Math.max(2, px * 0.14);
    x.strokeStyle = "#000";
    x.strokeText(text, pad, sprite.height / 2);
  }
  x.fillStyle = fill;
  x.fillText(text, pad, sprite.height / 2);
  return sprite;
}

// ---------------------------------------------------------------- dramaturgy

const startedAt = performance.now();
let surge = 0;
let pinned = opt.intensity;
let I = 0.1; // smoothed intensity: every transition is a fade, never a jump

function dramaturgy(seconds) {
  const p = (seconds % opt.cycle) / opt.cycle;
  if (pinned != null) return { phase: pinned > 0.85 ? "melt" : "build", target: pinned };
  let base, phase;
  if (p < 0.3) [phase, base] = ["drift", 0.15 + 0.25 * (p / 0.3)];
  else if (p < 0.72) [phase, base] = ["build", 0.4 + 0.55 * ((p - 0.3) / 0.42) ** 1.6];
  else if (p < 0.92) [phase, base] = ["melt", 1];
  else [phase, base] = ["void", 0.03];
  // a fresh headline lifts the room a little, even in the silence
  return { phase, target: clamp(base + (phase === "void" ? surge * 0.3 : surge), 0, 1) };
}

// ---------------------------------------------------------------- canvas

const canvas = document.getElementById("melt");
const ctx = canvas.getContext("2d", { alpha: false });
const buffer = document.createElement("canvas");
const bctx = buffer.getContext("2d", { alpha: false });
let W = 0, H = 0;

function resize() {
  W = canvas.width = buffer.width = Math.floor(innerWidth * opt.dpr);
  H = canvas.height = buffer.height = Math.floor(innerHeight * opt.dpr);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
}
addEventListener("resize", resize);

let hue = rand(0, 360);
let meltMode = "drip";
let meltModeUntil = 0;
const DRIP_COLUMNS = 48;
const drip = Float32Array.from({ length: DRIP_COLUMNS }, () => Math.random());

// the previous frame is redrawn, transformed and faded, under the new one: text trails, drips and swirls
function feedback(step, t) {
  if (t > meltModeUntil) {
    meltMode = pick(["drip", "drip", "wind", "shear", "sink", "swirl"]);
    meltModeUntil = t + rand(12, 30);
  }
  bctx.drawImage(canvas, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  // short trails keep every headline legible; the persistence follows the smoothed intensity, so it never jumps
  ctx.globalAlpha = (0.5 + 0.25 * I) ** step;
  if (meltMode === "drip") {
    const cw = W / DRIP_COLUMNS;
    for (let k = 0; k < DRIP_COLUMNS; k++) {
      drip[k] = clamp(drip[k] + rand(-0.05, 0.05), 0, 1);
      const dy = (0.3 + drip[k] ** 3 * 8 * I) * opt.dpr * step;
      ctx.drawImage(buffer, k * cw, 0, cw + 1, H, k * cw, dy, cw + 1, H);
    }
  } else if (meltMode === "wind") {
    // trails stream off to the left, behind the scrolling headlines
    ctx.drawImage(buffer, -(1 + 5 * I) * opt.dpr * step, 0);
  } else if (meltMode === "shear") {
    const rows = 24, rh = H / rows;
    for (let r = 0; r < rows; r++) {
      const dx = Math.sin(r * 0.37 + t * 1.3) * (1 + 4 * I) * opt.dpr * step;
      ctx.drawImage(buffer, 0, r * rh, W, rh + 1, dx, r * rh, W, rh + 1);
    }
  } else {
    const zoom = { sink: 1 - 0.006 * I, swirl: 1 + 0.004 * I }[meltMode];
    const turn = meltMode === "swirl" ? 0.004 * I * Math.sin(t * 0.2) : 0;
    ctx.setTransform(1, 0, 0, 1, W / 2, H / 2);
    ctx.rotate(turn * step);
    ctx.scale(zoom ** step, zoom ** step);
    ctx.drawImage(buffer, -W / 2, -H / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.globalAlpha = 1;
}

// ---- lanes: headlines scroll in from the right and out to the left; spoken ones carry their voice's position

const flyers = [];
const LANES = 8;
const lastInLane = new Array(LANES).fill(null);
const READ_RATE = 15; // characters per second: the pace of headlines nobody reads aloud

// the band above the terminal, split into rows
function lanes() {
  const top = H * 0.03;
  const bottom = Math.min(H, terminal.offsetTop * opt.dpr) - H * 0.02;
  return { top, height: (bottom - top) / LANES };
}

// a lane is free when its last headline has fully entered and the new one, maybe faster, never catches up with it;
// when every lane is taken the one with the most room is shared
function pickLane(speed, margin) {
  const free = [];
  let best = 0, bestRoom = -Infinity;
  for (let k = 0; k < LANES; k++) {
    const prev = lastInLane[k];
    const room = prev ? W - (prev.x + prev.w) * Math.max(1, speed / prev.speed) : W;
    if (room >= margin) free.push(k);
    if (room > bestRoom) [best, bestRoom] = [k, room];
  }
  return free.length ? pick(free) : best;
}

// every flyer is a whole headline, upright, in a legible font with a dark outline so overlaps stay readable. It
// moves by its own width over `duration`, so a spoken headline enters word by word as it is read.
function spawnFlyer(text, { duration = text.length / READ_RATE, spoken = false } = {}) {
  const { height } = lanes();
  const h = height * (spoken ? 1 : 0.75);
  // rasterized at its screen size: the sprite is ~1.95 font sizes tall including its padding
  const sprite = textSprite(text, pick(readableFonts), h / 1.95, randomColor(hue, spoken ? 72 : 62), true);
  const w = (sprite.width * h) / sprite.height;
  const speed = clamp(w / Math.max(duration, 1), W / 25, W / 5);
  const flyer = {
    x: W,
    w,
    h,
    speed,
    lane: pickLane(speed, height),
    alpha: spoken ? 1 : 0.8,
    sprite,
    voice: null,
    voiceUntil: 0,
  };
  lastInLane[flyer.lane] = flyer;
  flyers.push(flyer);
  return flyer;
}

function dropFlyer(i) {
  const f = flyers[i];
  flyers.splice(i, 1);
  if (lastInLane[f.lane] === f) lastInLane[f.lane] = null;
  if (f.voice) {
    f.voice.source.stop();
    f.voice.source.disconnect();
    f.voice.panner.disconnect();
  }
}

function drawFlyers(dt) {
  const { top, height } = lanes();
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i];
    f.x -= f.speed * dt;
    if (f.x + f.w < 0) {
      dropFlyer(i);
      continue;
    }
    const y = top + (f.lane + 0.5) * height;
    if (f.voice) {
      // listener sits at the origin looking down -z; the voice follows the visible part of its headline
      const cx = (clamp(f.x, 0, W) + clamp(f.x + f.w, 0, W)) / 2;
      f.voice.panner.positionX.value = (cx / W - 0.5) * 6;
      f.voice.panner.positionY.value = (0.5 - y / H) * 3;
      f.voice.panner.positionZ.value = -1.5;
    }
    ctx.globalAlpha = f.alpha;
    ctx.drawImage(f.sprite, f.x, y - f.h / 2, f.w, f.h);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- overlays

const terminal = document.getElementById("terminal");
const TERMINAL_LINES = 6;
const TYPE_SPEED = 60; // characters per second, multiplied by the backlog so no line is ever skipped
const terminalLines = [];
const terminalBacklog = [];

function typeLine(item) {
  const time = new Date(item.t * 1000).toTimeString().slice(0, 8);
  const line = item.kind === "error" ? `${time} -${item.nick}- ${item.title}` : `${time} <${item.nick}> ${item.url} ${item.title}`;
  terminalBacklog.push({ text: line, shown: 0 });
}

function drawTerminal(dt) {
  let typing = terminalLines.at(-1);
  if ((!typing || typing.shown === typing.text.length) && terminalBacklog.length) {
    typing = terminalBacklog.shift();
    terminalLines.push(typing);
    if (terminalLines.length > TERMINAL_LINES) terminalLines.shift();
  }
  if (typing) {
    const speed = TYPE_SPEED * (1 + terminalBacklog.length);
    typing.shown = Math.min(typing.text.length, typing.shown + Math.max(1, Math.round(speed * dt)));
  }
  terminal.textContent = terminalLines.map((l) => l.text.slice(0, l.shown)).join("\n") + "▌";
}

// ---------------------------------------------------------------- audio

let ac = null, master, reverbSend, droneGain, droneFilter;
let muted = false;
let inflight = 0;

function impulse(seconds, decay) {
  const length = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, length, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buf.getChannelData(c);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
  }
  return buf;
}

function initAudio() {
  ac = new AudioContext({ latencyHint: "playback" });
  const compressor = new DynamicsCompressorNode(ac, { threshold: -20, knee: 12, ratio: 8, attack: 0.005, release: 0.3 });
  compressor.connect(ac.destination);
  master = new GainNode(ac, { gain: 0.9 });
  master.connect(compressor);

  const reverb = new ConvolverNode(ac, { buffer: impulse(2.5, 2.2) });
  reverbSend = new GainNode(ac, { gain: 0.3 });
  reverbSend.connect(reverb).connect(master);

  // optional low detuned drone that thickens with intensity, so the room never quite goes silent
  if (!opt.synth) return;
  droneFilter = new BiquadFilterNode(ac, { type: "lowpass", frequency: 200, Q: 6 });
  droneGain = new GainNode(ac, { gain: 0 });
  for (const freq of [41.2, 41.5, 61.7, 82.6]) {
    const osc = new OscillatorNode(ac, { type: "sawtooth", frequency: freq });
    osc.connect(droneFilter);
    osc.start();
  }
  droneFilter.connect(droneGain).connect(master);
  droneGain.connect(reverbSend);
}

function steerAudio(phase) {
  if (!ac) return;
  const now = ac.currentTime;
  master.gain.setTargetAtTime(muted ? 0 : 0.9, now, 0.1);
  reverbSend.gain.setTargetAtTime(0.2 + 0.6 * I, now, 0.5);
  if (!droneGain) return;
  droneGain.gain.setTargetAtTime(phase === "void" ? 0.02 : 0.015 + 0.09 * I, now, 1);
  droneFilter.frequency.setTargetAtTime(120 + 2500 * I ** 2, now, 1);
}

// the server picks the voice from the feed's name, so a feed sounds the same every time; nothing here alters
// the voice (no pitch shifting, no copies)
async function speak(item) {
  inflight++;
  try {
    const response = await fetch(`/speak?id=${item.id}`);
    // 503: the synthesizers are saturated; put it back so it is read a moment later instead of never
    if (response.status === 503) return void liveQueue.unshift(item);
    if (!response.ok) return;
    const audio = await ac.decodeAudioData(await response.arrayBuffer());
    const source = new AudioBufferSourceNode(ac, { buffer: audio });
    const gain = new GainNode(ac, { gain: rand(0.5, 1) });
    const panner = new PannerNode(ac, { panningModel: opt.pan, distanceModel: "inverse", refDistance: 1, rolloffFactor: 0.8 });
    source.connect(gain).connect(panner).connect(master);
    panner.connect(reverbSend);
    const flyer = spawnFlyer(item.title, { duration: audio.duration, spoken: true });
    // the slot is freed by the clock, not by `onended`: a suspended AudioContext (autoplay policy, lost output
    // device) never ends a source, and would otherwise hold every slot and stop the headlines for good
    flyer.voice = { source, panner };
    flyer.voiceUntil = performance.now() + audio.duration * 1000;
    source.start();
  } catch (err) {
    console.warn("speech failed", err);
  } finally {
    inflight--;
  }
}

// every headline gets read; the only limit is how many voices may overlap
function scheduleVoices(now) {
  if (!ac || inflight >= 4) return;
  const voicing = flyers.reduce((n, f) => n + (f.voiceUntil > now), 0);
  if (voicing + inflight >= opt.maxVoices) return;
  const item = liveQueue.shift();
  if (item) speak(item);
}

// ---------------------------------------------------------------- live headlines

function onLive(item) {
  typeLine(item);
  if (item.kind === "error") return;
  surge = Math.min(0.4, surge + 0.2);
  // silent screens show the headline right away; otherwise it scrolls in when its voice starts
  if (!opt.audio) return void spawnFlyer(item.title);
  liveQueue.push(item);
  if (liveQueue.length > MAX_QUEUE) liveQueue.shift();
}

// ---------------------------------------------------------------- main loop

let last = performance.now();
const frameInterval = 1000 / opt.fps;

function frame(now) {
  requestAnimationFrame(frame);
  if (now - last < frameInterval - 2) return;
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const step = dt * 60;
  const seconds = (now - startedAt) / 1000;
  const { phase, target } = dramaturgy(seconds);
  I += (target - I) * (1 - Math.exp(-dt / 2.5));
  surge *= Math.exp(-dt / 6);
  hue = (hue + dt * (3 + 10 * I)) % 360;

  feedback(step, seconds);
  drawFlyers(dt);
  drawTerminal(dt);

  steerAudio(phase);
  scheduleVoices(now);
}

// ---------------------------------------------------------------- start

let started = false;

function start() {
  // a later click brings back a context the browser suspended
  if (started) return void ac?.resume();
  started = true;
  document.body.classList.add("melting");
  if (opt.audio) {
    initAudio();
    ac.resume();
  }
  document.documentElement.requestFullscreen?.().catch(() => {});
}

addEventListener("keydown", (event) => {
  if (!started) return start();
  if (event.key === "f") document.documentElement.requestFullscreen?.().catch(() => {});
  else if (event.key === "m") muted = !muted;
  else if (event.key === "h") document.body.classList.toggle("clean");
  else if (event.key === "0") pinned = opt.intensity;
  else if (/^[1-9]$/.test(event.key)) pinned = Number(event.key) / 9;
});
addEventListener("pointerdown", start);

resize();
connect();
await loadFonts();
if (opt.autostart) start();
requestAnimationFrame(frame);
