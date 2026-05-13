import { Platform } from "react-native";
import { detectPitch } from "./pitch";
import { freqToMidi, type PitchSample } from "./transcribe";

const FFT_SIZE = 2048;
const POLL_MS = 35;
const VOICE_MIN_HZ = 55;
const VOICE_MAX_HZ = 1500;

export type MicSession = {
  stop: () => PitchSample[];
  onSample: (cb: (sample: PitchSample) => void) => void;
};

export function micSupported(): boolean {
  return (
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

export async function startMicSession(): Promise<MicSession> {
  if (!micSupported()) {
    throw new Error("Microphone input requires a browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    } as MediaTrackConstraints,
  });

  const Ctor =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx: AudioContext = new Ctor();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  source.connect(analyser);

  const sampleRate = ctx.sampleRate;
  const buffer = new Float32Array(analyser.fftSize);
  const samples: PitchSample[] = [];
  const listeners: ((s: PitchSample) => void)[] = [];

  const startMs =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const now = () =>
    typeof performance !== "undefined"
      ? performance.now() - startMs
      : Date.now() - startMs;

  const interval = window.setInterval(() => {
    analyser.getFloatTimeDomainData(buffer);
    const result = detectPitch(buffer, sampleRate);
    let midi: number | null = null;
    let clarity = 0;
    if (result && result.freq >= VOICE_MIN_HZ && result.freq <= VOICE_MAX_HZ) {
      midi = freqToMidi(result.freq);
      clarity = result.clarity;
    }
    const sample: PitchSample = { t: now(), midi, clarity };
    samples.push(sample);
    for (const l of listeners) l(sample);
  }, POLL_MS);

  return {
    stop: () => {
      window.clearInterval(interval);
      try {
        source.disconnect();
      } catch {}
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
      return samples;
    },
    onSample: (cb) => {
      listeners.push(cb);
    },
  };
}
