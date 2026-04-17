export type Note = {
  name: string;
  octave: number;
  midi: number;
};

export type Interval = {
  name: string;
  short: string;
  semitones: number;
  color: string;
  famousTune?: string;
};

export const INTERVALS: Record<number, Interval> = {
  0: { name: "Unison", short: "P1", semitones: 0, color: "#9ca3af" },
  1: { name: "Minor 2nd", short: "m2", semitones: 1, color: "#ef4444", famousTune: "Jaws theme" },
  2: { name: "Major 2nd", short: "M2", semitones: 2, color: "#f97316", famousTune: "Happy Birthday" },
  3: { name: "Minor 3rd", short: "m3", semitones: 3, color: "#eab308", famousTune: "Smoke on the Water" },
  4: { name: "Major 3rd", short: "M3", semitones: 4, color: "#84cc16", famousTune: "When the Saints" },
  5: { name: "Perfect 4th", short: "P4", semitones: 5, color: "#22c55e", famousTune: "Here Comes the Bride" },
  6: { name: "Tritone", short: "TT", semitones: 6, color: "#14b8a6", famousTune: "The Simpsons" },
  7: { name: "Perfect 5th", short: "P5", semitones: 7, color: "#06b6d4", famousTune: "Star Wars" },
  8: { name: "Minor 6th", short: "m6", semitones: 8, color: "#3b82f6", famousTune: "The Entertainer" },
  9: { name: "Major 6th", short: "M6", semitones: 9, color: "#6366f1", famousTune: "My Bonnie" },
  10: { name: "Minor 7th", short: "m7", semitones: 10, color: "#8b5cf6", famousTune: "Somewhere (WSS)" },
  11: { name: "Major 7th", short: "M7", semitones: 11, color: "#a855f7", famousTune: "Take On Me" },
  12: { name: "Octave", short: "P8", semitones: 12, color: "#ec4899", famousTune: "Over the Rainbow" },
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const PITCH_CLASS: Record<string, number> = {
  C: 0, "C#": 1, DB: 1, D: 2, "D#": 3, EB: 3, E: 4, F: 5,
  "F#": 6, GB: 6, G: 7, "G#": 8, AB: 8, A: 9, "A#": 10, BB: 10, B: 11,
};

export function parseNote(token: string): Note | null {
  const t = token.trim().toUpperCase().replace("♯", "#").replace("♭", "B");
  const match = t.match(/^([A-G][#B]?)(-?\d+)$/);
  if (!match) return null;
  const pc = PITCH_CLASS[match[1]];
  if (pc === undefined) return null;
  const octave = parseInt(match[2], 10);
  const midi = (octave + 1) * 12 + pc;
  return { name: NOTE_NAMES[pc], octave, midi };
}

export function parseMelody(input: string): Note[] {
  return input
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map(parseNote)
    .filter((n): n is Note => n !== null);
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function noteLabel(note: Note): string {
  return `${note.name}${note.octave}`;
}

export function intervalBetween(a: Note, b: Note): Interval {
  const semis = Math.abs(b.midi - a.midi) % 12;
  const octaves = Math.floor(Math.abs(b.midi - a.midi) / 12);
  if (octaves > 0 && semis === 0) return INTERVALS[12];
  return INTERVALS[semis];
}

export function direction(a: Note, b: Note): "up" | "down" | "same" {
  if (b.midi > a.midi) return "up";
  if (b.midi < a.midi) return "down";
  return "same";
}

export type IntervalStep = {
  from: Note;
  to: Note;
  interval: Interval;
  direction: "up" | "down" | "same";
  semitoneDistance: number;
};

export function analyzeMelody(notes: Note[]): IntervalStep[] {
  const steps: IntervalStep[] = [];
  for (let i = 1; i < notes.length; i++) {
    const from = notes[i - 1];
    const to = notes[i];
    steps.push({
      from,
      to,
      interval: intervalBetween(from, to),
      direction: direction(from, to),
      semitoneDistance: Math.abs(to.midi - from.midi),
    });
  }
  return steps;
}

export function intervalHistogram(steps: IntervalStep[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of steps) {
    const key = s.interval.short;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export type ScaleRole = "tonic" | "fourth" | "fifth" | null;

export const ROLE_COLORS: Record<Exclude<ScaleRole, null>, string> = {
  tonic: "#fbbf24",
  fourth: "#ec4899",
  fifth: "#3b82f6",
};

export const ROLE_LABELS: Record<Exclude<ScaleRole, null>, string> = {
  tonic: "Tonic",
  fourth: "4th",
  fifth: "5th",
};

export function scaleRoleOf(note: Note, base: Note): ScaleRole {
  const semisAbove = (((note.midi - base.midi) % 12) + 12) % 12;
  if (semisAbove === 0) return "tonic";
  if (semisAbove === 5) return "fourth";
  if (semisAbove === 7) return "fifth";
  return null;
}

export function rolesForMelody(notes: Note[]): ScaleRole[] {
  if (notes.length === 0) return [];
  const base = notes[0];
  return notes.map((n) => scaleRoleOf(n, base));
}

export function dominantInsight(steps: IntervalStep[]): string {
  if (steps.length === 0) return "No intervals — add at least two notes.";
  const hist = intervalHistogram(steps);
  const sorted = Array.from(hist.entries()).sort((a, b) => b[1] - a[1]);
  const [topKey, topCount] = sorted[0];
  const pct = Math.round((topCount / steps.length) * 100);
  const top = Object.values(INTERVALS).find((i) => i.short === topKey);
  if (!top) return "";
  if (pct >= 80) return `Almost entirely ${top.name}s (${pct}%) — a pure ${top.name} workout.`;
  if (pct >= 50) return `Dominated by ${top.name}s (${pct}%). Great for drilling that interval.`;
  return `Mixed: ${top.name} leads at ${pct}%, with ${sorted.length - 1} other interval${sorted.length > 2 ? "s" : ""} in the mix.`;
}
