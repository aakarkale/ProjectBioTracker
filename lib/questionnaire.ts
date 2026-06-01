/**
 * Optional health questionnaire. Every question is multiple-choice (single- or
 * multi-select) so a user can click through the whole thing in well under a
 * minute. Answers are stored as JSONB on `profiles.health_questionnaire` and
 * folded into the AI recommendation prompt for sharper, more personal advice.
 *
 * This module is import-safe on the client (no server-only deps) so the form
 * and the server action can share one source of truth.
 */

export type QuestionType = "single" | "multi";

export type Question = {
  id: string;
  /** Short prompt shown above the options. */
  question: string;
  /** Optional helper line. */
  hint?: string;
  type: QuestionType;
  options: string[];
};

/** Answer map: single-select → string, multi-select → string[]. */
export type QuestionnaireAnswers = Record<string, string | string[]>;

export const QUESTIONNAIRE: Question[] = [
  {
    id: "activity_level",
    question: "How active are you in a typical week?",
    type: "single",
    options: [
      "Sedentary (little to no exercise)",
      "Lightly active (1–2 days/week)",
      "Moderately active (3–4 days/week)",
      "Very active (5+ days/week)",
    ],
  },
  {
    id: "diet",
    question: "Which best describes your diet?",
    type: "single",
    options: [
      "Omnivore (balanced)",
      "Mostly processed / fast food",
      "Vegetarian",
      "Vegan",
      "Pescatarian",
      "Low-carb / keto",
      "Mediterranean",
    ],
  },
  {
    id: "sleep_hours",
    question: "How much sleep do you usually get?",
    type: "single",
    options: ["Under 5 hours", "5–6 hours", "7–8 hours", "More than 8 hours"],
  },
  {
    id: "sleep_quality",
    question: "How would you rate your sleep quality?",
    type: "single",
    options: ["Poor", "Fair", "Good", "Excellent"],
  },
  {
    id: "stress",
    question: "What's your typical stress level?",
    type: "single",
    options: ["Low", "Moderate", "High", "Very high"],
  },
  {
    id: "smoking",
    question: "Do you smoke or vape?",
    type: "single",
    options: ["Never", "Former smoker", "Occasionally", "Regularly"],
  },
  {
    id: "alcohol",
    question: "How often do you drink alcohol?",
    type: "single",
    options: [
      "None",
      "Occasionally (1–2 drinks/week)",
      "Moderately (3–7 drinks/week)",
      "Heavily (8+ drinks/week)",
    ],
  },
  {
    id: "caffeine",
    question: "How much caffeine do you have daily?",
    type: "single",
    options: ["None", "1 cup/day", "2–3 cups/day", "4+ cups/day"],
  },
  {
    id: "conditions",
    question: "Any diagnosed conditions? (select all that apply)",
    hint: "Helps tailor advice to what matters for you.",
    type: "multi",
    options: [
      "None",
      "High blood pressure",
      "High cholesterol",
      "Diabetes / pre-diabetes",
      "Thyroid condition",
      "Heart condition",
      "PCOS",
      "Fatty liver",
      "Other",
    ],
  },
  {
    id: "family_history",
    question: "Family history of any of these? (select all that apply)",
    type: "multi",
    options: [
      "None",
      "Heart disease",
      "Diabetes",
      "High blood pressure",
      "Stroke",
      "Cancer",
    ],
  },
  {
    id: "medications",
    question: "Taking any of these regularly? (select all that apply)",
    type: "multi",
    options: [
      "None",
      "Blood pressure medication",
      "Cholesterol medication (statin)",
      "Diabetes medication",
      "Thyroid medication",
      "Vitamins / supplements",
      "Other",
    ],
  },
];

/** Human label for a question id (for summaries). */
const LABELS: Record<string, string> = {
  activity_level: "Activity level",
  diet: "Diet",
  sleep_hours: "Sleep duration",
  sleep_quality: "Sleep quality",
  stress: "Stress level",
  smoking: "Smoking",
  alcohol: "Alcohol",
  caffeine: "Caffeine",
  conditions: "Conditions",
  family_history: "Family history",
  medications: "Medications",
};

/** True when at least one question has been answered. */
export function hasQuestionnaire(answers: QuestionnaireAnswers | null | undefined): boolean {
  if (!answers) return false;
  return Object.values(answers).some((v) =>
    Array.isArray(v) ? v.length > 0 : Boolean(v)
  );
}

/**
 * Multi-line plain-text summary of the questionnaire for AI prompts. Empty
 * string when nothing is answered.
 */
export function describeQuestionnaire(
  answers: QuestionnaireAnswers | null | undefined
): string {
  if (!answers) return "";
  const lines: string[] = [];
  for (const q of QUESTIONNAIRE) {
    const v = answers[q.id];
    if (!v || (Array.isArray(v) && v.length === 0)) continue;
    const value = Array.isArray(v) ? v.join(", ") : v;
    lines.push(`- ${LABELS[q.id] ?? q.id}: ${value}`);
  }
  return lines.join("\n");
}
