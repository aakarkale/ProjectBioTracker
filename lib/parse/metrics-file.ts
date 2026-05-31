import Papa from "papaparse";
import {
  mergeByDay,
  normalizeDailyRow,
  parseIngestPayload,
  type DailyMetricColumns,
} from "@/lib/ingest";

/**
 * Parse an uploaded daily-metrics file into normalised rows.
 * Accepts CSV, a JSON array of rows, Health Auto Export JSON (iOS), or
 * Health Connect JSON (Android).
 */
export function parseMetricsFile(
  content: string,
  fileName: string
): DailyMetricColumns[] {
  const isJson =
    fileName.toLowerCase().endsWith(".json") || content.trim().startsWith("{") ||
    content.trim().startsWith("[");

  if (isJson) return parseMetricsJson(content);
  return parseMetricsCsv(content);
}

export function parseMetricsJson(content: string): DailyMetricColumns[] {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error("Invalid JSON file.");
  }

  return parseIngestPayload(data);
}

export function parseMetricsCsv(content: string): DailyMetricColumns[] {
  const result = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const rows = result.data
    .map(normalizeDailyRow)
    .filter((r): r is DailyMetricColumns => r !== null);

  return mergeByDay(rows);
}
