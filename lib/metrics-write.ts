import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyMetricColumns } from "@/lib/ingest";

/**
 * Upsert daily metric rows for a user. Works with either a user-scoped client
 * (RLS enforced) or the service client (webhook). Returns the row count.
 */
export async function upsertDailyMetrics(
  client: SupabaseClient,
  userId: string,
  rows: DailyMetricColumns[]
): Promise<number> {
  if (rows.length === 0) return 0;

  const payload = rows.map((r) => ({ ...r, user_id: userId, updated_at: new Date().toISOString() }));

  // Chunk to stay well under statement limits for large imports.
  const CHUNK = 500;
  let written = 0;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const slice = payload.slice(i, i + CHUNK);
    const { error } = await client
      .from("daily_metrics")
      .upsert(slice, { onConflict: "user_id,day" });
    if (error) throw new Error(error.message);
    written += slice.length;
  }
  return written;
}
