"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type UpdateInput = { title?: string; reportDate?: string | null };

/**
 * Rename a report and/or set its lab-test (report) date. When the date
 * changes, the date is propagated to all biomarkers extracted from it so
 * trends stay aligned.
 */
export async function updateReport(
  id: string,
  input: UpdateInput
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title.trim() || null;
  if (input.reportDate !== undefined) patch.collected_on = input.reportDate || null;

  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase
    .from("reports")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  if (input.reportDate !== undefined) {
    await supabase
      .from("biomarkers")
      .update({ measured_on: input.reportDate || null })
      .eq("report_id", id)
      .eq("user_id", user.id);
  }

  revalidatePath("/reports");
  return { ok: true };
}

/** Delete a report and (via cascade) its biomarkers + the stored file. */
export async function deleteReport(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Best-effort remove the stored file first.
  const { data: row } = await supabase
    .from("reports")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (row?.storage_path) {
    await supabase.storage.from("reports").remove([row.storage_path]);
  }

  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/reports");
  return { ok: true };
}
