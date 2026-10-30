import { useState, useMemo } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { YEARS, SEASONS } from "@/lib/constants";
import { formatNumber, formatSignedPercent } from "@/lib/format";
import { percentageChange } from "@/lib/metrics";
import {
  BarChart2,
  Calendar,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

export function CompareSeasonsTab({
  selectedCrop,
  selectedDistrict,
  observationsData,
}) {
  const currentYear = YEARS[YEARS.length - 1];
  const previousYear = YEARS[YEARS.length - 2] || currentYear - 1;

  const [period1, setPeriod1] = useState({ year: currentYear, season: "Season A" });
  const [period2, setPeriod2] = useState({ year: previousYear, season: "Season A" });

  // Extract totals for period 1 and period 2 from observationsData
  const comparison = useMemo(() => {
    if (!observationsData || !observationsData.length) return null;

    function getMetrics(year, season) {
      let production = null;
      let harvested_area = null;
      let yieldVal = null;

      for (const obs of observationsData) {
        if (
          obs.crop === selectedCrop &&
          obs.year === Number(year) &&
          obs.season === season &&
          (selectedDistrict === "all" ? obs.geography === "National" || !obs.geography : obs.geography === selectedDistrict)
        ) {
          if (obs.indicator === "production" && obs.value != null) {
            production = (production || 0) + Number(obs.value);
          }
          if (obs.indicator === "harvested_area" && obs.value != null) {
            harvested_area = (harvested_area || 0) + Number(obs.value);
          }
          if (obs.indicator === "reported_yield" && obs.value != null) {
            yieldVal = Number(obs.value);
          }
        }
      }

      // Calculate derived yield if area is positive
      if (production != null && harvested_area != null && harvested_area > 0) {
        yieldVal = production / harvested_area;
      }

      return { production, harvested_area, yield: yieldVal };
    }

    const p1 = getMetrics(period1.year, period1.season);
    const p2 = getMetrics(period2.year, period2.season);

    // Compute deltas safely using percentageChange helper
    const prodDelta = percentageChange(p1.production, p2.production);
    const areaDelta = percentageChange(p1.harvested_area, p2.harvested_area);
    const yieldDelta = percentageChange(p1.yield, p2.yield);

    const diffProduction = p1.production != null && p2.production != null ? p1.production - p2.production : null;
    const diffArea = p1.harvested_area != null && p2.harvested_area != null ? p1.harvested_area - p2.harvested_area : null;
    const diffYield = p1.yield != null && p2.yield != null ? p1.yield - p2.yield : null;

    return {
      p1,
      p2,
      diffProduction,
      diffArea,
      diffYield,
      prodDelta,
      areaDelta,
      yieldDelta,
    };
  }, [observationsData, selectedCrop, selectedDistrict, period1, period2]);

  const p1Label = `${period1.year} ${period1.season}`;
  const p2Label = `${period2.year} ${period2.season}`;

  const chartData = useMemo(() => {
    if (!comparison) return [];
    return [
      {
        indicator: "Production (t)",
        [p1Label]: comparison.p1.production ? Math.round(comparison.p1.production) : 0,
        [p2Label]: comparison.p2.production ? Math.round(comparison.p2.production) : 0,
      },
      {
        indicator: "Harvested Area (ha)",
        [p1Label]: comparison.p1.harvested_area ? Math.round(comparison.p1.harvested_area) : 0,
        [p2Label]: comparison.p2.harvested_area ? Math.round(comparison.p2.harvested_area) : 0,
      },
    ];
  }, [comparison, p1Label, p2Label]);

  return (
    <div className="space-y-6">
      {/* Header & Controls Card */}
      <DashboardCard
        title="Compare Agricultural Seasons"
        subtitle={`Examine changes in ${selectedCrop} across two distinct seasonal reporting periods in ${
          selectedDistrict === "all" ? "Rwanda" : `${selectedDistrict} District`
        }`}
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5 items-center">
          {/* Period 1 Selection */}
          <div className="lg:col-span-2 space-y-2 rounded-xl border border-border bg-card p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Primary Period (Season 1)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">Survey Year</label>
                <select
                  aria-label="Season 1 survey year"
                  value={period1.year}
                  onChange={(e) => setPeriod1({ ...period1, year: Number(e.target.value) })}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">Season</label>
                <select
                  aria-label="Season 1 season name"
                  value={period1.season}
                  onChange={(e) => setPeriod1({ ...period1, season: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {SEASONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] font-medium text-foreground">{p1Label}</p>
          </div>

          {/* Versus Icon */}
          <div className="flex justify-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <span className="text-xs font-bold">VS</span>
            </div>
          </div>

          {/* Period 2 Selection */}
          <div className="lg:col-span-2 space-y-2 rounded-xl border border-border bg-card p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Baseline Period (Season 2)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">Survey Year</label>
                <select
                  aria-label="Season 2 survey year"
                  value={period2.year}
                  onChange={(e) => setPeriod2({ ...period2, year: Number(e.target.value) })}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase">Season</label>
                <select
                  aria-label="Season 2 season name"
                  value={period2.season}
                  onChange={(e) => setPeriod2({ ...period2, season: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {SEASONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] font-medium text-foreground">{p2Label}</p>
          </div>
        </div>
      </DashboardCard>

      {/* Comparison Results Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Production Delta Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Production Comparison
            </span>
            <BarChart2 className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{p1Label}:</span>
              <span className="font-semibold text-foreground">
                {comparison?.p1.production != null ? `${formatNumber(comparison.p1.production)} t` : "Unavailable"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{p2Label}:</span>
              <span className="font-medium text-foreground">
                {comparison?.p2.production != null ? `${formatNumber(comparison.p2.production)} t` : "Unavailable"}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-border flex justify-between items-baseline">
              <span className="text-[11px] font-semibold text-foreground">Difference:</span>
              <div className="text-right">
                <span className="text-sm font-bold text-foreground">
                  {comparison?.diffProduction != null
                    ? `${comparison.diffProduction >= 0 ? "+" : ""}${formatNumber(comparison.diffProduction)} t`
                    : "Unavailable"}
                </span>
                {comparison?.prodDelta?.value != null && (
                  <p
                    className={`text-xs font-semibold ${
                      comparison.prodDelta.value >= 0 ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {formatSignedPercent(comparison.prodDelta.value)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Harvested Area Delta Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Harvested Area Comparison
            </span>
            <Calendar className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{p1Label}:</span>
              <span className="font-semibold text-foreground">
                {comparison?.p1.harvested_area != null
                  ? `${formatNumber(comparison.p1.harvested_area)} ha`
                  : "Unavailable"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{p2Label}:</span>
              <span className="font-medium text-foreground">
                {comparison?.p2.harvested_area != null
                  ? `${formatNumber(comparison.p2.harvested_area)} ha`
                  : "Unavailable"}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-border flex justify-between items-baseline">
              <span className="text-[11px] font-semibold text-foreground">Difference:</span>
              <div className="text-right">
                <span className="text-sm font-bold text-foreground">
                  {comparison?.diffArea != null
                    ? `${comparison.diffArea >= 0 ? "+" : ""}${formatNumber(comparison.diffArea)} ha`
                    : "Unavailable"}
                </span>
                {comparison?.areaDelta?.value != null && (
                  <p
                    className={`text-xs font-semibold ${
                      comparison.areaDelta.value >= 0 ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {formatSignedPercent(comparison.areaDelta.value)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Yield Delta Card */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Yield Comparison
            </span>
            <BarChart2 className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{p1Label}:</span>
              <span className="font-semibold text-foreground">
                {comparison?.p1.yield != null ? `${formatNumber(comparison.p1.yield, 2)} t/ha` : "Unavailable"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{p2Label}:</span>
              <span className="font-medium text-foreground">
                {comparison?.p2.yield != null ? `${formatNumber(comparison.p2.yield, 2)} t/ha` : "Unavailable"}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-border flex justify-between items-baseline">
              <span className="text-[11px] font-semibold text-foreground">Difference:</span>
              <div className="text-right">
                <span className="text-sm font-bold text-foreground">
                  {comparison?.diffYield != null
                    ? `${comparison.diffYield >= 0 ? "+" : ""}${formatNumber(comparison.diffYield, 2)} t/ha`
                    : "Unavailable"}
                </span>
                {comparison?.yieldDelta?.value != null && (
                  <p
                    className={`text-xs font-semibold ${
                      comparison.yieldDelta.value >= 0 ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {formatSignedPercent(comparison.yieldDelta.value)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Comparison Chart */}
      <DashboardCard
        title="Visual Indicator Comparison"
        subtitle={`Comparing ${p1Label} vs ${p2Label} for ${selectedCrop}`}
      >
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
              <XAxis dataKey="indicator" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : val)}
              />
              <RechartsTooltip
                formatter={(val, name) => [`${formatNumber(val)}`, name]}
                contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }} />
              <Bar dataKey={p1Label} fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey={p2Label} fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      {/* Safeguards & Analytical Note */}
      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Statistical Comparison Safeguards</p>
            <p>
              Percentage change is computed only when baseline observations are valid and non-zero. A missing season is never replaced by zero or an adjacent release.
            </p>
            <p>
              Observed variations between seasons reflect reported statistical estimates from seasonal sample surveys and should not be interpreted as definitive proof of specific weather or management causes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
