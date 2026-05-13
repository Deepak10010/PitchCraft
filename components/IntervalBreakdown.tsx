import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import type { IntervalStep } from "../lib/intervals";
import {
  INTERVALS,
  intervalHistogram,
  dominantInsight,
  intervalName,
} from "../lib/intervals";
import { useTheme } from "../theme/ThemeContext";
import { useLabelMode } from "../theme/LabelModeContext";
import { radius, type ThemeColors } from "../theme/tokens";

type Props = {
  steps: IntervalStep[];
  onDrillInterval?: (short: string) => void;
};

export function IntervalBreakdown({ steps, onDrillInterval }: Props) {
  const { colors } = useTheme();
  const { mode } = useLabelMode();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const hist = intervalHistogram(steps);
  const total = steps.length;
  const rows = Array.from(hist.entries()).sort((a, b) => b[1] - a[1]);
  const insight = dominantInsight(steps, mode);

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Interval breakdown</Text>
      {total === 0 ? (
        <Text style={styles.empty}>Add notes to see intervals.</Text>
      ) : (
        <>
          <View style={styles.bars}>
            {rows.map(([short, count]) => {
              const interval = Object.values(INTERVALS).find((i) => i.short === short);
              const pct = (count / total) * 100;
              return (
                <Pressable
                  key={short}
                  style={styles.row}
                  onPress={() => onDrillInterval?.(short)}
                >
                  <View style={styles.labelCell}>
                    <View
                      style={[
                        styles.swatch,
                        { backgroundColor: interval?.color ?? "#888" },
                      ]}
                    />
                    <Text style={styles.label}>
                      {interval ? intervalName(interval, mode) : short}
                    </Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: interval?.color ?? "#888",
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.count}>
                    {count}
                    <Text style={styles.pct}> · {Math.round(pct)}%</Text>
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.insightBox}>
            <Text style={styles.insightLabel}>Insight</Text>
            <Text style={styles.insightText}>{insight}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: c.surfaceElevated,
      padding: 16,
      borderRadius: radius.md + 2,
      gap: 12,
    },
    heading: { color: c.text, fontSize: 15, fontWeight: "700", marginBottom: 4 },
    empty: { color: c.textDim, fontSize: 13 },
    bars: { gap: 8 },
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    labelCell: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      width: 130,
    },
    swatch: { width: 10, height: 10, borderRadius: 2 },
    label: { color: c.text, fontSize: 13, fontWeight: "500" },
    barTrack: {
      flex: 1,
      height: 10,
      backgroundColor: c.border,
      borderRadius: 5,
      overflow: "hidden",
    },
    barFill: { height: "100%", borderRadius: 5 },
    count: {
      color: c.textMuted,
      fontSize: 12,
      width: 72,
      textAlign: "right",
      fontVariant: ["tabular-nums"],
    },
    pct: { color: c.textDim },
    insightBox: {
      backgroundColor: c.bg,
      padding: 12,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: "#38bdf8",
    },
    insightLabel: {
      color: "#38bdf8",
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    insightText: { color: c.text, fontSize: 13, lineHeight: 18 },
  });
