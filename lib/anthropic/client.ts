import Anthropic from "@anthropic-ai/sdk";

/** Model used across the app. */
export const MODEL = "claude-opus-4-8";

export const isAnthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);

let cached: Anthropic | null = null;

/** Lazily-constructed Anthropic client (reads ANTHROPIC_API_KEY from env). */
export function getAnthropic(): Anthropic {
  if (!isAnthropicConfigured) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  if (!cached) cached = new Anthropic();
  return cached;
}
