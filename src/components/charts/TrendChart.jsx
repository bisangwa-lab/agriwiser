import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { ChartPlaceholder } from "@/components/dashboard/ChartPlaceholder";
import { TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/format";

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-4))", "hsl(var(--chart-3))"];

/**
 * Time-series chart. `series` is [{ key, label, digits }]; the first series is
 * drawn as a filled area and any further series as lines on the same axis.
 */
export function TrendChart({ data, xKey = "label", series, unitShort, height = 300, emptyMessage }) {
  const rows = Array.isArray(data) ? data : [];
  const hasValues = rows.some((row) => series.some((s) => typeof row[s.key] === "number"));

  if (!hasValues) {
    return (
      <ChartPlaceholder
        icon={TrendingUp}
        title="No trend available yet"
        description={emptyMessage ?? "No compatible observations match the current filters."}
        height={height}
      />
    );
  }

  const labels = series.reduce((acc, s) => {
    acc[s.key] = s.label;
    return acc;
  }, {});

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
          <defs>
            {series.map((s, index) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.22} />
                <stop offset="100%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.01} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 4" vertical={false} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value) => formatNumber(value, 0)}
          />
          <Tooltip
            content={
              <ChartTooltip
                unitShort={unitShort}
                digits={series[0]?.digits ?? 0}
                seriesLabels={labels}
              />
            }
          />
          {series.map((s, index) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth={2}
              fill={`url(#fill-${s.key})`}
              dot={{ r: 3, strokeWidth: 1.5, fill: "hsl(var(--card))" }}
              activeDot={{ r: 4.5 }}
              connectNulls={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
