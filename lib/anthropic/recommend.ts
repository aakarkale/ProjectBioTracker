import { getAnthropic, MODEL } from "./client";
import type { Biomarker } from "@/lib/queries";
import type { KpiSummary } from "@/lib/analytics";

export type Recommendation = {
  title: string;
  rationale: string;
  actions: string[];
  priority: "high" | "medium" | "low";
  related_markers: string[];
};

const RECOMMEND_SYSTEM = `You are a careful health-data assistant. Given recent Apple Health activity metrics and out-of-range lab biomarkers, produce specific, evidence-aligned lifestyle recommendations.

Guidelines:
- Focus on the biomarkers that are borderline or critical, and on the activity gaps.
- Each recommendation must be concrete and actionable (specific behaviours, frequencies, targets) — not generic ("eat healthy").
- Tie recommendations to the data you were given via related_markers.
- Prioritise: "high" for critical markers or large gaps, "medium" for borderline, "low" for maintenance.
- Be encouraging and plain-spoken.
- IMPORTANT: This is informational only, not medical advice. Do not diagnose. Where appropriate, suggest discussing with a clinician.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    recommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          rationale: { type: "string" },
          actions: { type: "array", items: { type: "string" } },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          related_markers: { type: "array", items: { type: "string" } },
        },
        required: ["title", "rationale", "actions", "priority", "related_markers"],
      },
    },
  },
  required: ["recommendations"],
} as const;

function summarise(biomarkers: Biomarker[], kpi: KpiSummary): string {
  const flagged = biomarkers.filter((b) => b.status === "borderline" || b.status === "critical");
  const markerLines = (flagged.length ? flagged : biomarkers.slice(0, 12)).map((b) => {
    const range =
      b.reference_low != null || b.reference_high != null
        ? ` (ref ${b.reference_low ?? "–"}–${b.reference_high ?? "–"})`
        : "";
    return `- ${b.name}: ${b.value ?? "?"} ${b.unit ?? ""}${range} [${b.status}]`;
  });

  const fmt = (n: number | null) => (n == null ? "n/a" : Math.round(n * 10) / 10);
  const activity = [
    `- Resting HR: now ${fmt(kpi.rhr.now)} bpm (was ${fmt(kpi.rhr.then)})`,
    `- HRV: now ${fmt(kpi.hrv.now)} ms (was ${fmt(kpi.hrv.then)})`,
    `- Steps/day: now ${fmt(kpi.steps.now)} (was ${fmt(kpi.steps.then)})`,
    `- Exercise min/day: now ${fmt(kpi.exer.now)} (was ${fmt(kpi.exer.then)})`,
  ];

  return [
    "Recent activity (last 14 days vs first 14 days):",
    ...activity,
    "",
    flagged.length ? "Out-of-range biomarkers:" : "Biomarkers on file:",
    ...(markerLines.length ? markerLines : ["- none on file"]),
  ].join("\n");
}

/**
 * Generate personalised recommendations from biomarkers + activity KPIs.
 * The system instruction is cached; the per-user data summary varies and
 * sits after the cached prefix.
 */
export async function generateRecommendations(
  biomarkers: Biomarker[],
  kpi: KpiSummary
): Promise<Recommendation[]> {
  const client = getAnthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: RECOMMEND_SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: summarise(biomarkers, kpi),
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return [];
  const parsed = JSON.parse(text.text) as { recommendations: Recommendation[] };
  return Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
}
