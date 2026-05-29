import { createHash, randomBytes } from "node:crypto";

/** Columns of the daily_metrics table that ingestion writes. */
export type DailyMetricColumns = {
  day: string; // YYYY-MM-DD
  steps: number | null;
  active_calories: number | null;
  resting_hr: number | null;
  hrv: number | null;
  exercise_min: number | null;
  walking_hr: number | null;
  flights: number | null;
};

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const TOKEN_PREFIX = "bt_";

/** Generate a new opaque ingest token (shown to the user only once). */
export function generateToken(): string {
  return TOKEN_PREFIX + randomBytes(24).toString("hex");
}

/** SHA-256 hex of a token — only the hash is persisted. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

// ---------------------------------------------------------------------------
// Date + value normalisation
// ---------------------------------------------------------------------------

/** Coerce many date spellings to YYYY-MM-DD, or null if unparseable. */
export function normalizeDay(input: unknown): string | null {
  if (typeof input !== "string" && typeof input !== "number") return null;
  const s = String(input).trim();
  if (!s) return null;

  // Already ISO-ish: "2026-04-19", "2026-04-19 00:00:00 +0000"
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // US style: "04/19/2026" or "4/9/26"
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (us) {
    const yr = us[3].length === 2 ? `20${us[3]}` : us[3];
    return `${yr}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  }

  // "MM/DD" with no year — assume current year (personal-tool convenience).
  const md = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (md) {
    const yr = new Date().getFullYear();
    return `${yr}-${md[1].padStart(2, "0")}-${md[2].padStart(2, "0")}`;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function intOrNull(v: unknown): number | null {
  const n = num(v);
  return n === null ? null : Math.round(n);
}

// Accepted column aliases for generic CSV/JSON rows.
const ALIASES: Record<keyof Omit<DailyMetricColumns, "day">, string[]> = {
  steps: ["steps", "step_count", "stepcount"],
  active_calories: ["active_calories", "cal", "active_energy", "activeenergy", "activecal"],
  resting_hr: ["resting_hr", "rhr", "resting_heart_rate", "restinghr"],
  hrv: ["hrv", "heart_rate_variability", "heartratevariability"],
  exercise_min: ["exercise_min", "exer", "exercise_minutes", "apple_exercise_time", "exercisetime"],
  walking_hr: ["walking_hr", "whr", "walking_heart_rate_average", "walkinghr", "walking_heart_rate"],
  flights: ["flights", "flights_climbed", "flightsclimbed"],
};

const DAY_ALIASES = ["day", "date", "datetime", "timestamp"];

/** Map a loosely-typed record (CSV row / JSON object) to metric columns. */
export function normalizeDailyRow(
  record: Record<string, unknown>
): DailyMetricColumns | null {
  // Lower-case the keys for tolerant matching.
  const lc: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(record)) {
    lc[k.toLowerCase().replace(/[\s_-]/g, "_")] = v;
  }

  const dayRaw = DAY_ALIASES.map((k) => lc[k]).find((v) => v != null);
  const day = normalizeDay(dayRaw);
  if (!day) return null;

  const pick = (keys: string[]) => {
    const key = keys.find((k) => lc[k.replace(/[\s-]/g, "_")] != null);
    return key ? lc[key.replace(/[\s-]/g, "_")] : null;
  };

  return {
    day,
    steps: intOrNull(pick(ALIASES.steps)),
    active_calories: intOrNull(pick(ALIASES.active_calories)),
    resting_hr: intOrNull(pick(ALIASES.resting_hr)),
    hrv: num(pick(ALIASES.hrv)),
    exercise_min: intOrNull(pick(ALIASES.exercise_min)),
    walking_hr: intOrNull(pick(ALIASES.walking_hr)),
    flights: intOrNull(pick(ALIASES.flights)),
  };
}

// ---------------------------------------------------------------------------
// Health Auto Export JSON
// ---------------------------------------------------------------------------

// Map Health Auto Export metric identifiers to our columns.
const HAE_METRIC_MAP: Record<string, keyof Omit<DailyMetricColumns, "day">> = {
  step_count: "steps",
  steps: "steps",
  active_energy: "active_calories",
  resting_heart_rate: "resting_hr",
  heart_rate_variability: "hrv",
  apple_exercise_time: "exercise_min",
  walking_heart_rate_average: "walking_hr",
  flights_climbed: "flights",
};

type HaePoint = { date?: string; qty?: number; Avg?: number };
type HaeMetric = { name?: string; data?: HaePoint[] };

/**
 * Parse the JSON emitted by the "Health Auto Export" iOS app / Apple
 * Shortcuts, collapsing per-metric series into one row per day.
 */
export function parseHealthAutoExport(payload: unknown): DailyMetricColumns[] {
  const root = payload as { data?: { metrics?: HaeMetric[] } } | undefined;
  const metrics = root?.data?.metrics;
  if (!Array.isArray(metrics)) return [];

  const byDay = new Map<string, DailyMetricColumns>();

  for (const metric of metrics) {
    const col = metric?.name ? HAE_METRIC_MAP[metric.name] : undefined;
    if (!col || !Array.isArray(metric.data)) continue;

    for (const point of metric.data) {
      const day = normalizeDay(point.date);
      if (!day) continue;
      const value = num(point.qty ?? point.Avg);
      if (value === null) continue;

      const row =
        byDay.get(day) ??
        ({
          day,
          steps: null,
          active_calories: null,
          resting_hr: null,
          hrv: null,
          exercise_min: null,
          walking_hr: null,
          flights: null,
        } satisfies DailyMetricColumns);

      row[col] = col === "hrv" ? value : Math.round(value);
      byDay.set(day, row);
    }
  }

  return [...byDay.values()];
}

/** Merge partial rows that share a day (last non-null wins per column). */
export function mergeByDay(rows: DailyMetricColumns[]): DailyMetricColumns[] {
  const byDay = new Map<string, DailyMetricColumns>();
  for (const row of rows) {
    const existing = byDay.get(row.day);
    if (!existing) {
      byDay.set(row.day, { ...row });
      continue;
    }
    for (const k of Object.keys(row) as (keyof DailyMetricColumns)[]) {
      if (k === "day") continue;
      if (row[k] !== null && row[k] !== undefined) {
        (existing[k] as number | null) = row[k] as number | null;
      }
    }
  }
  return [...byDay.values()];
}
