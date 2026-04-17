import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { micSupported, startMicSession, type MicSession } from "../lib/mic";
import {
  segmentToNotes,
  notesToString,
  midiLabel,
  type PitchSample,
} from "../lib/transcribe";
import type { Note } from "../lib/intervals";
import { useTheme } from "../theme/ThemeContext";
import { radius, space, type as type_, type ThemeColors } from "../theme/tokens";

type Status = "idle" | "requesting" | "recording" | "processing";

type Props = {
  onDetected: (notesString: string, notes: Note[]) => void;
};

export function HumRecorder({ onDetected }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [currentMidi, setCurrentMidi] = useState<number | null>(null);
  const [clarity, setClarity] = useState(0);
  const [noteCount, setNoteCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const sessionRef = useRef<MicSession | null>(null);
  const startRef = useRef<number>(0);
  const partialSamplesRef = useRef<PitchSample[]>([]);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      sessionRef.current?.stop();
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, []);

  const start = async () => {
    if (!micSupported()) {
      setStatus("idle");
      setErrMsg("Microphone only available in a web browser.");
      return;
    }
    setErrMsg(null);
    setCurrentMidi(null);
    setClarity(0);
    setNoteCount(0);
    setElapsed(0);
    partialSamplesRef.current = [];
    setStatus("requesting");
    try {
      const session = await startMicSession();
      sessionRef.current = session;
      startRef.current = Date.now();
      session.onSample((s) => {
        partialSamplesRef.current.push(s);
        if (s.midi !== null && s.clarity >= 0.72) {
          setCurrentMidi(s.midi);
          setClarity(s.clarity);
        } else {
          setClarity((c) => c * 0.6);
        }
      });
      tickerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 100) / 10);
        const live = segmentToNotes(partialSamplesRef.current);
        setNoteCount(live.length);
      }, 150);
      setStatus("recording");
    } catch (e: any) {
      setStatus("idle");
      setErrMsg(
        e?.name === "NotAllowedError"
          ? "Mic permission denied. Enable it in your browser settings."
          : e?.message || "Couldn't start the microphone."
      );
    }
  };

  const stop = () => {
    if (!sessionRef.current) return;
    setStatus("processing");
    const samples = sessionRef.current.stop();
    sessionRef.current = null;
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    const notes = segmentToNotes(samples);
    if (notes.length === 0) {
      setStatus("idle");
      setErrMsg(
        samples.length === 0
          ? "No audio captured. Check your mic is on and try again."
          : "Didn't pick up a clear pitch. Hum louder, closer to the mic, in short clean notes — not sliding."
      );
      return;
    }
    onDetected(notesToString(notes), notes);
    setErrMsg(
      notes.length === 1
        ? "Only caught 1 note — you can add more, or hum again."
        : null
    );
    setStatus("idle");
  };

  const cancel = () => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    setStatus("idle");
    setErrMsg(null);
  };

  if (!micSupported()) {
    return (
      <View style={styles.unsupported}>
        <Ionicons name="mic-off" size={14} color={colors.textDim} />
        <Text style={styles.unsupportedText}>
          Humming needs a web browser (mic API not available on native).
        </Text>
      </View>
    );
  }

  if (status === "idle") {
    return (
      <View>
        <Pressable style={styles.startBtn} onPress={start}>
          <Ionicons name="mic" size={16} color={colors.accentBright} />
          <Text style={styles.startBtnText}>Hum it in</Text>
        </Pressable>
        {errMsg && (
          <View style={styles.errBox}>
            <Ionicons name="alert-circle-outline" size={13} color={colors.errorText} />
            <Text style={styles.errText}>{errMsg}</Text>
          </View>
        )}
      </View>
    );
  }

  if (status === "requesting") {
    return (
      <View style={styles.liveCard}>
        <Text style={styles.liveLabel}>
          <Ionicons name="hourglass-outline" size={13} color={colors.textMuted} />{" "}
          Waiting for mic permission…
        </Text>
      </View>
    );
  }

  const label = currentMidi !== null ? midiLabel(currentMidi) : "—";
  const meter = Math.min(1, Math.max(0, clarity));

  return (
    <View style={styles.liveCard}>
      <View style={styles.liveHead}>
        <View style={styles.recDot} />
        <Text style={styles.liveLabel}>Recording</Text>
        <Text style={styles.liveElapsed}>{elapsed.toFixed(1)}s</Text>
      </View>

      <View style={styles.pitchRow}>
        <Text style={styles.pitchNote}>{label}</Text>
        <View style={styles.meterTrack}>
          <View
            style={[
              styles.meterFill,
              {
                width: `${meter * 100}%`,
                backgroundColor:
                  meter > 0.9
                    ? "#22c55e"
                    : meter > 0.7
                    ? "#eab308"
                    : colors.textDim,
              },
            ]}
          />
        </View>
      </View>

      <Text style={styles.liveDetails}>
        {noteCount > 0
          ? `${noteCount} note${noteCount === 1 ? "" : "s"} detected so far`
          : "Hum a melody. Clean pauses between notes help."}
      </Text>

      <View style={styles.liveActions}>
        <Pressable style={styles.cancelBtn} onPress={cancel}>
          <Ionicons name="close" size={14} color={colors.textMuted} />
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.doneBtn} onPress={stop}>
          <Ionicons name="checkmark" size={14} color="#f0fdf4" />
          <Text style={styles.doneText}>Stop & decode</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    startBtn: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
      backgroundColor: c.accentTint,
      borderWidth: 1,
      borderColor: c.accentTintBorder,
    },
    startBtnText: { color: c.accentBright, fontSize: 13, fontWeight: "700" },
    liveCard: {
      backgroundColor: c.surfaceElevated,
      borderRadius: radius.md,
      padding: space.md + 2,
      gap: space.sm,
      borderWidth: 1,
      borderColor: c.border,
    },
    liveHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    recDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: "#ef4444",
    },
    liveLabel: { ...type_.caption, color: c.text, flex: 1 },
    liveElapsed: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    pitchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
    },
    pitchNote: {
      color: c.text,
      fontSize: 18,
      fontWeight: "800",
      minWidth: 52,
      letterSpacing: -0.3,
    },
    meterTrack: {
      flex: 1,
      height: 8,
      backgroundColor: c.border,
      borderRadius: 4,
      overflow: "hidden",
    },
    meterFill: { height: "100%", borderRadius: 4 },
    liveDetails: { color: c.textMuted, fontSize: 12 },
    liveActions: {
      flexDirection: "row",
      gap: space.sm,
      marginTop: space.xs,
      alignSelf: "flex-start",
    },
    cancelBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: space.md,
      borderRadius: radius.sm,
      backgroundColor: c.border,
    },
    cancelText: { color: c.textMuted, fontSize: 12, fontWeight: "600" },
    doneBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: space.md + 2,
      borderRadius: radius.sm,
      backgroundColor: c.success,
    },
    doneText: { color: "#f0fdf4", fontSize: 12, fontWeight: "700" },
    unsupported: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: radius.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    unsupportedText: { color: c.textDim, fontSize: 12, flex: 1 },
    errBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: space.sm,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: radius.sm,
      backgroundColor: c.errorBg,
      borderWidth: 1,
      borderColor: c.errorBorder,
    },
    errText: { color: c.errorText, fontSize: 12, flex: 1 },
  });
