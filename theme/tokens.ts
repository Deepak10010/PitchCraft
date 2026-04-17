export type ColorScheme = "dark" | "light";

export const darkColors = {
  bg: "#030712",
  surface: "#0b1020",
  surfaceElevated: "#111827",
  surfaceCanvas: "#0b1020",
  border: "#1e293b",
  borderSoft: "#0f172a",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  textDim: "#64748b",
  placeholder: "#475569",
  accent: "#2563eb",
  accentBright: "#3b82f6",
  accentSoft: "#1e3a8a",
  accentTint: "rgba(59,130,246,0.12)",
  accentTintBorder: "rgba(59,130,246,0.3)",
  success: "#16a34a",
  dangerBorder: "#7f1d1d",
  dangerSoft: "rgba(127,29,29,0.15)",
  warn: "#f59e0b",
  warnSoft: "#422006",
  warnText: "#fcd34d",
  gold: "#fbbf24",
  goldTint: "rgba(251,191,36,0.08)",
  goldTintBorder: "rgba(251,191,36,0.4)",
  canvasText: "#cbd5e1",
  canvasTextStrong: "#f8fafc",
  canvasGrid: "#1e293b",
  heroFrom: "#1e1b4b",
  heroVia: "#0b1020",
  heroTo: "#030712",
  chipActiveBg: "#422006",
  chipActiveBorder: "#facc15",
  errorText: "#f87171",
  errorBg: "rgba(239,68,68,0.1)",
  errorBorder: "rgba(239,68,68,0.3)",
  deleteText: "#fca5a5",
  editText: "#93c5fd",
};

export const lightColors: typeof darkColors = {
  bg: "#f8fafc",
  surface: "#ffffff",
  surfaceElevated: "#f1f5f9",
  surfaceCanvas: "#0f172a",
  border: "#e2e8f0",
  borderSoft: "#f1f5f9",
  text: "#0f172a",
  textMuted: "#475569",
  textDim: "#94a3b8",
  placeholder: "#cbd5e1",
  accent: "#2563eb",
  accentBright: "#1d4ed8",
  accentSoft: "#dbeafe",
  accentTint: "rgba(37,99,235,0.08)",
  accentTintBorder: "rgba(37,99,235,0.25)",
  success: "#16a34a",
  dangerBorder: "#fecaca",
  dangerSoft: "rgba(248,113,113,0.12)",
  warn: "#d97706",
  warnSoft: "#fef3c7",
  warnText: "#92400e",
  gold: "#d97706",
  goldTint: "rgba(217,119,6,0.1)",
  goldTintBorder: "rgba(217,119,6,0.3)",
  canvasText: "#e2e8f0",
  canvasTextStrong: "#f8fafc",
  canvasGrid: "#1e293b",
  heroFrom: "#dbeafe",
  heroVia: "#eff6ff",
  heroTo: "#ffffff",
  chipActiveBg: "#fef3c7",
  chipActiveBorder: "#eab308",
  errorText: "#b91c1c",
  errorBg: "rgba(239,68,68,0.08)",
  errorBorder: "rgba(239,68,68,0.3)",
  deleteText: "#b91c1c",
  editText: "#1d4ed8",
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

// Colors that stay identical across themes (interval palette, role palette)
// are defined in lib/intervals.ts — the theme only skins chrome.

// Kept for back-compat: old code imported { colors } directly. Now default to dark.
export const colors = darkColors;
