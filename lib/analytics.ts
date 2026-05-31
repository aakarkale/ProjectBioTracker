import type { DailyMetric } from "./health-data";

export type MetricKey = "steps" | "cal" | "rhr" | "hrv" | "exer" | "whr" | "flights";

/**
 * Trailing rolling average over `window` days, ignoring null readings.
 * Returns one value per row (aligned to the input), or null where the
 * window has no readings at all.
 */
export function rolling(
  arr: DailyMetric[],
  key: MetricKey,
  window = 7
): (number | null)[] {
  return arr.map((_, i) => {
    const slice = arr
      .slice(Math.max(0, i - window + 1), i + 1)
      .map((d) => d[key])
      .filter((v): v is number => v !== null && v !== undefined);
    if (!slice.length) return null;
    return Math.round((slice.reduce((s, v) => s + v, 0) / slice.length) * 10) / 10;
  });
}

/** Mean of a metric across rows, ignoring nulls. */
export function average(arr: DailyMetric[], key: MetricKey): number | null {
  const v = arr
    .map((d) => d[key])
    .filter((x): x is number => x !== null && x !== undefined);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

export type ChartPoint = DailyMetric & {
  rhrTrend: number | null;
  hrvTrend: number | null;
  stepsTrend: number | null;
  whrTrend: number | null;
  calTrend: number | null;
  exerTrend: number | null;
};

/** Build the chart series: raw data plus 7-day trend lines. */
export function buildChartData(rows: DailyMetric[]): ChartPoint[] {
  const rhrTrend = rolling(rows, "rhr");
  const hrvTrend = rolling(rows, "hrv");
  const stepsTrend = rolling(rows, "steps");
  const whrTrend = rolling(rows, "whr");
  const calTrend = rolling(rows, "cal");
  const exerTrend = rolling(rows, "exer");

  return rows.map((d, i) => ({
    ...d,
    rhrTrend: rhrTrend[i],
    hrvTrend: hrvTrend[i],
    stepsTrend: stepsTrend[i],
    whrTrend: whrTrend[i],
    calTrend: calTrend[i],
    exerTrend: exerTrend[i],
  }));
}

export type KpiPair = { now: number | null; then: number | null };

export type KpiSummary = {
  rhr: KpiPair;
  hrv: KpiPair;
  steps: KpiPair;
  exer: KpiPair;
};

/**
 * Compare the first 14 days vs the last 14 days of the full dataset.
 * Used to drive the KPI delta indicators.
 */
export function buildKpis(all: DailyMetric[]): KpiSummary {
  const first = all.slice(0, 14);
  const last = all.slice(-14);
  return {
    rhr: { now: average(last, "rhr"), then: average(first, "rhr") },
    hrv: { now: average(last, "hrv"), then: average(first, "hrv") },
    steps: { now: average(last, "steps"), then: average(first, "steps") },
    exer: { now: average(last, "exer"), then: average(first, "exer") },
  };
}

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "04/19" -> "Apr 19" (no year — daily labels don't carry one). */
function niceDate(mmdd: string): string {
  const [m, d] = mmdd.split("/").map(Number);
  if (!m || !d) return mmdd;
  return `${MONTH_ABBR[m - 1]} ${d}`;
}

export type DataWindow = { start: string; end: string; days: number };

/** First/last date labels and span of an oldest-first metrics series. */
export function dataWindow(data: DailyMetric[]): DataWindow | null {
  if (!data.length) return null;
  return {
    start: niceDate(data[0].date),
    end: niceDate(data[data.length - 1].date),
    days: data.length,
  };
}

const STREAM_GROUPS: { keys: MetricKey[]; label: string }[] = [
  { keys: ["rhr", "hrv"], label: "heart" },
  { keys: ["steps", "cal", "flights"], label: "activity" },
  { keys: ["exer"], label: "exercise" },
  { keys: ["whr"], label: "walking" },
];

function hasReadings(data: DailyMetric[], key: MetricKey): boolean {
  return data.some((d) => d[key] !== null && d[key] !== undefined);
}

/** Friendly names of the metric groups the user actually has data for. */
export function connectedGroups(data: DailyMetric[]): string[] {
  return STREAM_GROUPS.filter((g) => g.keys.some((k) => hasReadings(data, k))).map(
    (g) => g.label
  );
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

type Trend = "better" | "worse" | "flat" | "none";

function trend(now: number | null, then: number | null, betterUp: boolean): Trend {
  if (now === null || then === null || then === 0) return "none";
  const change = (now - then) / Math.abs(then);
  if (Math.abs(change) < 0.05) return "flat";
  return (betterUp ? now > then : now < then) ? "better" : "worse";
}

/**
 * One plain-English sentence describing what the user has connected and how
 * their health is trending — derived from their own data, no AI call. Drives
 * the dynamic header intro on the signed-in dashboard.
 */
export function buildHealthSummary(
  data: DailyMetric[],
  biomarkerCount = 0
): string {
  if (!data.length) {
    return "Connect your health data and this fills with your recovery, activity, and lab biomarkers.";
  }

  // --- what's connected ---
  const sources = connectedGroups(data);
  if (biomarkerCount > 0) {
    sources.push(`${biomarkerCount} lab biomarker${biomarkerCount === 1 ? "" : "s"}`);
  }
  const connectClause = sources.length ? `Tracking ${joinList(sources)}` : "Your health data";

  // --- how it's trending ---
  const kpi = buildKpis(data);
  const rhr = trend(kpi.rhr.now, kpi.rhr.then, false);
  const hrv = trend(kpi.hrv.now, kpi.hrv.then, true);
  const steps = trend(kpi.steps.now, kpi.steps.then, true);
  const exer = trend(kpi.exer.now, kpi.exer.then, true);

  const cardio = summarizePair([rhr, hrv], {
    better: "cardiovascular recovery is trending up",
    worse: "cardiovascular markers have slipped recently",
    flat: "cardiovascular markers are holding steady",
  });

  const exerAvg = average(data.slice(-14), "exer");
  const exerLow = exerAvg !== null && exerAvg < 15;
  const activity = exerLow
    ? "exercise volume is the main lever still to pull"
    : summarizePair([steps, exer], {
        better: "activity is climbing",
        worse: "activity has dropped off",
        flat: "activity is holding steady",
      });

  const parts = [cardio, activity].filter((p): p is string => p !== null);
  const health = parts.length ? parts.join(", while ") : "your recent readings look steady";

  return `${connectClause} — ${health}.`;
}

function summarizePair(
  signals: Trend[],
  copy: { better: string; worse: string; flat: string }
): string | null {
  const present = signals.filter((s) => s !== "none");
  if (!present.length) return null;
  const better = present.filter((s) => s === "better").length;
  const worse = present.filter((s) => s === "worse").length;
  if (better && !worse) return copy.better;
  if (worse && !better) return copy.worse;
  return copy.flat;
}
