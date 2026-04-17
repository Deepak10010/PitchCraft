import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { radius, type ThemeColors } from "../theme/tokens";

export type ViewMode = "staff" | "piano" | "guitar";

type Props = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
};

const OPTIONS: { key: ViewMode; label: string }[] = [
  { key: "staff", label: "Staff" },
  { key: "piano", label: "Piano" },
  { key: "guitar", label: "Guitar" },
];

export function ViewToggle({ value, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      {OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.btn, active && styles.btnActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      backgroundColor: c.surface,
      borderRadius: radius.pill,
      padding: 4,
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: c.border,
      gap: 2,
    },
    btn: {
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: radius.pill,
    },
    btnActive: { backgroundColor: c.accent },
    label: { color: c.textMuted, fontSize: 13, fontWeight: "600" },
    labelActive: { color: "#f8fafc" },
  });
