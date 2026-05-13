import { INTERVALS, midiToFreq, type Note } from "./intervals";
import {
  TRACKED_INTERVALS,
  accuracyOf,
  type IntervalStat,
  type LeitnerBox,
  type ProgressV1,
} from "./progressStorage";

export const SESSION_LENGTH = 10;
export const CHOICES_PER_QUESTION = 4;

const BOX_PERIOD: Record<LeitnerBox, number> = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
};

export const DRILL_SA_MIDI = 60; // C4 — Sa for every drill question.

export type DrillQuestion = {
  index: number;
  rootNote: Note;
  targetNote: Note;
  answerShort: string;
  answerSemitones: number;
  choices: string[];
};

function semitonesOf(short: string): number {
  const entry = Object.entries(INTERVALS).find(([, v]) => v.short === short);
  return entry ? parseInt(entry[0], 10) : 0;
}

function midiToNote(midi: number): Note {
  const NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { name: NAMES[pc], octave, midi };
}

export function isDue(stat: IntervalStat, sessionCounter: number): boolean {
  if (stat.lastSeenSession < 0) return true;
  const period = BOX_PERIOD[stat.box];
  return sessionCounter - stat.lastSeenSession >= period;
}

function weightFor(stat: IntervalStat): number {
  if (stat.attempts === 0) return 1.4;
  const inverseAcc = 1 - accuracyOf(stat);
  return 0.2 + inverseAcc * 1.6;
}

function weightedPick(
  shorts: string[],
  weights: number[],
  rand: () => number
): string {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < shorts.length; i++) {
    r -= weights[i];
    if (r <= 0) return shorts[i];
  }
  return shorts[shorts.length - 1];
}

export function buildQueue(
  progress: ProgressV1,
  rand: () => number = Math.random
): string[] {
  const nextSession = progress.sessions + 1;
  const all = TRACKED_INTERVALS;
  const dueSet = new Set(
    all.filter((s) => isDue(progress.intervals[s], nextSession))
  );

  const queue: string[] = [];
  const due = [...dueSet];
  for (let i = due.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [due[i], due[j]] = [due[j], due[i]];
  }
  for (const s of due) {
    if (queue.length >= SESSION_LENGTH) break;
    if (queue[queue.length - 1] !== s) queue.push(s);
  }

  while (queue.length < SESSION_LENGTH) {
    const weights = all.map((s) => weightFor(progress.intervals[s]));
    const pick = weightedPick(all, weights, rand);
    if (queue[queue.length - 1] === pick && all.length > 1) continue;
    queue.push(pick);
  }

  const distinct = new Set(queue);
  if (distinct.size < 3) {
    const missing = all.filter((s) => !distinct.has(s));
    for (let i = 0; i < queue.length && distinct.size < 3 && missing.length; i++) {
      const replacement = missing.shift()!;
      if (queue[i - 1] !== replacement && queue[i + 1] !== replacement) {
        queue[i] = replacement;
        distinct.add(replacement);
      }
    }
  }

  return queue;
}

function pickDistractors(
  answerShort: string,
  rand: () => number,
  count: number = CHOICES_PER_QUESTION - 1
): string[] {
  const answerSemis = semitonesOf(answerShort);
  const others = TRACKED_INTERVALS.filter((s) => s !== answerShort);
  others.sort((a, b) => {
    const da = Math.abs(semitonesOf(a) - answerSemis);
    const db = Math.abs(semitonesOf(b) - answerSemis);
    if (da !== db) return da - db;
    return rand() - 0.5;
  });
  const nearPool = others.slice(0, Math.min(others.length, 5));
  for (let i = nearPool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [nearPool[i], nearPool[j]] = [nearPool[j], nearPool[i]];
  }
  return nearPool.slice(0, count);
}

export function buildSession(
  progress: ProgressV1,
  rand: () => number = Math.random
): DrillQuestion[] {
  const queue = buildQueue(progress, rand);
  const rootNote = midiToNote(DRILL_SA_MIDI);
  return queue.map((answerShort, index) => {
    const answerSemis = semitonesOf(answerShort);
    const distractors = pickDistractors(answerShort, rand);
    const choices = [answerShort, ...distractors];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    const targetNote = midiToNote(rootNote.midi + answerSemis);
    return {
      index,
      rootNote,
      targetNote,
      answerShort,
      answerSemitones: answerSemis,
      choices,
    };
  });
}

export function freqsFor(q: DrillQuestion): { root: number; target: number } {
  return {
    root: midiToFreq(q.rootNote.midi),
    target: midiToFreq(q.targetNote.midi),
  };
}

export function nextDuePreview(
  progress: ProgressV1,
  limit: number = 3
): string[] {
  const nextSession = progress.sessions + 1;
  return TRACKED_INTERVALS.filter((s) => isDue(progress.intervals[s], nextSession)).slice(
    0,
    limit
  );
}
