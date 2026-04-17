import { type Note } from "./intervals";

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

// Segment a stream of pitch samples into discrete notes.
//
// Strategy:
//   - Anchor each "run" at the first valid sample's pitch (no drifting average).
//   - A sample that differs from the anchor by more than pitchToleranceSemitones
//     commits the current run and starts a new one.
//   - A gap between valid samples larger than silenceGapMs (breath, glottal stop)
//     also commits — this is what lets repeated same-pitch notes ("C C") register
//     as two separate notes instead of one long one.
//   - Runs shorter than minDurationMs are dropped (likely transition artifacts).
//   - Two consecutive notes at the same pitch are kept (no dedup).
export function segmentToNotes(
  samples: PitchSample[],
  options: SegmentOptions = {}
): Note[] {
  const {
    minDurationMs = 90,
    pitchToleranceSemitones = 0.6,
    minClarity = 0.75,
    silenceGapMs = 70,
  } = options;

  const notes: Note[] = [];
  let anchor: number | null = null;
  let runStart = 0;
  let runEnd = 0;
  let runSum = 0;
  let runCount = 0;
  let lastValidT = -Infinity;

  const commit = () => {
    if (
      anchor !== null &&
      runCount > 0 &&
      runEnd - runStart >= minDurationMs
    ) {
      notes.push(midiToNote(runSum / runCount));
    }
    anchor = null;
    runSum = 0;
    runCount = 0;
  };

  for (const s of samples) {
    const valid = s.midi !== null && s.clarity >= minClarity;
    if (!valid) continue;
    const m = s.midi as number;

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
  }
  commit();
  return notes;
}

export function notesToString(notes: Note[]): string {
  return notes.map((n) => `${n.name}${n.octave}`).join(" ");
}
