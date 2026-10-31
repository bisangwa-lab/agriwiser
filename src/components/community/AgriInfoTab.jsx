import { useState, useMemo } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { SourcePublications } from "@/components/dashboard/SourcePublications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CROPS,
  MAIN_CROPS,
  DISTRICTS,
  PROVINCES,
  DISTRICT_PROVINCE,
  cropLabel,
  SEASONS,
} from "@/lib/constants";
import { formatNumber, formatSignedPercent } from "@/lib/format";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Sprout,
  MapPin,
  TrendingUp,
  Bookmark,
  BookmarkCheck,
  Search,
  Check,
  Layers,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
} from "recharts";

const POPULAR_CROPS = ["Maize", "Beans", "Irish Potato", "Rice", "Cassava", "Soybean", "Banana", "Sorghum"];

export function AgriInfoTab({
  selectedCrop,
  selectedDistrict,
  selectedSeason,
  onSelectCrop,
  onSelectDistrict,
  onSelectSeason,
  overviewData,
  isLoadingObservations,
  observationsError = false,
  observationsErrorMessage,
  isCropSaved,
  isDistrictSaved,
  onToggleSaveCrop,
  onToggleSaveDistrict,
  observationsData,
}) {
  const { t } = useLanguage();
  const [cropSearch, setCropSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");

  const filteredCrops = useMemo(() => {
    if (!cropSearch.trim()) return CROPS;
    const term = cropSearch.toLowerCase();
    return CROPS.filter((c) => c.toLowerCase().includes(term));
  }, [cropSearch]);

  const filteredDistricts = useMemo(() => {
    if (!districtSearch.trim()) return DISTRICTS;
    const term = districtSearch.toLowerCase();
    return DISTRICTS.filter(
      (d) => d.name.toLowerCase().includes(term) || d.province.toLowerCase().includes(term)
    );
  }, [districtSearch]);

  const cards = overviewData?.cards ?? {};
  const trend = overviewData?.trend ?? [];
  const latestPeriod = overviewData?.latestPeriod ?? "Latest available season";

  const productionValue = cards.production?.value;
  const areaValue = cards.harvested_area?.value;
  const yieldValue = cards.yield?.value;
  const prodDelta = cards.production?.deltaPct;
  const areaDelta = cards.harvested_area?.deltaPct;
  const yieldDelta = cards.yield?.deltaPct;

  // Format trend data for Recharts
  const chartData = useMemo(() => {
    return trend.map((point) => ({
      year: String(point.year),
      production: point.value != null ? Math.round(point.value) : null,
      area: point.harvested_area != null ? Math.round(point.harvested_area) : null,
      yield: point.yield != null ? Number(point.yield.toFixed(2)) : null,
    }));
  }, [trend]);

  // Province comparison data for current crop
  const districtComparisonData = useMemo(() => {
    if (!observationsData || !observationsData.length) return [];
    const latestYear = overviewData?.latestYear;
    if (!latestYear) return [];

    // Filter observations for current crop, latest year, production indicator
    const currentProvince = selectedDistrict !== "all" ? DISTRICT_PROVINCE[selectedDistrict] : null;
    const relevantDistricts = currentProvince
      ? DISTRICTS.filter((d) => d.province === currentProvince).map((d) => d.name)
      : null;

    const districtMap = new Map();
    for (const obs of observationsData) {
      if (obs.crop === selectedCrop && obs.year === latestYear && obs.indicator === "production" && obs.geography && obs.geography !== "National") {
        if (!relevantDistricts || relevantDistricts.includes(obs.geography)) {
          const prev = districtMap.get(obs.geography) || 0;
          districtMap.set(obs.geography, prev + (Number(obs.value) || 0));
        }
      }
    }

    const result = Array.from(districtMap.entries()).map(([name, value]) => ({
      name,
      production: Math.round(value),
      isCurrent: name === selectedDistrict,
    }));

    return result.sort((a, b) => b.production - a.production).slice(0, 10);
  }, [observationsData, selectedCrop, selectedDistrict, overviewData]);

  return (
    <div className="space-y-6">
      {observationsError && <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{t("We couldn’t load the published figures.")} {t(observationsErrorMessage || "Please retry in a moment.")}</div>}
      {/* Top Filter Selection Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Feature 1: Choose Your Crop */}
        <DashboardCard
          title="Choose Your Crop"
          subtitle="Select from 26 officially published agricultural crops in Rwanda"
        >
          <div className="space-y-4">
            {/* Quick popular crops buttons */}
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("Common Crops")}
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {POPULAR_CROPS.map((crop) => (
                  <button
                    key={crop}
                    onClick={() => onSelectCrop(crop)}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      selectedCrop === crop
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-foreground hover:bg-muted"
                    }`}
                  >
                    {t(crop)}
                    {selectedCrop === crop && <Check className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Search and full crop list */}
            <div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("Search all 26 crops (e.g. Maize, Climbing Beans, Coffee)...")}
                  value={cropSearch}
                  onChange={(e) => setCropSearch(e.target.value)}
                  className="h-9 pl-9 text-xs"
                />
              </div>

              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-1">
                {filteredCrops.length === 0 ? (
                  <p className="p-3 text-center text-xs text-muted-foreground">
                    {t("No crops matching “")}{cropSearch}”
                  </p>
                ) : (
                  <div className="grid gap-1 sm:grid-cols-2">
                    {filteredCrops.map((crop) => {
                      const isMain = MAIN_CROPS.includes(crop);
                      const isSelected = selectedCrop === crop;
                      return (
                        <button
                          key={crop}
                          onClick={() => onSelectCrop(crop)}
                          className={`flex items-center justify-between rounded px-2.5 py-1.5 text-left text-xs transition-colors ${
                            isSelected
                              ? "bg-primary/10 font-semibold text-primary"
                              : "text-foreground hover:bg-muted/60"
                          }`}
                        >
                          <span className="truncate">{crop}</span>
                          <span className="flex items-center gap-1">
                            {isMain ? (
                              <span className="rounded bg-muted px-1 text-[9px] text-muted-foreground">
                                {t("Main")}
                              </span>
                            ) : (
                              <span className="rounded bg-muted px-1 text-[9px] text-muted-foreground">
                                {t("Subtype")}
                              </span>
                            )}
                            {isSelected && <Check className="h-3 w-3 text-primary" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Crop Meta & Save Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/20 p-3">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {t("Selected")}: {t(cropLabel(selectedCrop))}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {MAIN_CROPS.includes(selectedCrop)
                    ? t("Official primary aggregate crop category in NISR Seasonal Agricultural Surveys.")
                    : t("Published crop sub-classification with distinct agronomic characteristics.")}
                </p>
              </div>
              <Button
                size="sm"
                variant={isCropSaved ? "secondary" : "outline"}
                onClick={onToggleSaveCrop}
                className="h-8 gap-1.5 text-xs"
              >
                {isCropSaved ? (
                  <>
                    <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                    {t("Saved in Interests")}
                  </>
                ) : (
                  <>
                    <Bookmark className="h-3.5 w-3.5" />
                    {t("Save Crop as Interest")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DashboardCard>

        {/* Feature 2: Choose Your Area */}
        <DashboardCard
          title="Choose Your Area"
          subtitle="Select a district or view aggregate figures across all 30 districts"
        >
          <div className="space-y-4">
            {/* National view button */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("Geographic Scope")}
              </span>
              <button
                onClick={() => onSelectDistrict("all")}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedDistrict === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-foreground hover:bg-muted"
                }`}
              >
                {t("All Rwanda (National Aggregate)")}
                {selectedDistrict === "all" && <Check className="h-3 w-3" />}
              </button>
            </div>

            {/* Search and full district list */}
            <div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("Search 30 districts (e.g. Musanze, Nyagatare, Huye)...")}
                  value={districtSearch}
                  onChange={(e) => setDistrictSearch(e.target.value)}
                  className="h-9 pl-9 text-xs"
                />
              </div>

              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-1">
                {filteredDistricts.length === 0 ? (
                  <p className="p-3 text-center text-xs text-muted-foreground">
                    {t("No districts matching “")}{districtSearch}”
                  </p>
                ) : (
                  <div className="space-y-2 p-1">
                    {PROVINCES.map((province) => {
                      const provinceDistricts = filteredDistricts.filter(
                        (d) => d.province === province
                      );
                      if (provinceDistricts.length === 0) return null;
                      return (
                        <div key={province} className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t(province)} {t("Province")}
                          </span>
                          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                            {provinceDistricts.map((d) => {
                              const isSelected = selectedDistrict === d.name;
                              return (
                                <button
                                  key={d.name}
                                  onClick={() => onSelectDistrict(d.name)}
                                  className={`flex items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors ${
                                    isSelected
                                      ? "bg-primary/10 font-semibold text-primary"
                                      : "text-foreground hover:bg-muted/60"
                                  }`}
                                >
                                  <span className="truncate">{d.name}</span>
                                  {isSelected && <Check className="h-3 w-3 text-primary" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Selected District Meta & Save Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/20 p-3">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {t("Selected Area:")}{" "}
                  {selectedDistrict === "all" ? t("All Rwanda") : `${t(selectedDistrict)} ${t("District")}`}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedDistrict === "all"
                    ? t("Aggregated across all reporting districts in the survey.")
                    : `${t(DISTRICT_PROVINCE[selectedDistrict])} ${t("Province")} · ${t("District-level NISR survey statistics.")}`}
                </p>
              </div>
              {selectedDistrict !== "all" && (
                <Button
                  size="sm"
                  variant={isDistrictSaved ? "secondary" : "outline"}
                  onClick={onToggleSaveDistrict}
                  className="h-8 gap-1.5 text-xs"
                >
                  {isDistrictSaved ? (
                    <>
                      <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
                      {t("Saved in Interests")}
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3.5 w-3.5" />
                      {t("Save District as Interest")}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Feature 3: What The Data Says */}
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {t("Agriculture Statistics:")} {t(selectedCrop)} {t("in")}{" "}
              {selectedDistrict === "all" ? t("Rwanda") : `${t(selectedDistrict)} ${t("District")}`}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("Published production, harvested area, and yield metrics with transparent data provenance.")}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {selectedSeason === "all" ? t("All seasons") : t(selectedSeason)} · {t(latestPeriod)}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
          <label htmlFor="agriculture-statistics-season" className="text-xs font-medium">{t("Survey season")}</label>
          <select
            id="agriculture-statistics-season"
            value={selectedSeason}
            onChange={(event) => onSelectSeason(event.target.value)}
            className="h-9 min-w-40 rounded-lg border border-input bg-background px-3 text-xs"
          >
            <option value="all">{t("All available seasons")}</option>
            {SEASONS.map((season) => <option key={season} value={season}>{season}</option>)}
          </select>
          <p className="text-[11px] text-muted-foreground">{t("Season availability varies by crop, district, and publication.")}</p>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Production Card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("Reported Production")}
            </span>
            <div className="mt-2">
              {observationsError ? <p role="status" className="text-sm text-muted-foreground">{t("Production unavailable because the data request failed.")}</p> : isLoadingObservations ? (
                <p className="text-sm text-muted-foreground">{t("Loading production data…")}</p>
              ) : productionValue != null ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground">
                    {formatNumber(productionValue)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{t("tonnes (t)")}</span>
                </div>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">{t("Data unavailable")}</p>
              )}
              {prodDelta != null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span
                    className={
                      prodDelta >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"
                    }
                  >
                    {formatSignedPercent(prodDelta)}
                  </span>{" "}
                  {t("change from prior year")}
                </p>
              )}
            </div>
            <p className="mt-3 border-t border-border pt-2 text-[10.5px] text-muted-foreground">
              {t("Total volume harvested in metric tonnes")}
            </p>
          </div>

          {/* Harvested Area Card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("Harvested Area")}
            </span>
            <div className="mt-2">
              {observationsError ? <p role="status" className="text-sm text-muted-foreground">{t("Harvested area unavailable because the data request failed.")}</p> : isLoadingObservations ? (
                <p className="text-sm text-muted-foreground">{t("Loading area data…")}</p>
              ) : areaValue != null ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground">
                    {formatNumber(areaValue)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">{t("hectares (ha)")}</span>
                </div>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">{t("Data unavailable")}</p>
              )}
              {areaDelta != null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span
                    className={
                      areaDelta >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"
                    }
                  >
                    {formatSignedPercent(areaDelta)}
                  </span>{" "}
                  {t("change from prior year")}
                </p>
              )}
            </div>
            <p className="mt-3 border-t border-border pt-2 text-[10.5px] text-muted-foreground">
              {t("Area actually harvested during season")}
            </p>
          </div>

          {/* Yield Card */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("Average Yield")}
            </span>
            <div className="mt-2">
              {observationsError ? <p role="status" className="text-sm text-muted-foreground">{t("Yield unavailable because the data request failed.")}</p> : isLoadingObservations ? (
                <p className="text-sm text-muted-foreground">{t("Calculating yield…")}</p>
              ) : yieldValue != null ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground">
                    {formatNumber(yieldValue, 2)}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">t/ha</span>
                </div>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">{t("Yield unavailable")}</p>
              )}
              {yieldDelta != null && (
                <p className="mt-1 text-xs text-muted-foreground">
                  <span
                    className={
                      yieldDelta >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-amber-600"
                    }
                  >
                    {formatSignedPercent(yieldDelta)}
                  </span>{" "}
                  {t("change from prior year")}
                </p>
              )}
            </div>
            <p className="mt-3 border-t border-border pt-2 text-[10.5px] text-muted-foreground">
              {t("Derived: production divided by harvested area")}
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Production Multi-Year Trend Chart */}
          <DashboardCard
            title={`${selectedCrop} Production Trend`}
            subtitle={`Reported production in metric tonnes over available survey years in ${selectedDistrict === "all" ? "Rwanda" : selectedDistrict}`}
          >
            {chartData.length === 0 ? (
              <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-xs text-muted-foreground">
                  {t(`No multi-year historical trend data available for ${selectedCrop} in this area.`)}
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                    <XAxis dataKey="year" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k t` : `${val} t`)}
                    />
                    <RechartsTooltip
                      formatter={(value, name) => [
                        `${formatNumber(value)} ${name === "production" ? "tonnes" : name === "area" ? "ha" : "t/ha"}`,
                        t(name === "production" ? "Production" : name === "area" ? "Harvested Area" : "Yield"),
                      ]}
                      labelFormatter={(label) => `${t("Survey Year:")} ${label}`}
                      contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="production"
                      name="production"
                      stroke="#16a34a"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#16a34a" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </DashboardCard>

          {/* District Comparison Chart */}
          <DashboardCard
            title={`${selectedCrop} Production Across Districts`}
            subtitle={`${t("Comparative output in metric tonnes for")} ${overviewData?.latestYear || t("latest year")}`}
          >
            {districtComparisonData.length === 0 ? (
              <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-xs text-muted-foreground">
                  {t(`District comparison data for ${selectedCrop} is not available for this period.`)}
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={districtComparisonData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.25} />
                    <XAxis
                      type="number"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : val)}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <RechartsTooltip
                      formatter={(val) => [`${formatNumber(val)} tonnes`, "Production"]}
                      contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar
                      dataKey="production"
                      radius={[0, 4, 4, 0]}
                      fill="#0284c7"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </DashboardCard>
        </div>

        <SourcePublications sources={overviewData?.data?.sources ?? []} />

        {/* Source Provenance & Methodological Caveats */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              {t("Official Source Provenance & Methodological Notes")}
            </h3>
          </div>
          <div className="mt-3 grid gap-4 text-xs text-muted-foreground sm:grid-cols-3">
            <div>
              <p className="font-semibold text-foreground">{t("Source Publication")}</p>
              <p className="mt-1 leading-relaxed">
                {t("National Institute of Statistics of Rwanda (NISR) — Seasonal Agricultural Survey (SAS). Survey samples rural agricultural holdings across Rwanda.")}
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{t("Measurement Definitions")}</p>
              <p className="mt-1 leading-relaxed">
                {t("Production is measured in metric tonnes (t). Harvested area represents physical area harvested (ha). Yield is derived as production divided by harvested area.")}
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{t("Operational Interpretation")}</p>
              <p className="mt-1 leading-relaxed">
                {t("Statistics represent retrospective seasonal production totals. They do not indicate live market availability, stock currently in storage, or forward price guarantees.")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
