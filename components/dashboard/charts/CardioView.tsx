"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "@/lib/analytics";
import { palette } from "@/lib/theme";
import {
  ChartHeader,
  tickStyle,
  tooltipContentStyle,
  tooltipLabelStyle,
  xInterval,
  xTickStyle,
} from "./chartConfig";

export function CardioView({ data }: { data: ChartPoint[] }) {
  return (
    <>
      <ChartHeader
        title="Cardiovascular recovery"
        subtitle="Resting HR (red) vs HRV (purple) · 7-day trend"
      />
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid stroke={palette.border} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={xTickStyle}
            interval={xInterval(data.length)}
            axisLine={{ stroke: palette.border }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            domain={[40, 100]}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={tickStyle}
            axisLine={false}
            tickLine={false}
            domain={[0, 70]}
          />
          <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} />
          <ReferenceLine
            yAxisId="left"
            y={65}
            stroke={palette.steps}
            strokeDasharray="3 3"
            strokeOpacity={0.4}
            label={{
              value: "RHR target",
              fill: palette.steps,
              fontSize: 9,
              position: "insideTopRight",
            }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="rhr"
            stroke={palette.heart}
            strokeWidth={1}
            dot={{ r: 2, fill: palette.heart, strokeWidth: 0 }}
            connectNulls
            opacity={0.35}
            name="RHR raw"
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="rhrTrend"
            stroke={palette.heart}
            strokeWidth={2.5}
            dot={false}
            name="RHR 7d avg"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="hrv"
            stroke={palette.hrv}
            strokeWidth={1}
            dot={{ r: 2, fill: palette.hrv, strokeWidth: 0 }}
            connectNulls
            opacity={0.35}
            name="HRV raw"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="hrvTrend"
            stroke={palette.hrv}
            strokeWidth={2.5}
            dot={false}
            name="HRV 7d avg"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-4 flex gap-4 font-mono text-xs">
        <span className="text-mute">
          <span
            className="mr-1.5 inline-block h-0.5 w-3 align-middle"
            style={{ background: palette.heart }}
          />
          RHR bpm
        </span>
        <span className="text-mute">
          <span
            className="mr-1.5 inline-block h-0.5 w-3 align-middle"
            style={{ background: palette.hrv }}
          />
          HRV ms
        </span>
      </div>
    </>
  );
}
