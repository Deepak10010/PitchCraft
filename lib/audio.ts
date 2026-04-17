import { midiToFreq, type Note } from "./intervals";
import { getAudioContext, isAudioAvailable } from "./audioContext";

export type Voice = "piano" | "guitar";

type Harmonic = {
  ratio: number;
  amp: number;
  type: "sine" | "triangle" | "sawtooth" | "square";
};

const PIANO_HARMONICS: Harmonic[] = [
  { ratio: 1, amp: 1.0, type: "sine" },
  { ratio: 2, amp: 0.5, type: "sine" },
  { ratio: 3, amp: 0.25, type: "sine" },
  { ratio: 4, amp: 0.14, type: "sine" },
  { ratio: 5, amp: 0.08, type: "sine" },
  { ratio: 6, amp: 0.04, type: "sine" },
];

const GUITAR_HARMONICS: Harmonic[] = [
  { ratio: 1, amp: 1.0, type: "triangle" },
  { ratio: 2, amp: 0.45, type: "sine" },
  { ratio: 3, amp: 0.3, type: "sine" },
  { ratio: 4, amp: 0.18, type: "sine" },
  { ratio: 5, amp: 0.1, type: "sine" },
];

function playVoice(freq: number, duration: number, startAt: number, voice: Voice): void {
  const c = getAudioContext();
  if (!c) return;
  const t0 = c.currentTime + startAt;
  const tEnd = t0 + duration;

  const master = c.createGain();
  const dest: AudioNode = master;

  if (voice === "piano") {
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.32, t0 + 0.008);
    master.gain.exponentialRampToValueAtTime(0.2, t0 + 0.15);
    master.gain.exponentialRampToValueAtTime(0.08, t0 + duration * 0.75);
    master.gain.linearRampToValueAtTime(0.0001, tEnd);
    master.connect(c.destination);
  } else {
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(3800, t0);
    filter.frequency.exponentialRampToValueAtTime(1800, tEnd);
    filter.Q.value = 0.6;

    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.38, t0 + 0.004);
    master.gain.exponentialRampToValueAtTime(0.18, t0 + 0.12);
    master.gain.exponentialRampToValueAtTime(0.04, t0 + duration * 0.85);
    master.gain.linearRampToValueAtTime(0.0001, tEnd);
    master.connect(filter).connect(c.destination);
  }

  const harmonics = voice === "piano" ? PIANO_HARMONICS : GUITAR_HARMONICS;
  harmonics.forEach(({ ratio, amp, type }) => {
    const hz = freq * ratio;
    if (hz > 18000) return;
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = hz;
    const g = c.createGain();
    g.gain.value = amp;
    osc.connect(g).connect(dest);
    osc.start(t0);
    osc.stop(tEnd + 0.08);
  });
}

function resume(): void {
  const c = getAudioContext();
  if (c && (c as any).state === "suspended" && typeof (c as any).resume === "function") {
    (c as any).resume();
  }
}

export function playNote(note: Note, voice: Voice = "piano", durationSec = 0.65): void {
  resume();
  playVoice(midiToFreq(note.midi), durationSec, 0, voice);
}

export function playInterval(
  a: Note,
  b: Note,
  voice: Voice = "piano",
  noteDur = 0.6,
  gap = 0.08
): void {
  resume();
  playVoice(midiToFreq(a.midi), noteDur, 0, voice);
  playVoice(midiToFreq(b.midi), noteDur, noteDur + gap, voice);
}

export function playMelody(
  notes: Note[],
  voice: Voice = "piano",
  noteDur = 0.5,
  gap = 0.06,
  onStep?: (idx: number) => void,
  onDone?: () => void
): () => void {
  const c = getAudioContext();
  if (!c) {
    onDone?.();
    return () => {};
  }
  resume();
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];
  notes.forEach((n, i) => {
    const startAt = i * (noteDur + gap);
    playVoice(midiToFreq(n.midi), noteDur, startAt, voice);
    timers.push(
      setTimeout(() => {
        if (!cancelled) onStep?.(i);
      }, startAt * 1000)
    );
  });
  timers.push(
    setTimeout(() => {
      if (!cancelled) onDone?.();
    }, notes.length * (noteDur + gap) * 1000)
  );
  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
}

export const audioAvailable = isAudioAvailable;
