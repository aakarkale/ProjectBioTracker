"use client";

import {
  Bar,
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

export function ActivityView({ data }: { data: ChartPoint[] }) {
  return (
    <>
      <ChartHeader title="Daily steps" subtitle="Bars = daily · Line = 7-day average" />
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
          <YAxis tick={tickStyle} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} />
          <ReferenceLine
            y={8000}
            stroke={palette.steps}
            strokeDasharray="3 3"
            strokeOpacity={0.4}
            label={{
              value: "8k target",
              fill: palette.steps,
              fontSize: 9,
              position: "insideTopRight",
            }}
          />
          <Bar dataKey="steps" fill={palette.steps} fillOpacity={0.35} radius={[2, 2, 0, 0]} />
          <Line
            type="monotone"
            dataKey="stepsTrend"
            stroke={palette.steps}
            strokeWidth={2.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}
