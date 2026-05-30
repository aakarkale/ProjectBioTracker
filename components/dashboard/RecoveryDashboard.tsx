"use client";

import { useMemo, useState } from "react";
import { Activity, Heart, TrendingUp, Zap } from "lucide-react";
import type { DailyMetric } from "@/lib/health-data";
import { DATA_WINDOW } from "@/lib/health-data";
import { buildChartData, buildKpis } from "@/lib/analytics";
import { palette } from "@/lib/theme";
import { KpiCard } from "./KpiCard";
import { Insight } from "./Insight";
import { CardioView } from "./charts/CardioView";
import { ActivityView } from "./charts/ActivityView";
import { WalkingView } from "./charts/WalkingView";
import { IntensityView } from "./charts/IntensityView";
import { AppNav } from "@/components/AppNav";
import { BiomarkerInsightDemo } from "@/components/landing/BiomarkerInsightDemo";

type ViewId = "cardio" | "activity" | "walking" | "intensity";

const VIEWS: { id: ViewId; label: string; icon: typeof Heart }[] = [
  { id: "cardio", label: "Heart", icon: Heart },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "walking", label: "Walk HR", icon: Zap },
  { id: "intensity", label: "Exercise", icon: TrendingUp },
];

const RANGES = [30, 60, 90] as const;

type Props = {
  data: DailyMetric[];
  isSample?: boolean;
  userEmail?: string | null;
  /** "landing" = generic public demo; "app" = personalised signed-in view. */
  variant?: "landing" | "app";
};

export function RecoveryDashboard({
  data,
  isSample = false,
  userEmail = null,
  variant = "app",
}: Props) {
  const [view, setView] = useState<ViewId>("cardio");
  const [range, setRange] = useState<number>(90);
  const isLanding = variant === "landing";

  const chartData = useMemo(
    () => buildChartData(data.slice(-range)),
    [data, range]
  );
  const kpi = useMemo(() => buildKpis(data), [data]);

  return (
    <div className="min-h-screen w-full bg-bg text-ink">
      <div className="grain min-h-screen">
        <div className="mx-auto w-full max-w-5xl">
          <AppNav userEmail={userEmail} />

          {isSample && (
            <div className="border-b border-line bg-panel/40 px-5 py-2 sm:px-8">
              <p className="font-mono text-xs text-mute">
                {userEmail
                  ? "Showing sample data — upload metrics or connect Apple Health to see your own."
                  : "Demo mode — sample data. "}
                {!userEmail && (
                  <a href="/login" className="text-accent hover:underline">
                    Sign in
                  </a>
                )}
                {!userEmail && " to track your own."}
              </p>
            </div>
          )}

          {/* Header */}
          <header className="border-b border-line px-5 pb-6 pt-8 sm:px-8">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-mute">
                  {DATA_WINDOW.label}
                </p>
                <h1 className="mt-2 font-serif text-3xl font-medium leading-tight sm:text-4xl">
                  {isLanding ? "Health " : "Aakar’s Recovery"}
                  <span
                    className={`font-light italic text-accent${isLanding ? "" : " block"}`}
                  >
                    {isLanding ? "Dashboard." : "dashboard."}
                  </span>
                </h1>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs text-mute">
                  {DATA_WINDOW.start} → {DATA_WINDOW.end}
                </p>
                <p className="mt-1 font-mono text-xs text-mute">
                  {DATA_WINDOW.year}
                </p>
              </div>
            </div>
            <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-mute">
              {isLanding
                ? "Apple Health metrics and lab biomarkers, unified in one editorial dashboard. This is a live demo with sample data — sign in to track your own."
                : "Post-viral recovery has reset your cardiovascular baseline. Activity volume is the lever that still needs work."}
            </p>
          </header>

          {/* KPI grid */}
          <section className="grid grid-cols-2 gap-3 px-5 py-6 sm:px-8 lg:grid-cols-4">
            <KpiCard
              label="Resting HR"
              data={kpi.rhr}
              unit="bpm"
              better="down"
              color={palette.heart}
              glow="glow-heart"
              context="Target <65"
            />
            <KpiCard
              label="HRV"
              data={kpi.hrv}
              unit="ms"
              better="up"
              color={palette.hrv}
              glow="glow-hrv"
              context="Higher = recovered"
            />
            <KpiCard
              label="Steps / day"
              data={kpi.steps}
              unit=""
              better="up"
              color={palette.steps}
              glow="glow-steps"
              context="Aim 8k+"
            />
            <KpiCard
              label="Exercise min"
              data={kpi.exer}
              unit="/day"
              better="up"
              color={palette.cal}
              glow="glow-cal"
              context="Aim 30+"
            />
          </section>

          {/* View switcher */}
          <div className="px-5 pb-3 sm:px-8">
            <div className="flex gap-1 rounded-xl border border-line bg-panel p-1">
              {VIEWS.map((v) => {
                const Icon = v.icon;
                const active = view === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setView(v.id)}
                    aria-pressed={active}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium transition-all ${
                      active
                        ? "border-line bg-panel2 text-ink"
                        : "border-transparent text-mute hover:text-ink"
                    }`}
                  >
                    <Icon size={12} />
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Range selector */}
          <div className="flex gap-2 px-5 pb-4 sm:px-8">
            {RANGES.map((r) => {
              const active = range === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 font-mono text-xs transition-all ${
                    active
                      ? "border-accent bg-accent text-bg"
                      : "border-line text-mute hover:text-ink"
                  }`}
                >
                  {r}d
                </button>
              );
            })}
          </div>

          {/* Main chart */}
          <section className="px-5 pb-6 sm:px-8">
            <div className="rounded-2xl border border-line bg-panel p-4 pt-5 sm:p-6">
              {view === "cardio" && <CardioView data={chartData} />}
              {view === "activity" && <ActivityView data={chartData} />}
              {view === "walking" && <WalkingView data={chartData} />}
              {view === "intensity" && <IntensityView data={chartData} />}
            </div>
          </section>

          {/* Landing: biomarker tiles with AI-insight tooltips.
              App: editorial "Reading the signal" insights. */}
          {isLanding ? (
            <BiomarkerInsightDemo />
          ) : (
            <section className="px-5 pb-10 sm:px-8">
              <h2 className="mb-3 font-serif text-xl font-medium">Reading the signal</h2>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Insight
                  tag="WIN"
                  tagColor={palette.steps}
                  title="Cardiovascular system is recovering"
                  body="Resting HR averaged 82 bpm in late Jan / early Feb during the viral infection. It's back to 65 bpm over the last two weeks. HRV followed the same arc: low-20s ms then, high-30s/40s now."
                />
                <Insight
                  tag="GAP"
                  tagColor={palette.cal}
                  title="Exercise volume is the missing piece"
                  body="4.6 exercise minutes/day on average. For the 10kg weight goal and the HDL-25 / ALT-93 / visceral fat numbers, this is where the leverage sits. Zone 2 work 3x/week drives HDL up and liver fat down more reliably than any food swap."
                />
                <Insight
                  tag="NOTE"
                  tagColor={palette.walk}
                  title="Walking heart rate is trending down"
                  body="Average walking HR dropped from ~110 bpm in January to ~95 bpm recently. Your heart is doing the same work with less effort — aerobic fitness is improving even without formal workouts."
                />
                <Insight
                  tag="BLIND"
                  tagColor={palette.mute}
                  title="No weight data syncing"
                  body="Apple Health has no bodyMass entries in this window. A connected scale (Withings, Renpho) would close the loop between these metrics and your 89→78 kg goal."
                />
              </div>
            </section>
          )}

          <footer className="border-t border-line px-5 pb-8 pt-4 sm:px-8">
            <p className="font-mono text-xs text-mute">
              Data from Apple Health · Context from lab results dated Feb 2026 ·
              Not medical advice
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
