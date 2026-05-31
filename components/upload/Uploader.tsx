"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, Copy, Loader2, Sparkles } from "lucide-react";
import { resolveBiomarkerCanonical, updateReport } from "@/app/reports/actions";

/** Max files accepted in a single batch (uploaded sequentially). */
const MAX_FILES = 20;

type FileState = "queued" | "uploading" | "done" | "duplicate" | "error";

type FileResult = {
  name: string;
  state: FileState;
  message: string;
  reportId?: string;
  needsDate?: boolean;
};

type ReviewCandidate = { key: string; label: string };
type ReviewItem = {
  id: string;
  name: string;
  candidates: ReviewCandidate[];
  currentKey: string;
  currentLabel: string;
};

/** Human-in-the-loop fallback: confirm an uncertain marker's identity. */
function ConfirmMarker({ item }: { item: ReviewItem }) {
  const router = useRouter();
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function choose(key: string, label: string) {
    start(async () => {
      await resolveBiomarkerCanonical(item.id, key);
      setDone(label);
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-line bg-panel px-3 py-2">
      <p className="font-mono text-xs text-ink">{item.name}</p>
      {done ? (
        <p className="mt-1 font-mono text-xs text-steps">saved as {done} ✓</p>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.candidates.map((c) => (
            <button
              key={c.key}
              type="button"
              disabled={pending}
              onClick={() => choose(c.key, c.label)}
              className="rounded-full border border-hrv/50 px-2.5 py-1 font-mono text-xs text-hrv transition-colors hover:bg-hrv/10 disabled:opacity-50"
            >
              {c.label}
            </button>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => choose(item.currentKey, item.currentLabel)}
            className="rounded-full border border-line px-2.5 py-1 font-mono text-xs text-mute transition-colors hover:text-ink disabled:opacity-50"
          >
            Keep as &ldquo;{item.currentLabel}&rdquo;
          </button>
        </div>
      )}
    </li>
  );
}

/** Inline date prompt for a report whose lab-test date wasn't detected. */
function DateFix({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  if (saved) return <span className="font-mono text-xs text-steps">date saved ✓</span>;

  return (
    <div className="mt-1 flex gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg border border-line bg-panel px-2 py-1 font-mono text-xs text-ink outline-none focus:border-accent"
      />
      <button
        type="button"
        disabled={!date || pending}
        onClick={() =>
          start(async () => {
            await updateReport(reportId, { reportDate: date });
            setSaved(true);
            router.refresh();
          })
        }
        className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-bg disabled:opacity-50"
      >
        {pending ? "…" : "Set date"}
      </button>
    </div>
  );
}

function UploadCard({
  kind,
  title,
  description,
  accept,
  endpoint,
  cta,
}: {
  kind: "metrics" | "report";
  title: string;
  description: string;
  accept: string;
  endpoint: string;
  cta: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<FileResult[]>([]);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPick(list: FileList | null) {
    setError(null);
    setResults([]);
    setReview([]);
    const picked = list ? Array.from(list) : [];
    if (picked.length > MAX_FILES) {
      setError(`Up to ${MAX_FILES} files at a time — taking the first ${MAX_FILES}.`);
    }
    setFiles(picked.slice(0, MAX_FILES));
  }

  function messageFor(data: Record<string, unknown>): { state: FileState; message: string } {
    if (data.duplicate) return { state: "duplicate", message: "already uploaded — skipped" };
    if (kind === "metrics") return { state: "done", message: `${data.days ?? 0} days imported` };
    if (data.status === "pending")
      return { state: "done", message: "stored (add an Anthropic key to extract)" };
    if (data.needsDate)
      return { state: "done", message: `${data.count ?? 0} biomarkers — set the lab test date` };
    return { state: "done", message: `${data.count ?? 0} biomarkers extracted` };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setError("Choose one or more files first.");
      return;
    }
    setBusy(true);
    setError(null);
    setReview([]);
    const initial: FileResult[] = files.map((f) => ({
      name: f.name,
      state: "queued",
      message: "waiting…",
    }));
    setResults(initial);

    for (let i = 0; i < files.length; i++) {
      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, state: "uploading", message: "uploading…" } : r))
      );
      const body = new FormData();
      body.append("file", files[i]);
      try {
        const res = await fetch(endpoint, { method: "POST", body });
        const data = await res.json();
        if (!res.ok) {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, state: "error", message: data.error ?? "failed" } : r
            )
          );
          continue;
        }
        const { state, message } = messageFor(data);
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  state,
                  message,
                  reportId: data.reportId as string | undefined,
                  needsDate: Boolean(data.needsDate),
                }
              : r
          )
        );
        if (Array.isArray(data.review) && data.review.length > 0) {
          setReview((prev) => [...prev, ...(data.review as ReviewItem[])]);
        }
      } catch {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, state: "error", message: "network error" } : r
          )
        );
      }
    }

    setBusy(false);
    router.refresh();
  }

  const ICON: Record<FileState, React.ReactNode> = {
    queued: <Loader2 size={13} className="text-mute" />,
    uploading: <Loader2 size={13} className="animate-spin text-accent" />,
    done: <Check size={13} className="text-steps" />,
    duplicate: <Copy size={13} className="text-mute" />,
    error: <CircleAlert size={13} className="text-heart" />,
  };

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-line bg-panel p-5">
      <h3 className="font-serif text-lg font-medium">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-mute">{description}</p>

      <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-line bg-panel2 px-4 py-6 text-center transition-colors hover:border-accent">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />
        <span className="font-mono text-xs text-mute">
          {files.length === 0
            ? `Click to choose files (up to ${MAX_FILES})`
            : files.length === 1
              ? files[0].name
              : `${files.length} files selected`}
        </span>
      </label>

      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Working…" : files.length > 1 ? `${cta} (${files.length})` : cta}
      </button>

      {error && <p className="mt-3 font-mono text-xs text-heart">{error}</p>}

      {results.length > 0 && (
        <ul className="mt-4 space-y-2">
          {results.map((r, i) => (
            <li key={i} className="rounded-lg border border-line bg-panel2 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="shrink-0">{ICON[r.state]}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink">
                  {r.name}
                </span>
                <span
                  className={`shrink-0 font-mono text-xs ${
                    r.state === "error" ? "text-heart" : "text-mute"
                  }`}
                >
                  {r.message}
                </span>
              </div>
              {r.needsDate && r.reportId && <DateFix reportId={r.reportId} />}
            </li>
          ))}
        </ul>
      )}

      {review.length > 0 && (
        <div className="mt-4 rounded-xl border border-hrv/40 bg-hrv/5 p-3">
          <p className="mb-1 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-hrv">
            <Sparkles size={12} /> Confirm a few markers
          </p>
          <p className="mb-2 text-xs text-mute">
            We weren&apos;t fully sure what these are. Pick the right match so
            readings stay on one trend.
          </p>
          <ul className="space-y-2">
            {review.map((it) => (
              <ConfirmMarker key={it.id} item={it} />
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

export function Uploader() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <UploadCard
        kind="metrics"
        title="Daily metrics"
        description="One or more CSV/JSON files of daily Apple Health metrics (columns like date, steps, rhr, hrv, exercise_min, walking_hr). Also accepts Health Auto Export JSON."
        accept=".csv,.json,application/json,text/csv"
        endpoint="/api/upload/metrics"
        cta="Upload metrics"
      />
      <UploadCard
        kind="report"
        title="Medical reports"
        description="One or more PDF, image, CSV, or text lab reports. Claude reads each and extracts biomarkers with reference ranges (max 10MB per file)."
        accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt"
        endpoint="/api/reports"
        cta="Upload reports"
      />
    </div>
  );
}
