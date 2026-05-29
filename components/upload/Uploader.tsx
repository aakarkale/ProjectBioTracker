"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Status =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

function UploadCard({
  title,
  description,
  accept,
  endpoint,
  cta,
  successMessage,
}: {
  title: string;
  description: string;
  accept: string;
  endpoint: string;
  cta: string;
  successMessage: (data: Record<string, unknown>) => string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fileName, setFileName] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setStatus({ kind: "error", message: "Choose a file first." });
      return;
    }
    setStatus({ kind: "uploading" });
    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch(endpoint, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: data.error ?? "Upload failed." });
        return;
      }
      setStatus({ kind: "ok", message: successMessage(data) });
      router.refresh();
    } catch {
      setStatus({ kind: "error", message: "Network error." });
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-line bg-panel p-5"
    >
      <h3 className="font-serif text-lg font-medium">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-mute">{description}</p>

      <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-line bg-panel2 px-4 py-6 text-center transition-colors hover:border-accent">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
        />
        <span className="font-mono text-xs text-mute">
          {fileName || "Click to choose a file"}
        </span>
      </label>

      <button
        type="submit"
        disabled={status.kind === "uploading"}
        className="mt-4 w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {status.kind === "uploading" ? "Working…" : cta}
      </button>

      {status.kind === "ok" && (
        <p className="mt-3 font-mono text-xs text-steps">{status.message}</p>
      )}
      {status.kind === "error" && (
        <p className="mt-3 font-mono text-xs text-heart">{status.message}</p>
      )}
    </form>
  );
}

export function Uploader() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <UploadCard
        title="Daily metrics"
        description="CSV or JSON of daily Apple Health metrics (columns like date, steps, rhr, hrv, exercise_min, walking_hr). Also accepts Health Auto Export JSON."
        accept=".csv,.json,application/json,text/csv"
        endpoint="/api/upload/metrics"
        cta="Upload metrics"
        successMessage={(d) => `Imported ${d.days ?? 0} days of metrics.`}
      />
      <UploadCard
        title="Medical report"
        description="PDF, image, CSV, or text lab report. Claude reads it and extracts biomarkers with reference ranges (max 10MB)."
        accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt"
        endpoint="/api/reports"
        cta="Upload report"
        successMessage={(d) =>
          d.status === "pending"
            ? "Stored. Add an Anthropic key to extract biomarkers."
            : `Extracted ${d.count ?? 0} biomarkers.`
        }
      />
    </div>
  );
}
