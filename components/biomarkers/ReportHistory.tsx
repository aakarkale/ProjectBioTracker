"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Check, ChevronDown, Pencil, Trash2, X } from "lucide-react";
import type { ReportRow } from "@/lib/queries";
import { deleteReport, updateReport } from "@/app/reports/actions";

const SORTS = [
  { id: "newest", label: "Date (New to Old)" },
  { id: "oldest", label: "Date (Old to New)" },
] as const;
type SortId = (typeof SORTS)[number]["id"];

/** Sort reports by their lab-test date (falling back to upload date). */
function reportDateKey(r: ReportRow): string {
  return r.collected_on ?? r.created_at?.slice(0, 10) ?? "";
}

function HistorySortMenu({
  value,
  onChange,
}: {
  value: SortId;
  onChange: (s: SortId) => void;
}) {
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
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 font-mono text-xs text-mute transition-colors hover:text-ink"
      >
        <ArrowUpDown size={12} />
        <span className="text-ink">{current.label}</span>
        <ChevronDown size={12} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-panel shadow-xl"
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

export function ReportHistory({
  reports,
  readOnly = false,
}: {
  reports: ReportRow[];
  readOnly?: boolean;
}) {
  const [sortBy, setSortBy] = useState<SortId>("newest");

  const sorted = useMemo(() => {
    const arr = [...reports];
    arr.sort((a, b) =>
      sortBy === "newest"
        ? reportDateKey(b).localeCompare(reportDateKey(a))
        : reportDateKey(a).localeCompare(reportDateKey(b))
    );
    return arr;
  }, [reports, sortBy]);

  if (reports.length === 0) return null;
  return (
    <section className="mt-8">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="font-serif text-xl font-medium">Lab report history</h2>
        <HistorySortMenu value={sortBy} onChange={setSortBy} />
      </div>
      <p className="mb-4 text-xs text-mute">
        {readOnly
          ? "Reports behind this demo account, shown for reference."
          : "Rename a report, set its lab-test date, or delete it (which also removes its biomarkers). Deleting cannot be undone."}
      </p>
      <div className="space-y-2">
        {sorted.map((r) => (
          <ReportItem key={r.id} report={r} readOnly={readOnly} />
        ))}
      </div>
    </section>
  );
}

function ReportItem({ report, readOnly }: { report: ReportRow; readOnly: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(report.title ?? report.file_name);
  const [date, setDate] = useState(report.collected_on ?? "");
  const [error, setError] = useState<string | null>(null);

  const needsDate = !report.collected_on;

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateReport(report.id, { title, reportDate: date || null });
      if (!res.ok) setError(res.error ?? "Save failed");
      else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteReport(report.id);
      if (!res.ok) setError(res.error ?? "Delete failed");
      else router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-accent/40 bg-panel p-4">
        <label className="block">
          <span className="font-mono text-xs uppercase tracking-wider text-mute">
            Report name
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="mt-3 block">
          <span className="font-mono text-xs uppercase tracking-wider text-mute">
            Lab test date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-line bg-panel2 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
          />
        </label>
        {error && <p className="mt-2 font-mono text-xs text-heart">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-bg disabled:opacity-50"
          >
            <Check size={12} /> Save
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setTitle(report.title ?? report.file_name);
              setDate(report.collected_on ?? "");
            }}
            className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs text-mute"
          >
            <X size={12} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-ink">
            {report.title ?? report.file_name}
          </p>
          {report.report_type && (
            <span className="rounded-full border border-hrv/40 bg-hrv/10 px-2 py-0.5 font-mono text-[10px] text-hrv">
              {report.report_type}
            </span>
          )}
        </div>
        <p className="mt-0.5 font-mono text-xs text-mute">
          {needsDate ? (
            <span className="text-accent">⚠ set lab test date</span>
          ) : (
            <>test {report.collected_on}</>
          )}{" "}
          · {report.biomarker_count} biomarkers
          {report.status === "error" ? " · error" : ""}
          {report.status === "pending" ? " · pending extraction" : ""}
        </p>
      </div>
      {!readOnly && (
      <div className="flex shrink-0 items-center gap-1">
        {confirmDelete ? (
          <>
            <span className="font-mono text-xs text-mute">Delete?</span>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded-full border border-heart/50 px-2.5 py-1 font-mono text-xs text-heart disabled:opacity-50"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="rounded-full border border-line px-2.5 py-1 font-mono text-xs text-mute"
            >
              No
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit report"
              className="rounded-full border border-line p-1.5 text-mute transition-colors hover:text-ink"
            >
              <Pencil size={13} />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete report"
              className="rounded-full border border-line p-1.5 text-mute transition-colors hover:text-heart"
            >
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
      )}
    </div>
  );
}

