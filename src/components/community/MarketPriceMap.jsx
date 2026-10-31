import { useMemo } from "react";
import boundaryText from "@/data/rwanda-districts.geojson?raw";
import { geometryPath, mapProjection } from "@/lib/map-geometry";
import { formatPrice, formatDate } from "@/lib/market-prices-format";
import { useLanguage } from "@/lib/LanguageContext";

const BOUNDARIES = JSON.parse(boundaryText);
const WIDTH = 700;
const HEIGHT = 450;

function priceTier(value, sortedValues) {
  if (sortedValues.length < 2) return "middle";
  const rank = sortedValues.filter((item) => item <= value).length / sortedValues.length;
  return rank <= 0.33 ? "lower" : rank <= 0.67 ? "middle" : "higher";
}

const TIER_STYLE = {
  lower: { fill: "#0f766e", label: "Lower" },
  middle: { fill: "#ca8a04", label: "Middle" },
  higher: { fill: "#7c3aed", label: "Higher" },
};

function districtLabelPoint(geometry, project) {
  const coordinates = [];
  const visit = (value) => {
    if (Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number") coordinates.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
  };
  visit(geometry.coordinates);
  const [x, y] = coordinates.reduce((sum, point) => {
    const projected = project(point);
    return [sum[0] + projected[0], sum[1] + projected[1]];
  }, [0, 0]).map((value) => value / Math.max(coordinates.length, 1));
  return { x, y };
}

export function MarketPriceMap({ comparisons, currency, unit, onSelectMarket, selectedMarketId, selectedDistrict = "all", onSelectDistrict }) {
  const { t } = useLanguage();
  const project = useMemo(() => mapProjection(BOUNDARIES, WIDTH, HEIGHT), []);
  const shapes = useMemo(() => BOUNDARIES.features.map((feature) => ({
    name: feature.properties.shapeName,
    path: geometryPath(feature.geometry, project),
    ...districtLabelPoint(feature.geometry, project),
  })), [project]);
  const points = comparisons.filter((item) => item.mapEligible);
  const districtsWithData = new Set(points.map((item) => item.district));
  const sortedPrices = points.map((item) => item.medianPrice).sort((left, right) => left - right);
  const excluded = comparisons.length - points.length;
  const selectedDistrictMarkets = selectedDistrict === "all" ? [] : points.filter((item) => item.district === selectedDistrict);

  if (!comparisons.length) {
    return <p className="rounded-lg bg-muted/60 p-4 text-xs text-muted-foreground">{t("No matching market locations have a price record in this period.")}</p>;
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-border/70 bg-[#f7faf8]">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-labelledby="market-map-title market-map-description" className="h-auto w-full">
          <title id="market-map-title">{t("Markets with matching price records")}</title>
          <desc id="market-map-description">{t("The districts and market locations with prices matching the current commodity, unit, price type, and date range. Select a market marker to focus the trend chart.")}</desc>
          <rect width={WIDTH} height={HEIGHT} fill="#f7faf8" />
          <g>
            {shapes.map((shape) => (
              <path
                key={shape.name}
                d={shape.path}
                fill={districtsWithData.has(shape.name) ? "#e7f2ec" : "#f0f2f1"}
                stroke={selectedDistrict === shape.name ? "#146c50" : "#a6b7ae"}
                strokeWidth={selectedDistrict === shape.name ? "2.8" : "1.05"}
                role="button"
                tabIndex={0}
                aria-label={t(`${shape.name}: ${points.filter((item) => item.district === shape.name).length} matching price markets. Select to isolate this district.`)}
                onClick={() => onSelectDistrict?.(selectedDistrict === shape.name ? "all" : shape.name)}
                onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectDistrict?.(selectedDistrict === shape.name ? "all" : shape.name); } }}
                className="cursor-pointer outline-none focus-visible:stroke-slate-900"
              >
                <title>{t(`${shape.name}: ${points.filter((item) => item.district === shape.name).length} matching price markets. Select to isolate district.`)}</title>
              </path>
            ))}
          </g>
          <g aria-label={t("District names")}>
            {shapes.map((shape) => <text key={`label-${shape.name}`} x={shape.x} y={shape.y} textAnchor="middle" dominantBaseline="central" fontSize="8.5" fontWeight={selectedDistrict === shape.name ? 700 : 600} fill={selectedDistrict === shape.name ? "#0b5c43" : "#33463d"} stroke="#f7faf8" strokeWidth="2.6" paintOrder="stroke" role="button" tabIndex={0} aria-label={`Select ${shape.name} district`} onClick={() => onSelectDistrict?.(selectedDistrict === shape.name ? "all" : shape.name)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectDistrict?.(selectedDistrict === shape.name ? "all" : shape.name); } }} className="cursor-pointer outline-none">{shape.name}</text>)}
          </g>
          <g>
            {points.map((item) => {
              const [cx, cy] = project([item.longitude, item.latitude]);
              const tier = priceTier(item.medianPrice, sortedPrices);
              const style = TIER_STYLE[tier];
              const label = `${item.market}, ${item.district}: ${formatPrice(item.medianPrice, currency, unit)} median from ${item.recordCount} record${item.recordCount === 1 ? "" : "s"}; latest ${formatDate(item.lastDate)}`;
              return (
                <circle
                  key={item.marketId}
                  cx={cx}
                  cy={cy}
                  r={selectedMarketId === item.marketId ? 7.5 : 5.5}
                  fill={style.fill}
                  stroke={selectedMarketId === item.marketId ? "#102a22" : "white"}
                  strokeWidth={selectedMarketId === item.marketId ? 2.5 : 1.5}
                  role="button"
                  tabIndex={0}
                  aria-label={`${label}. ${style.label} relative price among shown markets. Select to focus trend.`}
                  onClick={() => onSelectMarket(item.marketId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectMarket(item.marketId);
                    }
                  }}
                  className="cursor-pointer outline-none focus-visible:stroke-slate-900"
                >
                  <title>{label}</title>
                </circle>
              );
            })}
          </g>
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs">
                <span>{selectedDistrict === "all" ? t("Select a district on the map to study its price-reporting markets.") : <><strong>{t(selectedDistrict)}</strong>: {selectedDistrictMarkets.length} {t(selectedDistrictMarkets.length === 1 ? "market" : "markets")} {t("with matching price records for the current filters.")}</>}</span>
        {selectedDistrict !== "all" ? <button type="button" className="font-medium text-primary underline underline-offset-2" onClick={() => onSelectDistrict?.("all")}>{t("Show all districts")}</button> : null}
      </div>
      {selectedDistrict !== "all" ? <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{selectedDistrictMarkets.map((market) => <button key={market.marketId} type="button" onClick={() => onSelectMarket(market.marketId)} className={`rounded-lg border px-3 py-2 text-left text-xs hover:border-primary ${selectedMarketId === market.marketId ? "border-primary bg-primary/5" : "border-border bg-card"}`}><span className="block font-medium text-foreground">{market.market}</span><span className="mt-1 block text-muted-foreground">{formatPrice(market.medianPrice, currency, unit)} median · {market.recordCount} records</span><span className="block text-muted-foreground">Latest: {formatDate(market.lastDate)}</span></button>)}{selectedDistrictMarkets.length === 0 ? <p className="text-xs text-muted-foreground">No verified market points with matching price records in this district and period.</p> : null}</div> : null}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10.5px] text-muted-foreground">
        <span className="font-medium text-foreground">{t("Marker price vs shown markets:")}</span>
        {Object.entries(TIER_STYLE).map(([key, style]) => (
          <span key={key} className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: style.fill }} />{t(style.label)}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm border border-border bg-[#f0f2f1]" />{t("No matching district data")}</span>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        District borders are a 2012 boundary reference. Only market points whose supplied coordinates fall inside their listed district are shown. {excluded ? `${excluded} location${excluded === 1 ? " was" : "s were"} left off the map because the location could not be verified.` : "All plotted market coordinates matched their listed district in the boundary check."}
      </p>
    </div>
  );
}
