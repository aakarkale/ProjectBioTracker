import { palette } from "@/lib/theme";

/** Shared axis tick styling for every chart. */
export const tickStyle = {
  fontSize: 10,
  fill: palette.mute,
  fontFamily: "var(--font-jetbrains-mono), monospace",
} as const;

export const xTickStyle = { ...tickStyle, fontSize: 9 } as const;

/** Tooltip container styling. */
export const tooltipContentStyle = {
  background: palette.panel2,
  border: `1px solid ${palette.border}`,
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "var(--font-jetbrains-mono), monospace",
} as const;

export const tooltipLabelStyle = { color: palette.text } as const;

/** Show roughly 5 evenly-spaced x labels regardless of range length. */
export function xInterval(length: number) {
  return Math.max(0, Math.floor(length / 5));
}

/** Wraps each chart's header (title + subtitle). */
export function ChartHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h3 className="font-serif text-lg font-medium">{title}</h3>
        <p className="mt-0.5 text-xs text-mute">{subtitle}</p>
      </div>
    </div>
  );
}
