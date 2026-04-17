import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PRESET_MELODIES, type Melody } from "../lib/melodies";
import { loadCustomMelodies } from "../lib/storage";
import {
  parseMelody,
  analyzeMelody,
  noteLabel,
  INTERVALS,
  intervalHistogram,
} from "../lib/intervals";
import { StaffView } from "../components/StaffView";
import { PianoView } from "../components/PianoView";
import { GuitarView } from "../components/GuitarView";
import { ViewToggle, type ViewMode } from "../components/ViewToggle";
import { RoleLegend } from "../components/RoleLegend";
import { IntervalBreakdown } from "../components/IntervalBreakdown";
import { playNote, playInterval, playMelody, audioAvailable, type Voice } from "../lib/audio";
import { useTheme } from "../theme/ThemeContext";
import { space, radius, type as type_, type ThemeColors } from "../theme/tokens";

export default function Decoder() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const [melody, setMelody] = useState<Melody | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [highlightInterval, setHighlightInterval] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("staff");
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const cancelPlaybackRef = useRef<() => void>(() => {});

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const preset = PRESET_MELODIES.find((m) => m.id === id);
      if (preset) {
        setMelody(preset);
        return;
      }
      loadCustomMelodies().then((ms) => {
        if (active) setMelody(ms.find((m) => m.id === id) ?? null);
      });
      return () => {
        active = false;
      };
    }, [id])
  );

  useEffect(() => () => cancelPlaybackRef.current?.(), []);

  const notes = useMemo(() => (melody ? parseMelody(melody.notes) : []), [melody]);
  const steps = useMemo(() => analyzeMelody(notes), [notes]);
  const voice: Voice = viewMode === "guitar" ? "guitar" : "piano";

  const topInterval = useMemo(() => {
    if (steps.length === 0) return null;
    const hist = intervalHistogram(steps);
    const sorted = Array.from(hist.entries()).sort((a, b) => b[1] - a[1]);
    const [short, count] = sorted[0];
    const meta = Object.values(INTERVALS).find((i) => i.short === short);
    return meta ? { meta, count } : null;
  }, [steps]);

  const handleTapNote = (i: number) => {
    cancelPlaybackRef.current?.();
    setIsPlaying(false);
    setActiveIndex(i);
    if (i === 0) {
      playNote(notes[0], voice);
    } else {
      playInterval(notes[i - 1], notes[i], voice);
    }
  };

  const handlePlayAll = () => {
    cancelPlaybackRef.current?.();
    if (isPlaying) {
      setIsPlaying(false);
      setActiveIndex(null);
      return;
    }
    setIsPlaying(true);
    setActiveIndex(null);
    cancelPlaybackRef.current = playMelody(
      notes,
      voice,
      0.5 / speed,
      0.06 / speed,
      (idx) => setActiveIndex(idx),
      () => {
        setActiveIndex(null);
        setIsPlaying(false);
      }
    );
  };

  const handleDrillInterval = (short: string) => {
    setHighlightInterval((cur) => (cur === short ? null : short));
  };

  if (!melody) {
    return (
      <View style={styles.centered}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const audio = audioAvailable();
  const highlightedSteps = highlightInterval
    ? steps.map((s, i) => ({ s, i })).filter(({ s }) => s.interval.short === highlightInterval)
    : [];
  const voiceLabel = voice === "guitar" ? "Acoustic Guitar" : "Grand Piano";
  const voiceIcon: keyof typeof Ionicons.glyphMap =
    voice === "guitar" ? "musical-note" : "musical-notes";
  const tonicLabel = notes[0] ? noteLabel(notes[0]) : "—";

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{melody.title}</Text>
        {melody.hint ? <Text style={styles.hint}>{melody.hint}</Text> : null}

        <View style={styles.metaRow}>
          <View style={[styles.metaChip, styles.metaKey]}>
            <View style={styles.keyDot} />
            <Text style={styles.metaChipLabel}>Key</Text>
            <Text style={styles.metaChipValue}>{tonicLabel}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="ellipse" size={8} color={colors.textDim} />
            <Text style={styles.metaChipLabel}>Notes</Text>
            <Text style={styles.metaChipValue}>{notes.length}</Text>
          </View>
          {topInterval && (
            <View style={styles.metaChip}>
              <View
                style={[
                  styles.metaChipSwatch,
                  { backgroundColor: topInterval.meta.color },
                ]}
              />
              <Text style={styles.metaChipLabel}>Mostly</Text>
              <Text style={styles.metaChipValue}>{topInterval.meta.short}</Text>
            </View>
          )}
        </View>
      </View>

      {!audio && (
        <View style={styles.audioWarn}>
          <Ionicons name="warning-outline" size={16} color={colors.warn} />
          <Text style={styles.audioWarnText}>
            Audio engine not available. Open this in a modern browser to hear playback.
          </Text>
        </View>
      )}

      <View style={styles.viewRow}>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </View>
      <RoleLegend baseNote={notes[0] ?? null} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.staffScroll}
      >
        {viewMode === "staff" && (
          <StaffView notes={notes} activeIndex={activeIndex} onTapNote={handleTapNote} />
        )}
        {viewMode === "piano" && (
          <PianoView notes={notes} activeIndex={activeIndex} onTapNote={handleTapNote} />
        )}
        {viewMode === "guitar" && (
          <GuitarView notes={notes} activeIndex={activeIndex} onTapNote={handleTapNote} />
        )}
      </ScrollView>

      <View style={styles.controls}>
        <Pressable style={styles.primaryBtn} onPress={handlePlayAll}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={16} color="#f8fafc" />
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryBtnText}>
              {isPlaying ? "Pause" : "Play full melody"}
            </Text>
            <View style={styles.primaryBtnMeta}>
              <Ionicons name={voiceIcon} size={10} color="#bfdbfe" />
              <Text style={styles.primaryBtnMetaText}>{voiceLabel}</Text>
            </View>
          </View>
        </Pressable>
        <Pressable
          style={styles.secondaryBtn}
          onPress={() => {
            cancelPlaybackRef.current?.();
            setIsPlaying(false);
            setActiveIndex(null);
          }}
        >
          <Ionicons name="stop" size={14} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.speedRow}>
        <Text style={styles.speedLabel}>Speed</Text>
        {[0.5, 0.75, 1, 1.5].map((s) => (
          <Pressable
            key={s}
            onPress={() => setSpeed(s)}
            style={[styles.speedPill, speed === s && styles.speedPillActive]}
          >
            <Text
              style={[
                styles.speedPillText,
                speed === s && styles.speedPillTextActive,
              ]}
            >
              {s === 1 ? "1×" : `${s}×`}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.noteStrip}>
        <Text style={styles.stripLabel}>Notes</Text>
        <View style={styles.chipRow}>
          {notes.map((n, i) => (
            <Pressable
              key={i}
              style={[styles.chip, activeIndex === i && styles.chipActive]}
              onPress={() => handleTapNote(i)}
            >
              <Text style={styles.chipIndex}>{i + 1}</Text>
              <Text style={styles.chipLabel}>{noteLabel(n)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <IntervalBreakdown steps={steps} onDrillInterval={handleDrillInterval} />

      {highlightInterval && (
        <View style={styles.drillBox}>
          <View style={styles.drillHead}>
            <Ionicons name="flash" size={14} color={colors.accentBright} />
            <Text style={styles.drillTitle}>
              Drill: {INTERVALS[semitonesFor(highlightInterval)]?.name ?? highlightInterval}
            </Text>
            <Pressable
              onPress={() => setHighlightInterval(null)}
              style={styles.drillClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={14} color={colors.textDim} />
            </Pressable>
          </View>
          {highlightedSteps.length === 0 ? (
            <Text style={styles.muted}>Not present in this melody.</Text>
          ) : (
            <View style={styles.drillButtons}>
              {highlightedSteps.map(({ s, i }) => (
                <Pressable
                  key={i}
                  style={styles.drillBtn}
                  onPress={() => {
                    cancelPlaybackRef.current?.();
                    setActiveIndex(i);
                    playInterval(s.from, s.to, voice);
                  }}
                >
                  <Ionicons name="play-skip-forward" size={12} color={colors.editText} />
                  <Text style={styles.drillBtnText}>
                    {noteLabel(s.from)} → {noteLabel(s.to)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function semitonesFor(short: string): number {
  const entry = Object.entries(INTERVALS).find(([, v]) => v.short === short);
  return entry ? parseInt(entry[0], 10) : 0;
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    scroll: { flex: 1, backgroundColor: c.bg },
    content: {
      padding: space.lg,
      paddingBottom: space.xxl + space.sm,
      gap: space.lg,
      maxWidth: 820,
      width: "100%",
      alignSelf: "center",
    },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg },
    muted: { color: c.textDim, fontSize: 13 },
    header: { gap: space.sm },
    title: { ...type_.title, color: c.text, fontSize: 22 },
    hint: { ...type_.body, color: c.textMuted },
    metaRow: { flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.xs },
    metaChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: radius.pill,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    metaKey: { borderColor: c.goldTintBorder, backgroundColor: c.goldTint },
    keyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.gold },
    metaChipLabel: { color: c.textDim, fontSize: 11, fontWeight: "600" },
    metaChipValue: { color: c.text, fontSize: 12, fontWeight: "700" },
    metaChipSwatch: { width: 8, height: 8, borderRadius: 2 },
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
    viewRow: { flexDirection: "row" },
    staffScroll: { marginHorizontal: -space.lg, paddingHorizontal: space.lg },
    controls: { flexDirection: "row", gap: space.sm },
    primaryBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
      backgroundColor: c.accent,
      paddingVertical: 11,
      paddingHorizontal: space.lg,
      borderRadius: radius.md,
    },
    primaryBtnText: { color: "#f8fafc", fontSize: 14, fontWeight: "700" },
    primaryBtnMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
    primaryBtnMetaText: { color: "#bfdbfe", fontSize: 11, fontWeight: "600" },
    secondaryBtn: {
      paddingVertical: 11,
      paddingHorizontal: 16,
      borderRadius: radius.md,
      backgroundColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    speedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
    },
    speedLabel: {
      ...type_.overline,
      color: c.textDim,
      marginRight: 4,
    },
    speedPill: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: radius.pill,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    speedPillActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    speedPillText: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: "700",
    },
    speedPillTextActive: {
      color: "#f8fafc",
    },
    noteStrip: { gap: space.sm },
    stripLabel: { ...type_.overline, color: c.textDim },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.surface,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { borderColor: c.chipActiveBorder, backgroundColor: c.chipActiveBg },
    chipIndex: { color: c.textDim, fontSize: 11, fontWeight: "700" },
    chipLabel: { color: c.text, fontSize: 13, fontWeight: "600" },
    drillBox: {
      backgroundColor: c.surfaceElevated,
      padding: space.md + 2,
      borderRadius: radius.md,
      gap: space.sm,
    },
    drillHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
    drillTitle: { color: c.text, fontSize: 14, fontWeight: "700", flex: 1 },
    drillClose: { padding: 2 },
    drillButtons: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
    drillBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.border,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: radius.sm,
    },
    drillBtnText: { color: c.editText, fontSize: 13, fontWeight: "600" },
  });
