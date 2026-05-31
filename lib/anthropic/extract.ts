import { getAnthropic, MODEL } from "./client";
import { BIOMARKER_CATEGORIES } from "@/lib/biomarker-categories";
import { catalogForPrompt } from "@/lib/biomarker-catalog";

export type CanonicalCandidate = { key: string; label: string };

export type ExtractedBiomarker = {
  name: string;
  value: number | null;
  unit: string | null;
  reference_low: number | null;
  reference_high: number | null;
  status: "normal" | "borderline" | "critical" | "unknown";
  category: string | null;
  /** Stable identity so synonyms merge into one tile/trend. */
  canonical_key: string;
  canonical_label: string;
  /** False when the canonical identity is uncertain (→ ask the user). */
  confident: boolean;
  /** Closest alternatives when not confident (best first). */
  candidates: CanonicalCandidate[];
};

export type ExtractionResult = {
  collected_on: string | null;
  report_type: string | null;
  biomarkers: ExtractedBiomarker[];
};

export type KnownMarker = { key: string; label: string };

const EXTRACTION_SYSTEM = `You extract structured lab biomarker data from medical / lab reports of ANY type.

Reports may be any of (non-exhaustive): Complete Blood Count (CBC), Basic or Comprehensive Metabolic Panel (BMP/CMP), Lipid Panel, Liver Function Tests, Kidney/Renal Panel, Urinalysis, HbA1c, Thyroid Panel, Cortisol/ACTH, Sex hormones, Vitamin/Iron studies, hs-CRP, Troponin/BNP, ApoB/Lp(a), ESR, ANA/RF/anti-CCP, immunoglobulins, coagulation (PT/INR, D-dimer), infectious-disease panels, tumor markers, hCG/prenatal panels, heavy metals, allergy/IgE panels, genetic/microbiome/advanced-lipid panels, and more.

Per-field rules:
- Extract EVERY distinct lab measurement present — across all panels in the document.
- "value": numeric result only (no units). Non-numeric (e.g. "Positive") → null.
- "unit": the unit as printed (e.g. "mg/dL", "%", "10^3/uL") or null.
- "reference_low"/"reference_high": from the printed range; one-sided ranges set the missing bound to null; absent → both null.
- "status": "normal" in range; "borderline" just outside / flagged borderline; "critical" substantially out / flagged H/L/critical; else "unknown".
- "category": exactly one of: ${BIOMARKER_CATEGORIES.join(", ")}. "Other" only if none fit.
- "collected_on": the LAB TEST / specimen-collection date as ISO YYYY-MM-DD. NEVER guess or use today's date. If none is present, null.
- "report_type": human-readable panel name (e.g. "Lipid Panel", "Comprehensive Metabolic Panel (CMP)"). Combined panels → "Comprehensive panel"; unclear → "Lab report".

CANONICAL IDENTITY — the most important part. Labs print the same analyte many ways; map each biomarker to a stable identity so the same analyte always merges:
- If the biomarker is the same analyte as a CATALOG entry below (ignoring wording, case, punctuation, and qualifiers like "Calculated"), set "canonical_key" to that catalog key and "canonical_label" to its label. Examples: "Total Cholesterol" and "Cholesterol" → total_cholesterol; "LDL Calculated" and "LDL-C" → ldl_cholesterol; "HDL cholesterol" → hdl_cholesterol.
- Else if it matches one of the USER'S EXISTING MARKERS (provided in the user message), reuse that exact key and label.
- Else mint a new snake_case "canonical_key" from the name and a clean "canonical_label".
- Keep DERIVED/ratio values DISTINCT from absolute measures: e.g. "Cholesterol/HDL Ratio" (cholesterol_hdl_ratio) is NOT "HDL Cholesterol". "Non-HDL Cholesterol" is its own marker.
- "confident": true only if you are sure of the identity. If the name is ambiguous or you're guessing, set false.
- "candidates": when NOT confident, list 1–3 closest {key,label} options (best first) drawn from the catalog and the user's existing markers. When confident, use [].

CATALOG (canonical_key = Label):
${catalogForPrompt()}`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    collected_on: { anyOf: [{ type: "string" }, { type: "null" }] },
    report_type: { anyOf: [{ type: "string" }, { type: "null" }] },
    biomarkers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          value: { anyOf: [{ type: "number" }, { type: "null" }] },
          unit: { anyOf: [{ type: "string" }, { type: "null" }] },
          reference_low: { anyOf: [{ type: "number" }, { type: "null" }] },
          reference_high: { anyOf: [{ type: "number" }, { type: "null" }] },
          status: {
            type: "string",
            enum: ["normal", "borderline", "critical", "unknown"],
          },
          category: { anyOf: [{ type: "string" }, { type: "null" }] },
          canonical_key: { type: "string" },
          canonical_label: { type: "string" },
          confident: { type: "boolean" },
          candidates: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: { key: { type: "string" }, label: { type: "string" } },
              required: ["key", "label"],
            },
          },
        },
        required: [
          "name",
          "value",
          "unit",
          "reference_low",
          "reference_high",
          "status",
          "category",
          "canonical_key",
          "canonical_label",
          "confident",
          "candidates",
        ],
      },
    },
  },
  required: ["collected_on", "report_type", "biomarkers"],
} as const;

type DocBlock =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

function buildContentBlock(buffer: Buffer, mimeType: string, fileName: string): DocBlock {
  const lower = (mimeType || "").toLowerCase();
  const name = fileName.toLowerCase();

  if (lower.includes("pdf") || name.endsWith(".pdf")) {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
    };
  }
  if (lower.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/.test(name)) {
    const media = lower.startsWith("image/") ? lower : "image/png";
    return {
      type: "image",
      source: { type: "base64", media_type: media, data: buffer.toString("base64") },
    };
  }
  // CSV / TXT / anything else: treat as UTF-8 text.
  return { type: "text", text: buffer.toString("utf-8").slice(0, 200_000) };
}

/**
 * Extract biomarkers from a medical report using Claude, assigning each a
 * canonical identity. `knownMarkers` (the user's existing markers) are passed
 * in the volatile user turn so the model reuses keys across reports — this is
 * what keeps the same analyte on one tile/trend. The catalog/instructions stay
 * in the cached system block.
 */
export async function extractBiomarkers(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  knownMarkers: KnownMarker[] = []
): Promise<ExtractionResult> {
  const client = getAnthropic();
  const block = buildContentBlock(buffer, mimeType, fileName);

  const knownBlock = knownMarkers.length
    ? `The user already tracks these markers — REUSE the exact canonical_key when the same analyte appears:\n${knownMarkers
        .map((m) => `${m.key} = ${m.label}`)
        .join("\n")}\n\n`
    : "";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: [
      {
        type: "text",
        text: EXTRACTION_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${knownBlock}Extract all biomarkers from this report and assign each a canonical identity.`,
          },
          block as never,
        ],
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    return { collected_on: null, report_type: null, biomarkers: [] };
  }

  const parsed = JSON.parse(text.text) as ExtractionResult;
  return {
    collected_on: parsed.collected_on ?? null,
    report_type: parsed.report_type ?? null,
    biomarkers: Array.isArray(parsed.biomarkers) ? parsed.biomarkers : [],
  };
}
