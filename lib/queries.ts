import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SAMPLE_DAILY_METRICS, type DailyMetric } from "@/lib/health-data";

/** "2026-04-19" -> "04/19" (the label the charts expect). */
function toLabel(day: string): string {
  const [, m, d] = day.split("-");
  return `${m}/${d}`;
}

type DailyMetricRow = {
  day: string;
  steps: number | null;
  active_calories: number | null;
  resting_hr: number | null;
  hrv: number | null;
  exercise_min: number | null;
  walking_hr: number | null;
  flights: number | null;
};

function mapRow(r: DailyMetricRow): DailyMetric {
  return {
    date: toLabel(r.day),
    steps: r.steps,
    cal: r.active_calories,
    rhr: r.resting_hr,
    hrv: r.hrv,
    exer: r.exercise_min,
    whr: r.walking_hr,
    flights: r.flights,
  };
}

export type DailyMetricsResult = {
  metrics: DailyMetric[];
  /** true when falling back to bundled sample data (no backend / no rows). */
  isSample: boolean;
};

/**
 * Daily metrics for the signed-in user, oldest-first. Falls back to the
 * bundled sample when Supabase isn't configured, the user is signed out, or
 * they have no data yet — so the dashboard always has something to render.
 */
export async function getDailyMetrics(): Promise<DailyMetricsResult> {
  if (!isSupabaseConfigured) {
    return { metrics: SAMPLE_DAILY_METRICS, isSample: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { metrics: SAMPLE_DAILY_METRICS, isSample: true };

  const { data, error } = await supabase
    .from("daily_metrics")
    .select(
      "day, steps, active_calories, resting_hr, hrv, exercise_min, walking_hr, flights"
    )
    .order("day", { ascending: true });

  if (error || !data || data.length === 0) {
    return { metrics: SAMPLE_DAILY_METRICS, isSample: true };
  }

  return { metrics: (data as DailyMetricRow[]).map(mapRow), isSample: false };
}

export type Biomarker = {
  id: string;
  name: string;
  value: number | null;
  unit: string | null;
  reference_low: number | null;
  reference_high: number | null;
  status: "normal" | "borderline" | "critical" | "unknown";
  category: string | null;
  measured_on: string | null;
};

/** Biomarkers for the signed-in user (empty in demo mode). */
export async function getBiomarkers(): Promise<Biomarker[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("biomarkers")
    .select(
      "id, name, value, unit, reference_low, reference_high, status, category, measured_on"
    )
    .order("measured_on", { ascending: false, nullsFirst: false });

  return (data as Biomarker[]) ?? [];
}
