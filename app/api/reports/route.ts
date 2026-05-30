import { NextResponse, type NextRequest } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAnthropicConfigured } from "@/lib/anthropic/client";
import { isDemoEmail } from "@/lib/demo";
import { extractBiomarkers, type ExtractedBiomarker } from "@/lib/anthropic/extract";

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
    const result = await extractBiomarkers(buffer, file.type, file.name);

    // Dedupe within the report by biomarker name (keep first occurrence).
    const seen = new Set<string>();
    const unique: ExtractedBiomarker[] = [];
    for (const b of result.biomarkers) {
      const key = b.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(b);
    }

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
        measured_on: result.collected_on,
      }));
      const { error: bmError } = await supabase.from("biomarkers").insert(rows);
      if (bmError) throw new Error(bmError.message);
    }

    await supabase
      .from("reports")
      .update({ status: "done", collected_on: result.collected_on })
      .eq("id", report.id);

    return NextResponse.json({
      ok: true,
      reportId: report.id,
      status: "done",
      collected_on: result.collected_on,
      // No definitive lab-test date found — the UI should ask the user.
      needsDate: !result.collected_on,
      count: unique.length,
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
