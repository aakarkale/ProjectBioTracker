/**
 * Apple Health daily metrics.
 *
 * For this first pass the data is bundled as a static sample (sourced from the
 * reference dashboard, Jan 20 2026 → Apr 20 2026). When Supabase lands, swap
 * `SAMPLE_DAILY_METRICS` for a query against the `daily_metrics` table — the
 * `DailyMetric` shape is the contract the rest of the UI depends on.
 */

export type DailyMetric = {
  /** MM/DD label as shown on the axis */
  date: string;
  steps: number | null;
  /** active calories */
  cal: number | null;
  /** resting heart rate (bpm) */
  rhr: number | null;
  /** heart-rate variability (ms) */
  hrv: number | null;
  /** exercise minutes */
  exer: number | null;
  /** walking heart rate (bpm) */
  whr: number | null;
  flights: number | null;
};

// [date, steps, activeCal, restHR, hrv, exerMin, walkHR, flights]
type Row = [string, number, number, number | null, number | null, number, number | null, number];

const RAW: Row[] = [
  ["01/20", 4477, 231, 71, 46, 6, 94, 2],
  ["01/21", 7613, 381, 73, 41, 4, 102, 1],
  ["01/22", 6858, 441, 81, 34, 31, 129, 2],
  ["01/23", 1517, 0, null, null, 0, null, 0],
  ["01/24", 5813, 255, 84, 27, 2, 102, 0],
  ["01/25", 4776, 155, null, null, 28, 117, 0],
  ["01/26", 5313, 191, 84, 37, 2, 105, 0],
  ["01/27", 2647, 164, 80, 30, 3, 89, 1],
  ["01/28", 1345, 59, 84, 42, 1, 93, 0],
  ["01/29", 5632, 234, 89, 23, 6, 102, 2],
  ["01/30", 2563, 128, 87, 26, 4, 98, 0],
  ["01/31", 2676, 99, 85, 27, 1, 112, 1],
  ["02/01", 2171, 2, 58, null, 1, null, 0],
  ["02/02", 5272, 291, 79, 22, 4, 91, 1],
  ["02/03", 2687, 0, null, null, 0, null, 1],
  ["02/04", 2176, 90, 65, 26, 0, 104, 0],
  ["02/05", 879, 0, null, null, 0, null, 0],
  ["02/06", 2432, 20, 63, 37, 1, null, 0],
  ["02/07", 3172, 136, 86, 28, 2, null, 2],
  ["02/08", 1631, 34, 96, 18, 0, null, 0],
  ["02/09", 2393, 0, null, null, 0, null, 2],
  ["02/10", 3725, 3, null, null, 1, null, 2],
  ["02/11", 3384, 66, 90, 16, 0, 109, 1],
  ["02/12", 2912, 45, 85, 24, 0, null, 0],
  ["02/13", 1735, 40, 79, 22, 1, 104, 1],
  ["02/14", 4803, 25, null, null, 1, 105, 2],
  ["02/15", 2339, 169, 81, 27, 0, null, 0],
  ["02/16", 2522, 0, null, null, 0, null, 1],
  ["02/17", 2055, 26, null, null, 0, null, 1],
  ["02/18", 2880, 63, 91, 27, 0, null, 0],
  ["02/19", 1320, 20, 74, 32, 0, null, 0],
  ["02/20", 2289, 126, 71, 39, 5, 96, 1],
  ["02/21", 5202, 348, 74, 32, 25, 115, 1],
  ["02/22", 5560, 1, null, null, 0, null, 2],
  ["02/23", 2639, 0, 64, null, 0, null, 1],
  ["02/24", 3724, 148, 80, 27, 5, 105, 1],
  ["02/25", 1030, 11, null, null, 2, null, 0],
  ["02/26", 3537, 2, null, null, 1, null, 0],
  ["02/27", 6748, 353, 71, 37, 8, 100, 3],
  ["02/28", 5645, 42, 63, 36, 0, 84, 0],
  ["03/01", 2405, 0, null, null, 0, null, 0],
  ["03/02", 4261, 0, null, null, 0, null, 0],
  ["03/03", 3481, 0, null, null, 0, null, 0],
  ["03/04", 3885, 146, 64, 25, 4, 93, 2],
  ["03/05", 1352, 2, null, null, 1, null, 1],
  ["03/06", 3161, 0, null, null, 0, null, 1],
  ["03/07", 1087, 0, null, null, 0, null, 0],
  ["03/08", 4464, 0, null, null, 0, null, 0],
  ["03/09", 5731, 204, 85, 25, 12, 100, 2],
  ["03/10", 2628, 0, null, null, 0, null, 2],
  ["03/11", 4984, 132, 61, 26, 20, 105, 3],
  ["03/12", 2101, 2, null, null, 1, null, 2],
  ["03/13", 4432, 131, 58, 50, 11, null, 0],
  ["03/14", 4277, 241, null, null, 0, 90, 0],
  ["03/15", 7642, 0, 73, 39, 0, null, 0],
  ["03/16", 5049, 136, 83, 44, 4, 100, 1],
  ["03/17", 5432, 0, null, null, 0, null, 1],
  ["03/18", 3804, 84, null, null, 18, 98, 0],
  ["03/19", 3300, 100, null, 22, 8, 101, 0],
  ["03/20", 9306, 2, null, null, 1, null, 1],
  ["03/21", 3852, 0, 48, null, 0, null, 6],
  ["03/22", 5054, 162, 59, 58, 1, 89, 0],
  ["03/23", 3244, 244, 59, 43, 4, 93, 2],
  ["03/24", 1324, 2, null, null, 1, null, 1],
  ["03/25", 4448, 249, 84, 25, 6, 107, 2],
  ["03/26", 9904, 575, 68, 38, 28, 94, 3],
  ["03/27", 7548, 377, 76, 43, 18, 85, 7],
  ["03/28", 4755, 129, null, null, 15, null, 5],
  ["03/29", 6777, 87, null, null, 5, 100, 6],
  ["03/30", 4787, 299, 72, 36, 6, 88, 2],
  ["03/31", 3791, 218, 71, 52, 5, 86, 2],
  ["04/01", 498, 2, 58, null, 1, null, 0],
  ["04/02", 2611, 67, 53, null, 11, 95, 0],
  ["04/03", 5335, 149, 62, 19, 7, 120, 2],
  ["04/04", 3262, 4, null, null, 1, null, 0],
  ["04/05", 4600, 328, 59, 33, 17, 104, 6],
  ["04/06", 6330, 208, 59, null, 3, 99, 0],
  ["04/07", 3528, 79, 85, 31, 2, 102, 2],
  ["04/08", 2104, 0, null, null, 0, null, 0],
  ["04/09", 5111, 194, 60, 37, 3, 98, 1],
  ["04/10", 1690, 61, 73, 50, 3, null, 1],
  ["04/11", 3858, 222, 61, 41, 7, 100, 4],
  ["04/12", 6556, 353, 50, 29, 2, 80, 0],
  ["04/13", 4209, 190, 71, 51, 15, 97, 1],
  ["04/14", 3539, 192, 75, 50, 7, 102, 4],
  ["04/15", 3629, 258, 82, 36, 6, 102, 3],
  ["04/16", 1532, 114, 73, 43, 5, null, 1],
  ["04/17", 3421, 51, null, null, 4, null, 0],
  ["04/18", 4177, 51, 58, 35, 2, 94, 3],
  ["04/19", 5543, 80, 58, 33, 1, 95, 1],
];

export const SAMPLE_DAILY_METRICS: DailyMetric[] = RAW.map(
  ([date, steps, cal, rhr, hrv, exer, whr, flights]) => ({
    date,
    steps,
    cal,
    rhr,
    hrv,
    exer,
    whr,
    flights,
  })
);

/** Window label shown in the header. */
export const DATA_WINDOW = {
  label: "Apple Health · 90-day window",
  start: "Jan 20",
  end: "Apr 20",
  year: "2026",
} as const;
