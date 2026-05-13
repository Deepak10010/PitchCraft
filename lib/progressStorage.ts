import AsyncStorage from "@react-native-async-storage/async-storage";
import { INTERVALS } from "./intervals";

const KEY = "pitchcraft.progress.v1";

export type LeitnerBox = 1 | 2 | 3 | 4;

export type IntervalStat = {
  short: string;
  attempts: number;
  correct: number;
  box: LeitnerBox;
  lastSeenAt: number;
  lastSeenSession: number;
  recentTimesMs: number[];
};

export type ProgressV1 = {
  version: 1;
  sessions: number;
  totalAttempts: number;
  totalCorrect: number;
  lastSessionAt: number;
  streakDays: number;
  intervals: Record<string, IntervalStat>;
};

export type QuestionResult = {
  short: string;
  correct: boolean;
  responseMs: number;
};

const TRACKED_INTERVALS: string[] = Object.values(INTERVALS)
  .filter((i) => i.semitones >= 1 && i.semitones <= 12)
  .map((i) => i.short);

export function emptyStat(short: string): IntervalStat {
  return {
    short,
    attempts: 0,
    correct: 0,
    box: 1,
    lastSeenAt: 0,
    lastSeenSession: -1,
    recentTimesMs: [],
  };
}

export function emptyProgress(): ProgressV1 {
  const intervals: Record<string, IntervalStat> = {};
  for (const s of TRACKED_INTERVALS) intervals[s] = emptyStat(s);
  return {
    version: 1,
    sessions: 0,
    totalAttempts: 0,
    totalCorrect: 0,
    lastSessionAt: 0,
    streakDays: 0,
    intervals,
  };
}

function hydrate(raw: unknown): ProgressV1 {
  const base = emptyProgress();
  if (!raw || typeof raw !== "object") return base;
  const p = raw as Partial<ProgressV1>;
  if (p.version !== 1) return base;
  const merged: ProgressV1 = {
    ...base,
    ...p,
    intervals: { ...base.intervals },
  };
  if (p.intervals && typeof p.intervals === "object") {
    for (const s of TRACKED_INTERVALS) {
      const incoming = (p.intervals as Record<string, IntervalStat>)[s];
      if (incoming) merged.intervals[s] = { ...emptyStat(s), ...incoming };
    }
  }
  return merged;
}

export async function loadProgress(): Promise<ProgressV1> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyProgress();
    return hydrate(JSON.parse(raw));
  } catch {
    return emptyProgress();
  }
}

export async function saveProgress(p: ProgressV1): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}

export async function resetProgress(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

const MAX_RECENT_TIMES = 20;

function dayBucket(ts: number): number {
  const d = new Date(ts);
  return Math.floor(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000
  );
}

export function applySessionResults(
  prev: ProgressV1,
  results: QuestionResult[],
  now: number = Date.now()
): ProgressV1 {
  if (results.length === 0) return prev;

  const sessions = prev.sessions + 1;
  const intervals: Record<string, IntervalStat> = { ...prev.intervals };

  for (const r of results) {
    const cur = intervals[r.short] ?? emptyStat(r.short);
    const nextBox: LeitnerBox = r.correct
      ? (Math.min(4, cur.box + 1) as LeitnerBox)
      : 1;
    const times = [...cur.recentTimesMs, r.responseMs].slice(-MAX_RECENT_TIMES);
    intervals[r.short] = {
      ...cur,
      attempts: cur.attempts + 1,
      correct: cur.correct + (r.correct ? 1 : 0),
      box: nextBox,
      lastSeenAt: now,
      lastSeenSession: sessions,
      recentTimesMs: times,
    };
  }

  let streakDays = prev.streakDays;
  if (prev.lastSessionAt === 0) {
    streakDays = 1;
  } else {
    const lastBucket = dayBucket(prev.lastSessionAt);
    const nowBucket = dayBucket(now);
    const diff = nowBucket - lastBucket;
    if (diff === 0) streakDays = Math.max(prev.streakDays, 1);
    else if (diff === 1) streakDays = prev.streakDays + 1;
    else streakDays = 1;
  }

  const correctThis = results.filter((r) => r.correct).length;

  return {
    ...prev,
    sessions,
    totalAttempts: prev.totalAttempts + results.length,
    totalCorrect: prev.totalCorrect + correctThis,
    lastSessionAt: now,
    streakDays,
    intervals,
  };
}

export function accuracyOf(stat: IntervalStat): number {
  if (stat.attempts === 0) return 0;
  return stat.correct / stat.attempts;
}

export function weakestInterval(p: ProgressV1): IntervalStat | null {
  const attempted = Object.values(p.intervals).filter((s) => s.attempts > 0);
  if (attempted.length === 0) return null;
  attempted.sort((a, b) => accuracyOf(a) - accuracyOf(b) || b.attempts - a.attempts);
  return attempted[0];
}

export function overallAccuracy(p: ProgressV1): number {
  if (p.totalAttempts === 0) return 0;
  return p.totalCorrect / p.totalAttempts;
}

export { TRACKED_INTERVALS };
