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
import {
  loadProgress,
  overallAccuracy,
  weakestInterval,
  emptyProgress,
  type ProgressV1,
} from "../lib/progressStorage";
import { IntervalFingerprint } from "../components/IntervalFingerprint";
import {
  INTERVALS,
  parseMelody,
  analyzeMelody,
  intervalHistogram,
  intervalName,
  intervalShortLabel,
} from "../lib/intervals";
import { useTheme } from "../theme/ThemeContext";
import { useLabelMode } from "../theme/LabelModeContext";
import { space, radius, type as type_, type ThemeColors } from "../theme/tokens";

const noteCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

function intervalMeta(short?: string) {
  if (!short) return null;
  return Object.values(INTERVALS).find((i) => i.short === short) ?? null;
}

function dominantInterval(notesStr: string): string | undefined {
  const parsed = parseMelody(notesStr);
  if (parsed.length < 2) return undefined;
  const steps = analyzeMelody(parsed);
  const hist = intervalHistogram(steps);
  const sorted = Array.from(hist.entries()).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0];
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type ArtProps = { color: string; label: string; size?: number };

function AlbumArt({ color, label, size = 68 }: ArtProps) {
  return (
    <LinearGradient
      colors={[hexToRgba(color, 1), hexToRgba(color, 0.72)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.2),
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: size * 0.45,
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: size * 0.12,
          bottom: size * 0.14,
          width: size * 0.22,
          height: 2,
          borderRadius: 2,
          backgroundColor: "rgba(0,0,0,0.18)",
        }}
      />
      <Text
        style={{
          color: "#0b0a18",
          fontSize: Math.round(size * 0.32),
          fontWeight: "900",
          letterSpacing: -0.8,
        }}
      >
        {label}
      </Text>
    </LinearGradient>
  );
}

const webShadow = (intensity: "soft" | "medium" | "strong" = "soft") =>
  Platform.OS === "web"
    ? ({
        boxShadow:
          intensity === "strong"
            ? "0 4px 12px rgba(15,12,40,0.08), 0 16px 40px rgba(124,58,237,0.08)"
            : intensity === "medium"
            ? "0 2px 6px rgba(15,12,40,0.06), 0 8px 24px rgba(124,58,237,0.06)"
            : "0 1px 3px rgba(15,12,40,0.04), 0 4px 14px rgba(124,58,237,0.04)",
      } as any)
    : {};

export default function Home() {
  const router = useRouter();
  const { colors } = useTheme();
  const { mode } = useLabelMode();
  const { width: winW } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [custom, setCustom] = useState<Melody[]>([]);
  const [progress, setProgress] = useState<ProgressV1>(emptyProgress);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadCustomMelodies().then((ms) => {
        if (active) setCustom(ms);
      });
      loadProgress().then((p) => {
        if (active) setProgress(p);
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

  const featured = useMemo(() => {
    const dayIndex = new Date().getDate() % PRESET_MELODIES.length;
    return PRESET_MELODIES[dayIndex];
  }, []);
  const libraryRest = PRESET_MELODIES.filter((m) => m.id !== featured.id);

  const isTwoCol = winW > 720;
  const cardWidth = isTwoCol ? styles.cardHalf : styles.cardFull;
  const featuredMeta = intervalMeta(featured.anchorInterval);
  const featuredColor = featuredMeta?.color ?? colors.accent;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Hero */}
      <LinearGradient
        colors={[colors.heroFrom, colors.heroVia, colors.heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, webShadow("medium")]}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="musical-notes" size={14} color={colors.accentBright} />
            <Text style={styles.heroBadgeText}>PitchCraft</Text>
          </View>
          <View style={styles.heroDecor}>
            <Ionicons
              name="musical-note"
              size={28}
              color={colors.accentBright}
              style={{ opacity: 0.16 }}
            />
            <Ionicons
              name="musical-notes"
              size={50}
              color={colors.accentBright}
              style={{ opacity: 0.1, marginLeft: -14 }}
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

        <Pressable
          style={[styles.heroDrillBtn, webShadow("medium")]}
          onPress={() => router.push("/drill")}
        >
          <Ionicons name="flash" size={16} color="#0b0a18" />
          <Text style={styles.heroDrillText}>
            {progress.sessions === 0 ? "Start your first drill" : "Drill intervals"}
          </Text>
          <Ionicons name="arrow-forward" size={14} color="#0b0a18" />
        </Pressable>
      </LinearGradient>

      {progress.sessions > 0 && (
        <Pressable
          style={[styles.statsStrip, webShadow("soft")]}
          onPress={() => router.push("/drill")}
        >
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>{progress.sessions}</Text>
            <Text style={styles.statsLabel}>sessions</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsItem}>
            <Text style={styles.statsValue}>
              {Math.round(overallAccuracy(progress) * 100)}%
            </Text>
            <Text style={styles.statsLabel}>accuracy</Text>
          </View>
          <View style={styles.statsDivider} />
          <View style={styles.statsItem}>
            <View style={styles.statsStreak}>
              <Ionicons name="flame" size={14} color={colors.gold} />
              <Text style={styles.statsValue}>{progress.streakDays}</Text>
            </View>
            <Text style={styles.statsLabel}>day streak</Text>
          </View>
          {(() => {
            const weak = weakestInterval(progress);
            if (!weak) return null;
            const meta = intervalMeta(weak.short);
            return (
              <>
                <View style={styles.statsDivider} />
                <View style={styles.statsItem}>
                  <View style={styles.statsWeak}>
                    {meta && (
                      <View
                        style={[
                          styles.statsWeakSwatch,
                          { backgroundColor: meta.color },
                        ]}
                      />
                    )}
                    <Text style={styles.statsValue}>
                      {meta ? intervalShortLabel(meta, mode) : weak.short}
                    </Text>
                  </View>
                  <Text style={styles.statsLabel}>weakest</Text>
                </View>
              </>
            );
          })()}
        </Pressable>
      )}

      {/* Your tunes */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <Text style={styles.sectionLabel}>Your tunes</Text>
            {custom.length > 0 && (
              <Text style={styles.sectionCount}>· {custom.length}</Text>
            )}
          </View>
          <Pressable style={styles.addBtn} onPress={() => router.push("/custom")}>
            <Ionicons name="add" size={16} color={colors.accentBright} />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>

        {custom.length === 0 ? (
          <Pressable
            style={[styles.humCard, webShadow("soft")]}
            onPress={() => router.push("/custom")}
          >
            <View style={styles.humIconWrap}>
              <Ionicons name="mic" size={20} color={colors.accentBright} />
            </View>
            <View style={styles.humTextWrap}>
              <Text style={styles.humTitle}>Hum your own tune</Text>
              <Text style={styles.humSub}>
                Sing or hum a melody — PitchCraft transcribes it into notes and
                decodes the interval jumps for you. Or type the notes in
                directly.
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {custom.length > 0 && (
          <View style={styles.grid}>
            {custom.map((m) => {
              const dom = dominantInterval(m.notes);
              const meta = intervalMeta(dom);
              const color = meta?.color ?? colors.accent;
              return (
                <View key={m.id} style={[styles.cardWrap, cardWidth]}>
                  <Pressable style={styles.tuneCard} onPress={() => open(m.id)}>
                    <View style={styles.tuneRow}>
                      <AlbumArt
                        color={color}
                        label={meta ? intervalShortLabel(meta, mode) : "♪"}
                        size={68}
                      />
                      <View style={styles.tuneContent}>
                        <Text style={styles.tuneTitle} numberOfLines={1}>
                          {m.title}
                        </Text>
                        {m.hint ? (
                          <Text style={styles.tuneHint} numberOfLines={2}>
                            {m.hint}
                          </Text>
                        ) : (
                          <Text style={styles.tuneHint} numberOfLines={1}>
                            {m.notes}
                          </Text>
                        )}
                        <View style={styles.tuneMeta}>
                          <Text style={styles.tuneMetaText}>
                            {noteCount(m.notes)} ♪
                          </Text>
                          {meta && (
                            <>
                              <View style={styles.tuneMetaDot} />
                              <Text style={styles.tuneMetaText}>
                                {intervalName(meta, mode)}
                              </Text>
                            </>
                          )}
                        </View>
                        {meta?.famousIndianTune && (
                          <View style={styles.indianAnchor}>
                            <Ionicons
                              name="musical-note"
                              size={10}
                              color={colors.gold}
                            />
                            <Text style={styles.indianAnchorText} numberOfLines={1}>
                              {meta.famousIndianTune}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.tuneFingerprint}>
                      <IntervalFingerprint notes={m.notes} height={4} />
                    </View>
                  </Pressable>
                  <View style={styles.customActions}>
                    <Pressable
                      style={styles.iconAction}
                      onPress={() =>
                        router.push({ pathname: "/custom", params: { id: m.id } })
                      }
                    >
                      <Ionicons
                        name="create-outline"
                        size={14}
                        color={colors.editText}
                      />
                      <Text style={styles.iconActionText}>Edit</Text>
                    </Pressable>
                    <View style={styles.actionDivider} />
                    <Pressable
                      style={styles.iconAction}
                      onPress={() => confirmDelete(m)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={14}
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
              );
            })}
          </View>
        )}
      </View>

      {/* Featured */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <Ionicons name="sparkles" size={14} color={colors.gold} />
            <Text style={styles.sectionLabel}>Today's pick</Text>
          </View>
        </View>

        <Pressable
          style={[
            styles.featuredCard,
            {
              borderColor: hexToRgba(featuredColor, 0.4),
              backgroundColor: hexToRgba(featuredColor, 0.04),
            },
            webShadow("strong"),
          ]}
          onPress={() => open(featured.id)}
        >
          <LinearGradient
            colors={[
              hexToRgba(featuredColor, 0.18),
              hexToRgba(featuredColor, 0.02),
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.featuredInner}>
            <View style={styles.featuredRow}>
              <AlbumArt
                color={featuredColor}
                label={featuredMeta ? intervalShortLabel(featuredMeta, mode) : "♪"}
                size={92}
              />
              <View style={styles.featuredContent}>
                <View style={styles.featuredEyebrow}>
                  <View
                    style={[
                      styles.featuredDot,
                      { backgroundColor: featuredColor },
                    ]}
                  />
                  <Text style={styles.featuredEyebrowText}>
                    Anchored on {featuredMeta ? intervalName(featuredMeta, mode) : "interval"}
                  </Text>
                </View>
                <Text style={styles.featuredTitle}>{featured.title}</Text>
                <Text style={styles.featuredHint} numberOfLines={2}>
                  {featured.hint}
                </Text>
                {featuredMeta?.famousIndianTune && (
                  <View style={styles.indianAnchor}>
                    <Ionicons
                      name="musical-note"
                      size={11}
                      color={colors.gold}
                    />
                    <Text style={styles.indianAnchorText} numberOfLines={1}>
                      {featuredMeta.famousIndianTune}
                    </Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.playCircle,
                  { backgroundColor: featuredColor },
                  webShadow("medium"),
                ]}
              >
                <Ionicons name="play" size={18} color="#0b0a18" />
              </View>
            </View>

            <View style={styles.featuredFingerprint}>
              <IntervalFingerprint notes={featured.notes} height={6} />
            </View>

            <View style={styles.featuredFooter}>
              <Text style={styles.featuredFooterText}>
                {noteCount(featured.notes)} notes · tap to decode
              </Text>
              <Ionicons
                name="arrow-forward"
                size={14}
                color={colors.textMuted}
              />
            </View>
          </View>
        </Pressable>
      </View>

      {/* Library */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <View style={styles.sectionHeadLeft}>
            <Text style={styles.sectionLabel}>Library</Text>
            <Text style={styles.sectionCount}>· {PRESET_MELODIES.length} tunes</Text>
          </View>
        </View>

        <View style={styles.libraryBlurb}>
          <Ionicons name="bulb-outline" size={14} color={colors.gold} />
          <Text style={styles.libraryBlurbText}>
            {mode === "sargam"
              ? "Each tune is anchored to one swara distance from Sa — the chip shows which. Hum the tune, and your ear already knows that interval."
              : "Each tune is anchored to one interval — the chip shows which. Hum the tune, and your ear already knows that interval."}
          </Text>
        </View>

        <View style={styles.grid}>
          {libraryRest.map((m) => {
            const meta = intervalMeta(m.anchorInterval);
            const color = meta?.color ?? colors.accent;
            return (
              <Pressable
                key={m.id}
                style={[styles.cardWrap, cardWidth]}
                onPress={() => open(m.id)}
              >
                <View style={[styles.tuneCard, webShadow("soft")]}>
                  <View style={styles.tuneRow}>
                    <AlbumArt
                      color={color}
                      label={meta ? intervalShortLabel(meta, mode) : "♪"}
                      size={68}
                    />
                    <View style={styles.tuneContent}>
                      <Text style={styles.tuneTitle} numberOfLines={1}>
                        {m.title}
                      </Text>
                      <Text style={styles.tuneHint} numberOfLines={2}>
                        {m.hint}
                      </Text>
                      <View style={styles.tuneMeta}>
                        <Text style={styles.tuneMetaText}>
                          {noteCount(m.notes)} ♪
                        </Text>
                        {meta && (
                          <>
                            <View style={styles.tuneMetaDot} />
                            <Text style={styles.tuneMetaText}>
                              {intervalName(meta, mode)}
                            </Text>
                          </>
                        )}
                      </View>
                      {meta?.famousIndianTune && (
                        <View style={styles.indianAnchor}>
                          <Ionicons
                            name="musical-note"
                            size={10}
                            color={colors.gold}
                          />
                          <Text style={styles.indianAnchorText} numberOfLines={1}>
                            {meta.famousIndianTune}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.tuneFingerprint}>
                    <IntervalFingerprint notes={m.notes} height={4} />
                  </View>
                </View>
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
      maxWidth: 980,
      width: "100%",
      alignSelf: "center",
    },

    /* Hero */
    hero: {
      padding: space.xl,
      borderRadius: radius.lg + 4,
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
    heroDecor: { flexDirection: "row", alignItems: "center" },
    heroTitle: {
      ...type_.display,
      color: c.text,
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.6,
    },
    heroSub: { ...type_.body, color: c.textMuted, fontSize: 14 },
    heroStats: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
      marginTop: space.md,
      paddingTop: space.md,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    heroStat: { flexDirection: "row", alignItems: "baseline", gap: 4 },
    heroStatValue: {
      color: c.text,
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    heroStatLabel: { color: c.textMuted, fontSize: 12, fontWeight: "600" },
    heroStatDivider: { width: 1, height: 18, backgroundColor: c.border },

    heroDrillBtn: {
      marginTop: space.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space.sm,
      paddingVertical: 11,
      paddingHorizontal: space.lg,
      borderRadius: radius.pill,
      backgroundColor: c.gold,
    },
    heroDrillText: {
      color: "#0b0a18",
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: -0.1,
    },

    statsStrip: {
      flexDirection: "row",
      alignItems: "stretch",
      backgroundColor: c.surface,
      borderRadius: radius.md + 2,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: space.sm + 2,
      paddingHorizontal: space.md,
    },
    statsItem: { flex: 1, alignItems: "center", gap: 2 },
    statsDivider: { width: 1, backgroundColor: c.border, marginVertical: 4 },
    statsValue: { color: c.text, fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
    statsLabel: { ...type_.overline, color: c.textDim, fontSize: 9.5 },
    statsStreak: { flexDirection: "row", alignItems: "center", gap: 4 },
    statsWeak: { flexDirection: "row", alignItems: "center", gap: 5 },
    statsWeakSwatch: { width: 8, height: 8, borderRadius: 2 },

    /* Section heads */
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
    sectionCount: { color: c.textDim, fontSize: 11, fontWeight: "600" },
    libraryBlurb: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      backgroundColor: c.goldTint,
      borderLeftWidth: 3,
      borderLeftColor: c.gold,
      borderRadius: radius.sm,
    },
    libraryBlurbText: {
      color: c.textMuted,
      fontSize: 12.5,
      lineHeight: 17,
      flex: 1,
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: space.md,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: c.accentTint,
      borderWidth: 1,
      borderColor: c.accentTintBorder,
    },
    addBtnText: { color: c.accentBright, fontSize: 12, fontWeight: "700" },

    humCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
      padding: space.md + 2,
      backgroundColor: c.surface,
      borderRadius: radius.md + 2,
      borderWidth: 1,
      borderColor: c.accentTintBorder,
      borderStyle: "dashed" as any,
    },
    humIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.accentTint,
      borderWidth: 1,
      borderColor: c.accentTintBorder,
    },
    humTextWrap: { flex: 1, gap: 3 },
    humTitle: {
      color: c.text,
      fontSize: 14.5,
      fontWeight: "800",
      letterSpacing: -0.2,
    },
    humSub: {
      color: c.textMuted,
      fontSize: 12.5,
      lineHeight: 17,
    },

    /* Grid */
    grid: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
    cardWrap: {},
    cardFull: { width: "100%" },
    cardHalf: { width: "48.5%", flexGrow: 1 },

    /* Tune card (album-art style) */
    tuneCard: {
      backgroundColor: c.surface,
      padding: space.md + 2,
      borderRadius: radius.md + 2,
      borderWidth: 1,
      borderColor: c.border,
      gap: space.sm,
      overflow: "hidden",
    },
    tuneRow: { flexDirection: "row", gap: space.md, alignItems: "center" },
    tuneContent: { flex: 1, gap: 4, minWidth: 0 },
    tuneTitle: {
      color: c.text,
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    tuneHint: {
      color: c.textMuted,
      fontSize: 12.5,
      lineHeight: 17,
    },
    tuneMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 2,
    },
    tuneMetaText: {
      color: c.textDim,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    tuneMetaDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: c.textDim,
    },
    tuneFingerprint: { marginTop: 2 },
    indianAnchor: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 4,
    },
    indianAnchorText: {
      color: c.gold,
      fontSize: 11.5,
      fontWeight: "700",
      letterSpacing: 0.1,
      flexShrink: 1,
    },

    /* Custom tune actions */
    customActions: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: c.border,
      marginTop: -1,
      backgroundColor: c.surface,
      borderBottomLeftRadius: radius.md + 2,
      borderBottomRightRadius: radius.md + 2,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: c.border,
    },
    iconAction: {
      flex: 1,
      paddingVertical: 9,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    iconActionText: { color: c.editText, fontSize: 12.5, fontWeight: "700" },
    actionDivider: { width: 1, backgroundColor: c.border },

    /* Featured card */
    featuredCard: {
      borderRadius: radius.lg + 2,
      borderWidth: 1.5,
      overflow: "hidden",
      position: "relative",
    },
    featuredInner: { padding: space.lg + 2, gap: space.md },
    featuredRow: { flexDirection: "row", alignItems: "center", gap: space.md },
    featuredContent: { flex: 1, gap: 4, minWidth: 0 },
    featuredEyebrow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 2,
    },
    featuredDot: { width: 6, height: 6, borderRadius: 3 },
    featuredEyebrowText: {
      color: c.textMuted,
      fontSize: 10.5,
      fontWeight: "800",
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    featuredTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: "800",
      letterSpacing: -0.4,
      lineHeight: 26,
    },
    featuredHint: {
      color: c.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    featuredFingerprint: { height: 6 },
    featuredFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    featuredFooterText: {
      color: c.textMuted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    playCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
    },
  });
