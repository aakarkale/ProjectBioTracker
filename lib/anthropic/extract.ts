import { getAnthropic, MODEL } from "./client";

export type ExtractedBiomarker = {
  name: string;
  value: number | null;
  unit: string | null;
  reference_low: number | null;
  reference_high: number | null;
  status: "normal" | "borderline" | "critical" | "unknown";
  category: string | null;
};

export type ExtractionResult = {
  collected_on: string | null;
  biomarkers: ExtractedBiomarker[];
};

const EXTRACTION_SYSTEM = `You extract structured lab biomarker data from medical reports.

Rules:
- Return every distinct lab measurement you can identify (e.g. Total Cholesterol, HDL, LDL, Triglycerides, HbA1c, Fasting Glucose, ALT, AST, TSH, Vitamin D, Ferritin, Creatinine, eGFR, CRP, etc.).
- "value" is the numeric result only (no units). If a result is non-numeric or missing, use null.
- "unit" is the measurement unit as printed (e.g. "mg/dL", "mmol/L", "%", "ng/mL"), or null.
- "reference_low" / "reference_high" come from the printed reference range. If the range is one-sided (e.g. "<150"), set the missing bound to null. If absent, use null for both.
- "status": "normal" if within range; "borderline" if just outside or flagged borderline; "critical" if substantially out of range or flagged H/L/critical; "unknown" if you cannot tell.
- "category" is a short group label when evident (e.g. "Lipids", "Liver", "Thyroid", "Metabolic", "Kidney", "Vitamins", "Inflammation"), else null.
- "collected_on" is the date the LAB TEST was performed — the specimen collection / draw date. Look for labels like "Collected on", "Specimen collected", "Collection date", "Drawn", "Date of test", or the report/result date. Return it as ISO YYYY-MM-DD. NEVER guess, NEVER fabricate a date, and NEVER use today's date. If the document does not contain a definitive test date, set "collected_on" to null.
- Do not invent values. Only report what is present in the document.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    collected_on: { anyOf: [{ type: "string" }, { type: "null" }] },
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
        },
        required: [
          "name",
          "value",
          "unit",
          "reference_low",
          "reference_high",
          "status",
          "category",
        ],
      },
    },
  },
  required: ["collected_on", "biomarkers"],
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
 * Extract biomarkers from a medical report using Claude.
 * Uses native PDF/image understanding (handles scanned reports) and
 * structured outputs for guaranteed-parseable JSON. The instruction block is
 * marked for prompt caching so repeated extractions reuse the prefix.
 */
export async function extractBiomarkers(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ExtractionResult> {
  const client = getAnthropic();
  const block = buildContentBlock(buffer, mimeType, fileName);

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
          { type: "text", text: "Extract all biomarkers from this report." },
          block as never,
        ],
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    return { collected_on: null, biomarkers: [] };
  }

  const parsed = JSON.parse(text.text) as ExtractionResult;
  return {
    collected_on: parsed.collected_on ?? null,
    biomarkers: Array.isArray(parsed.biomarkers) ? parsed.biomarkers : [],
  };
}
