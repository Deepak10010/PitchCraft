import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { parseMelody, analyzeMelody, type NoteTiming } from "../lib/intervals";
import {
  saveCustomMelody,
  newMelodyId,
  loadCustomMelodies,
  deleteCustomMelody,
} from "../lib/storage";
import { StaffView } from "../components/StaffView";
import { PianoView } from "../components/PianoView";
import { GuitarView } from "../components/GuitarView";
import { ViewToggle, type ViewMode } from "../components/ViewToggle";
import { RoleLegend } from "../components/RoleLegend";
import { IntervalBreakdown } from "../components/IntervalBreakdown";
import { HumRecorder } from "../components/HumRecorder";
import { playInterval, playMelody, playNote, type Voice } from "../lib/audio";
import { useTheme } from "../theme/ThemeContext";
import { space, radius, type as type_, type ThemeColors } from "../theme/tokens";

const EXAMPLES = [
  { label: "Twinkle Twinkle", notes: "C4 C4 G4 G4 A4 A4 G4" },
  { label: "Mary Had a Little Lamb", notes: "E4 D4 C4 D4 E4 E4 E4" },
  { label: "Chromatic climb", notes: "C4 C#4 D4 D#4 E4 F4" },
];

export default function Custom() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { id: paramId } = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof paramId === "string" ? paramId : null;

  const [title, setTitle] = useState("");
  const [hint, setHint] = useState("");
  const [notesRaw, setNotesRaw] = useState("C4 E4 G4 C5");
  const [timings, setTimings] = useState<NoteTiming[] | null>(null);
  const [preview, setPreview] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("staff");
  const [loadedForId, setLoadedForId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const cancelPlaybackRef = useRef<() => void>(() => {});

  useEffect(() => () => cancelPlaybackRef.current?.(), []);
  useEffect(() => {
    // cancel any running playback if the notes edit
    cancelPlaybackRef.current?.();
    setIsPlaying(false);
    setPreview(null);
  }, [notesRaw]);

  useEffect(() => {
    let active = true;
    if (!editingId) return;
    loadCustomMelodies().then((ms) => {
      if (!active) return;
      const found = ms.find((m) => m.id === editingId);
      if (found) {
        setTitle(found.title);
        setHint(found.hint);
        setNotesRaw(found.notes);
        setTimings(found.timings ?? null);
        setLoadedForId(editingId);
      }
    });
    return () => {
      active = false;
    };
  }, [editingId]);

  const notes = useMemo(() => parseMelody(notesRaw), [notesRaw]);
  const steps = useMemo(() => analyzeMelody(notes), [notes]);
  const voice: Voice = viewMode === "guitar" ? "guitar" : "piano";

  const handleTapNote = useCallback(
    (i: number) => {
      cancelPlaybackRef.current?.();
      setIsPlaying(false);
      setPreview(i);
      if (i === 0) playNote(notes[0], voice);
      else playInterval(notes[i - 1], notes[i], voice);
    },
    [notes, voice]
  );

  const handlePlayAll = () => {
    cancelPlaybackRef.current?.();
    if (isPlaying) {
      setIsPlaying(false);
      setPreview(null);
      return;
    }
    if (notes.length < 1) return;
    setIsPlaying(true);
    setPreview(null);
    const scaledTimings =
      timings && timings.length === notes.length
        ? timings.map((t) => ({
            startSec: t.startSec / speed,
            durationSec: t.durationSec / speed,
          }))
        : undefined;
    cancelPlaybackRef.current = playMelody(
      notes,
      voice,
      0.5 / speed,
      0.06 / speed,
      (idx) => setPreview(idx),
      () => {
        setPreview(null);
        setIsPlaying(false);
      },
      scaledTimings
    );
  };

  const handleStop = () => {
    cancelPlaybackRef.current?.();
    setIsPlaying(false);
    setPreview(null);
  };

  const save = async () => {
    setErr(null);
    if (notes.length < 2) {
      setErr("Need at least 2 valid notes (e.g. C4 E4).");
      return;
    }
    if (!title.trim()) {
      setErr("Give your tune a title.");
      return;
    }
    // Only persist timings when they line up with the parsed notes; if the user
    // edited the text and the counts diverged, the saved rhythm would be wrong.
    const validTimings =
      timings && timings.length === notes.length ? timings : undefined;
    await saveCustomMelody({
      id: editingId ?? newMelodyId(),
      title: title.trim(),
      hint: hint.trim(),
      notes: notesRaw.trim(),
      builtin: false,
      timings: validTimings,
    });
    router.back();
  };

  const confirmDelete = () => {
    if (!editingId) return;
    const go = async () => {
      await deleteCustomMelody(editingId);
      router.back();
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${title || "this tune"}"?`)) go();
    } else {
      Alert.alert("Delete tune?", title, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: go },
      ]);
    }
  };

  const isEditing = editingId !== null && loadedForId === editingId;
  const headerTitle = editingId ? "Edit tune" : "Add your own tune";

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{headerTitle}</Text>
        <Text style={styles.help}>
          Type notes separated by spaces. Format: note + octave, e.g.{" "}
          <Text style={styles.code}>C4</Text>, <Text style={styles.code}>F#3</Text>,{" "}
          <Text style={styles.code}>Bb5</Text>.
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Happy Birthday"
          placeholderTextColor={colors.placeholder}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Hint (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. A melody my grandma sings"
          placeholderTextColor={colors.placeholder}
          value={hint}
          onChangeText={setHint}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Notes</Text>
        <HumRecorder
          onDetected={(notesString, _notes, detectedTimings) => {
            setNotesRaw(notesString);
            setTimings(
              detectedTimings && detectedTimings.length > 0
                ? detectedTimings
                : null
            );
          }}
        />
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="C4 E4 G4 C5"
          placeholderTextColor={colors.placeholder}
          value={notesRaw}
          onChangeText={(t) => {
            setNotesRaw(t);
            // Manual edit invalidates the captured rhythm.
            setTimings(null);
          }}
          autoCapitalize="characters"
          multiline
        />
        <View style={styles.exampleRow}>
          {EXAMPLES.map((ex) => (
            <Pressable
              key={ex.label}
              style={styles.examplePill}
              onPress={() => {
                setNotesRaw(ex.notes);
                setTimings(null);
                if (!title) setTitle(ex.label);
              }}
            >
              <Text style={styles.examplePillText}>{ex.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {notes.length >= 2 && (
        <>
          <Text style={styles.previewLabel}>Preview</Text>
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <RoleLegend baseNote={notes[0] ?? null} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffScroll}>
            {viewMode === "staff" && (
              <StaffView notes={notes} activeIndex={preview} onTapNote={handleTapNote} />
            )}
            {viewMode === "piano" && (
              <PianoView notes={notes} activeIndex={preview} onTapNote={handleTapNote} />
            )}
            {viewMode === "guitar" && (
              <GuitarView notes={notes} activeIndex={preview} onTapNote={handleTapNote} />
            )}
          </ScrollView>

          <View style={styles.playControls}>
            <Pressable style={styles.playBtn} onPress={handlePlayAll}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={14}
                color="#f8fafc"
              />
              <Text style={styles.playBtnText}>
                {isPlaying ? "Pause" : "Play"}
              </Text>
            </Pressable>
            <Pressable style={styles.stopBtn} onPress={handleStop}>
              <Ionicons name="stop" size={12} color={colors.textMuted} />
            </Pressable>
            <View style={styles.speedRow}>
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
          </View>

          <IntervalBreakdown steps={steps} />
        </>
      )}

      {err && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.errorText} />
          <Text style={styles.error}>{err}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={14} color={colors.textMuted} />
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.saveBtn} onPress={save}>
          <Ionicons
            name={isEditing ? "checkmark-done" : "save"}
            size={14}
            color="#f0fdf4"
          />
          <Text style={styles.saveBtnText}>
            {isEditing ? "Update tune" : "Save tune"}
          </Text>
        </Pressable>
      </View>

      {isEditing && (
        <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={14} color={colors.deleteText} />
          <Text style={styles.deleteBtnText}>Delete this tune</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    scroll: { flex: 1, backgroundColor: c.bg },
    content: {
      padding: space.lg,
      paddingBottom: space.xxl + space.xxl,
      gap: space.lg,
      maxWidth: 1200,
      width: "100%",
      alignSelf: "center",
    },
    header: { gap: 6 },
    title: { ...type_.title, color: c.text },
    help: { ...type_.body, color: c.textMuted, fontSize: 13 },
    code: {
      fontFamily: Platform.select({
        ios: "Menlo",
        android: "monospace",
        default: "monospace",
      }),
      color: c.accentBright,
    },
    field: { gap: 6 },
    label: { ...type_.overline, color: c.textDim },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radius.sm,
      padding: space.md,
      color: c.text,
      fontSize: 15,
    },
    notesInput: {
      minHeight: 70,
      fontFamily: Platform.select({
        ios: "Menlo",
        android: "monospace",
        default: "monospace",
      }),
      letterSpacing: 0.5,
    },
    exampleRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 4,
    },
    examplePill: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: c.border,
      borderRadius: radius.pill,
    },
    examplePillText: { color: c.textMuted, fontSize: 12, fontWeight: "600" },
    previewLabel: { ...type_.overline, color: c.textDim },
    playControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
      flexWrap: "wrap",
    },
    playBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radius.md,
      backgroundColor: c.accent,
    },
    playBtnText: {
      color: "#f8fafc",
      fontSize: 13,
      fontWeight: "700",
    },
    stopBtn: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: radius.md,
      backgroundColor: c.border,
      alignItems: "center",
      justifyContent: "center",
    },
    speedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginLeft: space.xs,
    },
    speedPill: {
      paddingVertical: 4,
      paddingHorizontal: 9,
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
      fontSize: 11,
      fontWeight: "700",
    },
    speedPillTextActive: {
      color: "#f8fafc",
    },
    staffScroll: { marginHorizontal: -space.lg, paddingHorizontal: space.lg },
    actions: { flexDirection: "row", gap: space.sm },
    cancelBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 11,
      paddingHorizontal: space.lg,
      borderRadius: radius.md,
      backgroundColor: c.border,
    },
    cancelBtnText: { color: c.textMuted, fontSize: 14, fontWeight: "600" },
    saveBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: c.success,
      paddingVertical: 11,
      borderRadius: radius.md,
    },
    saveBtnText: { color: "#f0fdf4", fontSize: 14, fontWeight: "700" },
    deleteBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 11,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      backgroundColor: c.dangerSoft,
    },
    deleteBtnText: { color: c.deleteText, fontSize: 14, fontWeight: "600" },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: radius.sm,
      backgroundColor: c.errorBg,
      borderWidth: 1,
      borderColor: c.errorBorder,
    },
    error: { color: c.errorText, fontSize: 13, flex: 1 },
  });
