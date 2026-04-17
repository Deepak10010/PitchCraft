import type { Note } from "./intervals";

export const STANDARD_TUNING: { label: string; midi: number }[] = [
  { label: "E", midi: 64 },
  { label: "B", midi: 59 },
  { label: "G", midi: 55 },
  { label: "D", midi: 50 },
  { label: "A", midi: 45 },
  { label: "E", midi: 40 },
];

export const FRET_COUNT = 15;

export type FretPos = {
  stringIdx: number;
  fret: number;
};

export function positionsForMidi(midi: number): FretPos[] {
  const out: FretPos[] = [];
  STANDARD_TUNING.forEach((s, i) => {
    const fret = midi - s.midi;
    if (fret >= 0 && fret <= FRET_COUNT) {
      out.push({ stringIdx: i, fret });
    }
  });
  return out;
}

function posDistance(a: FretPos, b: FretPos): number {
  return Math.abs(a.fret - b.fret) + Math.abs(a.stringIdx - b.stringIdx) * 0.5;
}

export function optimalFingering(notes: Note[]): (FretPos | null)[] {
  const result: (FretPos | null)[] = [];
  let prev: FretPos | null = null;
  for (const n of notes) {
    const options = positionsForMidi(n.midi);
    if (options.length === 0) {
      result.push(null);
      continue;
    }
    if (!prev) {
      const best = options.reduce((a, b) => (a.fret <= b.fret ? a : b));
      result.push(best);
      prev = best;
      continue;
    }
    const p: FretPos = prev;
    const best: FretPos = options.reduce((a, b) =>
      posDistance(a, p) <= posDistance(b, p) ? a : b
    );
    result.push(best);
    prev = best;
  }
  return result;
}

export function isOutOfRange(midi: number): boolean {
  const lowest = Math.min(...STANDARD_TUNING.map((s) => s.midi));
  const highest = Math.max(...STANDARD_TUNING.map((s) => s.midi)) + FRET_COUNT;
  return midi < lowest || midi > highest;
}
