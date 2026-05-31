/**
 * Canonical lab-report (panel) type catalog. Labs name the same panel many
 * ways — "Lipid Panel" vs "Lipid Profile", "Liver Function Tests" vs "Liver
 * Panel" — which fragments the report-type filter and makes the same panel
 * look like two. This maps those variants to one stable display label so the
 * filter list (and stored report_type) never repeats.
 *
 * Mirrors the biomarker catalog pattern in `lib/biomarker-catalog.ts`.
 */

export type CanonicalReportType = {
  /** Clean display label — also the value stored in reports.report_type. */
  label: string;
  /** Lowercased name variants that should collapse onto `label`. */
  aliases: string[];
};

export const REPORT_TYPE_CATALOG: CanonicalReportType[] = [
  {
    label: "Lipid Panel",
    aliases: [
      "lipid panel",
      "lipid profile",
      "lipids",
      "lipid",
      "fasting lipid panel",
      "fasting lipid profile",
      "lipid profile fasting",
      "lipid panel fasting",
      "lipid panel with ratio",
      "cholesterol panel",
    ],
  },
  {
    label: "Comprehensive Metabolic Panel (CMP)",
    aliases: [
      "cmp",
      "comprehensive metabolic panel",
      "comprehensive metabolic panel cmp",
      "comp metabolic panel",
      "metabolic panel comprehensive",
      "complete metabolic panel",
    ],
  },
  {
    label: "Basic Metabolic Panel (BMP)",
    aliases: ["bmp", "basic metabolic panel", "basic metabolic panel bmp"],
  },
  {
    label: "Complete Blood Count (CBC)",
    aliases: [
      "cbc",
      "complete blood count",
      "complete blood count cbc",
      "cbc with differential",
      "cbc w differential",
      "cbc with diff",
      "full blood count",
      "fbc",
      "hemogram",
      "haemogram",
      "blood count",
    ],
  },
  {
    label: "Liver Panel",
    aliases: [
      "liver panel",
      "liver profile",
      "liver function tests",
      "liver function test",
      "liver function panel",
      "lft",
      "lfts",
      "hepatic panel",
      "hepatic function panel",
    ],
  },
  {
    label: "Kidney Panel",
    aliases: [
      "kidney panel",
      "kidney profile",
      "kidney function test",
      "kidney function tests",
      "renal panel",
      "renal profile",
      "renal function panel",
      "renal function test",
    ],
  },
  {
    label: "Thyroid Panel",
    aliases: [
      "thyroid panel",
      "thyroid profile",
      "thyroid function tests",
      "thyroid function test",
      "tft",
      "tfts",
    ],
  },
  {
    label: "Hemoglobin A1c",
    aliases: [
      "hemoglobin a1c",
      "haemoglobin a1c",
      "hba1c",
      "hba1c test",
      "a1c",
      "glycohemoglobin",
      "glycated hemoglobin",
    ],
  },
  {
    label: "Iron Studies",
    aliases: ["iron studies", "iron panel", "iron profile", "iron study"],
  },
  {
    label: "Urinalysis",
    aliases: [
      "urinalysis",
      "ua",
      "urine analysis",
      "urine routine",
      "urine routine examination",
      "urine test",
    ],
  },
  {
    label: "Vitamin D",
    aliases: [
      "vitamin d",
      "vitamin d test",
      "25-hydroxyvitamin d",
      "25 hydroxyvitamin d",
      "vitamin d 25 hydroxy",
      "vitamin d 25-oh",
    ],
  },
  {
    label: "hs-CRP",
    aliases: ["hs-crp", "hs crp", "high sensitivity crp", "hscrp", "cardio crp"],
  },
  {
    label: "Coagulation Panel",
    aliases: [
      "coagulation panel",
      "coagulation profile",
      "coagulation studies",
      "pt inr",
      "pt/inr",
      "prothrombin time",
    ],
  },
  {
    label: "Hepatitis B",
    aliases: ["hepatitis b", "hep b", "hbsag", "hepatitis b surface antigen"],
  },
  {
    label: "MMR Antibodies",
    aliases: [
      "mmr antibodies",
      "mmr antibody",
      "mmr titer",
      "mmr titre",
      "measles mumps rubella antibodies",
    ],
  },
  {
    label: "QuantiFERON-TB",
    aliases: [
      "quantiferon-tb",
      "quantiferon tb",
      "quantiferon",
      "quantiferon tb gold",
      "tb gold",
      "igra",
    ],
  },
];

/** Normalize a report-type string for matching: lowercase, alnum + spaces. */
export function normalizeReportType(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// normalized alias -> canonical label
const ALIAS_INDEX = new Map<string, string>();
for (const entry of REPORT_TYPE_CATALOG) {
  for (const a of entry.aliases) ALIAS_INDEX.set(normalizeReportType(a), entry.label);
  ALIAS_INDEX.set(normalizeReportType(entry.label), entry.label);
}

/**
 * Collapse a freeform report-type name onto its canonical label. Known panel
 * variants merge ("Lipid Profile" → "Lipid Panel"); unknown types are returned
 * trimmed (preserving the model's casing) so they still display cleanly.
 * Empty / null input returns null.
 */
export function canonicalReportType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return ALIAS_INDEX.get(normalizeReportType(trimmed)) ?? trimmed;
}

/** Canonical labels for the extraction prompt's "prefer these" guidance. */
export function reportTypesForPrompt(): string {
  return REPORT_TYPE_CATALOG.map((e) => e.label).join(", ");
}
