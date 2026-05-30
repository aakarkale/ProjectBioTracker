"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2, X } from "lucide-react";
import type { ReportRow } from "@/lib/queries";
import { deleteReport, updateReport } from "@/app/reports/actions";

function ReportItem({ report }: { report: ReportRow }) {
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
        <p className="truncate text-sm font-medium text-ink">
          {report.title ?? report.file_name}
        </p>
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
    </div>
  );
}

export function ReportHistory({ reports }: { reports: ReportRow[] }) {
  if (reports.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-1 font-serif text-xl font-medium">Lab report history</h2>
      <p className="mb-4 text-xs text-mute">
        Rename a report, set its lab-test date, or delete it (which also removes
        its biomarkers). Deleting cannot be undone.
      </p>
      <div className="space-y-2">
        {reports.map((r) => (
          <ReportItem key={r.id} report={r} />
        ))}
      </div>
    </section>
  );
}
