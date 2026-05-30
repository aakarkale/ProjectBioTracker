import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAnthropicConfigured } from "@/lib/anthropic/client";
import { biomarkerTrendInsight, type TrendPoint } from "@/lib/anthropic/insight";
import { getProfile, describeProfile } from "@/lib/profile";

export const runtime = "nodejs";
export const maxDuration = 60;

/** AI insight on a single biomarker's progression for the signed-in user. */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }
  if (!isAnthropicConfigured) {
    return NextResponse.json({ error: "AI not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let name: string;
  try {
    ({ name } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!name) return NextResponse.json({ error: "Missing biomarker name" }, { status: 400 });

  const { data } = await supabase
    .from("biomarkers")
    .select("value, unit, reference_low, reference_high, measured_on")
    .eq("name", name)
    .order("measured_on", { ascending: true, nullsFirst: true });

  const rows = data ?? [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No readings for this biomarker" }, { status: 404 });
  }

  const series: TrendPoint[] = rows.map((r) => ({
    date: r.measured_on,
    value: r.value,
  }));
  const latest = rows[rows.length - 1];

  try {
    const profile = await getProfile();
    const insight = await biomarkerTrendInsight({
      name,
      unit: latest.unit,
      referenceLow: latest.reference_low,
      referenceHigh: latest.reference_high,
      series,
      profileDescription: describeProfile(profile),
    });
    return NextResponse.json({ ok: true, insight });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Insight failed" },
      { status: 500 }
    );
  }
}
