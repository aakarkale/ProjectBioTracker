"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles, X } from "lucide-react";
import { palette } from "@/lib/theme";

export type BiomarkerGroup = {
  name: string;
  unit: string | null;
  status: "normal" | "borderline" | "critical" | "unknown";
  category: string | null;
  reportTypes: string[];
  latestValue: number | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  latestDate: string | null;
  series: { date: string | null; value: number | null }[];
};

const STATUS_COLOR: Record<BiomarkerGroup["status"], string> = {
  normal: "#10b981",
  borderline: "#f59e0b",
  critical: "#ef4444",
  unknown: "#71717a",
};

export function BiomarkerModal({
  group,
  aiEnabled,
  onClose,
}: {
  group: BiomarkerGroup;
  aiEnabled: boolean;
  onClose: () => void;
}) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const points = group.series
    .filter((p) => p.value !== null)
    .map((p) => ({ date: p.date ?? "—", value: p.value as number }));
  const hasTrend = points.length >= 2;
  const color = STATUS_COLOR[group.status];

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Fetch the AI insight when opened.
  useEffect(() => {
    if (!aiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/biomarker-insight", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: group.name }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) setError(data.error ?? "Couldn't generate insight.");
        else setInsight(data.insight ?? "");
      })
      .catch(() => !cancelled && setError("Network error."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [group.name, aiEnabled]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-serif text-xl font-medium">{group.name}</h3>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="tnum font-mono text-2xl text-ink">
                {group.latestValue ?? "—"}
              </span>
              <span className="font-mono text-xs text-mute">{group.unit ?? ""}</span>
              <span className="font-mono text-xs" style={{ color }}>
                {group.status}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-line p-1.5 text-mute transition-colors hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        {/* Trend */}
        {hasTrend ? (
          <div className="rounded-xl border border-line bg-panel2 p-3">
            <p className="mb-2 font-mono text-xs text-mute">
              {points.length} readings over time
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={points} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={palette.border} strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: palette.mute, fontFamily: "var(--font-jetbrains-mono), monospace" }}
                  axisLine={{ stroke: palette.border }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: palette.mute, fontFamily: "var(--font-jetbrains-mono), monospace" }}
                  axisLine={false}
                  tickLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    background: palette.panel2,
                    border: `1px solid ${palette.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                  }}
                  labelStyle={{ color: palette.text }}
                />
                {group.referenceLow != null && (
                  <ReferenceLine y={group.referenceLow} stroke={palette.steps} strokeDasharray="3 3" strokeOpacity={0.4} />
                )}
                {group.referenceHigh != null && (
                  <ReferenceLine y={group.referenceHigh} stroke={palette.steps} strokeDasharray="3 3" strokeOpacity={0.4} />
                )}
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
            {(group.referenceLow != null || group.referenceHigh != null) && (
              <p className="mt-2 font-mono text-xs text-mute">
                Reference {group.referenceLow ?? "–"}–{group.referenceHigh ?? "–"}{" "}
                {group.unit ?? ""} (dashed)
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-panel2 p-4">
            <p className="text-xs text-mute">
              Only one reading so far. Upload another report from a different date
              to see how {group.name} is trending.
            </p>
          </div>
        )}

        {/* AI insight */}
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-1.5">
            <Sparkles size={12} className="text-hrv" />
            <span className="font-mono text-xs uppercase tracking-wider text-hrv">
              AI insight
            </span>
          </div>
          {!aiEnabled ? (
            <p className="text-xs text-mute">
              Add an Anthropic API key to get personalised insights.
            </p>
          ) : loading ? (
            <p className="animate-pulse text-xs text-mute">Analysing your trend…</p>
          ) : error ? (
            <p className="font-mono text-xs text-heart">{error}</p>
          ) : (
            <p className="text-sm leading-relaxed text-ink">{insight}</p>
          )}
          <p className="mt-3 font-mono text-xs text-mute">
            Informational only · not medical advice
          </p>
        </div>
      </div>
    </div>
  );
}
