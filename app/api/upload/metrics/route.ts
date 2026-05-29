import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { parseMetricsFile } from "@/lib/parse/metrics-file";
import { upsertDailyMetrics } from "@/lib/metrics-write";

export const runtime = "nodejs";

/** Authenticated manual upload of a daily-metrics CSV/JSON file. */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  let rows;
  try {
    const text = await file.text();
    rows = parseMetricsFile(text, file.name);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not parse file" },
      { status: 422 }
    );
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No daily metrics found. Expect columns like date, steps, rhr, hrv…" },
      { status: 422 }
    );
  }

  try {
    const written = await upsertDailyMetrics(supabase, user.id, rows);
    return NextResponse.json({ ok: true, days: written });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Write failed" },
      { status: 500 }
    );
  }
}
