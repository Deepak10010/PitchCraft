import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PRESET_MELODIES, type Melody } from "../lib/melodies";
import { loadCustomMelodies, deleteCustomMelody } from "../lib/storage";
import { IntervalFingerprint } from "../components/IntervalFingerprint";
import { INTERVALS } from "../lib/intervals";
import { useTheme } from "../theme/ThemeContext";
import { space, radius, type as type_, type ThemeColors } from "../theme/tokens";

const noteCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function intervalMeta(short?: string) {
  if (!short) return null;
  return Object.values(INTERVALS).find((i) => i.short === short) ?? null;
}

export default function Home() {
  const router = useRouter();
  const { colors } = useTheme();
  const { width: winW } = useWindowDimensions();
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

  // Featured tune rotates daily so the home page feels alive.
  const featured = useMemo(() => {
    const dayIndex = new Date().getDate() % PRESET_MELODIES.length;
    return PRESET_MELODIES[dayIndex];
  }, []);
  const libraryRest = PRESET_MELODIES.filter((m) => m.id !== featured.id);

  const isTwoCol = winW > 640;
  const gridCardStyle = isTwoCol ? styles.cardHalf : styles.cardFull;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Hero */}
      <LinearGradient
        colors={[colors.heroFrom, colors.heroVia, colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="musical-notes" size={14} color={colors.accentBright} />
            <Text style={styles.heroBadgeText}>PitchCraft</Text>
          </View>
          <View style={styles.heroDecor}>
            <Ionicons
              name="musical-note"
              size={26}
              color={colors.accentBright}
              style={{ opacity: 0.18 }}
            />
            <Ionicons
              name="musical-notes"
              size={44}
              color={colors.accentBright}
              style={{ opacity: 0.12, marginLeft: -10 }}
            />
          </View>
        </View>

        <Text style={styles.heroTitle}>Every melody is a flashcard.</Text>
        <Text style={styles.heroSub}>
          Tap any tune. Tap note #2 — you'll hear note #1 and #2 back to back so your
          ear feels the leap. The coloured lines name every interval.
        </Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{PRESET_MELODIES.length}</Text>
            <Text style={styles.heroStatLabel}>tunes</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>13</Text>
            <Text style={styles.heroStatLabel}>intervals</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>3</Text>
            <Text style={styles.heroStatLabel}>views</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Your tunes */}
      {custom.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.sectionHeadLeft}>
              <Text style={styles.sectionLabel}>Your tunes</Text>
              <Text style={styles.sectionCount}>· {custom.length}</Text>
            </View>
            <Pressable style={styles.addBtn} onPress={() => router.push("/custom")}>
              <Ionicons name="add" size={16} color={colors.accentBright} />
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>

          <View style={styles.grid}>
            {custom.map((m) => (
              <View key={m.id} style={[styles.customCard, gridCardStyle]}>
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
                    <Ionicons name="create-outline" size={15} color={colors.editText} />
                    <Text style={styles.iconActionText}>Edit</Text>
                  </Pressable>
                  <View style={styles.actionDivider} />
                  <Pressable style={styles.iconAction} onPress={() => confirmDelete(m)}>
                    <Ionicons
                      name="trash-outline"
                      size={15}
                      color={colors.deleteText}
                    />
                    <Text
                      style={[styles.iconActionText, { color: colors.deleteText }]}
                    >
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Featured */}
      {(() => {
        const meta = intervalMeta(featured.anchorInterval);
        return (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionHeadLeft}>
                <Ionicons name="sparkles" size={13} color={colors.gold} />
                <Text style={styles.sectionLabel}>Today's pick</Text>
              </View>
            </View>

            <Pressable
              style={[
                styles.featuredCard,
                meta && {
                  borderColor: meta.color,
                },
              ]}
              onPress={() => open(featured.id)}
            >
              <View style={styles.featuredAccent} />

              <View style={styles.featuredHead}>
                <View style={{ flex: 1 }}>
                  {meta && (
                    <View style={styles.featuredBadgeRow}>
                      <View
                        style={[
                          styles.intervalBadge,
                          { backgroundColor: meta.color },
                        ]}
                      >
                        <Text style={styles.intervalBadgeText}>{meta.short}</Text>
                      </View>
                      <Text style={styles.featuredBadgeLabel}>
                        Anchored on {meta.name}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.featuredTitle}>{featured.title}</Text>
                </View>
                <View style={styles.playCircle}>
                  <Ionicons name="play" size={16} color="#f8fafc" />
                </View>
              </View>

              <Text style={styles.featuredHint}>{featured.hint}</Text>

              <View style={{ height: 10 }}>
                <IntervalFingerprint notes={featured.notes} height={10} />
              </View>

              <View style={styles.featuredFooter}>
                <Text style={styles.featuredFooterText}>
                  {noteCount(featured.notes)} notes · tap to decode
                </Text>
                <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
              </View>
            </Pressable>
          </View>
        );
      })()}

      {/* Library grid */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <Text style={styles.sectionLabel}>Library</Text>
            <Text style={styles.sectionCount}>· {PRESET_MELODIES.length} tunes</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {libraryRest.map((m) => {
            const meta = intervalMeta(m.anchorInterval);
            return (
              <Pressable
                key={m.id}
                style={[styles.card, gridCardStyle]}
                onPress={() => open(m.id)}
              >
                <View style={styles.cardHead}>
                  {meta ? (
                    <View
                      style={[
                        styles.intervalBadge,
                        { backgroundColor: meta.color },
                      ]}
                    >
                      <Text style={styles.intervalBadgeText}>{meta.short}</Text>
                    </View>
                  ) : (
                    <View style={{ width: 8 }} />
                  )}
                  <Text style={styles.cardTitleGrid} numberOfLines={1}>
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
            );
          })}
        </View>
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
      maxWidth: 900,
      width: "100%",
      alignSelf: "center",
    },

    /* Hero */
    hero: {
      padding: space.xl,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      gap: space.sm,
      overflow: "hidden",
      position: "relative",
    },
    heroTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: space.xs,
    },
    heroBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: c.accentTint,
      borderWidth: 1,
      borderColor: c.accentTintBorder,
    },
    heroBadgeText: {
      color: c.accentBright,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    heroDecor: {
      flexDirection: "row",
      alignItems: "center",
    },
    heroTitle: {
      ...type_.display,
      color: c.text,
      fontSize: 26,
      lineHeight: 32,
    },
    heroSub: {
      ...type_.body,
      color: c.textMuted,
    },
    heroStats: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
      marginTop: space.md,
      paddingTop: space.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    heroStat: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 4,
    },
    heroStatValue: {
      color: c.text,
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    heroStatLabel: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    heroStatDivider: {
      width: 1,
      height: 18,
      backgroundColor: c.border,
    },

    /* Sections */
    section: { gap: space.md },
    sectionHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionHeadLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    sectionLabel: { ...type_.overline, color: c.textDim },
    sectionCount: {
      color: c.textDim,
      fontSize: 11,
      fontWeight: "600",
    },
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

    /* Grid */
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: space.md,
    },
    cardFull: {
      width: "100%",
    },
    cardHalf: {
      width: "48.5%",
      flexGrow: 1,
    },

    /* Regular library card */
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
      alignItems: "center",
      gap: space.sm,
    },
    cardTitle: {
      ...type_.heading,
      color: c.text,
      flex: 1,
    },
    cardTitleGrid: {
      ...type_.heading,
      color: c.text,
      flex: 1,
      fontSize: 14,
    },
    cardHint: {
      ...type_.body,
      fontSize: 13,
      color: c.textMuted,
      lineHeight: 18,
    },
    noteCountPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: c.borderSoft,
    },
    noteCountText: { color: c.textMuted, fontSize: 11, fontWeight: "700" },

    /* Interval badge on library cards */
    intervalBadge: {
      minWidth: 32,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    intervalBadgeText: {
      color: "#0b1020",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.2,
    },

    /* Custom tune card */
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

    /* Featured card */
    featuredCard: {
      backgroundColor: c.surface,
      padding: space.lg,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: c.border,
      gap: space.md,
      overflow: "hidden",
    },
    featuredAccent: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: 3,
      backgroundColor: c.gold,
    },
    featuredHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
    },
    featuredBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
    },
    featuredBadgeLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    featuredTitle: {
      ...type_.title,
      color: c.text,
      fontSize: 20,
    },
    featuredHint: {
      ...type_.body,
      fontSize: 13,
      color: c.textMuted,
      lineHeight: 19,
    },
    featuredFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 4,
    },
    featuredFooterText: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    playCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
  });
