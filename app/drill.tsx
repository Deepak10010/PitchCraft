import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  INTERVALS,
  noteLabel,
  intervalName,
  type LabelMode,
} from "../lib/intervals";
import { playInterval, audioAvailable, startTanpuraDrone } from "../lib/audio";
import { useLabelMode } from "../theme/LabelModeContext";
import {
  loadProgress,
  applySessionResults,
  saveProgress,
  emptyProgress,
  type ProgressV1,
  type QuestionResult,
} from "../lib/progressStorage";
import {
  buildSession,
  DRILL_SA_MIDI,
  type DrillQuestion,
} from "../lib/drillScheduler";
import { useTheme } from "../theme/ThemeContext";
import { space, radius, type as type_, type ThemeColors } from "../theme/tokens";

type Phase = "loading" | "playing" | "answered" | "done";

function metaFor(short: string) {
  return Object.values(INTERVALS).find((i) => i.short === short) ?? null;
}

const webShadow =
  Platform.OS === "web"
    ? ({
        boxShadow: "0 2px 6px rgba(15,12,40,0.08), 0 12px 32px rgba(124,58,237,0.08)",
      } as any)
    : {};

export default function Drill() {
  const router = useRouter();
  const { colors } = useTheme();
  const { mode } = useLabelMode();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [progress, setProgress] = useState<ProgressV1>(emptyProgress);
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [droneOn, setDroneOn] = useState(true);
  const askedAtRef = useRef<number>(0);
  const droneStopRef = useRef<(() => void) | null>(null);
  const audioOk = audioAvailable();

  const startSession = useCallback((basis: ProgressV1) => {
    const qs = buildSession(basis);
    setQuestions(qs);
    setQIndex(0);
    setResults([]);
    setPicked(null);
    setPhase("playing");
  }, []);

  // Start / stop the tanpura drone alongside the playing phase. Re-runs when
  // the user toggles it mid-session.
  useEffect(() => {
    droneStopRef.current?.();
    droneStopRef.current = null;
    if (droneOn && (phase === "playing" || phase === "answered") && audioOk) {
      droneStopRef.current = startTanpuraDrone(DRILL_SA_MIDI);
    }
    return () => {
      droneStopRef.current?.();
      droneStopRef.current = null;
    };
  }, [droneOn, phase, audioOk]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadProgress().then((p) => {
        if (!active) return;
        setProgress(p);
        startSession(p);
      });
      return () => {
        active = false;
      };
    }, [startSession])
  );

  const current = questions[qIndex];

  useEffect(() => {
    if (phase !== "playing" || !current) return;
    askedAtRef.current = Date.now();
    const t = setTimeout(() => {
      playInterval(current.rootNote, current.targetNote, "piano");
    }, 220);
    return () => clearTimeout(t);
  }, [phase, current]);

  const handleReplay = () => {
    if (!current) return;
    playInterval(current.rootNote, current.targetNote, "piano");
  };

  const handlePick = (short: string) => {
    if (!current || phase !== "playing") return;
    const responseMs = Date.now() - askedAtRef.current;
    const correct = short === current.answerShort;
    setPicked(short);
    setPhase("answered");
    setResults((cur) => [
      ...cur,
      { short: current.answerShort, correct, responseMs },
    ]);
    setTimeout(() => {
      playInterval(current.rootNote, current.targetNote, "piano");
    }, 260);
  };

  const handleNext = useCallback(async () => {
    if (qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1);
      setPicked(null);
      setPhase("playing");
      return;
    }
    setPhase("done");
    const updated = applySessionResults(progress, results);
    setProgress(updated);
    try {
      await saveProgress(updated);
    } catch {}
  }, [qIndex, questions.length, progress, results]);

  if (phase === "loading" || (phase !== "done" && !current)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Building your session…</Text>
      </View>
    );
  }

  if (phase === "done") {
    return (
      <Summary
        results={results}
        onAgain={() => startSession(progress)}
        onHome={() => router.replace("/")}
        styles={styles}
        colors={colors}
        mode={mode}
      />
    );
  }

  const correctMeta = current && metaFor(current.answerShort);
  const isCorrect = picked === current!.answerShort;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.progressRow}>
        {questions.map((_, i) => {
          const past = i < qIndex;
          const isCur = i === qIndex;
          const res = results[i];
          const bg = past
            ? res?.correct
              ? colors.success
              : colors.errorText
            : isCur
            ? colors.accentBright
            : colors.border;
          return <View key={i} style={[styles.progressDot, { backgroundColor: bg }]} />;
        })}
      </View>

      <View style={styles.counterRow}>
        <Text style={styles.counter}>
          Question {qIndex + 1} of {questions.length}
        </Text>
        <View style={styles.counterRight}>
          <Pressable
            onPress={() => setDroneOn((v) => !v)}
            hitSlop={6}
            style={[
              styles.dronePill,
              droneOn
                ? { backgroundColor: colors.goldTint, borderColor: colors.goldTintBorder }
                : { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name={droneOn ? "musical-notes" : "musical-notes-outline"}
              size={11}
              color={droneOn ? colors.gold : colors.textDim}
            />
            <Text
              style={[
                styles.dronePillText,
                { color: droneOn ? colors.gold : colors.textDim },
              ]}
            >
              {droneOn ? "Drone Sa" : "Drone off"}
            </Text>
          </Pressable>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.textDim} />
          </Pressable>
        </View>
      </View>

      {!audioOk && (
        <View style={styles.audioWarn}>
          <Ionicons name="warning-outline" size={16} color={colors.warn} />
          <Text style={styles.audioWarnText}>
            Audio engine not available — drills need a modern browser.
          </Text>
        </View>
      )}

      <View style={[styles.stage, webShadow]}>
        <Text style={styles.stageLabel}>What interval did you hear?</Text>
        <Pressable
          onPress={handleReplay}
          style={({ pressed }) => [
            styles.replayBtn,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="refresh" size={18} color={colors.accentBright} />
          <Text style={styles.replayText}>Replay</Text>
        </Pressable>
      </View>

      <View style={styles.choices}>
        {current!.choices.map((short) => {
          const isPicked = picked === short;
          const isAnswer = short === current!.answerShort;
          const meta = metaFor(short);
          const reveal = phase === "answered";
          const showCorrect = reveal && isAnswer;
          const showWrong = reveal && isPicked && !isAnswer;
          const primary = meta ? intervalName(meta, mode) : short;
          const secondary = meta
            ? mode === "sargam"
              ? `${meta.name} · ${meta.short}`
              : meta.name
            : short;
          return (
            <Pressable
              key={short}
              onPress={() => handlePick(short)}
              disabled={phase !== "playing"}
              style={[
                styles.choice,
                showCorrect && { borderColor: colors.success, backgroundColor: "rgba(22,163,74,0.12)" },
                showWrong && { borderColor: colors.errorText, backgroundColor: colors.errorBg },
              ]}
            >
              <View
                style={[
                  styles.choiceSwatch,
                  { backgroundColor: meta?.color ?? colors.border },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceShort}>{primary}</Text>
                <Text style={styles.choiceName}>{secondary}</Text>
              </View>
              {showCorrect && (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              )}
              {showWrong && (
                <Ionicons name="close-circle" size={20} color={colors.errorText} />
              )}
            </Pressable>
          );
        })}
      </View>

      {phase === "answered" && current && correctMeta && (
        <View
          style={[
            styles.feedback,
            {
              borderColor: isCorrect ? colors.success : colors.errorText,
              backgroundColor: isCorrect ? "rgba(22,163,74,0.08)" : colors.errorBg,
            },
          ]}
        >
          <Text style={styles.feedbackTitle}>
            {isCorrect ? "Nice." : `That was ${intervalName(correctMeta, mode)}.`}
          </Text>
          <Text style={styles.feedbackBody}>
            {noteLabel(current.rootNote)} → {noteLabel(current.targetNote)} ·{" "}
            {mode === "sargam"
              ? correctMeta.famousIndianTune ??
                correctMeta.famousTune ??
                `${correctMeta.semitones} semitones`
              : correctMeta.famousTune ?? `${correctMeta.semitones} semitones`}
          </Text>
          <Pressable style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {qIndex + 1 < questions.length ? "Next" : "See results"}
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#f8fafc" />
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

type SummaryProps = {
  results: QuestionResult[];
  onAgain: () => void;
  onHome: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
  mode: LabelMode;
};

function Summary({ results, onAgain, onHome, styles, colors, mode }: SummaryProps) {
  const correctCount = results.filter((r) => r.correct).length;
  const total = results.length;
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const sorted = [...results.map((r) => r.responseMs)].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;

  const byInterval = new Map<string, { right: number; wrong: number }>();
  for (const r of results) {
    const cur = byInterval.get(r.short) ?? { right: 0, wrong: 0 };
    if (r.correct) cur.right++;
    else cur.wrong++;
    byInterval.set(r.short, cur);
  }
  const missed = Array.from(byInterval.entries())
    .filter(([, v]) => v.wrong > 0)
    .sort((a, b) => b[1].wrong - a[1].wrong)[0];
  const nailed = Array.from(byInterval.entries())
    .filter(([, v]) => v.right > 0 && v.wrong === 0)[0];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={[styles.scoreCard, webShadow]}>
        <Text style={styles.scoreEyebrow}>Session complete</Text>
        <Text style={styles.scoreBig}>
          {correctCount}
          <Text style={styles.scoreSlash}> / {total}</Text>
        </Text>
        <Text style={styles.scorePct}>{pct}% accuracy</Text>
        <View style={styles.scoreMetaRow}>
          <View style={styles.scoreMeta}>
            <Text style={styles.scoreMetaLabel}>Median time</Text>
            <Text style={styles.scoreMetaValue}>{(median / 1000).toFixed(1)}s</Text>
          </View>
          {missed && (
            <View style={styles.scoreMeta}>
              <Text style={styles.scoreMetaLabel}>Trickiest</Text>
              <Text style={styles.scoreMetaValue}>
                {(() => {
                  const m = metaFor(missed[0]);
                  return m ? intervalName(m, mode) : missed[0];
                })()}
              </Text>
            </View>
          )}
          {nailed && !missed && (
            <View style={styles.scoreMeta}>
              <Text style={styles.scoreMetaLabel}>Cleanest</Text>
              <Text style={styles.scoreMetaValue}>
                {(() => {
                  const m = metaFor(nailed[0]);
                  return m ? intervalName(m, mode) : nailed[0];
                })()}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.summaryActions}>
        <Pressable style={styles.primaryBtn} onPress={onAgain}>
          <Ionicons name="play" size={16} color="#f8fafc" />
          <Text style={styles.primaryBtnText}>Drill again</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtnText} onPress={onHome}>
          <Ionicons name="home-outline" size={14} color={colors.textMuted} />
          <Text style={styles.secondaryBtnLabel}>Back to library</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    scroll: { flex: 1, backgroundColor: c.bg },
    content: {
      padding: space.lg,
      paddingBottom: space.xxl + space.sm,
      gap: space.lg,
      maxWidth: 720,
      width: "100%",
      alignSelf: "center",
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.bg,
    },
    muted: { color: c.textDim, fontSize: 13 },

    progressRow: { flexDirection: "row", gap: 6 },
    progressDot: { flex: 1, height: 6, borderRadius: 3 },

    counterRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    counter: { ...type_.overline, color: c.textDim },
    counterRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
    },
    dronePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 4,
      paddingHorizontal: 9,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    dronePillText: {
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 0.2,
    },

    audioWarn: {
      backgroundColor: c.warnSoft,
      borderLeftWidth: 3,
      borderLeftColor: c.warn,
      padding: space.md,
      borderRadius: radius.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
    },
    audioWarnText: { color: c.warnText, fontSize: 12, lineHeight: 17, flex: 1 },

    stage: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: space.xl,
      alignItems: "center",
      gap: space.md,
    },
    stageLabel: {
      ...type_.heading,
      color: c.text,
      textAlign: "center",
    },
    replayBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: radius.pill,
      backgroundColor: c.accentTint,
      borderWidth: 1,
      borderColor: c.accentTintBorder,
    },
    replayText: {
      color: c.accentBright,
      fontSize: 14,
      fontWeight: "700",
    },

    choices: { gap: space.sm },
    choice: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
      padding: space.md,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.border,
    },
    choiceSwatch: {
      width: 14,
      height: 14,
      borderRadius: 4,
    },
    choiceShort: {
      color: c.text,
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: -0.2,
    },
    choiceName: { color: c.textMuted, fontSize: 12, fontWeight: "600" },

    feedback: {
      borderWidth: 1.5,
      borderRadius: radius.md,
      padding: space.md + 2,
      gap: 4,
    },
    feedbackTitle: { color: c.text, fontSize: 15, fontWeight: "800" },
    feedbackBody: { color: c.textMuted, fontSize: 13 },
    nextBtn: {
      marginTop: space.sm,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.accent,
      paddingVertical: 9,
      paddingHorizontal: 16,
      borderRadius: radius.pill,
    },
    nextBtnText: { color: "#f8fafc", fontSize: 13, fontWeight: "700" },

    scoreCard: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.lg + 2,
      padding: space.xl,
      alignItems: "center",
      gap: 4,
    },
    scoreEyebrow: {
      ...type_.overline,
      color: c.textDim,
      marginBottom: space.xs,
    },
    scoreBig: {
      color: c.text,
      fontSize: 56,
      fontWeight: "900",
      letterSpacing: -2,
    },
    scoreSlash: {
      color: c.textDim,
      fontSize: 28,
      fontWeight: "700",
    },
    scorePct: {
      color: c.accentBright,
      fontSize: 16,
      fontWeight: "800",
      marginBottom: space.md,
    },
    scoreMetaRow: {
      flexDirection: "row",
      gap: space.lg,
      paddingTop: space.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
      width: "100%",
      justifyContent: "space-around",
    },
    scoreMeta: { alignItems: "center", gap: 2 },
    scoreMetaLabel: {
      ...type_.overline,
      color: c.textDim,
      fontSize: 10,
    },
    scoreMetaValue: {
      color: c.text,
      fontSize: 14,
      fontWeight: "700",
    },

    summaryActions: { gap: space.sm },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space.sm,
      backgroundColor: c.accent,
      paddingVertical: 12,
      borderRadius: radius.md,
    },
    primaryBtnText: { color: "#f8fafc", fontSize: 14, fontWeight: "700" },
    secondaryBtnText: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
    },
    secondaryBtnLabel: {
      color: c.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
  });
