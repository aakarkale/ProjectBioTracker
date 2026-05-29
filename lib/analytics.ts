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
