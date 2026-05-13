export type ColorScheme = "dark" | "light";

// "Studio Violet" — distinct from generic SaaS blue, complements the music-info palette
// (gold tonic / pink 4th / blue 5th) which is intentionally NOT themed.

export const darkColors = {
  bg: "#0b0a18",
  surface: "#15132c",
  surfaceElevated: "#1f1c3e",
  surfaceCanvas: "#100e22",
  border: "#332c5a",
  borderSoft: "#0f0d22",
  text: "#f5f3ff",
  textMuted: "#a8a4c8",
  textDim: "#6e6a8a",
  placeholder: "#4c486e",
  accent: "#7c3aed",
  accentBright: "#8b5cf6",
  accentSoft: "#2e1065",
  accentTint: "rgba(124,58,237,0.14)",
  accentTintBorder: "rgba(124,58,237,0.4)",
  success: "#16a34a",
  dangerBorder: "#7f1d1d",
  dangerSoft: "rgba(127,29,29,0.18)",
  warn: "#f59e0b",
  warnSoft: "#451a03",
  warnText: "#fcd34d",
  gold: "#fbbf24",
  goldTint: "rgba(251,191,36,0.1)",
  goldTintBorder: "rgba(251,191,36,0.4)",
  canvasText: "#d4d1e8",
  canvasTextStrong: "#f8fafc",
  canvasGrid: "#332c5a",
  heroFrom: "#3730a3",
  heroVia: "#1e1b4b",
  heroTo: "#0b0a18",
  chipActiveBg: "#451a03",
  chipActiveBorder: "#facc15",
  errorText: "#f87171",
  errorBg: "rgba(239,68,68,0.12)",
  errorBorder: "rgba(239,68,68,0.35)",
  deleteText: "#fca5a5",
  editText: "#a78bfa",
};

export const lightColors: typeof darkColors = {
  bg: "#fafaff",
  surface: "#ffffff",
  surfaceElevated: "#f5f3ff",
  surfaceCanvas: "#1f1c3e",
  border: "#e0d8f5",
  borderSoft: "#edeafa",
  text: "#1e1b3a",
  textMuted: "#534f73",
  textDim: "#9590b8",
  placeholder: "#c4bbd9",
  accent: "#6d28d9",
  accentBright: "#5b21b6",
  accentSoft: "#ede9fe",
  accentTint: "rgba(109,40,217,0.08)",
  accentTintBorder: "rgba(109,40,217,0.3)",
  success: "#16a34a",
  dangerBorder: "#fecaca",
  dangerSoft: "rgba(220,38,38,0.1)",
  warn: "#d97706",
  warnSoft: "#fef3c7",
  warnText: "#92400e",
  gold: "#d97706",
  goldTint: "rgba(217,119,6,0.08)",
  goldTintBorder: "rgba(217,119,6,0.3)",
  canvasText: "#e2dfef",
  canvasTextStrong: "#f8fafc",
  canvasGrid: "#332c5a",
  heroFrom: "#c7d2fe",
  heroVia: "#ddd6fe",
  heroTo: "#faf5ff",
  chipActiveBg: "#fef3c7",
  chipActiveBorder: "#eab308",
  errorText: "#dc2626",
  errorBg: "rgba(220,38,38,0.08)",
  errorBorder: "rgba(220,38,38,0.3)",
  deleteText: "#dc2626",
  editText: "#6d28d9",
};

export type ThemeColors = typeof darkColors;

export const getColors = (scheme: ColorScheme): ThemeColors =>
  scheme === "dark" ? darkColors : lightColors;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
};

export const type = {
  display: { fontSize: 24, fontWeight: "800" as const, letterSpacing: -0.4 },
  title: { fontSize: 20, fontWeight: "800" as const, letterSpacing: -0.2 },
  heading: { fontSize: 15, fontWeight: "700" as const },
  body: { fontSize: 14, lineHeight: 20, fontWeight: "400" as const },
  caption: { fontSize: 12, fontWeight: "600" as const },
  overline: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
};

// Kept for back-compat: old code imported { colors } directly. Defaults to dark.
export const colors = darkColors;
