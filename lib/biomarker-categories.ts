/** Canonical biomarker categories used for extraction + grouping. */
export const BIOMARKER_CATEGORIES = [
  "Hematology",
  "Metabolic",
  "Lipids",
  "Liver",
  "Kidney",
  "Urinalysis",
  "Endocrine",
  "Thyroid",
  "Hormones",
  "Vitamins & Minerals",
  "Cardiac",
  "Inflammation",
  "Immune / Autoimmune",
  "Coagulation",
  "Infectious disease",
  "Cancer markers",
  "Reproductive",
  "Specialized",
  "Other",
] as const;

export type BiomarkerCategory = (typeof BIOMARKER_CATEGORIES)[number];
