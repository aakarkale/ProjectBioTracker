"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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

export function IntensityView({ data }: { data: ChartPoint[] }) {
  return (
    <>
      <ChartHeader
        title="Daily exercise minutes"
        subtitle="Apple's 30/day ring target"
      />
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
            y={30}
            stroke={palette.accent}
            strokeDasharray="3 3"
            strokeOpacity={0.5}
            label={{
              value: "30 min target",
              fill: palette.accent,
              fontSize: 9,
              position: "insideTopRight",
            }}
          />
          <Bar dataKey="exer" fill={palette.cal} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
