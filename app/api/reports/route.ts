import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAnthropicConfigured } from "@/lib/anthropic/client";
import { isDemoEmail } from "@/lib/demo";
import { extractBiomarkers, type ExtractedBiomarker } from "@/lib/anthropic/extract";
import { labelForKey, slugKey } from "@/lib/biomarker-catalog";
import { canonicalReportType } from "@/lib/report-type-catalog";
import { runReportSanityCheck } from "@/lib/report-sanity";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED = /\.(pdf|csv|txt|png|jpe?g|webp)$/i;

/** Upload a medical report → store → extract biomarkers with Claude. */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: "Backend not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (isDemoEmail(user.email)) {
    return NextResponse.json({ error: "The demo is view-only." }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10MB" }, { status: 413 });
  }
  if (!ALLOWED.test(file.name)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PDF, image, CSV, or TXT." },
      { status: 415 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentHash = createHash("sha256").update(buffer).digest("hex");

  // Never double-count: if this exact file was already uploaded, no-op.
  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("user_id", user.id)
    .eq("content_hash", contentHash)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      reportId: existing.id,
      message: "This report was already uploaded — skipped to avoid duplicates.",
    });
  }

  const storagePath = `${user.id}/${randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: report, error: insertError } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      file_name: file.name,
      title: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      content_hash: contentHash,
      status: isAnthropicConfigured ? "processing" : "pending",
    })
    .select("id")
    .single();
  if (insertError || !report) {
    return NextResponse.json(
      { error: insertError?.message ?? "Could not record report" },
      { status: 500 }
    );
  }

  // Without an Anthropic key we keep the file but defer extraction.
  if (!isAnthropicConfigured) {
    return NextResponse.json({
      ok: true,
      reportId: report.id,
      status: "pending",
      message: "Stored. Add ANTHROPIC_API_KEY to enable biomarker extraction.",
    });
  }

  try {
    // Reuse the user's existing canonical markers so the same analyte stays on
    // one tile/trend across reports.
    const { data: existingMarkers } = await supabase
      .from("biomarkers")
      .select("canonical_key, name")
      .eq("user_id", user.id)
      .not("canonical_key", "is", null);

    const knownMap = new Map<string, string>();
    for (const m of (existingMarkers as { canonical_key: string | null; name: string }[]) ?? []) {
      if (m.canonical_key && !knownMap.has(m.canonical_key)) {
        knownMap.set(m.canonical_key, labelForKey(m.canonical_key, m.name));
      }
    }
    const knownMarkers = [...knownMap.entries()].map(([key, label]) => ({ key, label }));

    const result = await extractBiomarkers(buffer, file.type, file.name, knownMarkers);

    // Dedupe within the report by biomarker name (keep first occurrence).
    const seen = new Set<string>();
    const unique: ExtractedBiomarker[] = [];
    for (const b of result.biomarkers) {
      const key = b.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(b);
    }

    type ReviewItem = {
      id: string;
      name: string;
      candidates: { key: string; label: string }[];
      currentKey: string;
      currentLabel: string;
    };
    let review: ReviewItem[] = [];

    if (unique.length > 0) {
      const rows = unique.map((b) => ({
        user_id: user.id,
        report_id: report.id,
        name: b.name,
        value: b.value,
        unit: b.unit,
        reference_low: b.reference_low,
        reference_high: b.reference_high,
        status: b.status,
        category: b.category,
        canonical_key: b.canonical_key || slugKey(b.name),
        needs_review: !b.confident,
        measured_on: result.collected_on,
      }));
      const { data: inserted, error: bmError } = await supabase
        .from("biomarkers")
        .insert(rows)
        .select("id, name");
      if (bmError) throw new Error(bmError.message);

      const idByName = new Map(
        ((inserted as { id: string; name: string }[]) ?? []).map((r) => [r.name, r.id])
      );
      review = unique
        .filter((b) => !b.confident)
        .map((b) => ({
          id: idByName.get(b.name) ?? "",
          name: b.name,
          candidates: Array.isArray(b.candidates) ? b.candidates : [],
          currentKey: b.canonical_key || slugKey(b.name),
          currentLabel: b.canonical_label || b.name,
        }))
        .filter((r) => r.id);
    }

    // Collapse panel-name variants ("Lipid Profile" → "Lipid Panel") so the
    // report-type filter never shows the same panel twice.
    const reportType = canonicalReportType(result.report_type);

    await supabase
      .from("reports")
      .update({
        status: "done",
        collected_on: result.collected_on,
        report_type: reportType,
      })
      .eq("id", report.id);

    // Sanity sweep: normalize all of this user's report types + re-key any
    // biomarkers that deterministically match the catalog, so no duplicate
    // filters or tiles can accumulate over time. Best-effort — never blocks
    // the response.
    try {
      await runReportSanityCheck(supabase, user.id);
    } catch {
      /* non-fatal: the per-report write above already applied canonical types */
    }

    return NextResponse.json({
      ok: true,
      reportId: report.id,
      status: "done",
      collected_on: result.collected_on,
      report_type: reportType,
      // No definitive lab-test date found — the UI should ask the user.
      needsDate: !result.collected_on,
      count: unique.length,
      // Markers whose identity is uncertain — the UI asks the user to confirm.
      review,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Extraction failed";
    await supabase
      .from("reports")
      .update({ status: "error", error: message })
      .eq("id", report.id);
    return NextResponse.json({ error: message, reportId: report.id }, { status: 500 });
  }
}
