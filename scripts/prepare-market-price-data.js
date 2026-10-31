import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const privateDir = resolve(root, "data/private/prices");
const inputPath = resolve(privateDir, "wfp_food_prices_rwa.csv");
const marketPath = resolve(privateDir, "wfp_markets_rwa.csv");
const manifestPath = resolve(privateDir, "manifest.json");
const hdxMetadataPath = resolve(privateDir, "hdx-wfp-rwanda-package-metadata.json");
const boundaryPath = resolve(root, "src/data/rwanda-districts.geojson");
const outputPath = resolve(root, "src/data/wfp-market-prices.json");

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === ",") {
      fields.push(field);
      field = "";
    } else if (character === '"') {
      quoted = true;
    } else {
      field += character;
    }
  }
  fields.push(field);
  return fields;
}

function csvObjects(contents) {
  const lines = contents.replace(/^\uFEFF/, "").trimEnd().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift() ?? "");
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[previous];
    if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) inside = !inside;
  }
  return inside;
}

function pointInGeometry(point, geometry) {
  const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
  return polygons.some((polygon) => pointInRing(point, polygon[0]) && !polygon.slice(1).some((ring) => pointInRing(point, ring)));
}

function number(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

const importManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const hdxMetadata = JSON.parse(readFileSync(hdxMetadataPath, "utf8"));
const boundaries = JSON.parse(readFileSync(boundaryPath, "utf8"));
const districtShapes = new Map(boundaries.features.map((feature) => [feature.properties.shapeName.toLowerCase(), feature.geometry]));
const marketRows = csvObjects(readFileSync(marketPath, "utf8"));
const marketLookup = new Map(marketRows.map((row) => [String(row.market_id), row]));
const sourceRows = csvObjects(readFileSync(inputPath, "utf8"));
const markets = new Map();
const observations = [];
const skipped = { beforeCoverageWindow: 0, nonFood: 0, nonObservedPriceFlag: 0, invalidOrNonPositivePrice: 0, missingMarket: 0 };

for (const row of sourceRows) {
  if (row.date < "2018-01-01") {
    skipped.beforeCoverageWindow += 1;
    continue;
  }
  if (row.category === "non-food") {
    skipped.nonFood += 1;
    continue;
  }
  if (row.priceflag !== "actual" && row.priceflag !== "actual,aggregate") {
    skipped.nonObservedPriceFlag += 1;
    continue;
  }
  const price = number(row.price);
  if (!price || price <= 0 || !row.date || !row.commodity || !row.unit || !row.pricetype || !row.currency) {
    skipped.invalidOrNonPositivePrice += 1;
    continue;
  }

  const marketId = String(row.market_id);
  const market = marketLookup.get(marketId);
  if (!market) {
    skipped.missingMarket += 1;
    continue;
  }
  const district = String(market.admin2 || row.admin2 || "");
  const latitude = number(market.latitude);
  const longitude = number(market.longitude);
  const geometry = districtShapes.get(district.toLowerCase());
  const mapEligible = Boolean(
    geometry && latitude !== null && longitude !== null && pointInGeometry([longitude, latitude], geometry),
  );
  const candidate = {
    id: marketId,
    name: String(market.market || row.market),
    district,
    province: String(market.admin1 || row.admin1 || ""),
    latitude,
    longitude,
    mapEligible,
  };
  const existing = markets.get(marketId);
  if (existing && (existing.name !== candidate.name || existing.district !== candidate.district || existing.latitude !== candidate.latitude || existing.longitude !== candidate.longitude)) {
    existing.mapEligible = false;
  } else if (!existing) {
    markets.set(marketId, candidate);
  }

  observations.push([
    row.date,
    marketId,
    String(row.commodity),
    String(row.category),
    String(row.unit),
    String(row.priceflag),
    String(row.pricetype),
    String(row.currency),
    price,
  ]);
}

observations.sort((left, right) => left[0].localeCompare(right[0]) || left[1].localeCompare(right[1]) || left[2].localeCompare(right[2]));
const marketList = [...markets.values()].sort((left, right) => left.district.localeCompare(right.district) || left.name.localeCompare(right.name));
const dates = observations.map((observation) => observation[0]);
const aggregateOnlyDates = sourceRows
  .filter((row) => row.category !== "non-food" && row.priceflag === "aggregate" && number(row.price) > 0)
  .map((row) => row.date)
  .sort();
const output = {
  metadata: {
    provider: "World Food Programme Price Database",
    distributor: "Humanitarian Data Exchange",
    datasetUrl: "https://data.humdata.org/dataset/wfp-food-prices-for-rwanda",
    license: "CC BY-IGO",
    attribution: "World Food Programme (WFP) Price Database via HDX",
    retrievedAt: importManifest.checked_at,
    sourceMetadataModified: hdxMetadata.result.metadata_modified?.slice(0, 10) ?? null,
    coverageStart: dates[0] ?? null,
    latestObservation: dates.at(-1) ?? null,
    latestAggregateOnlyRecord: aggregateOnlyDates.at(-1) ?? null,
    latestSnapshotIsHistorical: true,
    coverageWindow: "2018 onward; food commodities; positive prices flagged actual or actual,aggregate",
    excludedRows: skipped,
    observationCount: observations.length,
    marketCount: marketList.length,
    coveredDistrictCount: new Set(marketList.map((market) => market.district)).size,
    nationalDistrictCount: boundaries.features.length,
    mapEligibleMarketCount: marketList.filter((market) => market.mapEligible).length,
    observationFields: ["date", "marketId", "commodity", "category", "unit", "priceFlag", "priceType", "currency", "price"],
  },
  markets: marketList,
  observations,
};

writeFileSync(outputPath, `${JSON.stringify(output)}\n`, "utf8");
console.log(`Prepared ${observations.length} observations across ${marketList.length} markets (${output.metadata.mapEligibleMarketCount} mapped) at ${outputPath}`);
