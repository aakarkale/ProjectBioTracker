import { getAnthropic, MODEL } from "./client";

export type TrendPoint = { date: string | null; value: number | null };

const SYSTEM = `You are a careful health-data assistant explaining how a single lab biomarker has changed over time for one person.

Guidelines:
- Use the person's profile (age, sex, height, weight, goals) to make the reading personal and relevant when it's provided.
- Describe the trend plainly: is it improving, worsening, or stable relative to the reference range? Reference the actual numbers.
- If there is only one reading, interpret that single value in context and note that more reports will reveal a trend.
- Give one or two concrete, actionable suggestions tied to this marker and the person's goals.
- Be concise (3-5 sentences), encouraging, and plain-spoken.
- IMPORTANT: informational only, not medical advice or a diagnosis. Suggest discussing with a clinician where appropriate.`;

/** Personalised natural-language insight on a biomarker's progression. */
export async function biomarkerTrendInsight(params: {
  name: string;
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  series: TrendPoint[];
  profileDescription: string;
}): Promise<string> {
  const { name, unit, referenceLow, referenceHigh, series, profileDescription } =
    params;
  const client = getAnthropic();

  const range =
    referenceLow != null || referenceHigh != null
      ? `${referenceLow ?? "–"}–${referenceHigh ?? "–"}${unit ? ` ${unit}` : ""}`
      : "not provided";

  const readings =
    series
      .filter((p) => p.value !== null)
      .map((p) => `${p.date ?? "unknown date"}: ${p.value}${unit ? ` ${unit}` : ""}`)
      .join("\n") || "no numeric readings";

  const userBlock = [
    `Person: ${profileDescription || "no health profile on file"}`,
    `Biomarker: ${name}`,
    `Reference range: ${range}`,
    `Readings over time (oldest first):`,
    readings,
  ].join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userBlock }],
  });

  const text = response.content.find((b) => b.type === "text");
  return text && text.type === "text" ? text.text.trim() : "";
}
