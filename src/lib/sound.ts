let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API not supported", e);
      return null;
    }
  }
  return ctx;
}

const CLICK_SOURCES = ["/audio/click1.m4a", "/audio/Click2.m4a"];
const buffers: AudioBuffer[] = [];
let loading = false;

export function preloadClickSounds() {
  const c = getCtx();
  if (!c || buffers.length > 0 || loading) return;
  loading = true;
  try {
    const jobs = CLICK_SOURCES.map(async (src) => {
      const res = await fetch(src);
      const arr = await res.arrayBuffer();
      return await c.decodeAudioData(arr);
    });
    Promise.all(jobs).then(
      (decoded) => {
        buffers.push(...decoded);
        console.log("Tactile click sounds loaded");
      },
      (e) => console.error("Failed to load click sounds", e),
    ).finally(() => {
      loading = false;
    });
  } catch (e) {
    console.error("Failed to load click sounds", e);
    loading = false;
  }
}

let noiseBuffer: AudioBuffer | null = null;
function getNoise(c: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const len = c.sampleRate * 2;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

interface SynthPreset {
  frequency: number;
  decay: number;
  volume: number;
  type: OscillatorType;
  pitchDrop?: number;
  noiseMix?: number;
}

export const presets: Record<string, SynthPreset> = {
  key: { frequency: 600, decay: 0.05, volume: 0.15, type: "triangle", pitchDrop: 200, noiseMix: 0.2 },
  space: { frequency: 400, decay: 0.08, volume: 0.2, type: "sine", pitchDrop: 100, noiseMix: 0.1 },
  enter: { frequency: 500, decay: 0.06, volume: 0.18, type: "square", pitchDrop: 150, noiseMix: 0.15 },
  delete: { frequency: 800, decay: 0.04, volume: 0.12, type: "sine", pitchDrop: 300, noiseMix: 0.3 },
  click: { frequency: 1200, decay: 0.03, volume: 0.1, type: "sine", pitchDrop: 500, noiseMix: 0.5 },
};

export function playSynth(p: SynthPreset) {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const t0 = c.currentTime;
  const { frequency, decay, volume, type, pitchDrop = 0, noiseMix = 0 } = p;
  const master = c.createGain();
  master.connect(c.destination);
  master.gain.setValueAtTime(volume, t0);
  master.gain.exponentialRampToValueAtTime(0.01, t0 + decay);

  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, t0);
  if (pitchDrop > 0)
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, frequency - pitchDrop), t0 + decay);
  const dry = c.createGain();
  dry.gain.value = 1 - noiseMix;
  osc.connect(dry);
  dry.connect(master);
  osc.start(t0);
  osc.stop(t0 + decay);

  if (noiseMix > 0) {
    const src = c.createBufferSource();
    src.buffer = getNoise(c);
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3000;
    const wet = c.createGain();
    wet.gain.value = noiseMix;
    src.connect(filter);
    filter.connect(wet);
    wet.connect(master);
    src.start(t0, Math.random() * 2);
    src.stop(t0 + decay);
  }
  setTimeout(() => master.disconnect(), decay * 1000 + 100);
}

function playSynthClick() {
  const jitter = (Math.random() - 0.5) * 100;
  playSynth({ ...presets.click, frequency: presets.click.frequency + jitter });
}

export function playClick() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  if (buffers.length === 0) {
    preloadClickSounds();
    playSynthClick();
    return;
  }
  const buf = buffers[Math.floor(Math.random() * buffers.length)];
  const src = c.createBufferSource();
  src.buffer = buf;
  src.detune.value = (Math.random() - 0.5) * 200;
  const gain = c.createGain();
  gain.gain.value = 0.5;
  src.connect(gain);
  gain.connect(c.destination);
  src.start(0);
}

export function installClickListener() {
  preloadClickSounds();
  const handler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === "BUTTON" ||
      target.tagName === "A" ||
      target.closest("button") ||
      target.closest("a") ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.getAttribute("role") === "button"
    ) {
      playClick();
      return;
    }
    try {
      let node: HTMLElement | null = target;
      let depth = 0;
      let pointer = false;
      while (node && depth < 3) {
        if (window.getComputedStyle(node).cursor === "pointer") {
          pointer = true;
          break;
        }
        node = node.parentElement;
        depth++;
      }
      if (pointer) playClick();
    } catch {
      /* noop */
    }
  };
  window.addEventListener("click", handler, true);
  return () => window.removeEventListener("click", handler, true);
}
