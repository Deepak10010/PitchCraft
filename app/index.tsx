import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PRESET_MELODIES, type Melody } from "../lib/melodies";
import { loadCustomMelodies, deleteCustomMelody } from "../lib/storage";
import { IntervalFingerprint } from "../components/IntervalFingerprint";
import { useTheme } from "../theme/ThemeContext";
import { space, radius, type as type_, type ThemeColors } from "../theme/tokens";

export default function Home() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [custom, setCustom] = useState<Melody[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadCustomMelodies().then((ms) => {
        if (active) setCustom(ms);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const open = (id: string) => router.push({ pathname: "/decoder", params: { id } });

  const confirmDelete = (m: Melody) => {
    const go = async () => {
      await deleteCustomMelody(m.id);
      setCustom((cur) => cur.filter((x) => x.id !== m.id));
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${m.title}"?`)) go();
    } else {
      Alert.alert("Delete tune?", m.title, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: go },
      ]);
    }
  };

  const noteCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[colors.heroFrom, colors.heroVia, colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroBadge}>
          <Ionicons name="musical-notes" size={14} color={colors.accentBright} />
          <Text style={styles.heroBadgeText}>PitchCraft</Text>
        </View>
        <Text style={styles.heroTitle}>Every melody is a flashcard.</Text>
        <Text style={styles.heroSub}>
          Tap any tune. Tap note #2 — you'll hear note #1 and #2 back to back so your
          ear feels the leap. The coloured lines name every interval in the melody.
        </Text>
      </LinearGradient>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>Your tunes</Text>
          <Pressable style={styles.addBtn} onPress={() => router.push("/custom")}>
            <Ionicons name="add" size={16} color={colors.accentBright} />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {custom.length === 0 ? (
          <Pressable style={styles.emptyCard} onPress={() => router.push("/custom")}>
            <Ionicons name="create-outline" size={28} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No tunes yet</Text>
            <Text style={styles.emptySub}>
              Tap to add a melody. Hum it, type the notes, and it becomes your flashcard.
            </Text>
          </Pressable>
        ) : (
          custom.map((m) => (
            <View key={m.id} style={styles.customCard}>
              <Pressable style={styles.cardMain} onPress={() => open(m.id)}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {m.title}
                  </Text>
                  <View style={styles.noteCountPill}>
                    <Text style={styles.noteCountText}>{noteCount(m.notes)}♪</Text>
                  </View>
                </View>
                {m.hint ? (
                  <Text style={styles.cardHint} numberOfLines={2}>
                    {m.hint}
                  </Text>
                ) : null}
                <IntervalFingerprint notes={m.notes} />
              </Pressable>
              <View style={styles.customActions}>
                <Pressable
                  style={styles.iconAction}
                  onPress={() =>
                    router.push({ pathname: "/custom", params: { id: m.id } })
                  }
                >
                  <Ionicons name="create-outline" size={16} color={colors.editText} />
                  <Text style={styles.iconActionText}>Edit</Text>
                </Pressable>
                <View style={styles.actionDivider} />
                <Pressable style={styles.iconAction} onPress={() => confirmDelete(m)}>
                  <Ionicons name="trash-outline" size={16} color={colors.deleteText} />
                  <Text style={[styles.iconActionText, { color: colors.deleteText }]}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Library</Text>
        {PRESET_MELODIES.map((m) => (
          <Pressable key={m.id} style={styles.card} onPress={() => open(m.id)}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {m.title}
              </Text>
              <View style={styles.noteCountPill}>
                <Text style={styles.noteCountText}>{noteCount(m.notes)}♪</Text>
              </View>
            </View>
            <Text style={styles.cardHint} numberOfLines={2}>
              {m.hint}
            </Text>
            <IntervalFingerprint notes={m.notes} />
          </Pressable>
        ))}
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
      gap: space.xl,
      maxWidth: 720,
      width: "100%",
      alignSelf: "center",
    },
    hero: {
      padding: space.xl,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      gap: space.sm,
      overflow: "hidden",
    },
    heroBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: c.accentTint,
      borderWidth: 1,
      borderColor: c.accentTintBorder,
      marginBottom: space.sm,
    },
    heroBadgeText: {
      color: c.accentBright,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    heroTitle: { ...type_.display, color: c.text, lineHeight: 30 },
    heroSub: { ...type_.body, color: c.textMuted },
    section: { gap: space.md },
    sectionHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionLabel: { ...type_.overline, color: c.textDim },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: space.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: c.border,
    },
    addBtnText: { color: c.accentBright, fontSize: 12, fontWeight: "700" },
    card: {
      backgroundColor: c.surface,
      padding: space.lg - 2,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      gap: space.sm,
    },
    cardHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: space.sm,
    },
    cardTitle: { ...type_.heading, color: c.text, flex: 1 },
    cardHint: { ...type_.body, fontSize: 13, color: c.textMuted, lineHeight: 18 },
    noteCountPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: c.borderSoft,
    },
    noteCountText: { color: c.textMuted, fontSize: 11, fontWeight: "700" },
    customCard: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    cardMain: { padding: space.lg - 2, gap: space.sm },
    customActions: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    iconAction: {
      flex: 1,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    iconActionText: { color: c.editText, fontSize: 13, fontWeight: "600" },
    actionDivider: { width: 1, backgroundColor: c.border },
    emptyCard: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: c.border,
      padding: space.xl,
      alignItems: "center",
      gap: space.sm,
    },
    emptyTitle: { ...type_.heading, color: c.text },
    emptySub: {
      ...type_.body,
      color: c.textMuted,
      textAlign: "center",
      fontSize: 13,
    },
  });
