import React, { useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import Svg, { Rect, Text as SvgText, Line } from "react-native-svg";
import type { Note } from "../lib/intervals";
import { INTERVALS, analyzeMelody, noteLabel, rolesForMelody, ROLE_COLORS } from "../lib/intervals";
import { useTheme } from "../theme/ThemeContext";

type Props = {
  notes: Note[];
  activeIndex: number | null;
  onTapNote: (index: number) => void;
};

const WHITE_KEY_W = 36;
const WHITE_KEY_H = 150;
const BLACK_KEY_W = 22;
const BLACK_KEY_H = 92;
const LABEL_BAND = 28;

const WHITE_PC = [0, 2, 4, 5, 7, 9, 11];
const BLACK_PC_OFFSET: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };

function midiToWhiteIndex(midi: number): { whiteIdx: number; isBlack: boolean; blackOffset: number } {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  if (WHITE_PC.includes(pc)) {
    const whiteInOctave = WHITE_PC.indexOf(pc);
    return { whiteIdx: octave * 7 + whiteInOctave, isBlack: false, blackOffset: 0 };
  }
  const blackOffset = BLACK_PC_OFFSET[pc];
  return { whiteIdx: octave * 7 + blackOffset, isBlack: true, blackOffset };
}

export function PianoView({ notes, activeIndex, onTapNote }: Props) {
  const { colors } = useTheme();
  const { startMidi, endMidi, whiteStart, whiteCount } = useMemo(() => {
    if (notes.length === 0) {
      return { startMidi: 60, endMidi: 72, whiteStart: 35, whiteCount: 8 };
    }
    const midis = notes.map((n) => n.midi);
    let lo = Math.min(...midis) - 2;
    let hi = Math.max(...midis) + 2;
    while ((lo % 12 + 12) % 12 !== 0) lo--;
    while ((hi % 12 + 12) % 12 !== 11) hi++;
    const startInfo = midiToWhiteIndex(lo);
    const endInfo = midiToWhiteIndex(hi);
    return {
      startMidi: lo,
      endMidi: hi,
      whiteStart: startInfo.whiteIdx,
      whiteCount: endInfo.whiteIdx - startInfo.whiteIdx + 1,
    };
  }, [notes]);

  const width = whiteCount * WHITE_KEY_W;
  const height = WHITE_KEY_H + LABEL_BAND;

  const xForMidi = (midi: number): { x: number; w: number; isBlack: boolean } => {
    const info = midiToWhiteIndex(midi);
    if (info.isBlack) {
      const baseX = (info.whiteIdx - whiteStart + 1) * WHITE_KEY_W - BLACK_KEY_W / 2;
      return { x: baseX, w: BLACK_KEY_W, isBlack: true };
    }
    return { x: (info.whiteIdx - whiteStart) * WHITE_KEY_W, w: WHITE_KEY_W, isBlack: false };
  };

  const steps = analyzeMelody(notes);
  const intervalByNoteIdx = new Map<number, string>();
  steps.forEach((s, i) => {
    intervalByNoteIdx.set(i + 1, s.interval.short);
  });

  const whiteMidis: number[] = [];
  for (let m = startMidi; m <= endMidi; m++) {
    if (WHITE_PC.includes(((m % 12) + 12) % 12)) whiteMidis.push(m);
  }
  const blackMidis: number[] = [];
  for (let m = startMidi; m <= endMidi; m++) {
    if (!WHITE_PC.includes(((m % 12) + 12) % 12)) blackMidis.push(m);
  }

  const noteIndicesByMidi = new Map<number, number[]>();
  notes.forEach((n, i) => {
    const list = noteIndicesByMidi.get(n.midi) ?? [];
    list.push(i);
    noteIndicesByMidi.set(n.midi, list);
  });

  const roles = rolesForMelody(notes);
  const roleByNoteIdx = new Map<number, typeof roles[number]>();
  roles.forEach((r, i) => {
    if (r) roleByNoteIdx.set(i, r);
  });
  const roleByMidi = (midi: number): typeof roles[number] => {
    const idxs = noteIndicesByMidi.get(midi) ?? [];
    for (const i of idxs) {
      const r = roleByNoteIdx.get(i);
      if (r) return r;
    }
    return null;
  };

  const playNoteAtIndex = (idx: number) => onTapNote(idx);

  return (
    <View style={[styles.wrap, { width, height }]}>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill={colors.surfaceCanvas} rx={8} />

        {whiteMidis.map((m) => {
          const { x, w } = xForMidi(m);
          const idxs = noteIndicesByMidi.get(m) ?? [];
          const activeIdx = activeIndex !== null && idxs.includes(activeIndex) ? activeIndex : null;
          const highlighted = idxs.length > 0;
          const intervalShort = activeIdx !== null ? intervalByNoteIdx.get(activeIdx) : null;
          const interval = intervalShort
            ? Object.values(INTERVALS).find((v) => v.short === intervalShort)
            : null;
          const role = roleByMidi(m);
          const roleColor = role ? ROLE_COLORS[role] : null;
          const keyFill =
            activeIdx !== null
              ? "#facc15"
              : role === "tonic"
              ? "#fde68a"
              : role === "fourth"
              ? "#fce7f3"
              : role === "fifth"
              ? "#dbeafe"
              : highlighted
              ? "#e2e8f0"
              : "#f8fafc";
          return (
            <React.Fragment key={`w-${m}`}>
              <Rect
                x={x + 1}
                y={LABEL_BAND}
                width={w - 2}
                height={WHITE_KEY_H - 1}
                fill={keyFill}
                stroke={roleColor ?? "#475569"}
                strokeWidth={roleColor ? 2.5 : 1}
                rx={3}
              />
              {highlighted && (
                <>
                  <Rect
                    x={x + w / 2 - 10}
                    y={LABEL_BAND + WHITE_KEY_H - 32}
                    width={20}
                    height={20}
                    rx={10}
                    fill={interval?.color ?? "#334155"}
                    opacity={0.95}
                  />
                  <SvgText
                    x={x + w / 2}
                    y={LABEL_BAND + WHITE_KEY_H - 18}
                    fontSize={11}
                    fontWeight="700"
                    fill="#0b1020"
                    textAnchor="middle"
                  >
                    {idxs.map((i) => i + 1).join(",")}
                  </SvgText>
                </>
              )}
              {((m % 12) + 12) % 12 === 0 && (
                <SvgText
                  x={x + w / 2}
                  y={LABEL_BAND + WHITE_KEY_H - 6}
                  fontSize={9}
                  fill="#475569"
                  textAnchor="middle"
                >
                  C{Math.floor(m / 12) - 1}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}

        {blackMidis.map((m) => {
          const { x, w } = xForMidi(m);
          const idxs = noteIndicesByMidi.get(m) ?? [];
          const activeIdx = activeIndex !== null && idxs.includes(activeIndex) ? activeIndex : null;
          const highlighted = idxs.length > 0;
          const intervalShort = activeIdx !== null ? intervalByNoteIdx.get(activeIdx) : null;
          const interval = intervalShort
            ? Object.values(INTERVALS).find((v) => v.short === intervalShort)
            : null;
          const role = roleByMidi(m);
          const roleColor = role ? ROLE_COLORS[role] : null;
          const keyFill =
            activeIdx !== null
              ? "#f59e0b"
              : role === "tonic"
              ? "#92400e"
              : role === "fourth"
              ? "#831843"
              : role === "fifth"
              ? "#1e3a8a"
              : highlighted
              ? "#334155"
              : "#0f172a";
          return (
            <React.Fragment key={`b-${m}`}>
              <Rect
                x={x}
                y={LABEL_BAND}
                width={w}
                height={BLACK_KEY_H}
                fill={keyFill}
                stroke={roleColor ?? "#1e293b"}
                strokeWidth={roleColor ? 2 : 1}
                rx={2}
              />
              {highlighted && (
                <>
                  <Rect
                    x={x + w / 2 - 9}
                    y={LABEL_BAND + BLACK_KEY_H - 24}
                    width={18}
                    height={18}
                    rx={9}
                    fill={interval?.color ?? "#64748b"}
                    opacity={0.95}
                  />
                  <SvgText
                    x={x + w / 2}
                    y={LABEL_BAND + BLACK_KEY_H - 11}
                    fontSize={10}
                    fontWeight="700"
                    fill="#0b1020"
                    textAnchor="middle"
                  >
                    {idxs.map((i) => i + 1).join(",")}
                  </SvgText>
                </>
              )}
            </React.Fragment>
          );
        })}

        {notes.map((n, i) => {
          if (i === 0) return null;
          const from = notes[i - 1];
          const to = n;
          const fromX = xForMidi(from.midi).x + xForMidi(from.midi).w / 2;
          const toX = xForMidi(to.midi).x + xForMidi(to.midi).w / 2;
          const step = steps[i - 1];
          return (
            <Line
              key={`arc-${i}`}
              x1={fromX}
              y1={LABEL_BAND / 2}
              x2={toX}
              y2={LABEL_BAND / 2}
              stroke={step.interval.color}
              strokeWidth={2}
              strokeDasharray="4,3"
              opacity={0.7}
            />
          );
        })}
      </Svg>

      <View style={[styles.tapLayer, { width, height }]} pointerEvents="box-none">
        {notes.map((n, i) => {
          const { x, w, isBlack } = xForMidi(n.midi);
          const keyH = isBlack ? BLACK_KEY_H : WHITE_KEY_H;
          return (
            <Pressable
              key={`tap-${i}`}
              onPress={() => playNoteAtIndex(i)}
              style={[
                styles.tapTarget,
                {
                  left: x,
                  top: LABEL_BAND,
                  width: w,
                  height: keyH,
                },
              ]}
            />
          );
        })}
      </View>
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
  },
});
