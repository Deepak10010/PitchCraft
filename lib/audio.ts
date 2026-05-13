import { midiToFreq, type Note, type NoteTiming } from "./intervals";
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
  onDone?: () => void,
  timings?: NoteTiming[]
): () => void {
  const c = getAudioContext();
  if (!c) {
    onDone?.();
    return () => {};
  }
  resume();
  let cancelled = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const useTimings =
    timings && timings.length === notes.length && timings.length > 0;

  let totalDur = 0;
  notes.forEach((n, i) => {
    let startAt: number;
    let dur: number;
    if (useTimings) {
      // Caller already pre-scaled timings by speed; we just use them as-is.
      startAt = timings![i].startSec;
      dur = Math.max(0.05, timings![i].durationSec);
    } else {
      startAt = i * (noteDur + gap);
      dur = noteDur;
    }
    playVoice(midiToFreq(n.midi), dur, startAt, voice);
    timers.push(
      setTimeout(() => {
        if (!cancelled) onStep?.(i);
      }, startAt * 1000)
    );
    totalDur = Math.max(totalDur, startAt + dur);
  });
  if (!useTimings) {
    totalDur = notes.length * (noteDur + gap);
  }
  timers.push(
    setTimeout(() => {
      if (!cancelled) onDone?.();
    }, totalDur * 1000)
  );
  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
}

export const audioAvailable = isAudioAvailable;

// Continuous tanpura drone, cycling Sa↑ → Pa → Sa → Sa↓ on a relaxed pluck
// pattern with overlapping decays. Routed through one master gain so stop()
// can ramp the whole thing to silence cleanly without leaving stray oscillators
// scheduled past the cancel point.
export function startTanpuraDrone(saMidi: number): () => void {
  const c = getAudioContext();
  if (!c) return () => {};
  resume();

  const pattern = [saMidi + 12, saMidi + 7, saMidi, saMidi - 12];
  const STRIDE_SEC = 1.4;
  const PLUCK_DUR = 3.2;
  const TOTAL_CYCLES = 80; // ~7.5 minutes of drone — covers any drill session.

  const droneGain = c.createGain();
  droneGain.gain.value = 1;
  droneGain.connect(c.destination);

  const oscillators: OscillatorNode[] = [];
  const baseTime = c.currentTime;

  const droneHarmonics: Harmonic[] = [
    { ratio: 1, amp: 1.0, type: "sine" },
    { ratio: 2, amp: 0.55, type: "sine" },
    { ratio: 3, amp: 0.32, type: "sine" },
    { ratio: 4, amp: 0.18, type: "sine" },
    { ratio: 5, amp: 0.1, type: "sine" },
  ];

  for (let cycle = 0; cycle < TOTAL_CYCLES; cycle++) {
    pattern.forEach((midi, i) => {
      const t0 = baseTime + (cycle * pattern.length + i) * STRIDE_SEC;
      const tEnd = t0 + PLUCK_DUR;

      const pluckGain = c.createGain();
      pluckGain.gain.setValueAtTime(0.0001, t0);
      pluckGain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.04);
      pluckGain.gain.exponentialRampToValueAtTime(0.04, t0 + 0.5);
      pluckGain.gain.exponentialRampToValueAtTime(0.015, t0 + PLUCK_DUR * 0.7);
      pluckGain.gain.linearRampToValueAtTime(0.0001, tEnd);

      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2200, t0);
      filter.frequency.exponentialRampToValueAtTime(900, tEnd);
      filter.Q.value = 0.7;
      pluckGain.connect(filter).connect(droneGain);

      const freq = midiToFreq(midi);
      droneHarmonics.forEach(({ ratio, amp, type }) => {
        const hz = freq * ratio;
        if (hz > 18000) return;
        const osc = c.createOscillator();
        osc.type = type;
        osc.frequency.value = hz;
        const g = c.createGain();
        g.gain.value = amp;
        osc.connect(g).connect(pluckGain);
        osc.start(t0);
        osc.stop(tEnd + 0.1);
        oscillators.push(osc);
      });
    });
  }

  return () => {
    const t = c.currentTime;
    droneGain.gain.cancelScheduledValues(t);
    droneGain.gain.setValueAtTime(droneGain.gain.value, t);
    droneGain.gain.linearRampToValueAtTime(0.0001, t + 0.15);
    setTimeout(() => {
      for (const osc of oscillators) {
        try {
          osc.stop();
        } catch {}
      }
    }, 200);
  };
}
