"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { Biomarker } from "@/lib/queries";

type Recommendation = {
  title: string;
  rationale: string;
  actions: string[];
  priority: "high" | "medium" | "low";
  related_markers: string[];
};

const STATUS_COLORS: Record<Biomarker["status"], string> = {
  normal: "#10b981",
  borderline: "#f59e0b",
  critical: "#ef4444",
  unknown: "#71717a",
};

const FILTERS = ["all", "critical", "borderline", "normal"] as const;
type Filter = (typeof FILTERS)[number];

const PRIORITY_COLOR: Record<Recommendation["priority"], string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

export function BiomarkerView({
  biomarkers,
  aiEnabled,
}: {
  biomarkers: Biomarker[];
  aiEnabled: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { all: biomarkers.length, critical: 0, borderline: 0, normal: 0 };
    for (const b of biomarkers) {
      if (b.status in c) (c as Record<string, number>)[b.status]++;
    }
    return c;
  }, [biomarkers]);

  const shown = useMemo(
    () => (filter === "all" ? biomarkers : biomarkers.filter((b) => b.status === filter)),
    [biomarkers, filter]
  );

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommendations", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Failed to generate.");
      else setRecs(data.recommendations ?? []);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  if (biomarkers.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-panel p-8 text-center">
        <p className="text-sm text-ink">No biomarkers yet.</p>
        <p className="mt-2 text-xs text-mute">
          Upload a medical report and Claude will extract your lab values here.
        </p>
        <a
          href="/upload"
          className="mt-4 inline-block rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-bg"
        >
          Upload a report
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters + AI button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 font-mono text-xs capitalize transition-all ${
                filter === f
                  ? "border-accent bg-accent text-bg"
                  : "border-line text-mute hover:text-ink"
              }`}
            >
              {f} ({counts[f as keyof typeof counts] ?? 0})
            </button>
          ))}
        </div>
        {aiEnabled && (
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-hrv/50 px-3 py-1.5 font-mono text-xs text-hrv transition-colors hover:bg-hrv/10 disabled:opacity-50"
          >
            <Sparkles size={12} />
            {loading ? "Thinking…" : "AI recommendations"}
          </button>
        )}
      </div>

      {error && <p className="font-mono text-xs text-heart">{error}</p>}

      {/* Recommendations */}
      {recs && recs.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-serif text-xl font-medium">Recommendations</h2>
          {recs.map((r, i) => (
            <div key={i} className="rounded-xl border border-line bg-panel p-4">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="rounded px-2 py-0.5 font-mono text-xs uppercase"
                  style={{
                    background: `${PRIORITY_COLOR[r.priority]}20`,
                    color: PRIORITY_COLOR[r.priority],
                    border: `1px solid ${PRIORITY_COLOR[r.priority]}40`,
                  }}
                >
                  {r.priority}
                </span>
                <h4 className="text-sm font-semibold">{r.title}</h4>
              </div>
              <p className="text-xs leading-relaxed text-mute">{r.rationale}</p>
              {r.actions.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-ink">
                  {r.actions.map((a, j) => (
                    <li key={j}>{a}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <p className="font-mono text-xs text-mute">
            Informational only · not medical advice
          </p>
        </div>
      )}

      {/* Biomarker grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((b) => {
          const range =
            b.reference_low != null || b.reference_high != null
              ? `${b.reference_low ?? "–"}–${b.reference_high ?? "–"}`
              : "—";
          return (
            <div key={b.id} className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-ink">{b.name}</span>
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: STATUS_COLORS[b.status] }}
                  title={b.status}
                />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="tnum font-mono text-2xl text-ink">
                  {b.value ?? "—"}
                </span>
                <span className="font-mono text-xs text-mute">{b.unit ?? ""}</span>
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-xs text-mute">
                <span>ref {range}</span>
                {b.measured_on && <span>{b.measured_on}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
