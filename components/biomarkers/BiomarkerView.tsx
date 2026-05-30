"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import type { Biomarker } from "@/lib/queries";
import { BiomarkerModal, type BiomarkerGroup } from "./BiomarkerModal";

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

const SORTS = [
  { id: "status", label: "Status" },
  { id: "type", label: "Type" },
  { id: "date", label: "Date tested" },
  { id: "name", label: "Name (A–Z)" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

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
      category: latest.category,
      latestValue: latest.value,
      referenceLow: latest.reference_low,
      referenceHigh: latest.reference_high,
      latestDate: latest.measured_on,
      series: sorted.map((r) => ({ date: r.measured_on, value: r.value })),
    });
  }
  return groups;
}

function sortGroups(groups: BiomarkerGroup[], by: SortId): BiomarkerGroup[] {
  const arr = [...groups];
  switch (by) {
    case "name":
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "type":
      return arr.sort(
        (a, b) =>
          (a.category ?? "~").localeCompare(b.category ?? "~") ||
          a.name.localeCompare(b.name)
      );
    case "date":
      return arr.sort(
        (a, b) =>
          (b.latestDate ?? "").localeCompare(a.latestDate ?? "") ||
          a.name.localeCompare(b.name)
      );
    default: // status
      return arr.sort(
        (a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name)
      );
  }
}

function SortMenu({ value, onChange }: { value: SortId; onChange: (s: SortId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORTS.find((s) => s.id === value)!;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 font-mono text-xs text-mute transition-colors hover:text-ink"
      >
        <ArrowUpDown size={12} />
        Sort: <span className="text-ink">{current.label}</span>
        <ChevronDown size={12} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-line bg-panel shadow-xl"
        >
          <p className="px-3 pt-2 font-mono text-[10px] uppercase tracking-wider text-mute">
            Sort by
          </p>
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="menuitemradio"
              aria-checked={value === s.id}
              onClick={() => {
                onChange(s.id);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-panel2"
            >
              {s.label}
              {value === s.id && <Check size={14} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BiomarkerView({
  biomarkers,
  aiEnabled,
}: {
  biomarkers: Biomarker[];
  aiEnabled: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sortBy, setSortBy] = useState<SortId>("status");
  const [selected, setSelected] = useState<BiomarkerGroup | null>(null);

  const groups = useMemo(() => buildGroups(biomarkers), [biomarkers]);

  const counts = useMemo(() => {
    const c = { all: groups.length, critical: 0, borderline: 0, normal: 0 };
    for (const g of groups) if (g.status in c) (c as Record<string, number>)[g.status]++;
    return c;
  }, [groups]);

  const shown = useMemo(() => {
    const filtered = filter === "all" ? groups : groups.filter((g) => g.status === filter);
    return sortGroups(filtered, sortBy);
  }, [groups, filter, sortBy]);

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-panel p-8 text-center">
        <p className="text-sm text-ink">No biomarkers yet.</p>
        <p className="mt-2 text-xs text-mute">
          Upload a medical report and Claude will extract your lab values here.
          Manage uploaded reports on the Upload page.
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
      {/* Status filters + sort */}
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
        <SortMenu value={sortBy} onChange={setSortBy} />
      </div>

      {/* Biomarker tiles (one per marker — click for trend + AI insight) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((g) => {
          const range =
            g.referenceLow != null || g.referenceHigh != null
              ? `${g.referenceLow ?? "–"}–${g.referenceHigh ?? "–"}`
              : "—";
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
                <span>
                  {readings > 1 ? `${readings} readings →` : (g.latestDate ?? "")}
                </span>
              </div>
            </button>
          );
        })}
      </div>

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
