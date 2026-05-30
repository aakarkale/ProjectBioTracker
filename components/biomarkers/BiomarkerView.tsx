"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { Biomarker, ReportRow } from "@/lib/queries";
import { BiomarkerModal, type BiomarkerGroup } from "./BiomarkerModal";
import { ReportHistory } from "./ReportHistory";

const STATUS_COLORS: Record<Biomarker["status"], string> = {
  normal: "#10b981",
  borderline: "#f59e0b",
  critical: "#ef4444",
  unknown: "#71717a",
};

const FILTERS = ["all", "critical", "borderline", "normal"] as const;
type Filter = (typeof FILTERS)[number];

const RANK: Record<Biomarker["status"], number> = {
  critical: 0,
  borderline: 1,
  normal: 2,
  unknown: 3,
};

type Recommendation = {
  title: string;
  rationale: string;
  actions: string[];
  priority: "high" | "medium" | "low";
  related_markers: string[];
};

const PRIORITY_COLOR: Record<Recommendation["priority"], string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

/** Collapse biomarker rows into one group per name (latest value + full series). */
function buildGroups(biomarkers: Biomarker[]): BiomarkerGroup[] {
  const byName = new Map<string, Biomarker[]>();
  for (const b of biomarkers) {
    const arr = byName.get(b.name) ?? [];
    arr.push(b);
    byName.set(b.name, arr);
  }
  const groups: BiomarkerGroup[] = [];
  for (const [name, rows] of byName) {
    const sorted = [...rows].sort((a, b) =>
      (a.measured_on ?? "").localeCompare(b.measured_on ?? "")
    );
    const latest = sorted[sorted.length - 1];
    groups.push({
      name,
      unit: latest.unit,
      status: latest.status,
      latestValue: latest.value,
      referenceLow: latest.reference_low,
      referenceHigh: latest.reference_high,
      series: sorted.map((r) => ({ date: r.measured_on, value: r.value })),
    });
  }
  groups.sort((a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name));
  return groups;
}

export function BiomarkerView({
  biomarkers,
  reports,
  aiEnabled,
}: {
  biomarkers: Biomarker[];
  reports: ReportRow[];
  aiEnabled: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<BiomarkerGroup | null>(null);
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => buildGroups(biomarkers), [biomarkers]);

  const counts = useMemo(() => {
    const c = { all: groups.length, critical: 0, borderline: 0, normal: 0 };
    for (const g of groups) if (g.status in c) (c as Record<string, number>)[g.status]++;
    return c;
  }, [groups]);

  const shown = useMemo(
    () => (filter === "all" ? groups : groups.filter((g) => g.status === filter)),
    [groups, filter]
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

  if (groups.length === 0) {
    return (
      <div className="space-y-6">
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
        <ReportHistory reports={reports} />
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

      {/* Biomarker tiles (one per marker — click for trend + AI insight) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((g) => {
          const range =
            g.referenceLow != null || g.referenceHigh != null
              ? `${g.referenceLow ?? "–"}–${g.referenceHigh ?? "–"}`
              : "—";
          const latestDate = g.series[g.series.length - 1]?.date;
          const readings = g.series.filter((p) => p.value !== null).length;
          return (
            <button
              key={g.name}
              type="button"
              onClick={() => setSelected(g)}
              className="rounded-2xl border border-line bg-panel p-4 text-left transition-colors hover:border-mute"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-ink">{g.name}</span>
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: STATUS_COLORS[g.status] }}
                  title={g.status}
                />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="tnum font-mono text-2xl text-ink">
                  {g.latestValue ?? "—"}
                </span>
                <span className="font-mono text-xs text-mute">{g.unit ?? ""}</span>
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-xs text-mute">
                <span>ref {range}</span>
                <span>{readings > 1 ? `${readings} readings →` : (latestDate ?? "")}</span>
              </div>
            </button>
          );
        })}
      </div>

      <ReportHistory reports={reports} />

      {selected && (
        <BiomarkerModal
          group={selected}
          aiEnabled={aiEnabled}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
