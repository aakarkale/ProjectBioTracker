import type { SupabaseClient } from "@supabase/supabase-js";
import { canonicalReportType } from "@/lib/report-type-catalog";
import { matchCatalog } from "@/lib/biomarker-catalog";

export type SanityResult = {
  /** report_type values rewritten to their canonical label. */
  reportTypesFixed: number;
  /** biomarker rows whose canonical_key was corrected to the catalog key. */
  biomarkersReKeyed: number;
};

/**
 * Post-upload sanity sweep for one user. Self-healing and idempotent —
 * safe to run after every report upload:
 *
 *  1. Collapses duplicate report types — rewrites every `reports.report_type`
 *     to its canonical label, so the filter list can't show "Lipid Panel" and
 *     "Lipid Profile" as separate entries.
 *  2. De-duplicates biomarkers — for any reading whose printed name is a
 *     deterministic catalog match, snaps its `canonical_key` to the catalog
 *     key, so synonyms across reports collapse onto one tile/trend.
 *
 * Only writes rows that actually change, so repeated runs are cheap no-ops.
 */
export async function runReportSanityCheck(
  client: SupabaseClient,
  userId: string
): Promise<SanityResult> {
  const result: SanityResult = { reportTypesFixed: 0, biomarkersReKeyed: 0 };

  // --- 1. Canonicalize report types ------------------------------------
  const { data: reports } = await client
    .from("reports")
    .select("id, report_type")
    .eq("user_id", userId)
    .not("report_type", "is", null);

  for (const r of (reports as { id: string; report_type: string | null }[]) ?? []) {
    const canonical = canonicalReportType(r.report_type);
    if (canonical && canonical !== r.report_type) {
      const { error } = await client
        .from("reports")
        .update({ report_type: canonical })
        .eq("id", r.id);
      if (!error) result.reportTypesFixed++;
    }
  }

  // --- 2. Re-key biomarkers that match the catalog by name -------------
  const { data: markers } = await client
    .from("biomarkers")
    .select("id, name, canonical_key")
    .eq("user_id", userId);

  for (const m of (markers as { id: string; name: string; canonical_key: string | null }[]) ??
    []) {
    const entry = matchCatalog(m.name);
    if (entry && entry.key !== m.canonical_key) {
      const { error } = await client
        .from("biomarkers")
        .update({ canonical_key: entry.key })
        .eq("id", m.id);
      if (!error) result.biomarkersReKeyed++;
    }
  }

  return result;
}
