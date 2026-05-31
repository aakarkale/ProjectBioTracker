/**
 * Canonical biomarker catalog. Maps the many ways labs print the same analyte
 * to one stable `key` (+ clean display label), so synonyms merge into a single
 * tile and trend instead of fragmenting.
 *
 * The catalog feeds the extraction prompt (so Claude maps to these keys) and
 * provides display labels for grouping. Unknown analytes fall back to a
 * normalized slug of their printed name.
 */

export type CanonicalBiomarker = {
  key: string;
  label: string;
  category: string;
  aliases: string[];
};

export const BIOMARKER_CATALOG: CanonicalBiomarker[] = [
  // Lipids
  { key: "total_cholesterol", label: "Total Cholesterol", category: "Lipids", aliases: ["cholesterol", "total cholesterol", "cholesterol total", "serum cholesterol"] },
  { key: "hdl_cholesterol", label: "HDL Cholesterol", category: "Lipids", aliases: ["hdl", "hdl cholesterol", "hdl-c", "high density lipoprotein"] },
  { key: "ldl_cholesterol", label: "LDL Cholesterol", category: "Lipids", aliases: ["ldl", "ldl cholesterol", "ldl-c", "ldl calculated", "ldl (calculated)", "ldl calc", "ldl cholesterol calc"] },
  { key: "vldl_cholesterol", label: "VLDL Cholesterol", category: "Lipids", aliases: ["vldl", "vldl cholesterol", "vldl calculated", "vldl cholesterol (calculated)"] },
  { key: "non_hdl_cholesterol", label: "Non-HDL Cholesterol", category: "Lipids", aliases: ["non-hdl cholesterol", "non hdl cholesterol", "total non-hdl cholesterol"] },
  { key: "triglycerides", label: "Triglycerides", category: "Lipids", aliases: ["triglycerides", "trig", "tg"] },
  { key: "cholesterol_hdl_ratio", label: "Cholesterol/HDL Ratio", category: "Lipids", aliases: ["cholesterol/hdl ratio", "cholesterol to hdl ratio", "chol/hdl ratio", "total cholesterol/hdl ratio", "tc/hdl ratio"] },
  { key: "apob", label: "ApoB", category: "Cardiac", aliases: ["apob", "apo b", "apolipoprotein b"] },
  { key: "lipoprotein_a", label: "Lipoprotein(a)", category: "Cardiac", aliases: ["lipoprotein(a)", "lipoprotein (a)", "lp(a)", "lipoprotein a"] },

  // Liver
  { key: "alt", label: "ALT", category: "Liver", aliases: ["alt", "alanine aminotransferase", "sgpt", "alt (sgpt)"] },
  { key: "ast", label: "AST", category: "Liver", aliases: ["ast", "aspartate aminotransferase", "sgot", "ast (sgot)"] },
  { key: "alp", label: "Alkaline Phosphatase", category: "Liver", aliases: ["alp", "alkaline phosphatase", "alk phos"] },
  { key: "ggt", label: "GGT", category: "Liver", aliases: ["ggt", "gamma-glutamyl transferase", "gamma gt"] },
  { key: "total_bilirubin", label: "Total Bilirubin", category: "Liver", aliases: ["total bilirubin", "bilirubin total", "bilirubin, total"] },
  { key: "direct_bilirubin", label: "Direct Bilirubin", category: "Liver", aliases: ["direct bilirubin", "bilirubin direct"] },
  { key: "albumin", label: "Albumin", category: "Liver", aliases: ["albumin"] },
  { key: "total_protein", label: "Total Protein", category: "Liver", aliases: ["total protein", "protein total"] },

  // Kidney / electrolytes
  { key: "glucose", label: "Glucose", category: "Metabolic", aliases: ["glucose", "fasting glucose", "blood glucose", "glucose, fasting"] },
  { key: "bun", label: "BUN", category: "Kidney", aliases: ["bun", "blood urea nitrogen", "urea nitrogen"] },
  { key: "creatinine", label: "Creatinine", category: "Kidney", aliases: ["creatinine", "creatinine, serum"] },
  { key: "egfr", label: "eGFR", category: "Kidney", aliases: ["egfr", "estimated gfr", "gfr", "egfr (calculated)"] },
  { key: "sodium", label: "Sodium", category: "Kidney", aliases: ["sodium", "na"] },
  { key: "potassium", label: "Potassium", category: "Kidney", aliases: ["potassium", "k"] },
  { key: "chloride", label: "Chloride", category: "Kidney", aliases: ["chloride", "cl"] },
  { key: "co2", label: "CO2 (Bicarbonate)", category: "Kidney", aliases: ["co2", "bicarbonate", "carbon dioxide", "co2 (bicarbonate)"] },
  { key: "calcium", label: "Calcium", category: "Metabolic", aliases: ["calcium", "ca"] },
  { key: "anion_gap", label: "Anion Gap", category: "Metabolic", aliases: ["anion gap"] },

  // Metabolic
  { key: "hba1c", label: "Hemoglobin A1c", category: "Metabolic", aliases: ["hba1c", "hemoglobin a1c", "a1c", "glycohemoglobin", "hemoglobin a1c (hba1c)", "glycated hemoglobin"] },
  { key: "eag", label: "Average Glucose (eAG)", category: "Metabolic", aliases: ["average glucose", "eag", "estimated average glucose", "average glucose (eag)"] },

  // Thyroid
  { key: "tsh", label: "TSH", category: "Thyroid", aliases: ["tsh", "thyroid stimulating hormone", "thyrotropin"] },
  { key: "free_t4", label: "Free T4", category: "Thyroid", aliases: ["free t4", "ft4", "free thyroxine", "t4 free", "t4, free"] },
  { key: "free_t3", label: "Free T3", category: "Thyroid", aliases: ["free t3", "ft3", "t3 free", "t3, free"] },

  // Vitamins & minerals
  { key: "vitamin_d", label: "Vitamin D (25-OH)", category: "Vitamins & Minerals", aliases: ["vitamin d", "25-oh vitamin d", "vitamin d, 25-hydroxy", "25-hydroxyvitamin d", "vitamin d 25 hydroxy"] },
  { key: "vitamin_b12", label: "Vitamin B12", category: "Vitamins & Minerals", aliases: ["vitamin b12", "b12", "cobalamin"] },
  { key: "folate", label: "Folate", category: "Vitamins & Minerals", aliases: ["folate", "folic acid"] },
  { key: "ferritin", label: "Ferritin", category: "Vitamins & Minerals", aliases: ["ferritin"] },
  { key: "iron", label: "Iron", category: "Vitamins & Minerals", aliases: ["iron", "serum iron"] },

  // Inflammation
  { key: "crp", label: "C-Reactive Protein (CRP)", category: "Inflammation", aliases: ["crp", "c-reactive protein", "c reactive protein"] },
  { key: "hs_crp", label: "hs-CRP", category: "Inflammation", aliases: ["hs-crp", "high sensitivity crp", "hscrp", "cardio crp"] },
  { key: "esr", label: "ESR (Sed Rate)", category: "Inflammation", aliases: ["esr", "sedimentation rate", "sed rate", "sedimentation rate (esr)", "erythrocyte sedimentation rate"] },

  // CBC
  { key: "wbc", label: "White Blood Cell Count", category: "Hematology", aliases: ["wbc", "white blood cell count", "white blood cells", "leukocytes"] },
  { key: "rbc", label: "Red Blood Cell Count", category: "Hematology", aliases: ["rbc", "red blood cell count", "red blood cells", "erythrocytes"] },
  { key: "hemoglobin", label: "Hemoglobin", category: "Hematology", aliases: ["hemoglobin", "hgb", "hb"] },
  { key: "hematocrit", label: "Hematocrit", category: "Hematology", aliases: ["hematocrit", "hct"] },
  { key: "platelet_count", label: "Platelet Count", category: "Hematology", aliases: ["platelet count", "platelets", "plt"] },
  { key: "mcv", label: "MCV", category: "Hematology", aliases: ["mcv", "mean corpuscular volume"] },
  { key: "mch", label: "MCH", category: "Hematology", aliases: ["mch", "mean corpuscular hemoglobin"] },
  { key: "mchc", label: "MCHC", category: "Hematology", aliases: ["mchc"] },
  { key: "rdw", label: "RDW", category: "Hematology", aliases: ["rdw", "red cell distribution width"] },
];

/** Normalize a printed name for matching/slugging: lowercase, alnum + spaces. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Slug for an unknown analyte (the fallback canonical key). */
export function slugKey(name: string): string {
  return normalizeName(name).replace(/\s+/g, "_") || "unknown";
}

// alias (normalized) -> catalog entry
const ALIAS_INDEX = new Map<string, CanonicalBiomarker>();
for (const entry of BIOMARKER_CATALOG) {
  for (const a of entry.aliases) ALIAS_INDEX.set(normalizeName(a), entry);
  ALIAS_INDEX.set(normalizeName(entry.label), entry);
}
const KEY_INDEX = new Map(BIOMARKER_CATALOG.map((e) => [e.key, e]));

/** Deterministic catalog match by exact alias (case/punctuation-insensitive). */
export function matchCatalog(name: string): CanonicalBiomarker | null {
  return ALIAS_INDEX.get(normalizeName(name)) ?? null;
}

/** Display label for a canonical key (catalog label, else humanized slug). */
export function labelForKey(key: string, fallbackName?: string): string {
  const entry = KEY_INDEX.get(key);
  if (entry) return entry.label;
  if (fallbackName) return fallbackName;
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Compact catalog summary for the extraction prompt. */
export function catalogForPrompt(): string {
  return BIOMARKER_CATALOG.map((e) => `${e.key} = ${e.label}`).join("\n");
}
