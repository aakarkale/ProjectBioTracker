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
 * Daily metrics for the signed-in user, oldest-first.
 *
 * Sample data is only for **signed-out** visitors (the public landing/demo).
 * A signed-in user always gets their own data — an empty array if they have
 * none yet (so the dashboard can show an onboarding state instead of fake
 * numbers).
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

  // Signed in: return real data only — never fall back to sample.
  if (error || !data) {
    return { metrics: [], isSample: false };
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
  /** Stable identity used for grouping/trends (synonyms share a key). */
  canonical_key: string | null;
  /** Type of the report this reading came from (e.g. "Lipid Panel"). */
  report_type: string | null;
};

type ReportRel = { report_type: string | null };
type BiomarkerRaw = Omit<Biomarker, "report_type"> & {
  reports: ReportRel | ReportRel[] | null;
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
      "id, name, value, unit, reference_low, reference_high, status, category, measured_on, canonical_key, reports(report_type)"
    )
    .order("measured_on", { ascending: false, nullsFirst: false });

  return ((data as unknown as BiomarkerRaw[]) ?? []).map(({ reports, ...b }) => {
    const rel = Array.isArray(reports) ? reports[0] : reports;
    return { ...b, report_type: rel?.report_type ?? null };
  });
}

export type ReportRow = {
  id: string;
  title: string | null;
  file_name: string;
  collected_on: string | null; // the lab test (report) date
  report_type: string | null;
  status: "pending" | "processing" | "done" | "error";
  error: string | null;
  created_at: string;
  biomarker_count: number;
};

/** Uploaded lab reports for the signed-in user, newest first. */
export async function getReports(): Promise<ReportRow[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("reports")
    .select(
      "id, title, file_name, collected_on, report_type, status, error, created_at, biomarkers(count)"
    )
    .order("created_at", { ascending: false });

  type Raw = Omit<ReportRow, "biomarker_count"> & {
    biomarkers: { count: number }[] | null;
  };

  return ((data as Raw[]) ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    file_name: r.file_name,
    collected_on: r.collected_on,
    report_type: r.report_type,
    status: r.status,
    error: r.error,
    created_at: r.created_at,
    biomarker_count: r.biomarkers?.[0]?.count ?? 0,
  }));
}
