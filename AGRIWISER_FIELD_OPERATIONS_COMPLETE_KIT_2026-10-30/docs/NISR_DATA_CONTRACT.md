# NISR data contract for Field Operations

## Authoritative dataset discovery
Use `migration/nisr-source-manifest.json` (17 workbook entries in reviewed snapshot), `migration/nisr-report-manifest.json` (30 report entries), `migration/real-data-import-report.json` and `LOCAL_DATA.md` in the checked-out repo. Source URLs here are references, not an assertion that downloads currently succeed. Data files from local ignored directories are not bundled in this kit.

## Dataset categories and uses
| Family / category | Field Operations use | Constraint |
|---|---|---|
| SAS seasonal agricultural survey | Crop production, harvested/cultivated area, published yield and comparable season/district figures | Validate district-level grain and survey release; don't merge season A/B/C blindly |
| AHS agricultural household survey | Input use, agricultural practices, irrigation/land-use context where published aggregates support it | Don't expose household-level respondent rows or infer district estimates from national tables |
| CFSVA / food security | Context on vulnerability/food security in published aggregation | Not a direct crop loss causation measure |
| Published NISR reports | Interpret methods, survey definitions, sampling, changes, tables and footnotes | Preserve edition/page and don't assume parsed narrative is a direct measurement |
| Climate providers | Separate environmental context | Never label ERA5/MERRA-2 as NISR or direct field observations |

## Publication-bound record contract
Minimum for any displayed numeric indicator:
```
source_publisher, survey_family, publication_id, release_date (if known),
workbook_or_report, table_or_sheet (if known), source_url,
geography_name, geography_code (if verified), geographic_level,
crop_category, crop_subtype (if any), indicator_definition, value, unit,
season, year, period_start/end (if supported),
observation_status, reported_zero, missing_reason, quality_flags,
import_job_id, source_hash, methodology_link, revision_version.
```
Do not invent missing fields. Use explicitly nullable properties. NISR is only the source if the source record identifies it; downstream derived values labeled calculated-from-NISR, not source-published.

## Statistical rules
1. `production_tonnes` is an absolute amount, may be summed only across genuinely disjoint compatible parts with valid coverage and no parent/subtype overlap.
2. `harvested_area_ha` is an area. Distinguish cultivated and harvested area and avoid silent conversion.
3. `derived_yield_t_per_ha = production_tonnes / harvested_area_ha` only for same district/crop/season/year/release, finite values and harvested area > 0; mismatches/unavailable are null.
4. `source_published_yield` is not overwritten by calculated yield; units may be kg/ha and need documented conversion.
5. `%change = ((current - previous) / previous)*100` only with non-zero, present previous. No alert if incompatible release/crop/geography/season/category or invalid baselines.
6. Reported numeric `0` is distinct from missing/nonreported/blank. Do not display missing as `0`, `-100%` or success.
7. Parent crop/subtype (Banana vs Banana for Beer, Beans vs Bush Beans) must not double count.
8. Dataset presence ≠ comparable coverage. Show unavailable, partial, ambiguous and warning states explicitly.
9. The dashboard must be explicit whether an observed number is published, estimated, provisional or calculated.
10. A 100% change demands source-cell verification and reasonable-quality evidence before elevating to operational action.

## Weather compatibility
Match district/time/season and note source spatial grid + missing days. Seasonal rainfall total requires complete relevant daily sequence under current weather module's documented rule. Temperature summaries use valid day counts with units. Do not infer village/farm climate from district cells. Keep NASA MERRA-2 and ERA5/Copernicus separate, never silently average.

## Source provenance visual
Every finding detail: indicator | value + unit | exact periods | district + crop | source publication/release | calculation | quality | source link | methodology | recorded/generated at. Use 'Source unavailable' if no valid reference, not a generic 'NISR' badge.

## Import path (from existing repo)
`scripts/inspect-surveys.py` → `scripts/profile-survey-archives.py` → `scripts/discover-nisr-sources.py` → `scripts/download-nisr-data.py` → `scripts/index-published-reports.py` → `scripts/prepare-real-data.py` → `scripts/import-local-data.js` → `scripts/check-real-data.js`. Require authorization, source integrity checks and documented error handling.
