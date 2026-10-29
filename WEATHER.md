# Weather & Climate

The module is available at `/weather` for super admins, data managers, agricultural analysts, policy makers, agricultural officers, field investigators and field supervisors. Navigation is shared with each role's existing panel. Public/community roles cannot call the weather backend. Every weather server function applies `requireUser` and checks roles again before reading cache or contacting a provider. Integration operations additionally require super-admin or data-manager privileges on the server.

## Integration across the application

- Analytics & Planning includes an explicit district/season/crop climate context card, separate from sample previews. It checks the same compatibility rules as the full Weather & Climate module before showing NISR production, harvested area or derived yield alongside weather.
- Field Operations includes historical climate context for investigation, with source and resolution limitations. It does not issue planting advice or official warnings.
- District Comparison and the main dashboard's weather map use the same server-backed NASA grid samples; district details link into full climate analysis.
- Reports has a **Weather & agriculture** tab. Load a selected season to create a CSV report or print/PDF with four climate indicators, units, coverage, cache freshness, source URLs, retrieval timestamps, quality flags and methods. Compatible NISR rows retain their own provider, survey spatial support, units and source references; they do not inherit NASA retrieval dates or grid coordinates. Weather reports can also be exported directly from the analytics/field context cards. Meteo Rwanda has its own source-specific report export when an authorized delivery exists.
- Administration and Data Sources & Quality show private integration status, cached grid-cell/year coverage, missing precipitation/mean-temperature rates, last successful retrieval, expired cache entries and recent safe API error codes. Cache inventories are not live availability guarantees. Monitoring retains the last 100 attempts, exposing only the latest 20; no user IDs, credentials, authorization references or upstream response bodies are stored in events.
- The Weather source filter selects NASA POWER or Meteo Rwanda explicitly. There is no automatic fallback, averaging, merging or precedence between providers. Differences should be investigated with each source's time window and spatial support; station-to-district aggregation has not been established.

## Provider and interpretation

NASA POWER is the working initial provider. Its public daily point API requires **no API key**:

- Documentation: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- Meteorology methodology: https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/
- Resolution/request guidance: https://power.larc.nasa.gov/docs/tutorials/service-data-request/api/
- Endpoint: `https://power.larc.nasa.gov/api/temporal/daily/point`
- Community: `AG`; format: JSON; time standard explicitly UTC.
- Parameters: `PRECTOTCORR` (mm/day), `T2M`, `T2M_MIN`, `T2M_MAX` (C).
- Meteorological source: MERRA-2 reanalysis via POWER; classification **model-estimated**, not a district station observation.
- Spatial resolution: approximately 0.5° latitude × 0.625° longitude. Requests are snapped to native meteorological cell centres to avoid repeated requests within the same cell. Rwanda's 30 representative district points share eight cells.
- Daily availability starts in 1981. Latency, provisional values, missing days and source revisions can affect recent dates. Requests end before today; this module provides historical analysis, not weather forecasts or official alerts.

District points are generated from the existing real ADM2 boundaries using the centroid of the largest polygon, with an interior-point fallback for concave polygons. They are neither administrative offices nor meteorological stations. See `scripts/prepare-weather-locations.js`, `src/data/weather-locations.json` and the existing boundary attribution. Custom coordinates must lie inside Rwanda's actual polygons; only the sampled grid centre is sent to NASA. District colours describe that sampled cell, not a spatially averaged district. Complex terrain and local conditions can differ substantially from the coarse grid.

## Aggregation, seasons, baselines and indicators

- Rainfall total: sum of daily precipitation rates × one day, in mm, only when every requested day has valid precipitation. A partial observed subtotal is retained internally but is not displayed as a full rainfall total.
- Temperature mean: mean of valid daily means, with valid/expected day counts shown. Minimum/maximum are the lowest daily minimum/highest daily maximum in the selected period, not averages of daily extrema.
- Missing dates, provider fill values (-999), nonnumeric or out-of-range values remain null. Inconsistent daily temperature minima/means/maxima are flagged and excluded. Zero precipitation remains zero. Charts keep gaps; daily records and full CSV exports provide accessible alternatives.
- Season A: September of the preceding year through the final day of February of the named year. B: March–June; C: July–September. These are broad NISR-aligned analysis windows, not a crop's measured growing window. September overlaps the broad A/C definitions, so seasonal totals must not be added as unique annual totals.
- Daily requests support at most 1,831 days per request; repeat ranges to inspect longer history. District map requests are limited to one year. These bounds prevent unbounded public provider work; they do not truncate returned data.
- Default climate baseline: 1991–2020, comparing the same agricultural season. The user can choose 20–40 completed baseline years, starting in 1982 or later, all preceding the selected year. Season A needs the preceding September, so 1981 is not offered as a season year.
- Rainfall anomaly (mm): selected complete season total minus the mean of complete baseline-season totals. Anomaly (%): 100 × difference / baseline mean; unavailable for a missing or zero baseline. At least 20 complete baseline seasons per parameter are required. Temperature anomaly: selected complete season mean minus mean complete baseline-season temperature.
- Thresholds are configurable in the analysis view: rainfall deficit <= -20%, daily maximum >=35°C, daily minimum <=10°C, and seasonal mean anomaly >=2°C by default. Threshold settings are not official warning criteria. Hot/cold counts use valid days and are labelled with coverage. These are exploratory indicators, not confirmed droughts, floods, disasters or official alerts.
- Climate/agriculture alignment requires a selected district, the exact complete season window, complete rainfall/mean-temperature coverage, and unique real NISR production/area records with compatible units and one release. Custom coordinates, arbitrary partial windows, duplicate records, demonstration records and incompatible units/releases are rejected for this automatic alignment. Yield requires positive compatible harvested area. Weather is grid-point context and agriculture is a district survey estimate; spatial supports differ. The UI reports this explicitly and does not calculate correlation, causation or unsupported yield forecasts.

## Storage, reliability and security

Provider-specific HTTP/parsing lives in `weather-provider.js`, independently of UI. `weather-service.js` manages caching, coalescing and three concurrent upstream requests. All calls use a fixed HTTPS NASA origin, four whitelisted parameters and server-built dates/coordinates. Redirects are rejected using manual redirect handling (Cloudflare workerd does not implement `redirect: error`). No visitor token or incoming headers are forwarded to NASA.

Each actual upstream request has a 45-second timeout, an 8 MiB response bound, status/schema/unit/coordinate/date checks and controlled errors. Transient network/availability/timeout failures receive at most one retry after a 500 ms backoff; every actual attempt consumes provider rate limits. Malformed payloads are not retried. HTTP 429 triggers a shared backoff respecting Retry-After (bounded to one hour), with no immediate retry. No automatic UI retry loop is used. Failures with an existing expired cache return explicitly stale data and its retrieval date; failures without cache remain unavailable. Error bodies, request headers, account tokens and credentials are never logged. The few diagnostic logs contain controlled error categories only.

The running local project uses the existing `LOCAL_AUTH_DB` D1/SQLite database. `migrations/0003_weather.sql` creates independent cache and atomic limiter tables; it does not alter accounts, survey observations, findings or source archives. Cache entries are safely upserted by provider version, sampled cell and calendar year. Historic years are fresh for seven days and the current year for six hours. Cached day arrays retain source URL, API version, requested parameter units, retrieval time and quality flags. Cached errors are not substituted for measurements. Generic local collection endpoints do not expose these private cache tables.

Local rate limits: 60 weather operations per authenticated user/minute and 45 upstream calls/minute for this server. Map/point/normal requests reuse shared cells and years. Limits and provider backoff also apply to cache misses from different users.

### Deployment configuration

NASA requires **no new environment variable, API key or credential**. Local mode works with the existing `LOCAL_AUTH_DB` binding. The app creates the weather schema lazily; it can also be applied through the project's normal D1 migration workflow.

On an independently deployed Cloudflare Worker, bind a real D1 database as `WEATHER_DB` and apply `0003_weather.sql` to get persistent cache and database-backed limits. Do not use the dummy local database ID for production. Base44-managed publishing does not automatically deploy bindings declared in wrangler.jsonc: provision platform bindings through an authorized deployment configuration. If no D1 binding is present, the implementation can use Cloudflare's Cache API for public NASA data and a per-isolate in-memory limiter. That fallback is not a global/distributed rate limit; configure `WEATHER_DB` or a platform rate-limiting binding for stronger production enforcement. Cache capability/binding errors are shown as setup failures, without fake values.

Meteo Rwanda is currently **not configured**: no authorized station-data account or delivery was supplied. Its official [Climate & Warnings page](https://www.meteorwanda.gov.rw/climate-warning) links to [Climate Data Request / MIS](https://mis.meteorwanda.gov.rw/) and the [data platform](https://data.meteorwanda.gov.rw/web/login.php). The MIS did not respond during verification and the data platform requires an access session; no documented public machine API or authorized session was verified. The implementation therefore uses the permitted **authorized file delivery** path, rather than guessing an endpoint.

### Testable Meteo Rwanda delivery configuration

1. Obtain written access, redistribution terms, licence, product definitions, station/grid metadata, units and temporal conventions through Meteo Rwanda's official data request process. Public access to a website does not by itself authorize redistribution of its underlying datasets.
2. Convert the officially delivered data to the application's normalized contract below using the documented provider definitions. Preserve originals and original quality flags. Do not silently convert local-day observations into UTC-day records; obtain a compatible daily product or establish a separately documented transformation first. `PRECTOTCORR` is an internal shared precipitation field in this contract; Meteo values are labelled **daily precipitation**, never claimed to be NASA-corrected precipitation.
3. Bind a **private R2 bucket** as `METEO_RWANDA_DATA` through authorized Worker/platform configuration. Save the approved normalized JSON as `approved-delivery.json` (maximum 8 MiB). The bucket binding supplies server-side access; no public bucket URL, client upload endpoint or API key is created. Replace this one versioned delivery object safely when a new approved release arrives; duplicate station IDs/dates are rejected. Keep the original releases in a separate archive. Base44 publishing does not automatically provision wrangler bindings.
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

The adapter validates numeric ranges, consistency between temperature extrema/mean, dates, unique keys, official attribution, units and country coverage. It rejects the complete delivery on schema/provenance errors. Station locations identify sampling support; no station-to-district representativeness is inferred. R2 object upload time is reported as retrieval time, and the official issue timestamp is retained separately. R2 access failures return safe disconnected states; NASA data is never substituted. If a future official API is approved, place its credentials in server secrets (`secrets.get(...)` from `base44:runtime` for Base44; Worker secrets for independently managed Workers), and implement only that documented protocol. Never put credentials in `VITE_*`, scrape private endpoints or bypass access controls.

## Verification

- `node --test tests/weather.test.js`: parsing, missing values, invalid input/schema, seasons, baseline sufficiency/formulas, outages/429/timeout, persistent cache and rate limits, shared cells, roles and climate/agriculture compatibility.
- `node --test tests/weather-integration.test.js`: authorized-delivery fixtures only, source separation, metadata privacy, station selection, delivery validation, monitoring retention/coverage and bounded retries. These fixtures never enter application storage.
- `node scripts/check-weather.js`: real authenticated requests against the running local backend and actual NASA POWER; 30-district/eight-cell map, full 1991–2020 baseline, repeated cache reads, analyst/field access, viewer/anonymous denial, invalid points/dates and CSRF checks. No mocked values enter production caches.
- `npm run lint`, `npm run build` and the existing regression tests must pass. The repository is JavaScript/JSX and has no separate type-check script.

Live verification retrieved Gasabo's sampled cell (-2, 30), 2025 Season B: 122 daily records and 352.21 mm precipitation. These are NASA grid estimates and can be revised by the provider; they are not local station observations or official warnings. Baseline sources and formulas remain inspectable in the UI.
