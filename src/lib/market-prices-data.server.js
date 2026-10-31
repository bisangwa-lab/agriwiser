import { normalizeRole } from "@/lib/rbac";
import snapshot from "@/data/wfp-market-prices.json";

const COMMUNITY_PRICE_ROLES = new Set(["farmer", "cooperative", "buyer", "agribusiness", "super_admin"]);
const OBSERVATION = Object.freeze({ date: 0, marketId: 1, commodity: 2, category: 3, unit: 4, flag: 5, priceType: 6, currency: 7, price: 8 });
const observations = snapshot.observations;
const markets = new Map(snapshot.markets.map((market) => [market.id, market]));
const allDates = observations.map((row) => row[OBSERVATION.date]).sort();
const sourceEnd = allDates.at(-1);
const earliestDate = observations[0]?.[OBSERVATION.date] ?? "2018-01-01";
const sourceLatest = snapshot.metadata.latestObservation;
const sourceRetrievedAt = snapshot.metadata.retrievedAt;

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function monthsBefore(dateString, months) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

function monthlySequence(start, end) {
  const from = new Date(`${start.slice(0, 7)}-01T00:00:00.000Z`);
  const through = new Date(`${end.slice(0, 7)}-01T00:00:00.000Z`);
  const values = [];
  while (from <= through) {
    const key = from.toISOString().slice(0, 7);
    values.push({ key, label: from.toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" }), value: null, marketCount: 0, recordCount: 0 });
    from.setUTCMonth(from.getUTCMonth() + 1);
  }
  return values;
}

function catalog() {
  const commodities = new Map();
  const districts = new Set();
  const priceTypes = new Set();
  for (const row of observations) {
    const commodity = row[OBSERVATION.commodity];
    const unit = row[OBSERVATION.unit];
    const type = row[OBSERVATION.priceType];
    if (!commodities.has(commodity)) commodities.set(commodity, new Map());
    const unitTypes = commodities.get(commodity);
    if (!unitTypes.has(unit)) unitTypes.set(unit, new Set());
    unitTypes.get(unit).add(type);
    priceTypes.add(type);
  }
  for (const market of markets.values()) districts.add(market.district);
  return {
    commodities: [...commodities].sort(([left], [right]) => left.localeCompare(right)).map(([name, unitMap]) => ({
      name,
      units: [...unitMap]
        .sort(([left], [right]) => (left === "KG" ? -1 : right === "KG" ? 1 : left.localeCompare(right)))
        .map(([unitName, typeSet]) => ({ name: unitName, priceTypes: [...typeSet].sort() })),
    })),
    districts: [...districts].sort((left, right) => left.localeCompare(right)),
    priceTypes: [...priceTypes].sort(),
    markets: [...markets.values()].sort((left, right) => left.district.localeCompare(right.district) || left.name.localeCompare(right.name)).map(({ id, name, district }) => ({ id, name, district })),
  };
}

const priceCatalog = catalog();
const commodityNames = new Set(priceCatalog.commodities.map((item) => item.name));
const districtNames = new Set(priceCatalog.districts);
const marketIds = new Set(priceCatalog.markets.map((market) => market.id));
const periodMonths = new Map([["12m", 12], ["24m", 24], ["all", null]]);

function validateFilters(input) {
  const allowedKeys = new Set(["commodity", "unit", "priceType", "district", "marketId", "period"]);
  if (!input || typeof input !== "object" || Object.keys(input).some((key) => !allowedKeys.has(key))) {
    throw Object.assign(new Error("Choose valid market price filters."), { status: 400 });
  }
  const filters = {
    commodity: String(input.commodity ?? ""),
    unit: String(input.unit ?? ""),
    priceType: String(input.priceType ?? ""),
    district: String(input.district ?? "all"),
    marketId: String(input.marketId ?? "all"),
    period: String(input.period ?? "24m"),
  };
  const commodity = priceCatalog.commodities.find((item) => item.name === filters.commodity);
  const unit = commodity?.units.find((item) => item.name === filters.unit);
  if (!commodity || !unit || !unit.priceTypes.includes(filters.priceType)) {
    throw Object.assign(new Error("That commodity, unit, or price type is not available in this data."), { status: 400 });
  }
  if (filters.district !== "all" && !districtNames.has(filters.district)) {
    throw Object.assign(new Error("Choose a district from the available list."), { status: 400 });
  }
  if (filters.marketId !== "all" && !marketIds.has(filters.marketId)) {
    throw Object.assign(new Error("Choose a market from the available list."), { status: 400 });
  }
  const selectedMarket = filters.marketId === "all" ? null : markets.get(filters.marketId);
  if (selectedMarket && filters.district !== "all" && selectedMarket.district !== filters.district) {
    throw Object.assign(new Error("The selected market is outside the selected district."), { status: 400 });
  }
  if (!periodMonths.has(filters.period)) {
    throw Object.assign(new Error("Choose a valid time period."), { status: 400 });
  }
  return filters;
}

function isAllowedUser(user) {
  return COMMUNITY_PRICE_ROLES.has(normalizeRole(user));
}

function summarize(filters) {
  const months = periodMonths.get(filters.period);
  const startDate = months === null ? earliestDate : monthsBefore(sourceEnd, months);
  const selected = observations.filter((row) => {
    const market = markets.get(row[OBSERVATION.marketId]);
    return row[OBSERVATION.date] >= startDate
      && row[OBSERVATION.commodity] === filters.commodity
      && row[OBSERVATION.unit] === filters.unit
      && row[OBSERVATION.priceType] === filters.priceType
      && (filters.district === "all" || market?.district === filters.district);
  });
  const selectedMarketRows = filters.marketId === "all"
    ? selected
    : selected.filter((row) => row[OBSERVATION.marketId] === filters.marketId);
  const latestRow = selectedMarketRows.reduce((latest, row) => !latest || row[OBSERVATION.date] > latest[OBSERVATION.date] ? row : latest, null);
  const latestMarket = latestRow ? markets.get(latestRow[OBSERVATION.marketId]) : null;

  const trendMap = new Map();
  for (const row of selectedMarketRows) {
    const month = row[OBSERVATION.date].slice(0, 7);
    if (!trendMap.has(month)) trendMap.set(month, { prices: [], marketIds: new Set(), recordCount: 0 });
    const bucket = trendMap.get(month);
    bucket.prices.push(row[OBSERVATION.price]);
    bucket.marketIds.add(row[OBSERVATION.marketId]);
    bucket.recordCount += 1;
  }
  const trend = monthlySequence(startDate, sourceEnd).map((point) => {
    const bucket = trendMap.get(point.key);
    return bucket ? { ...point, value: median(bucket.prices), marketCount: bucket.marketIds.size, recordCount: bucket.recordCount } : point;
  });

  const compareMap = new Map();
  for (const row of selected) {
    const marketId = row[OBSERVATION.marketId];
    if (!compareMap.has(marketId)) compareMap.set(marketId, { market: markets.get(marketId), prices: [], dates: [], recordCount: 0 });
    const bucket = compareMap.get(marketId);
    bucket.prices.push(row[OBSERVATION.price]);
    bucket.dates.push(row[OBSERVATION.date]);
    bucket.recordCount += 1;
  }
  const comparisons = [...compareMap.values()].map((bucket) => ({
    marketId: bucket.market.id,
    market: bucket.market.name,
    district: bucket.market.district,
    province: bucket.market.province,
    medianPrice: median(bucket.prices),
    recordCount: bucket.recordCount,
    firstDate: bucket.dates.reduce((left, right) => left < right ? left : right),
    lastDate: bucket.dates.reduce((left, right) => left > right ? left : right),
    latitude: bucket.market.latitude,
    longitude: bucket.market.longitude,
    mapEligible: bucket.market.mapEligible,
  })).sort((left, right) => right.lastDate.localeCompare(left.lastDate) || left.market.localeCompare(right.market));

  return {
    filters,
    catalog: priceCatalog,
    metadata: {
      provider: snapshot.metadata.provider,
      distributor: snapshot.metadata.distributor,
      datasetUrl: snapshot.metadata.datasetUrl,
      license: snapshot.metadata.license,
      attribution: snapshot.metadata.attribution,
      retrievedAt: sourceRetrievedAt,
      sourceMetadataModified: snapshot.metadata.sourceMetadataModified,
      coverageStart: snapshot.metadata.coverageStart,
      latestObservation: sourceLatest,
      latestAggregateOnlyRecord: snapshot.metadata.latestAggregateOnlyRecord,
      snapshotType: "historical",
      mapBoundaryYear: 2012,
      mapEligibleMarketCount: snapshot.metadata.mapEligibleMarketCount,
      coveredDistrictCount: snapshot.metadata.coveredDistrictCount,
      nationalDistrictCount: snapshot.metadata.nationalDistrictCount,
      marketCount: snapshot.metadata.marketCount,
    },
    range: { startDate, endDate: sourceEnd },
    latest: latestRow && latestMarket ? {
      date: latestRow[OBSERVATION.date],
      price: latestRow[OBSERVATION.price],
      currency: latestRow[OBSERVATION.currency],
      unit: latestRow[OBSERVATION.unit],
      priceType: latestRow[OBSERVATION.priceType],
      priceFlag: latestRow[OBSERVATION.flag],
      commodity: latestRow[OBSERVATION.commodity],
      market: latestMarket.name,
      district: latestMarket.district,
      marketId: latestMarket.id,
    } : null,
    trend,
    comparisons,
  };
}

export function getMarketPriceViewForUser(user, input) {
  if (!isAllowedUser(user)) {
    throw Object.assign(new Error("Market Prices is available in the Community & Business workspace."), { status: 403 });
  }
  return summarize(validateFilters(input));
}
