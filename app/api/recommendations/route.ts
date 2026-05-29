import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAnthropicConfigured } from "@/lib/anthropic/client";
import { generateRecommendations } from "@/lib/anthropic/recommend";
import { getBiomarkers, getDailyMetrics } from "@/lib/queries";
import { buildKpis } from "@/lib/analytics";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Generate AI recommendations from the user's biomarkers + activity. */
export async function POST() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }
  if (!isAnthropicConfigured) {
    return NextResponse.json(
      { error: "AI not configured. Add ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [biomarkers, { metrics }] = await Promise.all([
    getBiomarkers(),
    getDailyMetrics(),
  ]);

  if (biomarkers.length === 0) {
    return NextResponse.json(
      { error: "No biomarkers yet. Upload a report first." },
      { status: 422 }
    );
  }

  try {
    const kpi = buildKpis(metrics);
    const recommendations = await generateRecommendations(biomarkers, kpi);
    return NextResponse.json({ ok: true, recommendations });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 }
    );
  }
}
