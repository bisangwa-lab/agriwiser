# Weather & Climate

The module is available at `/weather` for super admins, data managers, agricultural analysts, policy makers, agricultural officers, field investigators and field supervisors. Navigation is shared with each role's existing panel. Public/community roles cannot call the weather backend. Every weather server function applies `requireUser` and checks roles again before reading cache or contacting a provider. Integration operations additionally require super-admin or data-manager privileges on the server.

## Integration across the application

- Analytics & Planning includes an explicit district/season/crop climate context card, separate from sample previews. It checks the same compatibility rules as the full Weather & Climate module before showing NISR production, harvested area or derived yield alongside weather.
- Field Operations includes historical climate context for investigation, with source and resolution limitations. It does not issue planting advice or official warnings.
- District Comparison and the main dashboard's weather map use the same server-backed area-weighted NASA district estimates and native-cell map; district details link into full climate analysis.
- Reports has a **Weather & agriculture** tab. Load a selected season to create a CSV report or print/PDF with four climate indicators, units, coverage, cache freshness, source URLs, retrieval timestamps, quality flags and methods. Compatible NISR rows retain their own provider, survey spatial support, units and source references; they do not inherit NASA retrieval dates or grid coordinates. Weather reports can also be exported directly from the analytics/field context cards. Meteo Rwanda has its own source-specific report export when an authorized delivery exists.
- Administration links to **Data management → Weather integrations** (`/data-sources?tab=weather`). This private operations tab separates provider identity/status, cached grid-cell/year coverage, missing precipitation/mean-temperature rates, last successful retrieval, expired cache entries and recent safe API error codes. Calendar year lists expand on demand; datasets and imports remain in the separate **Datasets & sources** tab. Cache inventories are not live availability guarantees, and years may be only partially cached. Edge cache fallback reports inventory as unavailable. Monitoring retains the last 100 attempts, exposing only the latest 20; no user IDs, credentials, authorization references or upstream response bodies are stored in events.
- The Weather source filter selects Open-Meteo ERA5, NASA POWER or Meteo Rwanda explicitly. There is no automatic fallback, averaging, merging or precedence between providers. Differences should be investigated with each source's time window and spatial support; station-to-district aggregation has not been established.

## Provider and interpretation

The full Weather & Climate view defaults to ERA5; NASA POWER remains selectable. Existing context/report cards and requests without a dataset continue using NASA POWER, now with area-weighted district estimates. No existing cache values are relabelled or blended between providers.

NASA POWER is an available provider. Its public daily point API requires **no API key**:

- Documentation: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- Meteorology methodology: https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/
- Resolution/request guidance: https://power.larc.nasa.gov/docs/tutorials/service-data-request/api/
- Endpoint: `https://power.larc.nasa.gov/api/temporal/daily/point`
- Community: `AG`; format: JSON; time standard explicitly UTC.
- Parameters: `PRECTOTCORR` (mm/day), `T2M`, `T2M_MIN`, `T2M_MAX` (C).
- Meteorological source: MERRA-2 reanalysis via POWER; classification **model-estimated**, not a district station observation.
- Spatial resolution: approximately 0.5° latitude × 0.625° longitude. Requests are snapped to native meteorological cell centres to avoid repeated requests within the same cell. All district polygons intersect 14 native cells. The old eight-cell count covered only district representative points and is no longer the map's sampling method.
- Daily availability starts in 1981. Latency, provisional values, missing days and source revisions can affect recent dates. Requests end before today; this module provides historical analysis, not weather forecasts or official alerts.

### District spatial support and map views

Every district request uses **all cells intersecting its actual ADM2 polygon**, not a representative point. Weights are intersection area / full district area, computed in cylindrical equal-area coordinates (longitude, sin(latitude)), with holes subtracted and every MultiPolygon member included. The estimate assumes uniform weather within each source cell. Rebuild the deterministic spatial metadata after boundary changes with `node scripts/prepare-weather-overlaps.js`; `src/data/weather-overlaps.json` contains the 14 MERRA-2 and 51 ERA5 intersecting cells and every district's weights.

For each date and parameter: district estimate = Σ(cell value × district area fraction). All cells must supply valid values for **100% of district area** (floating-point tolerance only). A missing cell/parameter makes that day's district parameter null; available cells are never renormalized. Daily rows expose parameter-specific spatial coverage, summaries expose the minimum coverage over the selected period, and the UI lists contributing coordinates, weights, valid days, cache status and errors. Only full-area valid days contribute to temperature summaries; rainfall totals also require every requested day. District averages can remain identical when supported by the same source cells.

The map defaults to **native weather cells with district outlines**, clipped to Rwanda. A second view colours area-weighted district estimates. Both are keyboard accessible and support cell and district inspection. Every district table and analysis view uses the same backend calculation. Selecting Analyze this district applies the map's exact season window and keeps the source selection. These estimates do not resolve variation within a native cell or establish local accuracy; finer resolution still requires validation against independent local observations.

Custom coordinates must lie inside Rwanda's actual polygons and return **one nearest native cell**, clearly labelled as a point request. The original district representative coordinates remain in the district catalogue for identification/legacy point utilities; they are not used to calculate district weather.

### Finer-resolution ERA5 provider

- Official API/methodology: https://open-meteo.com/en/docs/historical-weather-api
- Fixed endpoint: `https://archive-api.open-meteo.com/v1/archive`; fixed `models=era5`, not the changing best-match model.
- Dataset: ECMWF/Copernicus ERA5 reanalysis, 0.25° × 0.25° (~25 km), for both precipitation and temperature. It is still model-estimated, not station-observed. ERA5-Land's finer temperature grid is not presented as finer precipitation data.
- Native-cell requests use `cell_selection=nearest`, `elevation=nan` and `timezone=GMT` (UTC). Elevation downscaling is disabled so a cell has one consistent value for polygon weighting. Responses must match the requested native coordinates, daily dates, units and UTC offset exactly.
- Daily fields: `precipitation_sum` (mm per UTC day), `temperature_2m_mean`, `temperature_2m_min`, `temperature_2m_max` (°C), normalized into the existing daily weather contract. Precipitation is not described as NASA's corrected-precipitation product.
- ERA5 availability has approximately five days of delay; requests use data through UTC today minus six days. More recent requested dates remain explicit nulls, never a different model or forecast.
- Map/short district requests batch up to ten cell coordinates per upstream request and cache by native cell/year. Historical baselines use bounded five-year chunks per cell with at most three upstream requests active. Conservative weighted quotas (480 equivalent calls/minute, 4,500/hour, 9,000/day) account for request duration and location count; minute-budget exhaustion paces requests until the next window. Hour/day exhaustion returns a controlled retry time. A failed historical chunk preserves already completed years; the next attempt retrieves only missing years. The first uncached map/baseline can take several minutes. Requests coalesce and both maps/analyses reuse the same cache.
- Attribution: Open-Meteo and Copernicus/ECMWF, CC BY 4.0. The integrated **free API is for non-commercial use**, needs no key and has provider limits/no uptime guarantee: https://open-meteo.com/en/pricing. Commercial deployment needs an appropriate Open-Meteo subscription/customer endpoint integration; no paid account, key or purchase is configured by this change.


## Aggregation, seasons, baselines and indicators

- Rainfall total: sum of daily precipitation rates × one day, in mm, only when every requested day has valid precipitation. A partial observed subtotal is retained internally but is not displayed as a full rainfall total.
- Temperature mean: mean of valid daily means, with valid/expected day counts shown. For districts, each daily minimum/maximum is first averaged across cells by area; period minimum/maximum are the lowest/highest of those daily district averages. They are not the coldest/hottest place in a district. For custom points, they remain cell interval extremes.
- Missing dates, provider fill values (-999), nonnumeric or out-of-range values remain null. Inconsistent daily temperature minima/means/maxima are flagged and excluded. Zero precipitation remains zero. Charts keep gaps; daily records and full CSV exports provide accessible alternatives.
- Season A: September of the preceding year through the final day of February of the named year. B: March–June; C: July–September. These are broad NISR-aligned analysis windows, not a crop's measured growing window. September overlaps the broad A/C definitions, so seasonal totals must not be added as unique annual totals.
- Daily requests support at most 1,831 days per request; repeat ranges to inspect longer history. District map requests are limited to one year. These bounds prevent unbounded public provider work; they do not truncate returned data.
- Default climate baseline: 1991–2020, comparing the same agricultural season. The user can choose 20–40 completed baseline years, starting in 1982 or later, all preceding the selected year. Season A needs the preceding September, so 1981 is not offered as a season year.
- Rainfall anomaly (mm): selected complete season total minus the mean of complete baseline-season totals. Anomaly (%): 100 × difference / baseline mean; unavailable for a missing or zero baseline. At least 20 complete baseline seasons per parameter are required. Temperature anomaly: selected complete season mean minus mean complete baseline-season temperature.
- Thresholds are configurable in the analysis view: rainfall deficit <= -20%, daily maximum >=35°C, daily minimum <=10°C, and seasonal mean anomaly >=2°C by default. Threshold settings are not official warning criteria. Hot/cold counts use valid days and are labelled with coverage. These are exploratory indicators, not confirmed droughts, floods, disasters or official alerts.
- Climate/agriculture alignment requires a selected district, the exact complete season window, complete rainfall/mean-temperature coverage, and unique real NISR production/area records with compatible units and one release. Custom coordinates, arbitrary partial windows, duplicate records, demonstration records and incompatible units/releases are rejected for this automatic alignment. Yield requires positive compatible harvested area. Weather is an area-weighted district reanalysis estimate and agriculture is a district survey estimate; source resolution, accuracy and survey coverage still differ. The UI reports this explicitly and does not calculate correlation, causation or unsupported yield forecasts.

## Storage, reliability and security

Provider-specific HTTP/parsing lives in `weather-provider.js` (NASA) and `weather-era5-provider.js` (ERA5), independently of UI. `weather-service.js` manages caching, coalescing and three concurrent upstream requests. All calls use fixed HTTPS provider origins, four whitelisted parameters and server-built dates/coordinates. Redirects are rejected using manual redirect handling (Cloudflare workerd does not implement `redirect: error`). No visitor token or incoming headers are forwarded to either provider.

Each actual upstream request has a 45-second timeout, an 8 MiB response bound, status/schema/unit/coordinate/date checks and controlled errors. Transient network/availability/timeout failures receive at most one retry after a 500 ms backoff for single-cell requests; every actual attempt consumes provider rate limits. Malformed payloads are not retried. HTTP 429 triggers a shared backoff respecting Retry-After (bounded to one hour), with no immediate retry. No automatic UI retry loop is used. Failed ERA5 batches are not followed by an unbounded per-cell retry storm; a 30-second in-memory failure cooldown preserves controlled per-cell errors or stale fallback. Failures with an existing expired cache return explicitly stale data and its retrieval date; failures without cache remain unavailable. Error bodies, request headers, account tokens and credentials are never logged. The few diagnostic logs contain controlled error categories only.

The running local project uses the existing `LOCAL_AUTH_DB` D1/SQLite database. `migrations/0003_weather.sql` creates independent cache and atomic limiter tables; it does not alter accounts, survey observations, findings or source archives. Cache entries are safely upserted by provider version, sampled cell and calendar year. Historic years are fresh for seven days and the current year for six hours. Cached day arrays retain source URL, API version, requested parameter units, retrieval time and quality flags. Cached errors are not substituted for measurements. Generic local collection endpoints do not expose these private cache tables.

Local rate limits: 60 weather operations per authenticated user/minute and 45 NASA upstream calls/minute and 120 ERA5 HTTP requests/minute for this server (provider-side weighted quotas still apply). Map/point/normal requests reuse shared cells and years. Limits and provider backoff also apply to cache misses from different users.

### Deployment configuration

NASA requires **no new environment variable, API key or credential**. Local mode works with the existing `LOCAL_AUTH_DB` binding. The app creates the weather schema lazily; it can also be applied through the project's normal D1 migration workflow.


Meteo Rwanda is currently **not configured**: no authorized station-data account or delivery was supplied. Its official [Climate & Warnings page](https://www.meteorwanda.gov.rw/climate-warning) links to [Climate Data Request / MIS](https://mis.meteorwanda.gov.rw/) and the [data platform](https://data.meteorwanda.gov.rw/web/login.php). The MIS did not respond during verification and the data platform requires an access session; no documented public machine API or authorized session was verified. The implementation therefore uses the permitted **authorized file delivery** path, rather than guessing an endpoint.

### Testable Meteo Rwanda delivery configuration

1. Obtain written access, redistribution terms, licence, product definitions, station/grid metadata, units and temporal conventions through Meteo Rwanda's official data request process. Public access to a website does not by itself authorize redistribution of its underlying datasets.
2. Convert the officially delivered data to the application's normalized contract below using the documented provider definitions. Preserve originals and original quality flags. Do not silently convert local-day observations into UTC-day records; obtain a compatible daily product or establish a separately documented transformation first. `PRECTOTCORR` is an internal shared precipitation field in this contract; Meteo values are labelled **daily precipitation**, never claimed to be NASA-corrected precipitation.
4. Select Meteo Rwanda in `/weather`; use **Check delivery status**, then select the identified station/grid sample and dates. Only valid deliveries activate the view. Admin status distinguishes not-configured, missing/invalid delivery and available authorized delivery. Missing days remain null. Multiple samples in a district require an explicit station choice and are never averaged. These station/grid records are not automatically joined to NISR district survey values.

Normalized delivery metadata (this is our ingestion contract, **not an official Meteo API schema**):

| Field | Required definition |
| --- | --- |
| schemaVersion / provider | `1` / `Meteo Rwanda` |
| dataset / licence | Official release/product name and permitted-use licence text |
| authorizationReference | Private written-approval reference, retained server-side and excluded from responses/exports |
| issuedAt | ISO release timestamp, no later than the delivery upload time |
| sourceUrl | Official HTTPS `meteorwanda.gov.rw` or subdomain URL, without embedded credentials/query tokens |
| timeStandard / temporalResolution | `UTC` / `daily` |
| units | `PRECTOTCORR: mm/day`, `T2M: C`, `T2M_MIN: C`, `T2M_MAX: C` |
| stations | 1–100 identified stations or blended grid samples |
| station fields | Unique `id`, `name`, real `district`, numeric `latitude`/`longitude` inside Rwanda, `spatialResolution`, `classification` = `station-observed` or `blended-grid-estimate` |
| station rows | Up to 17,000 unique historical dates; `date` as YYYY-MM-DD, four numeric parameter values or explicit null, optional bounded `qualityFlags` string array |


## Verification

- `node --test tests/weather.test.js tests/weather-spatial.test.js tests/weather-integration.test.js`: parsing, missing values, invalid input/schema, seasons, baseline sufficiency/formulas, outages/429/timeout, persistent cache and rate limits, shared cells, roles and climate/agriculture compatibility.
- `node --test tests/weather-integration.test.js`: authorized-delivery fixtures only, source separation, metadata privacy, station selection, delivery validation, monitoring retention/coverage and bounded retries. These fixtures never enter application storage.
- `node scripts/check-weather.js`: real authenticated requests against the running local backend and actual NASA POWER and Open-Meteo ERA5; 30-district maps using all 14/51 native cells, map/analysis agreement, custom-point mode, separate provider inventories, full 1991–2020 baselines for both sources, repeated cache reads, analyst/field access, viewer/anonymous denial, invalid points/dates and CSRF checks. No mocked values enter production caches.
- `npm run lint`, `npm run build` and the existing regression tests must pass. The repository is JavaScript/JSX and has no separate type-check script.

Live verification for Gasabo, 2025 Season B, retrieved 122 valid daily records: NASA/MERRA-2 district precipitation 352.21 mm (the district lies within one cell) and ERA5 area-weighted district precipitation 439.39 mm across four cells. Values are source-specific reanalysis estimates and can be revised; neither is a station observation or official warning. Sources, area weights and baseline formulas remain inspectable in the UI.

## Agricultural climate analysis workspace

The snapshot's **Investigate this season** panel compares the same crop, district and agricultural season across a user-selected reference year. It displays absolute and percentage changes for production, harvested area, derived yield and rainfall; temperature changes use °C. A separate optional 20–40-year seasonal weather baseline (default 1991–2020 for recent years) supplies anomalies. At least 20 complete seasons per weather measure are required. These baselines are not applied to crop statistics.

Five-season charts share a year axis and synchronized tooltips, with separate units for rainfall, temperature and yield. An accessible table marks a selected year on every chart and exposes valid-day counts. Missing years stay missing. Mean temperature comparisons require complete daily coverage. Crop pairs require unique published production and harvested-area records, matching units and release within each year. Demonstration and forecast records are excluded. No fallback reference year or interpolated crop history is used.

The production breakdown is an arithmetic identity, not a causal attribution: area component = (current area − reference area) × (current yield + reference yield) / 2; yield component = (current yield − reference yield) × (current area + reference area) / 2. Both areas must be positive. Components sum to the production difference.

**Compare all 30 districts** explicitly loads weather for the two selected seasons and ranks districts by yield change, rainfall change, yield or production. Missing values always sort last. Rainfall percentages in this table compare two reporting years; they are not historical anomalies, a disaster classification or a priority score. Source URLs, periods, units and coverage travel with the CSV export. Shared model cells mean district weather estimates are not independent observations.

`getClimateAnalysis`, `getClimateRanking` and `saveClimateFinding` require a session and the existing weather role check. Their strict validators bound districts, crops, years, baseline lengths, datasets and note lengths. Statistical reads run as the caller; no service role is used. Each completed analysis creates a server-preserved snapshot owned by that user, valid for 24 hours before saving. The finding endpoint accepts only that snapshot ID and notes, checks ownership and expiry, and saves authoritative evidence in the existing `ReportFinding` collection. It never accepts client-supplied measurements. Expired transient D1 analysis snapshots are pruned; saved findings retain their evidence independently. Reports supports both original map findings and these seasonal snapshots. Saving uses the same snapshot ID for idempotence in local mode.

Verification: `node --test tests/climate-analysis.test.js` covers zero baselines, missing/duplicate/forecast records, release/unit compatibility, arithmetic decomposition, sorting and server-snapshot ownership/expiry. `node scripts/check-climate-analysis.js` verifies real authenticated weather/crop analysis, 30-district agreement, baseline completeness and denied anonymous/viewer/other-owner requests. It does not insert a test finding into the user's records.

## Application storage

The configured backend stores caches, rate limits and event metadata in private Supabase tables. Supabase Auth and current database roles protect all weather functions. Meteo Rwanda remains unavailable until an authorized JSON delivery is configured under METEO_RWANDA_OBJECT in the private hingasmart-weather bucket. No data connection or authorization is inferred from the bucket existing. See SUPABASE_SETUP.md.
