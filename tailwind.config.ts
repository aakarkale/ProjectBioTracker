import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Recovery dashboard palette (mirrors lib/theme.ts)
        bg: "#0a0a0b",
        panel: "#141416",
        panel2: "#1c1c1f",
        line: "#27272a",
        ink: "#e4e4e7",
        mute: "#71717a",
        accent: "#f59e0b",
        heart: "#ef4444",
        hrv: "#a78bfa",
        steps: "#10b981",
        cal: "#f97316",
        walk: "#38bdf8",
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
