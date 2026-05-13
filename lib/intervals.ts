export type Note = {
  name: string;
  octave: number;
  midi: number;
};

export type NoteTiming = {
  startSec: number;
  durationSec: number;
};

export type Interval = {
  name: string;
  short: string;
  semitones: number;
  color: string;
  famousTune?: string;
  famousIndianTune?: string;
  sargam: string;
  sargamShort: string;
};

export type LabelMode = "western" | "sargam";

export const INTERVALS: Record<number, Interval> = {
  0:  { name: "Unison",     short: "P1", semitones: 0,  color: "#9ca3af", sargam: "Sa",          sargamShort: "Sa"  },
  1:  { name: "Minor 2nd",  short: "m2", semitones: 1,  color: "#ef4444", famousTune: "Jaws theme",            famousIndianTune: "Raag Bhairav (Sa→Re komal)",       sargam: "Re komal",  sargamShort: "Re♭" },
  2:  { name: "Major 2nd",  short: "M2", semitones: 2,  color: "#f97316", famousTune: "Happy Birthday",        famousIndianTune: "Saare Jahaan Se Achchha (opening)", sargam: "Re",        sargamShort: "Re"  },
  3:  { name: "Minor 3rd",  short: "m3", semitones: 3,  color: "#eab308", famousTune: "Smoke on the Water",    famousIndianTune: "Raag Bhairavi (Sa→Ga komal)",       sargam: "Ga komal",  sargamShort: "Ga♭" },
  4:  { name: "Major 3rd",  short: "M3", semitones: 4,  color: "#84cc16", famousTune: "When the Saints",       famousIndianTune: "Vande Mataram (opening)",           sargam: "Ga",        sargamShort: "Ga"  },
  5:  { name: "Perfect 4th",short: "P4", semitones: 5,  color: "#22c55e", famousTune: "Here Comes the Bride",  famousIndianTune: "Jana Gana Mana (Sa→Ma climb)",      sargam: "Ma",        sargamShort: "Ma"  },
  6:  { name: "Tritone",    short: "TT", semitones: 6,  color: "#14b8a6", famousTune: "The Simpsons",          famousIndianTune: "Raag Yaman (Sa→Ma tivra)",          sargam: "Ma tivra",  sargamShort: "Ma#" },
  7:  { name: "Perfect 5th",short: "P5", semitones: 7,  color: "#06b6d4", famousTune: "Star Wars",             famousIndianTune: "Tanpura Sa–Pa drone",               sargam: "Pa",        sargamShort: "Pa"  },
  8:  { name: "Minor 6th",  short: "m6", semitones: 8,  color: "#3b82f6", famousTune: "The Entertainer",       famousIndianTune: "Raag Bhairav (Sa→Dha komal)",       sargam: "Dha komal", sargamShort: "Dha♭"},
  9:  { name: "Major 6th",  short: "M6", semitones: 9,  color: "#6366f1", famousTune: "My Bonnie",             famousIndianTune: "Raag Khamaj (Sa→Dha)",              sargam: "Dha",       sargamShort: "Dha" },
  10: { name: "Minor 7th",  short: "m7", semitones: 10, color: "#8b5cf6", famousTune: "Somewhere (WSS)",       famousIndianTune: "Raag Kafi (Sa→Ni komal)",           sargam: "Ni komal",  sargamShort: "Ni♭" },
  11: { name: "Major 7th",  short: "M7", semitones: 11, color: "#a855f7", famousTune: "Take On Me",            famousIndianTune: "Raag Bilawal (Sa→Ni)",              sargam: "Ni",        sargamShort: "Ni"  },
  12: { name: "Octave",     short: "P8", semitones: 12, color: "#ec4899", famousTune: "Over the Rainbow",      famousIndianTune: "Lag Ja Gale (Lata, octave drop)",   sargam: "Sa (upper)",sargamShort: "Sa↑" },
};

export function intervalName(meta: Interval, mode: LabelMode): string {
  return mode === "sargam" ? meta.sargam : meta.name;
}

export function intervalShortLabel(meta: Interval, mode: LabelMode): string {
  return mode === "sargam" ? meta.sargamShort : meta.short;
}

export function intervalByShort(short: string): Interval | null {
  return Object.values(INTERVALS).find((i) => i.short === short) ?? null;
}

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

export function dominantInsight(steps: IntervalStep[], mode: LabelMode = "western"): string {
  if (steps.length === 0) return "No intervals — add at least two notes.";
  const hist = intervalHistogram(steps);
  const sorted = Array.from(hist.entries()).sort((a, b) => b[1] - a[1]);
  const [topKey, topCount] = sorted[0];
  const pct = Math.round((topCount / steps.length) * 100);
  const top = Object.values(INTERVALS).find((i) => i.short === topKey);
  if (!top) return "";
  const label = intervalName(top, mode);
  if (pct >= 80) return `Almost entirely ${label} (${pct}%) — a pure ${label} workout.`;
  if (pct >= 50) return `Dominated by ${label} (${pct}%). Great for drilling that interval.`;
  return `Mixed: ${label} leads at ${pct}%, with ${sorted.length - 1} other interval${sorted.length > 2 ? "s" : ""} in the mix.`;
}
