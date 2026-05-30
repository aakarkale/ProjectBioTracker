"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const linkError = params.get("error") === "link";
  const demoError = params.get("error") === "demo";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setStatus("error");
      setMessage("Backend not configured yet — running in demo mode.");
      return;
    }
    setStatus("sending");
    const supabase = createClient();
    const emailRedirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="grain flex min-h-screen items-center justify-center bg-bg px-5">
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs uppercase tracking-widest text-mute">
          BioTracker
        </p>
        <h1 className="mt-2 font-serif text-3xl font-medium leading-tight">
          Sign in
          <span className="block font-light italic text-accent">
            to your dashboard.
          </span>
        </h1>

        {status === "sent" ? (
          <div className="mt-8 rounded-2xl border border-line bg-panel p-5">
            <p className="text-sm text-ink">Check your inbox.</p>
            <p className="mt-2 text-xs leading-relaxed text-mute">
              We sent a magic link to{" "}
              <span className="font-mono text-ink">{email}</span>. Click it to
              finish signing in.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-3">
            <label className="block">
              <span className="font-mono text-xs uppercase tracking-wider text-mute">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-line bg-panel px-4 py-3 font-mono text-sm text-ink outline-none transition-colors placeholder:text-mute focus:border-accent"
              />
            </label>
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </button>
            {(status === "error" || linkError) && (
              <p className="font-mono text-xs text-heart">
                {message || "That link expired or was invalid. Try again."}
              </p>
            )}
            {!isSupabaseConfigured && (
              <p className="font-mono text-xs text-mute">
                Demo mode: the dashboard is viewable without signing in.
              </p>
            )}
          </form>
        )}

        <div className="mt-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="font-mono text-xs text-mute">or</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <a
          href="/demo"
          className="mt-4 block w-full rounded-xl border border-line py-3 text-center text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
        >
          View live demo
        </a>
        {demoError && (
          <p className="mt-2 font-mono text-xs text-heart">
            Demo isn&apos;t available right now. Try the magic link above.
          </p>
        )}

        <p className="mt-6 font-mono text-xs text-mute">
          We&apos;ll email you a one-time link. No password to remember. The demo
          uses a shared sample account.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
