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

// ---------------------------------------------------------------------------
// Android / Health Connect JSON
// ---------------------------------------------------------------------------

function emptyRow(day: string): DailyMetricColumns {
  return {
    day,
    steps: null,
    active_calories: null,
    resting_hr: null,
    hrv: null,
    exercise_min: null,
    walking_hr: null,
    flights: null,
  };
}

const normType = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Health Connect record / metric type → column + how to aggregate per day.
const HC_TYPE_MAP: Record<string, { col: keyof Omit<DailyMetricColumns, "day">; agg: "sum" | "avg" }> = {
  steps: { col: "steps", agg: "sum" },
  stepcount: { col: "steps", agg: "sum" },
  stepsrecord: { col: "steps", agg: "sum" },
  totalcaloriesburned: { col: "active_calories", agg: "sum" },
  activecaloriesburned: { col: "active_calories", agg: "sum" },
  activeenergyburned: { col: "active_calories", agg: "sum" },
  activeenergy: { col: "active_calories", agg: "sum" },
  caloriesburned: { col: "active_calories", agg: "sum" },
  restingheartrate: { col: "resting_hr", agg: "avg" },
  restingheartraterecord: { col: "resting_hr", agg: "avg" },
  heartratevariabilityrmssd: { col: "hrv", agg: "avg" },
  heartratevariability: { col: "hrv", agg: "avg" },
  hrv: { col: "hrv", agg: "avg" },
  exercisesession: { col: "exercise_min", agg: "sum" },
  exercisetime: { col: "exercise_min", agg: "sum" },
  exerciseminutes: { col: "exercise_min", agg: "sum" },
  floorsclimbed: { col: "flights", agg: "sum" },
  flightsclimbed: { col: "flights", agg: "sum" },
  walkingheartrateaverage: { col: "walking_hr", agg: "avg" },
  walkingheartrate: { col: "walking_hr", agg: "avg" },
};

const VALUE_KEYS = [
  "count", "value", "qty", "quantity", "amount", "steps",
  "beatsperminute", "bpm", "minutes", "durationminutes", "floors", "flights",
];

/** Pull a numeric value out of a Health Connect record (handles common nestings). */
function extractValue(p: Record<string, unknown>): number | null {
  const lc: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) lc[normType(k)] = v;

  for (const key of VALUE_KEYS) {
    const v = num(lc[key]);
    if (v !== null) return v;
  }
  // Energy is often nested: { energy: { inKilocalories | inCalories } }
  const energy = (lc["energy"] ?? lc["totalenergy"] ?? lc["activeenergy"]) as
    | Record<string, unknown>
    | undefined;
  if (energy && typeof energy === "object") {
    const kcal = num((energy as Record<string, unknown>)["inkilocalories"] ?? (energy as Record<string, unknown>)["inKilocalories"]);
    if (kcal !== null) return kcal;
    const cal = num((energy as Record<string, unknown>)["incalories"] ?? (energy as Record<string, unknown>)["inCalories"]);
    if (cal !== null) return cal / 1000;
  }
  return null;
}

const DATE_KEYS = ["date", "day", "time", "starttime", "startdate", "datetime", "endtime", "instant"];

function recordDay(p: Record<string, unknown>): string | null {
  const lc: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) lc[normType(k)] = v;
  for (const key of DATE_KEYS) {
    const d = normalizeDay(lc[key] as string);
    if (d) return d;
  }
  return null;
}

/** Exercise duration in whole minutes from a record's start/end, if present. */
function durationMinutes(p: Record<string, unknown>): number | null {
  const lc: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) lc[normType(k)] = v;
  const start = lc["starttime"] ?? lc["startdate"] ?? lc["start"];
  const end = lc["endtime"] ?? lc["enddate"] ?? lc["end"];
  if (typeof start === "string" && typeof end === "string") {
    const s = Date.parse(start);
    const e = Date.parse(end);
    if (!Number.isNaN(s) && !Number.isNaN(e) && e > s) {
      return Math.round((e - s) / 60000);
    }
  }
  return null;
}

/**
 * Parse Android / Health Connect style JSON (e.g. from HealthConnectExports or
 * Health Sync). Accepts either an array of records, or an object whose values
 * are arrays of records keyed by type. Records are mapped to our columns and
 * aggregated per day (sums for counts, averages for rates).
 */
export function parseHealthConnect(input: unknown): DailyMetricColumns[] {
  const records: { type: string; point: Record<string, unknown> }[] = [];

  if (Array.isArray(input)) {
    for (const r of input) {
      if (r && typeof r === "object") {
        const o = r as Record<string, unknown>;
        const type = String(o.recordType ?? o.type ?? o.dataType ?? o.name ?? "");
        records.push({ type, point: o });
      }
    }
  } else if (input && typeof input === "object") {
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        for (const p of v) {
          if (p && typeof p === "object") records.push({ type: k, point: p as Record<string, unknown> });
        }
      }
    }
  }

  const byDay = new Map<string, DailyMetricColumns>();
  const avg = new Map<string, Map<string, number[]>>(); // day -> col -> values

  for (const { type, point } of records) {
    const meta =
      HC_TYPE_MAP[normType(type)] ??
      HC_TYPE_MAP[normType(String(point.recordType ?? point.type ?? ""))];
    if (!meta) continue;
    const day = recordDay(point);
    if (!day) continue;

    let value = extractValue(point);
    if (value === null && meta.col === "exercise_min") value = durationMinutes(point);
    if (value === null) continue;

    if (!byDay.has(day)) byDay.set(day, emptyRow(day));
    const row = byDay.get(day)!;

    if (meta.agg === "sum") {
      const isHrv = meta.col === "hrv";
      const cur = (row[meta.col] as number | null) ?? 0;
      row[meta.col] = isHrv ? cur + value : Math.round(cur + value);
    } else {
      if (!avg.has(day)) avg.set(day, new Map());
      const m = avg.get(day)!;
      const arr = m.get(meta.col) ?? [];
      arr.push(value);
      m.set(meta.col, arr);
    }
  }

  // Finalize averages.
  for (const [day, cols] of avg) {
    if (!byDay.has(day)) byDay.set(day, emptyRow(day));
    const row = byDay.get(day)!;
    for (const [col, vals] of cols) {
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      row[col as keyof Omit<DailyMetricColumns, "day">] =
        col === "hrv" ? Math.round(mean * 10) / 10 : Math.round(mean);
    }
  }

  return [...byDay.values()];
}

/**
 * Unified entry point: turn any supported JSON payload into daily metric rows.
 * Tries, in order: Health Auto Export (iOS), a plain array of daily rows,
 * then Health Connect (Android) records.
 */
export function parseIngestPayload(payload: unknown): DailyMetricColumns[] {
  // Health Auto Export: { data: { metrics: [...] } }
  if (payload && typeof payload === "object" && "data" in payload) {
    const hae = parseHealthAutoExport(payload);
    if (hae.length) return hae;
  }

  const tryRows = (arr: unknown[]): DailyMetricColumns[] => {
    const daily = mergeByDay(
      arr
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .map(normalizeDailyRow)
        .filter((r): r is DailyMetricColumns => r !== null)
    );
    if (daily.length) return daily;
    return parseHealthConnect(arr);
  };

  if (Array.isArray(payload)) return tryRows(payload);

  if (payload && typeof payload === "object") {
    const data = (payload as Record<string, unknown>).data;
    if (Array.isArray(data)) {
      const rows = tryRows(data);
      if (rows.length) return rows;
    }
    return parseHealthConnect(payload);
  }

  return [];
}
