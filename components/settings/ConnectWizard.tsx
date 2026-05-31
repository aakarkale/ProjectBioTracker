"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  KeyRound,
  RefreshCw,
  Smartphone,
  Upload,
  Zap,
} from "lucide-react";
import { createIngestToken, revokeIngestToken } from "@/app/settings/actions";
import type { TokenRow } from "@/components/settings/TokenManager";

type Platform = "apple" | "android";
type Method = "api" | "manual";

const PLATFORMS: { id: Platform; label: string; sub: string }[] = [
  { id: "apple", label: "iPhone", sub: "Apple Health" },
  { id: "android", label: "Android", sub: "Health Connect" },
];

const METHODS: { id: Method; label: string; sub: string; icon: typeof Zap }[] = [
  {
    id: "api",
    label: "Auto-sync",
    sub: "Updates through the day. Set up once, runs in the background.",
    icon: Zap,
  },
  {
    id: "manual",
    label: "Manual upload",
    sub: "Export a file and upload it. A snapshot — no automatic updates.",
    icon: Upload,
  },
];

function Choice({
  label,
  sub,
  icon: Icon,
  onClick,
}: {
  label: string;
  sub: string;
  icon?: typeof Zap;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-2xl border border-line bg-panel p-4 text-left transition-colors hover:border-accent"
    >
      {Icon && (
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-mute group-hover:text-accent">
          <Icon size={16} />
        </span>
      )}
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-mute">{sub}</span>
      </span>
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-panel2 font-mono text-xs text-accent">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">{title}</p>
        {children && <div className="mt-1.5">{children}</div>}
      </div>
    </li>
  );
}

/** The token + webhook block used by the auto-sync (API) path. */
function SyncCredentials({
  webhookUrl,
  tokens,
}: {
  webhookUrl: string;
  tokens: TokenRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = tokens.filter((t) => !t.revoked);

  function generate() {
    setError(null);
    start(async () => {
      const res = await createIngestToken();
      if (res.ok) setToken(res.token);
      else setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-line bg-panel2 p-3">
      <p className="font-mono text-xs text-mute">Your ingestion URL</p>
      <code className="mt-1 block break-all rounded-lg border border-line bg-panel px-2 py-1.5 font-mono text-xs text-walk">
        {webhookUrl}
      </code>

      {token ? (
        <>
          <p className="mt-3 font-mono text-xs text-mute">
            Your token — copy it now, it won&apos;t be shown again:
          </p>
          <code className="mt-1 block break-all rounded-lg border border-accent/40 bg-panel px-2 py-1.5 font-mono text-xs text-accent">
            {token}
          </code>
          <p className="mt-1.5 font-mono text-[10px] text-mute">
            Use it as the header <span className="text-ink">Authorization: Bearer {"<token>"}</span>
          </p>
        </>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-bg disabled:opacity-50"
        >
          <KeyRound size={12} />
          {pending ? "Generating…" : active.length ? "Generate a new token" : "Generate sync token"}
        </button>
      )}
      {error && <p className="mt-2 font-mono text-xs text-heart">{error}</p>}

      {active.length > 0 && (
        <ul className="mt-3 space-y-1">
          {active.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-mute">
                token created {new Date(t.created_at).toLocaleDateString()} ·{" "}
                {t.last_used_at ? "in use" : "never used"}
              </span>
              <button
                type="button"
                onClick={() => start(async () => { await revokeIngestToken(t.id); router.refresh(); })}
                className="font-mono text-[10px] text-mute transition-colors hover:text-heart"
              >
                revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadLink() {
  return (
    <a
      href="/upload"
      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink transition-colors hover:border-accent"
    >
      <Upload size={12} /> Go to the Upload page
    </a>
  );
}

export function ConnectWizard({
  tokens,
  webhookPath = "/api/ingest/metrics",
}: {
  tokens: TokenRow[];
  webhookPath?: string;
}) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [method, setMethod] = useState<Method | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);
  const webhookUrl = `${origin || "https://your-app.vercel.app"}${webhookPath}`;

  // ---- Question 1: platform ----
  if (!platform) {
    return (
      <div className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-mute">
          Step 1 · Which phone do you use?
        </p>
        {PLATFORMS.map((p) => (
          <Choice
            key={p.id}
            label={p.label}
            sub={p.sub}
            icon={Smartphone}
            onClick={() => setPlatform(p.id)}
          />
        ))}
      </div>
    );
  }

  // ---- Question 2: method ----
  if (!method) {
    return (
      <div className="space-y-3">
        <Crumbs platform={platform} onReset={() => setPlatform(null)} />
        <p className="font-mono text-xs uppercase tracking-wider text-mute">
          Step 2 · How do you want to connect?
        </p>
        {METHODS.map((m) => (
          <Choice
            key={m.id}
            label={m.label}
            sub={m.sub}
            icon={m.icon}
            onClick={() => setMethod(m.id)}
          />
        ))}
      </div>
    );
  }

  // ---- Tailored steps ----
  return (
    <div className="space-y-4">
      <Crumbs
        platform={platform}
        method={method}
        onReset={() => {
          setPlatform(null);
          setMethod(null);
        }}
        onChangeMethod={() => setMethod(null)}
      />
      <ol className="space-y-4">
        {renderSteps(platform, method, webhookUrl, tokens)}
      </ol>
    </div>
  );
}

function Crumbs({
  platform,
  method,
  onReset,
  onChangeMethod,
}: {
  platform: Platform;
  method?: Method;
  onReset: () => void;
  onChangeMethod?: () => void;
}) {
  const pLabel = PLATFORMS.find((p) => p.id === platform)!.label;
  const mLabel = method ? METHODS.find((m) => m.id === method)!.label : null;
  return (
    <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-mute">
      <button
        type="button"
        onClick={onReset}
        className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 transition-colors hover:text-ink"
      >
        <ArrowLeft size={11} /> Start over
      </button>
      <span className="rounded-full border border-line px-2.5 py-1 text-ink">{pLabel}</span>
      {mLabel && (
        <button
          type="button"
          onClick={onChangeMethod}
          className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-ink transition-colors hover:border-accent"
        >
          <RefreshCw size={10} /> {mLabel}
        </button>
      )}
    </div>
  );
}

function renderSteps(
  platform: Platform,
  method: Method,
  webhookUrl: string,
  tokens: TokenRow[]
): React.ReactNode {
  const creds = <SyncCredentials webhookUrl={webhookUrl} tokens={tokens} />;

  if (platform === "apple" && method === "api") {
    return (
      <>
        <Step n={1} title="Install “Health Auto Export — JSON+CSV” from the App Store, open it, and allow access to Apple Health. Toggle on the metrics you want (Apple defaults them off)." />
        <Step n={2} title="Auto-sync needs the app’s Premium tier (there’s a 7-day trial). The free tier can’t export." />
        <Step n={3} title="Generate your sync token and copy your ingestion URL:">
          {creds}
        </Step>
        <Step n={4} title="In Health Auto Export → create an Automation → REST API. Paste the ingestion URL, add the Authorization: Bearer header with your token, and set format to JSON." />
        <Step n={5} title="Keep the metric set focused (~10 daily-aggregated metrics) — iOS limits large background pushes. Set it to run every few hours, run once to test, then check your dashboard." />
      </>
    );
  }
  if (platform === "apple" && method === "manual") {
    return (
      <>
        <Step n={1} title="Install “Health Auto Export — JSON+CSV” (the one-time Basic purchase enables export) and allow access to Apple Health." />
        <Step n={2} title="Use Quick Export → choose your metrics and a date range → pick CSV or JSON." />
        <Step n={3} title="Save or AirDrop the file to this device." />
        <Step n={4} title="Upload it here:">
          <UploadLink />
        </Step>
        <Step n={5} title="Re-export and re-upload whenever you want fresh data." />
      </>
    );
  }
  if (platform === "android" && method === "api") {
    return (
      <>
        <Step n={1} title="Make sure your wearable/fitness app (Garmin, Fitbit, Samsung Health, Oura, Strava…) is writing into Health Connect — Settings → Health Connect → Data and access." />
        <Step n={2} title="The basic “Health Data Export” app can’t push to an API. For live auto-sync, install Health Sync (paid) or HealthConnectExports (open source) and grant Health Connect permissions." />
        <Step n={3} title="Generate your sync token and copy your ingestion URL:">
          {creds}
        </Step>
        <Step n={4} title="In the app, set the destination to your ingestion URL, add the API key/token, and set format to JSON." />
        <Step n={5} title="Set the sync frequency (e.g. every few hours), run once to test, then confirm your dashboard shows the data." />
      </>
    );
  }
  // android + manual
  return (
    <>
      <Step n={1} title="Confirm Health Connect has your data — Settings → Health Connect → Data and access. If a category is empty, enable it in the source app (e.g. Garmin Connect)." />
      <Step n={2} title="Install “Health Data Export” from the Play Store and grant it Health Connect permissions for the data types you want." />
      <Step n={3} title="Choose your metrics and a date range, and pick CSV (easiest for BioTracker to read)." />
      <Step n={4} title="Export the file, then upload it here:">
        <UploadLink />
      </Step>
      <Step n={5} title="Re-export and re-upload whenever you want fresh data." />
    </>
  );
}
