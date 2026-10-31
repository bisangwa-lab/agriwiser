import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const sourcePath = resolve(root, 'src/data/wfp-market-prices.json');
const outputPath = resolve(root, 'src/data/ussd-market-prices.json');
const source = JSON.parse(await readFile(sourcePath, 'utf8'));
const marketById = new Map(source.markets.map((market) => [market.id, market]));
const supportedCrops = new Set(['Maize', 'Beans (dry)', 'Rice (local)', 'Potatoes (Irish)']);
const groups = new Map();

for (const row of source.observations) {
  const [date, marketId, crop, , unit, flag, priceType, currency, price] = row;
  const market = marketById.get(marketId);
  if (!market || !supportedCrops.has(crop) || unit !== 'KG' || priceType !== 'Retail' || !flag.includes('actual')) continue;

  const key = `${market.district}\u0000${crop}`;
  let group = groups.get(key);
  if (!group || date > group.date) {
    group = { date, values: [], markets: new Set(), flags: new Set(), currency, unit, priceType };
    groups.set(key, group);
  }
  if (date !== group.date) continue;
  group.values.push(price);
  group.markets.add(marketId);
  group.flags.add(flag);
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

const entries = [...groups.entries()]
  .map(([key, group]) => {
    const [district, crop] = key.split('\u0000');
    return {
      district,
      crop,
      date: group.date,
      price: Number(median(group.values).toFixed(2)),
      currency: group.currency,
      unit: group.unit,
      priceType: group.priceType,
      marketCount: group.markets.size,
      observationCount: group.values.length,
      priceFlags: [...group.flags].sort(),
    };
  })
  .sort((left, right) => left.district.localeCompare(right.district) || left.crop.localeCompare(right.crop));

const output = {
  metadata: {
    provider: source.metadata.provider,
    distributor: source.metadata.distributor,
    attribution: source.metadata.attribution,
    license: source.metadata.license,
    datasetUrl: source.metadata.datasetUrl,
    retrievedAt: source.metadata.retrievedAt,
    latestObservation: source.metadata.latestObservation,
    coverageDistrictCount: source.metadata.coveredDistrictCount,
    nationalDistrictCount: source.metadata.nationalDistrictCount,
    snapshotType: 'historical',
    aggregation: 'Median of actual retail observations for the latest available date within each district and crop; no interpolation.',
  },
  entries,
};

await writeFile(outputPath, `${JSON.stringify(output)}\n`, 'utf8');
console.log(`Prepared ${entries.length} offline USSD price summaries from ${source.metadata.attribution}.`);
