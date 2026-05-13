export type Melody = {
  id: string;
  title: string;
  hint: string;
  notes: string;
  builtin: boolean;
  anchorInterval?: string;
  // Per-note timings captured from humming. Length must equal note count;
  // when out of sync (user edited the notes string) consumers should ignore.
  timings?: { startSec: number; durationSec: number }[];
};

export const PRESET_MELODIES: Melody[] = [
  {
    id: "rainbow",
    title: "Somewhere Over the Rainbow",
    hint: "The opening leap is a full Octave — the biggest jump in an octave-bounded scale.",
    notes: "C4 C5 B4 G4 A4 B4 C5",
    builtin: true,
    anchorInterval: "P8",
  },
  {
    id: "jaws",
    title: "Jaws Theme",
    hint: "Pure Minor 2nds — the tightest, most tense interval. That's the dread.",
    notes: "E3 F3 E3 F3 E3 F3",
    builtin: true,
    anchorInterval: "m2",
  },
  {
    id: "happy-birthday",
    title: "Happy Birthday",
    hint: "Opens with a Major 2nd — warm, conversational, the most stepwise interval.",
    notes: "C4 C4 D4 C4 F4 E4",
    builtin: true,
    anchorInterval: "M2",
  },
  {
    id: "smoke",
    title: "Smoke on the Water",
    hint: "Famous riff built from Minor 3rds — dark, bluesy, rock's favourite interval.",
    notes: "G3 A#3 C4 G3 A#3 C#4 C4",
    builtin: true,
    anchorInterval: "m3",
  },
  {
    id: "saints",
    title: "When the Saints Go Marching In",
    hint: "Walks up a Major 3rd triad — bright, triumphant, stable.",
    notes: "C4 E4 F4 G4 C4 E4 F4 G4",
    builtin: true,
    anchorInterval: "M3",
  },
  {
    id: "bride",
    title: "Here Comes the Bride",
    hint: "Opens with a Perfect 4th — strong, unambiguous, the sound of resolution.",
    notes: "C4 F4 F4 F4",
    builtin: true,
    anchorInterval: "P4",
  },
  {
    id: "simpsons",
    title: "The Simpsons Theme",
    hint: "The opening C → F# is a Tritone — the most unstable interval, pure mischief.",
    notes: "C4 E4 F#4 A4 G4 E4 C4 A3 F#3",
    builtin: true,
    anchorInterval: "TT",
  },
  {
    id: "starwars",
    title: "Star Wars Main Theme",
    hint: "Opens with a Perfect 5th — the most powerful, resolved interval in music.",
    notes: "G3 G3 G3 C4 G4 F4 E4 D4 C5 G4",
    builtin: true,
    anchorInterval: "P5",
  },
  {
    id: "entertainer",
    title: "The Entertainer",
    hint: "Features a Minor 6th — wistful, slightly off-kilter, ragtime's signature.",
    notes: "D4 D#4 E4 C5 E4 C5 E4",
    builtin: true,
    anchorInterval: "m6",
  },
  {
    id: "bonnie",
    title: "My Bonnie Lies Over the Ocean",
    hint: "Opens with a Major 6th — open, yearning, the sound of longing.",
    notes: "C4 A4 F4 A4 G4 E4 C4",
    builtin: true,
    anchorInterval: "M6",
  },
  {
    id: "takeonme",
    title: "Take On Me",
    hint: "The synth hook features a Major 7th leap — thrilling, just shy of an octave.",
    notes: "F#4 F#4 D4 B3 B3 E4 E4 E4 G#4 G#4 A4 B4 A4 A4 A4 E4 D4 F#4",
    builtin: true,
    anchorInterval: "M7",
  },
  {
    id: "westside",
    title: "Somewhere (West Side Story)",
    hint: "Opens with a Minor 7th — wide, longing, almost an octave but quietly sadder.",
    notes: "E4 D5 C#5 A4 B4 C#5",
    builtin: true,
    anchorInterval: "m7",
  },
];
