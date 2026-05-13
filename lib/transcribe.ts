import { type Note, type NoteTiming } from "./intervals";

export type SegmentedMelody = {
  notes: Note[];
  timings: NoteTiming[];
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export type PitchSample = {
  t: number;
  midi: number | null;
  clarity: number;
};

export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

export function midiToNote(midi: number): Note {
  const rounded = Math.round(midi);
  const octave = Math.floor(rounded / 12) - 1;
  const pc = ((rounded % 12) + 12) % 12;
  return { name: NOTE_NAMES[pc], octave, midi: rounded };
}

export function midiLabel(midi: number): string {
  const rounded = Math.round(midi);
  const octave = Math.floor(rounded / 12) - 1;
  const pc = ((rounded % 12) + 12) % 12;
  return `${NOTE_NAMES[pc]}${octave}`;
}

export type SegmentOptions = {
  minDurationMs?: number;
  pitchToleranceSemitones?: number;
  minClarity?: number;
  silenceGapMs?: number;
};

// 3-sample sliding median over midi values — kills 1-sample pitch spikes
// (transients, plosives, glitchy YIN frames) without touching legitimate runs.
function medianFilter(samples: PitchSample[]): PitchSample[] {
  if (samples.length < 3) return samples;
  const out = samples.slice();
  for (let i = 1; i < samples.length - 1; i++) {
    const a = samples[i - 1].midi;
    const b = samples[i].midi;
    const c = samples[i + 1].midi;
    if (a === null || b === null || c === null) continue;
    const med = [a, b, c].sort((x, y) => x - y)[1];
    out[i] = { ...samples[i], midi: med };
  }
  return out;
}

// Octave-correction: maintains a running median of recent pitch. If a new
// sample is much closer to (median ± 12) than to the median itself, snap it
// back. Cures YIN's occasional first-overtone confusion on low voices.
function correctOctaves(samples: PitchSample[]): PitchSample[] {
  const WINDOW = 12;
  const SNAP_TOLERANCE = 0.7;
  const recent: number[] = [];
  return samples.map((s) => {
    if (s.midi === null) return s;
    if (recent.length < 3) {
      recent.push(s.midi);
      return s;
    }
    const sorted = recent.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    let m = s.midi;
    const dist = Math.abs(m - median);
    if (dist > 6) {
      const up = Math.abs(m - 12 - median);
      const down = Math.abs(m + 12 - median);
      if (up < SNAP_TOLERANCE && up < dist) m -= 12;
      else if (down < SNAP_TOLERANCE && down < dist) m += 12;
    }
    recent.push(m);
    if (recent.length > WINDOW) recent.shift();
    return { ...s, midi: m };
  });
}

// Segment a stream of pitch samples into discrete notes.
//
// Pipeline:
//   1. medianFilter — drop 1-sample transients (plosives, glitchy YIN frames)
//   2. correctOctaves — snap YIN octave hops back to the running median
//   3. segment — group consecutive same-pitch samples into runs
//
// Segmentation strategy:
//   - First valid sample seeds the run anchor.
//   - Anchor drifts as a running mean so slow intonation drift inside one
//     held note doesn't commit a false split — but a real interval leap
//     (M2 = 2 semitones) still exceeds the tolerance and commits.
//   - A gap between valid samples > silenceGapMs (breath, glottal stop)
//     commits — that's how repeated same-pitch notes ("C C") become two
//     separate notes instead of one long one.
//   - Runs shorter than minDurationMs are dropped (transition artifacts).
//   - Two consecutive notes at the same pitch are kept (no dedup).
export function segmentToNotes(
  samples: PitchSample[],
  options: SegmentOptions = {}
): SegmentedMelody {
  const {
    minDurationMs = 110,
    pitchToleranceSemitones = 0.85,
    minClarity = 0.6,
    silenceGapMs = 70,
  } = options;

  const preprocessed = correctOctaves(medianFilter(samples));

  const notes: Note[] = [];
  const timings: NoteTiming[] = [];
  let anchor: number | null = null;
  let runStart = 0;
  let runEnd = 0;
  let runSum = 0;
  let runCount = 0;
  let lastValidT = -Infinity;
  let firstValidT: number | null = null;

  const commit = () => {
    if (
      anchor !== null &&
      runCount > 0 &&
      runEnd - runStart >= minDurationMs
    ) {
      notes.push(midiToNote(runSum / runCount));
      const startSec = (runStart - (firstValidT ?? 0)) / 1000;
      const durationSec = (runEnd - runStart) / 1000;
      timings.push({ startSec, durationSec });
    }
    anchor = null;
    runSum = 0;
    runCount = 0;
  };

  for (const s of preprocessed) {
    const valid = s.midi !== null && s.clarity >= minClarity;
    if (!valid) continue;
    const m = s.midi as number;
    if (firstValidT === null) firstValidT = s.t;

    // Long gap since last valid sample → note boundary (breath, pause).
    if (anchor !== null && s.t - lastValidT > silenceGapMs) {
      commit();
    }
    lastValidT = s.t;

    if (anchor === null) {
      anchor = m;
      runStart = s.t;
      runEnd = s.t;
      runSum = m;
      runCount = 1;
      continue;
    }

    // Pitch jumped outside the run's tolerance → new note.
    if (Math.abs(m - anchor) > pitchToleranceSemitones) {
      commit();
      anchor = m;
      runStart = s.t;
      runEnd = s.t;
      runSum = m;
      runCount = 1;
      continue;
    }

    runEnd = s.t;
    runSum += m;
    runCount += 1;
    anchor = runSum / runCount;
  }
  commit();
  return { notes, timings };
}

export function notesToString(notes: Note[]): string {
  return notes.map((n) => `${n.name}${n.octave}`).join(" ");
}
