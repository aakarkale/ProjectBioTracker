"use client";

import { useState, useTransition } from "react";
import { createIngestToken, revokeIngestToken } from "@/app/settings/actions";

export type TokenRow = {
  id: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
};

export function TokenManager({ tokens }: { tokens: TokenRow[] }) {
  const [pending, startTransition] = useTransition();
  const [newToken, setNewToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  // Resolve the webhook origin on the client.
  if (typeof window !== "undefined" && !origin) {
    setOrigin(window.location.origin);
  }

  const webhookUrl = `${origin || "https://your-app.vercel.app"}/api/ingest/metrics`;

  async function onCreate() {
    setError(null);
    setNewToken(null);
    const res = await createIngestToken();
    if (res.ok) setNewToken(res.token);
    else setError(res.error);
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => startTransition(onCreate)}
        disabled={pending}
        className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Generating…" : "Generate ingest token"}
      </button>
      {error && <p className="font-mono text-xs text-heart">{error}</p>}

      {newToken && (
        <div className="space-y-3 rounded-2xl border border-accent/40 bg-panel p-4">
          <p className="text-sm text-ink">
            Your token — copy it now, it won&apos;t be shown again:
          </p>
          <code className="block break-all rounded-lg border border-line bg-panel2 p-3 font-mono text-xs text-accent">
            {newToken}
          </code>
          <div className="space-y-2 pt-1 text-xs leading-relaxed text-mute">
            <p className="text-ink">Connect Apple Health (no app to build):</p>
            <ol className="list-decimal space-y-1 pl-4">
              <li>
                Install the free <span className="text-ink">Health Auto Export</span>{" "}
                app (or use the Shortcuts app).
              </li>
              <li>
                Add a <span className="text-ink">REST API</span> automation pointing
                to:
                <code className="mt-1 block break-all rounded bg-panel2 px-2 py-1 font-mono text-walk">
                  {webhookUrl}
                </code>
              </li>
              <li>
                Set header{" "}
                <code className="font-mono text-walk">
                  Authorization: Bearer {newToken.slice(0, 10)}…
                </code>{" "}
                (your full token).
              </li>
              <li>
                Select metrics: steps, resting heart rate, HRV, exercise time,
                walking HR, active energy, flights. Send daily.
              </li>
            </ol>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="font-mono text-xs uppercase tracking-wider text-mute">
          Active tokens
        </h3>
        {tokens.length === 0 ? (
          <p className="text-xs text-mute">No tokens yet.</p>
        ) : (
          <ul className="space-y-2">
            {tokens.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-line bg-panel p-3"
              >
                <div>
                  <p className="text-sm text-ink">{t.label ?? "Token"}</p>
                  <p className="font-mono text-xs text-mute">
                    created {new Date(t.created_at).toLocaleDateString()} ·{" "}
                    {t.last_used_at
                      ? `last used ${new Date(t.last_used_at).toLocaleDateString()}`
                      : "never used"}
                    {t.revoked ? " · revoked" : ""}
                  </p>
                </div>
                {!t.revoked && (
                  <button
                    type="button"
                    onClick={() => startTransition(() => revokeIngestToken(t.id))}
                    className="rounded-full border border-line px-3 py-1 font-mono text-xs text-mute transition-colors hover:text-heart"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
