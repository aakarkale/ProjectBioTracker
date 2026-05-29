"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
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

export function WalkingView({ data }: { data: ChartPoint[] }) {
  return (
    <>
      <ChartHeader
        title="Walking heart rate"
        subtitle="Dropping = aerobic fitness improving"
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
          <YAxis tick={tickStyle} axisLine={false} tickLine={false} domain={[70, 135]} />
          <Tooltip contentStyle={tooltipContentStyle} labelStyle={tooltipLabelStyle} />
          <Line
            type="monotone"
            dataKey="whr"
            stroke={palette.walk}
            strokeWidth={1}
            dot={{ r: 2.5, fill: palette.walk, strokeWidth: 0 }}
            connectNulls
            opacity={0.4}
          />
          <Line
            type="monotone"
            dataKey="whrTrend"
            stroke={palette.walk}
            strokeWidth={2.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}
