// BRAINMELTER — brockman.news firehose as an overwhelming wall of type and voices.
//
// Nothing flashes: every change in brightness is a fade. Only two layers carry text: whole headlines floating
// through the tunnel, and the raw IRC stream at the bottom.
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
// Only what actually comes in: every live headline is read once and floats once; nothing is replayed.

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
    meltMode = pick(["drip", "drip", "zoom", "shear", "sink", "swirl"]);
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
  } else if (meltMode === "shear") {
    const rows = 24, rh = H / rows;
    for (let r = 0; r < rows; r++) {
      const dx = Math.sin(r * 0.37 + t * 1.3) * (1 + 4 * I) * opt.dpr * step;
      ctx.drawImage(buffer, 0, r * rh, W, rh + 1, dx, r * rh, W, rh + 1);
    }
  } else {
    const zoom = { zoom: 1 + 0.008 * I, sink: 1 - 0.006 * I, swirl: 1 + 0.004 * I }[meltMode];
    const turn = meltMode === "swirl" ? 0.004 * I * Math.sin(t * 0.2) : 0;
    ctx.setTransform(1, 0, 0, 1, W / 2, H / 2);
    ctx.rotate(turn * step);
    ctx.scale(zoom ** step, zoom ** step);
    ctx.drawImage(buffer, -W / 2, -H / 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.globalAlpha = 1;
}

// ---- tunnel: headlines fly at the viewer; spoken ones carry their voice's position

const flyers = [];
const TUNNEL_TEXT = 0.35; // font size at distance 1, relative to the focal length
const FADE_IN_MS = 1200;

// every flyer is a whole headline, upright, in a legible font with a dark outline so overlaps stay readable
// starts mid-distance and wide, so headlines spread across the whole screen instead of piling up in the centre
function spawnFlyer(text, { duration = rand(6, 10), spoken = false } = {}) {
  const z = rand(3, 6);
  const px = spoken ? 96 : 72;
  const flyer = {
    x: rand(-3, 3),
    y: rand(-1.8, 1.8),
    z,
    vz: (z - 0.5) / duration,
    born: performance.now(),
    alpha: spoken ? 1 : 0.8,
    px,
    sprite: textSprite(text, pick(readableFonts), px, randomColor(hue, spoken ? 72 : 62), true),
    spoken,
    panner: null,
  };
  flyers.push(flyer);
  return flyer;
}

function drawFlyers(dt, now) {
  const focal = Math.min(W, H) * 0.6;
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i];
    f.z -= f.vz * dt;
    if (f.z < 0.5) {
      flyers.splice(i, 1);
      continue;
    }
    if (f.panner) {
      // listener sits at the origin looking down -z, like the viewer
      f.panner.positionX.value = f.x * 2;
      f.panner.positionY.value = -f.y * 2;
      f.panner.positionZ.value = -f.z * 0.6;
    }
    const scale = (TUNNEL_TEXT * focal) / f.z / f.px; // sprite px → screen px
    const h = f.sprite.height * scale;
    if (h < 3) continue;
    const w = f.sprite.width * scale;
    // fade in over time and out before it grows past the screen; nothing ever pops
    ctx.globalAlpha = f.alpha * clamp((now - f.born) / FADE_IN_MS, 0, 1) * clamp(f.z - 0.5, 0, 1);
    ctx.drawImage(f.sprite, W / 2 + (f.x * focal) / f.z - w / 2, H / 2 + (f.y * focal) / f.z - h / 2, w, h);
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
const active = new Set();
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
    flyer.panner = panner;
    source.start();
    active.add(source);
    source.onended = () => {
      active.delete(source);
      flyer.panner = null;
      source.disconnect();
      panner.disconnect();
    };
  } catch (err) {
    console.warn("speech failed", err);
  } finally {
    inflight--;
  }
}

// every headline gets read; the only limit is how many voices may overlap
function scheduleVoices() {
  if (!ac || active.size + inflight >= opt.maxVoices || inflight >= 4) return;
  const item = liveQueue.shift();
  if (item) speak(item);
}

// ---------------------------------------------------------------- live headlines

function onLive(item) {
  typeLine(item);
  if (item.kind === "error") return;
  surge = Math.min(0.4, surge + 0.2);
  // silent screens show the headline right away; otherwise it floats in when its voice starts
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
  drawFlyers(dt, now);
  drawTerminal(dt);

  steerAudio(phase);
  scheduleVoices();
}

// ---------------------------------------------------------------- start

let started = false;

function start() {
  if (started) return;
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
