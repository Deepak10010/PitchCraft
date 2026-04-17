import React, { useMemo } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import Svg, { Rect, Line, Circle, Text as SvgText } from "react-native-svg";
import type { Note } from "../lib/intervals";
import { INTERVALS, analyzeMelody, noteLabel, rolesForMelody, ROLE_COLORS } from "../lib/intervals";
import {
  STANDARD_TUNING,
  FRET_COUNT,
  optimalFingering,
  isOutOfRange,
} from "../lib/fretboard";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  notes: Note[];
  activeIndex: number | null;
  onTapNote: (index: number) => void;
};

const FRET_W = 52;
const STRING_GAP = 26;
const LEFT_PAD = 56;
const TOP_PAD = 20;
const BOTTOM_PAD = 28;

export function GuitarView({ notes, activeIndex, onTapNote }: Props) {
  const { colors } = useTheme();
  const fingering = useMemo(() => optimalFingering(notes), [notes]);
  const steps = analyzeMelody(notes);
  const roles = rolesForMelody(notes);

  const boardW = LEFT_PAD + FRET_W * FRET_COUNT + 14;
  const boardH = TOP_PAD + STRING_GAP * (STANDARD_TUNING.length - 1) + BOTTOM_PAD;

  const xForFret = (f: number) =>
    f === 0 ? LEFT_PAD - 18 : LEFT_PAD + (f - 0.5) * FRET_W;
  const yForString = (s: number) => TOP_PAD + s * STRING_GAP;

  const anyOutOfRange = notes.some((n) => isOutOfRange(n.midi));

  return (
    <View style={styles.wrap}>
      <Svg width={boardW} height={boardH}>
        <Rect x={0} y={0} width={boardW} height={boardH} fill="#3a2712" rx={6} />
        <Rect
          x={LEFT_PAD - 4}
          y={TOP_PAD - 6}
          width={FRET_W * FRET_COUNT + 8}
          height={STRING_GAP * (STANDARD_TUNING.length - 1) + 12}
          fill="#4d321a"
        />

        {[3, 5, 7, 9].map((f) => (
          <Circle
            key={`inlay-${f}`}
            cx={LEFT_PAD + (f - 0.5) * FRET_W}
            cy={TOP_PAD + STRING_GAP * 2.5}
            r={4}
            fill="#f5e9c8"
            opacity={0.55}
          />
        ))}
        <Circle
          cx={LEFT_PAD + (12 - 0.7) * FRET_W}
          cy={TOP_PAD + STRING_GAP * 1.5}
          r={4}
          fill="#f5e9c8"
          opacity={0.55}
        />
        <Circle
          cx={LEFT_PAD + (12 - 0.3) * FRET_W}
          cy={TOP_PAD + STRING_GAP * 3.5}
          r={4}
          fill="#f5e9c8"
          opacity={0.55}
        />

        {Array.from({ length: FRET_COUNT + 1 }).map((_, f) => (
          <Line
            key={`fret-${f}`}
            x1={LEFT_PAD + f * FRET_W}
            y1={TOP_PAD - 4}
            x2={LEFT_PAD + f * FRET_W}
            y2={TOP_PAD + STRING_GAP * (STANDARD_TUNING.length - 1) + 4}
            stroke={f === 0 ? "#fafaf9" : "#94a3b8"}
            strokeWidth={f === 0 ? 5 : 2}
          />
        ))}

        {STANDARD_TUNING.map((s, i) => (
          <React.Fragment key={`str-${i}`}>
            <Line
              x1={LEFT_PAD - 18}
              y1={yForString(i)}
              x2={LEFT_PAD + FRET_W * FRET_COUNT}
              y2={yForString(i)}
              stroke="#cbd5e1"
              strokeWidth={1 + (STANDARD_TUNING.length - i - 1) * 0.3}
              opacity={0.85}
            />
            <SvgText
              x={22}
              y={yForString(i) + 4}
              fontSize={13}
              fontWeight="700"
              fill="#f5e9c8"
              textAnchor="middle"
            >
              {s.label}
            </SvgText>
          </React.Fragment>
        ))}

        {[3, 5, 7, 9, 12].map((f) => (
          <SvgText
            key={`flabel-${f}`}
            x={LEFT_PAD + (f - 0.5) * FRET_W}
            y={boardH - 8}
            fontSize={10}
            fill="#94a3b8"
            textAnchor="middle"
          >
            {f}
          </SvgText>
        ))}

        {fingering.map((pos, i) => {
          if (!pos) return null;
          const isActive = activeIndex === i;
          const step = i > 0 ? steps[i - 1] : null;
          const role = roles[i];
          const roleColor = role ? ROLE_COLORS[role] : null;
          const isTonic = role === "tonic";
          const color = roleColor ?? step?.interval.color ?? "#f8fafc";
          const x = xForFret(pos.fret);
          const y = yForString(pos.stringIdx);
          const radius = isActive ? 14 : isTonic ? 13 : 11;
          return (
            <React.Fragment key={`dot-${i}`}>
              {isTonic && !isActive && (
                <Circle
                  cx={x}
                  cy={y}
                  r={radius + 4}
                  fill="none"
                  stroke={ROLE_COLORS.tonic}
                  strokeWidth={1.5}
                  strokeDasharray="2,2"
                  opacity={0.85}
                />
              )}
              <Circle
                cx={x}
                cy={y}
                r={radius}
                fill={isActive ? "#facc15" : color}
                stroke={isActive ? "#fbbf24" : roleColor ? "#0b1020" : "#0b1020"}
                strokeWidth={roleColor ? 2.5 : 2}
              />
              <SvgText
                x={x}
                y={y + 4}
                fontSize={11}
                fontWeight="700"
                fill="#0b1020"
                textAnchor="middle"
              >
                {i + 1}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={[styles.tapLayer, { width: boardW, height: boardH }]} pointerEvents="box-none">
        {fingering.map((pos, i) => {
          if (!pos) return null;
          return (
            <Pressable
              key={`tap-${i}`}
              onPress={() => onTapNote(i)}
              style={[
                styles.tapTarget,
                {
                  left: xForFret(pos.fret) - 22,
                  top: yForString(pos.stringIdx) - 22,
                },
              ]}
            />
          );
        })}
      </View>

      {anyOutOfRange && (
        <Text style={[styles.rangeNote, { color: colors.warn }]}>
          Some notes are outside standard-tuning range — they're dropped from the fretboard but still on the staff and piano.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    alignSelf: "flex-start",
  },
  tapLayer: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  tapTarget: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  rangeNote: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: "italic",
  },
});
