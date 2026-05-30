import type { SupabaseClient } from "@supabase/supabase-js";
import { SAMPLE_DAILY_METRICS } from "@/lib/health-data";
import { DEMO_EMAIL } from "@/lib/demo";

export { DEMO_EMAIL };

type Marker = {
  name: string;
  value: number;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  status: "normal" | "borderline" | "critical";
  category: string;
};

// Two dated panels so biomarker trends have something to plot (Feb → May).
const PANELS: { hash: string; title: string; date: string; markers: Marker[] }[] = [
  {
    hash: "demo-panel-a",
    title: "Lab panel — Feb 2026",
    date: "2026-02-04",
    markers: [
      { name: "HDL Cholesterol", value: 28, unit: "mg/dL", reference_low: 40, reference_high: 60, status: "critical", category: "Lipids" },
      { name: "ALT", value: 88, unit: "U/L", reference_low: 7, reference_high: 56, status: "critical", category: "Liver" },
      { name: "LDL Cholesterol", value: 120, unit: "mg/dL", reference_low: null, reference_high: 100, status: "borderline", category: "Lipids" },
      { name: "Triglycerides", value: 170, unit: "mg/dL", reference_low: null, reference_high: 150, status: "borderline", category: "Lipids" },
      { name: "Vitamin D", value: 21, unit: "ng/mL", reference_low: 30, reference_high: 100, status: "borderline", category: "Vitamins" },
      { name: "HbA1c", value: 5.5, unit: "%", reference_low: null, reference_high: 5.7, status: "normal", category: "Metabolic" },
      { name: "Fasting Glucose", value: 95, unit: "mg/dL", reference_low: 70, reference_high: 99, status: "normal", category: "Metabolic" },
      { name: "TSH", value: 2.2, unit: "mIU/L", reference_low: 0.4, reference_high: 4.0, status: "normal", category: "Thyroid" },
    ],
  },
  {
    hash: "demo-panel-b",
    title: "Lab panel — May 2026",
    date: "2026-05-04",
    markers: [
      { name: "HDL Cholesterol", value: 34, unit: "mg/dL", reference_low: 40, reference_high: 60, status: "borderline", category: "Lipids" },
      { name: "ALT", value: 58, unit: "U/L", reference_low: 7, reference_high: 56, status: "borderline", category: "Liver" },
      { name: "LDL Cholesterol", value: 108, unit: "mg/dL", reference_low: null, reference_high: 100, status: "borderline", category: "Lipids" },
      { name: "Triglycerides", value: 148, unit: "mg/dL", reference_low: null, reference_high: 150, status: "normal", category: "Lipids" },
      { name: "Vitamin D", value: 28, unit: "ng/mL", reference_low: 30, reference_high: 100, status: "borderline", category: "Vitamins" },
      { name: "HbA1c", value: 5.4, unit: "%", reference_low: null, reference_high: 5.7, status: "normal", category: "Metabolic" },
      { name: "Fasting Glucose", value: 92, unit: "mg/dL", reference_low: 70, reference_high: 99, status: "normal", category: "Metabolic" },
      { name: "TSH", value: 2.1, unit: "mIU/L", reference_low: 0.4, reference_high: 4.0, status: "normal", category: "Thyroid" },
    ],
  },
];

/** Find the demo user, creating it (email pre-confirmed) if needed. */
export async function ensureDemoUser(service: SupabaseClient): Promise<string> {
  const { data: list } = await service.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = list?.users?.find((u) => u.email === DEMO_EMAIL);
  if (found) return found.id;

  const { data, error } = await service.auth.admin.createUser({
    email: DEMO_EMAIL,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create demo user");
  return data.user.id;
}

/** Seed the demo account once (profile, metrics, two lab panels). Idempotent. */
export async function seedDemo(service: SupabaseClient, userId: string): Promise<void> {
  await service.from("profiles").upsert(
    {
      id: userId,
      email: DEMO_EMAIL,
      date_of_birth: "1990-04-12",
      sex: "Male",
      height_cm: 178,
      weight_kg: 82,
      goals: "Improve cardio fitness, Lose weight — post-viral recovery",
      onboarded: true,
    },
    { onConflict: "id" }
  );

  const { count: metricCount } = await service
    .from("daily_metrics")
    .select("day", { count: "exact", head: true })
    .eq("user_id", userId);
  if (!metricCount) {
    const rows = SAMPLE_DAILY_METRICS.map((m) => {
      const [mm, dd] = m.date.split("/");
      return {
        user_id: userId,
        day: `2026-${mm}-${dd}`,
        steps: m.steps,
        active_calories: m.cal,
        resting_hr: m.rhr,
        hrv: m.hrv,
        exercise_min: m.exer,
        walking_hr: m.whr,
        flights: m.flights,
      };
    });
    await service.from("daily_metrics").upsert(rows, { onConflict: "user_id,day" });
  }

  const { count: reportCount } = await service
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (!reportCount) {
    for (const p of PANELS) {
      const { data: rep } = await service
        .from("reports")
        .insert({
          user_id: userId,
          file_name: p.title,
          title: p.title,
          storage_path: `demo/${p.hash}`,
          mime_type: "application/pdf",
          content_hash: p.hash,
          status: "done",
          collected_on: p.date,
        })
        .select("id")
        .single();
      if (rep) {
        await service.from("biomarkers").insert(
          p.markers.map((mk) => ({
            user_id: userId,
            report_id: rep.id,
            measured_on: p.date,
            ...mk,
          }))
        );
      }
    }
  }
}
