import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip } from "@/components/charts/ChartTooltip";
import { ChartPlaceholder } from "@/components/dashboard/ChartPlaceholder";
import { ArrowLeftRight } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { ChartExplanationButton } from "@/components/charts/ChartExplanationButton";
import { useLanguage } from "@/lib/LanguageContext";

/**
 * Ranked bar chart for comparing entities (districts, crops) on one indicator.
 * Horizontal bars keep long district names readable on every screen size.
 */
export function ComparisonBarChart({
  rows,
  valueKey = "value",
  labelKey = "name",
  unitShort,
  digits = 0,
  height,
  highlightKeys = [],
  emptyMessage,
  explanationProps,
}) {
  const { t } = useLanguage();
  const data = (Array.isArray(rows) ? rows : []).filter((r) => typeof r[valueKey] === "number");

  if (!data.length) {
    return (
      <ChartPlaceholder
        icon={ArrowLeftRight}
        title={t("No comparison available yet")}
        description={t(emptyMessage ?? "No compatible values match the current filters.")}
        height={height ?? 250}
      />
    );
  }

  const resolvedHeight = height ?? Math.max(220, data.length * 30 + 40);
  const max = Math.max(...data.map((r) => r[valueKey]));
  const highlight = new Set(highlightKeys);

  return (
    <div className="relative group" style={{ width: "100%", height: resolvedHeight }}>
      {explanationProps ? (
        <div className="absolute right-1 top-1 z-10 opacity-70 group-hover:opacity-100 transition-opacity">
          <ChartExplanationButton {...explanationProps} data={data} />
        </div>
      ) : null}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 4" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatNumber(value, 0)}
          />
          <YAxis
            type="category"
            interval={0}
            dataKey={labelKey}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={104}
          />
          <Tooltip content={<ChartTooltip unitShort={unitShort} digits={digits} />} cursor={{ fill: "hsl(var(--muted) / 0.6)" }} />
          <Bar dataKey={valueKey} radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
            {data.map((row) => (
              <Cell
                key={row[labelKey]}
                fill={highlight.has(row[labelKey]) ? "hsl(var(--chart-3))" : "hsl(var(--chart-1))"}
                opacity={highlight.size && !highlight.has(row[labelKey]) ? 0.45 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {t("Axis maximum")}: {formatNumber(max, digits)} {unitShort}
        {highlightKeys.length ? ` · ${t("highlighted bars are the selected entities")}` : null}
      </p>
    </div>
  );
}
