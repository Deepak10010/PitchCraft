import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { parseMelody, analyzeMelody } from "../lib/intervals";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  notes: string;
  height?: number;
};

export function IntervalFingerprint({ notes, height = 6 }: Props) {
  const { colors } = useTheme();
  const steps = useMemo(() => analyzeMelody(parseMelody(notes)), [notes]);

  if (steps.length === 0) {
    return (
      <View
        style={[
          styles.empty,
          { height, backgroundColor: colors.border, opacity: 0.4 },
        ]}
      />
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      {steps.map((s, i) => (
        <View
          key={i}
          style={[styles.segment, { backgroundColor: s.interval.color }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    width: "100%",
    overflow: "hidden",
    borderRadius: 3,
    gap: 2,
  },
  segment: { flex: 1 },
  empty: { borderRadius: 3 },
});
