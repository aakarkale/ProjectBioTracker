import Papa from "papaparse";
import {
  mergeByDay,
  normalizeDailyRow,
  parseHealthAutoExport,
  type DailyMetricColumns,
} from "@/lib/ingest";

/**
 * Parse an uploaded daily-metrics file into normalised rows.
 * Accepts CSV, a JSON array of rows, or Health Auto Export JSON.
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

  // Health Auto Export shape: { data: { metrics: [...] } }
  if (data && typeof data === "object" && "data" in data) {
    const rows = parseHealthAutoExport(data);
    if (rows.length) return mergeByDay(rows);
  }

  // Plain array of row objects.
  const arr = Array.isArray(data) ? data : [];
  const rows = arr
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map(normalizeDailyRow)
    .filter((r): r is DailyMetricColumns => r !== null);

  return mergeByDay(rows);
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
