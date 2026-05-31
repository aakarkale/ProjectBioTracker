import Link from "next/link";
import { Activity, ArrowRight, FileText, Upload } from "lucide-react";
import { AppNav } from "@/components/AppNav";

const KPIS = [
  { label: "Resting HR", unit: "bpm", context: "Target <65", color: "#ef4444" },
  { label: "HRV", unit: "ms", context: "Higher = recovered", color: "#a78bfa" },
  { label: "Steps / day", unit: "", context: "Aim 8k+", color: "#10b981" },
  { label: "Exercise min", unit: "/day", context: "Aim 30+", color: "#f97316" },
];

const STEPS = [
  {
    n: 1,
    icon: Activity,
    title: "Connect your health data",
    body: "Sync Apple Health or Android (Health Connect). We walk you through it step by step for your phone — set up once and your metrics flow in automatically.",
    href: "/settings",
    cta: "Set up sync",
    accent: "#10b981",
  },
  {
    n: 2,
    icon: Upload,
    title: "Or upload metrics",
    body: "Already have a CSV or JSON export of your daily Apple Health metrics? Drop it in and the dashboard fills instantly.",
    href: "/upload",
    cta: "Upload metrics",
    accent: "#38bdf8",
  },
  {
    n: 3,
    icon: FileText,
    title: "Add lab reports",
    body: "Upload a PDF or photo of a lab report — Claude reads it and extracts your biomarkers with reference ranges and status.",
    href: "/upload",
    cta: "Upload a report",
    accent: "#a78bfa",
  },
];

/** Onboarding state shown to a signed-in user who has no data yet. */
export function EmptyDashboard({
  userEmail,
  displayName = "My",
}: {
  userEmail: string | null;
  displayName?: string;
}) {
  return (
    <div className="min-h-screen w-full bg-bg text-ink">
      <div className="grain min-h-screen">
        <div className="mx-auto w-full max-w-5xl">
          <AppNav userEmail={userEmail} />

          {/* Header */}
          <header className="border-b border-line px-5 pb-6 pt-8 sm:px-8">
            <p className="font-mono text-xs uppercase tracking-widest text-mute">
              Welcome
            </p>
            <h1 className="mt-2 font-serif text-3xl font-medium leading-tight sm:text-4xl">
              {displayName}&rsquo;s Health{" "}
              <span className="font-light italic text-accent">Dashboard.</span>
            </h1>
            <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-mute">
              It&apos;s empty for now. Connect Apple Health or upload your data
              and this fills with your cardiovascular recovery, activity, and lab
              biomarkers — all private to you.
            </p>
          </header>

          {/* Ghost KPI row — structure preview, no fake numbers */}
          <section className="grid grid-cols-2 gap-3 px-5 py-6 sm:px-8 lg:grid-cols-4">
            {KPIS.map((k) => (
              <div
                key={k.label}
                className="rounded-2xl border border-line bg-panel p-4 opacity-60 sm:p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-mute">
                    {k.label}
                  </span>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: k.color }}
                    aria-hidden
                  />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="tnum font-mono text-3xl font-medium text-mute sm:text-4xl">
                    —
                  </span>
                  <span className="font-mono text-xs text-mute">{k.unit}</span>
                </div>
                <div className="mt-3">
                  <span className="font-mono text-xs text-mute">{k.context}</span>
                </div>
              </div>
            ))}
          </section>

          {/* Get started steps */}
          <section className="px-5 pb-12 sm:px-8">
            <h2 className="mb-4 font-serif text-xl font-medium">Get started</h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {STEPS.map((s) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.n}
                    href={s.href}
                    className="group flex flex-col rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-mute"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-full border"
                        style={{ borderColor: `${s.accent}55`, color: s.accent }}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="font-mono text-xs text-mute">
                        Step {s.n}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-ink">{s.title}</h3>
                    <p className="mt-1.5 flex-1 text-xs leading-relaxed text-mute">
                      {s.body}
                    </p>
                    <span
                      className="mt-4 inline-flex items-center gap-1 font-mono text-xs"
                      style={{ color: s.accent }}
                    >
                      {s.cta}
                      <ArrowRight
                        size={12}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <footer className="border-t border-line px-5 pb-8 pt-4 sm:px-8">
            <p className="font-mono text-xs text-mute">
              Private to your account · Not medical advice
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
