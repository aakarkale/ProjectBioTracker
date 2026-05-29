import { TrendingDown, TrendingUp } from "lucide-react";
import type { KpiPair } from "@/lib/analytics";

type Props = {
  label: string;
  data: KpiPair;
  unit: string;
  better: "up" | "down";
  /** dot + delta accent colour */
  color: string;
  /** one of the glow-* utility classes */
  glow: string;
  context: string;
};

export function KpiCard({ label, data, unit, better, color, glow, context }: Props) {
  const { now: value, then: baseline } = data;
  const delta = value !== null && baseline !== null ? value - baseline : null;
  const pct = delta !== null && baseline ? (delta / baseline) * 100 : null;
  const improved =
    delta === null ? null : better === "down" ? delta < 0 : delta > 0;

  const display =
    value === null
      ? "—"
      : value >= 100
        ? Math.round(value).toLocaleString()
        : value.toFixed(1);

  return (
    <div
      className={`rounded-2xl border border-line bg-panel p-4 sm:p-5 ${glow}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-mute">
          {label}
        </span>
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: color }}
          aria-hidden
        />
      </div>

      <div className="flex items-baseline gap-1">
        <span className="tnum font-mono text-3xl font-medium text-ink sm:text-4xl">
          {display}
        </span>
        <span className="font-mono text-xs text-mute">{unit}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-mute">{context}</span>
        {pct !== null && (
          <span
            className="flex items-center gap-0.5 font-mono text-xs"
            style={{ color: improved ? "#10b981" : "#ef4444" }}
          >
            {improved ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(Math.round(pct))}%
          </span>
        )}
      </div>
    </div>
  );
}
