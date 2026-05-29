/**
 * Central colour palette for the recovery dashboard.
 * Mirrored in tailwind.config.ts so it can be used both as Tailwind
 * classes (layout/UI) and as raw hex values (Recharts, which needs strings).
 */
export const palette = {
  bg: "#0a0a0b",
  panel: "#141416",
  panel2: "#1c1c1f",
  border: "#27272a",
  text: "#e4e4e7",
  mute: "#71717a",
  accent: "#f59e0b",
  heart: "#ef4444",
  hrv: "#a78bfa",
  steps: "#10b981",
  cal: "#f97316",
  walk: "#38bdf8",
} as const;

export type Palette = typeof palette;
