import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/config";
import { hashToken, mergeByDay, normalizeDailyRow, parseHealthAutoExport, type DailyMetricColumns } from "@/lib/ingest";
import { upsertDailyMetrics } from "@/lib/metrics-write";

export const runtime = "nodejs";

/**
 * Apple Health ingestion webhook.
 *
 * Auth: per-user token via `Authorization: Bearer <token>` or `?token=<token>`.
 * Body: Health Auto Export JSON, or a plain JSON array of daily rows.
 *
 * Point the "Health Auto Export" app or an Apple Shortcut at this URL with the
 * token from Settings → it upserts the user's daily_metrics.
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }

  // --- token ---
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : null;
  const token = bearer ?? request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: tokenRow } = await service
    .from("ingest_tokens")
    .select("id, user_id, revoked")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!tokenRow || tokenRow.revoked) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // --- body ---
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  let rows: DailyMetricColumns[] = [];
  if (body && typeof body === "object" && "data" in body) {
    rows = parseHealthAutoExport(body);
  } else if (Array.isArray(body)) {
    rows = mergeByDay(
      body
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map(normalizeDailyRow)
        .filter((r): r is DailyMetricColumns => r !== null)
    );
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No recognisable daily metrics in payload" },
      { status: 422 }
    );
  }

  try {
    const written = await upsertDailyMetrics(service, tokenRow.user_id, rows);
    await service
      .from("ingest_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);
    return NextResponse.json({ ok: true, days: written });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Write failed" },
      { status: 500 }
    );
  }
}
