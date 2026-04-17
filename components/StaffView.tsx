import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Svg, { Line, Circle, Text as SvgText, Rect } from "react-native-svg";
import type { Note } from "../lib/intervals";
import { analyzeMelody, noteLabel, rolesForMelody, ROLE_COLORS } from "../lib/intervals";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  notes: Note[];
  activeIndex: number | null;
  onTapNote: (index: number) => void;
};

const H_PADDING = 28;
const V_PADDING = 32;
const DEFAULT_SPACING = 64;
const MAX_SPACING = 130;
const MIN_SPACING = 30;
const LABEL_THRESHOLD = 48;
const NOTE_NAME_THRESHOLD = 34;
const SEMITONE_HEIGHT = 10;
const NOTE_RADIUS = 11;
const MIN_HEIGHT = 190;

export function StaffView({ notes, activeIndex, onTapNote }: Props) {
  const { colors } = useTheme();
  const { width: winW } = useWindowDimensions();

  if (notes.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.surfaceCanvas }]}>
        <Text style={[styles.emptyText, { color: colors.textDim }]}>No notes yet.</Text>
      </View>
    );
  }

  // Viewport available inside the decoder's scroll container.
  const viewport = Math.min(winW - 48, 788);
  const n = notes.length;

  // Layout strategy:
  //   - Short melody (natural spacing fits comfortably): stretch with cap, center content.
  //   - Medium melody (spacing would be below default): compress to fit viewport exactly.
  //   - Long melody (can't fit even at MIN_SPACING): use MIN_SPACING, let user scroll.
  let effectiveSpacing: number;
  let width: number;
  let xOffset: number;
  if (n <= 1) {
    effectiveSpacing = 0;
    width = viewport;
    xOffset = width / 2;
  } else {
    const fitSpacing = (viewport - H_PADDING * 2) / (n - 1);
    if (fitSpacing >= DEFAULT_SPACING) {
      effectiveSpacing = Math.min(fitSpacing, MAX_SPACING);
      const used = effectiveSpacing * (n - 1) + H_PADDING * 2;
      width = Math.max(used, viewport);
      xOffset = (width - effectiveSpacing * (n - 1)) / 2;
    } else if (fitSpacing >= MIN_SPACING) {
      effectiveSpacing = fitSpacing;
      width = viewport;
      xOffset = H_PADDING;
    } else {
      effectiveSpacing = MIN_SPACING;
      width = effectiveSpacing * (n - 1) + H_PADDING * 2;
      xOffset = H_PADDING;
    }
  }

  const showIntervalLabels = effectiveSpacing >= LABEL_THRESHOLD;
  const showNoteNames = effectiveSpacing >= NOTE_NAME_THRESHOLD;

  const midis = notes.map((n) => n.midi);
  const minMidi = Math.min(...midis);
  const maxMidi = Math.max(...midis);
  const range = Math.max(maxMidi - minMidi, 4);
  const height = Math.max(
    V_PADDING * 2 + range * SEMITONE_HEIGHT + 24,
    MIN_HEIGHT
  );

  const xFor = (i: number) =>
    notes.length === 1 ? width / 2 : xOffset + i * effectiveSpacing;
  const yFor = (midi: number) =>
    height - V_PADDING - (midi - minMidi) * SEMITONE_HEIGHT;

  const steps = analyzeMelody(notes);
  const roles = rolesForMelody(notes);

  const gridMidis: number[] = [];
  for (let m = minMidi; m <= maxMidi; m++) {
    if (m % 12 === 0) gridMidis.push(m);
  }

  return (
    <View style={[styles.wrap, { width }]}>
      <Svg width={width} height={height}>
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={colors.surfaceCanvas}
          rx={12}
        />

        {gridMidis.map((m) => (
          <Line
            key={`grid-${m}`}
            x1={H_PADDING / 2}
            x2={width - H_PADDING / 2}
            y1={yFor(m)}
            y2={yFor(m)}
            stroke={colors.canvasGrid}
            strokeDasharray="2,6"
            strokeWidth={1}
          />
        ))}

        {steps.map((s, i) => {
          const x1 = xFor(i);
          const y1 = yFor(s.from.midi);
          const x2 = xFor(i + 1);
          const y2 = yFor(s.to.midi);
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2;
          return (
            <React.Fragment key={`line-${i}`}>
              <Line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={s.interval.color}
                strokeWidth={2.5}
                strokeDasharray="6,4"
                opacity={0.9}
              />
              {showIntervalLabels && (
                <>
                  <Rect
                    x={midX - 18}
                    y={midY - 10}
                    width={36}
                    height={18}
                    rx={4}
                    fill={s.interval.color}
                    opacity={0.95}
                  />
                  <SvgText
                    x={midX}
                    y={midY + 3}
                    fontSize={11}
                    fontWeight="700"
                    fill="#0b1020"
                    textAnchor="middle"
                  >
                    {s.interval.short}
                  </SvgText>
                </>
              )}
            </React.Fragment>
          );
        })}

        {notes.map((n, i) => {
          const x = xFor(i);
          const y = yFor(n.midi);
          const isActive = activeIndex === i;
          const role = roles[i];
          const isTonic = role === "tonic";
          const roleColor = role ? ROLE_COLORS[role] : null;
          const baseRadius = NOTE_RADIUS + (isTonic ? 2 : 0);
          const fill = isActive
            ? "#facc15"
            : isTonic
            ? "#fbbf24"
            : "#f8fafc";
          const stroke = isActive
            ? "#fbbf24"
            : roleColor ?? "#334155";
          const strokeWidth = isActive ? 3 : roleColor ? 3.5 : 2;
          return (
            <React.Fragment key={`note-${i}`}>
              {isTonic && !isActive && (
                <Circle
                  cx={x}
                  cy={y}
                  r={baseRadius + 5}
                  fill="none"
                  stroke={ROLE_COLORS.tonic}
                  strokeWidth={1.5}
                  strokeDasharray="2,3"
                  opacity={0.7}
                />
              )}
              <Circle
                cx={x}
                cy={y}
                r={baseRadius + (isActive ? 4 : 0)}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
              />
              <SvgText
                x={x}
                y={y + 4}
                fontSize={10}
                fontWeight="700"
                fill="#0b1020"
                textAnchor="middle"
              >
                {i + 1}
              </SvgText>
              {showNoteNames && (
                <SvgText
                  x={x}
                  y={y - NOTE_RADIUS - 8}
                  fontSize={11}
                  fontWeight="600"
                  fill={colors.canvasText}
                  textAnchor="middle"
                >
                  {noteLabel(n)}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={[styles.tapLayer, { width, height }]} pointerEvents="box-none">
        {notes.map((_, i) => (
          <Pressable
            key={`tap-${i}`}
            onPress={() => onTapNote(i)}
            style={[
              styles.tapTarget,
              {
                left: xFor(i) - 22,
                top: yFor(notes[i].midi) - 22,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
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
  empty: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  emptyText: { fontSize: 14 },
});
