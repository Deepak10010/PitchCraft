import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { Note } from "../lib/intervals";
import { ROLE_COLORS, noteLabel } from "../lib/intervals";
import { useTheme } from "../theme/ThemeContext";
import { radius, type ThemeColors } from "../theme/tokens";

type Props = {
  baseNote: Note | null;
};

export function RoleLegend({ baseNote }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <View style={styles.chip}>
        <View style={[styles.swatch, { backgroundColor: ROLE_COLORS.tonic }]} />
        <Text style={styles.label}>
          Tonic{baseNote ? ` · ${noteLabel(baseNote)}` : ""}
        </Text>
      </View>
      <View style={styles.chip}>
        <View style={[styles.swatch, { backgroundColor: ROLE_COLORS.fourth }]} />
        <Text style={styles.label}>4th</Text>
      </View>
      <View style={styles.chip}>
        <View style={[styles.swatch, { backgroundColor: ROLE_COLORS.fifth }]} />
        <Text style={styles.label}>5th</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      alignItems: "center",
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: radius.pill,
    },
    swatch: { width: 10, height: 10, borderRadius: 5 },
    label: { color: c.text, fontSize: 12, fontWeight: "600" },
  });
