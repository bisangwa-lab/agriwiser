# NISR source registry — use and verification

**17 source workbook references** in `NISR_WORKBOOK_SOURCE_CATALOG.csv` were transcribed from the reviewed repository's `migration/nisr-source-manifest.json` on 2026-10-30. The full manifest in the latest repo is the canonical source. `REPO_IMPORT_COVERAGE_SNAPSHOT.json` captures the prepared import report dated 2026-10-29; its counts should **not** be shown as current field counts.

## NISR survey families
- `SAS`: Seasonal Agricultural Survey. Crop production, harvested area, survey periods, published yield and other original table measures when verified.
- `AHS`: Agricultural Household Survey. Published aggregate household/farm practices and inputs; no raw respondent records in the app.
- `CFSVA`: food security / vulnerability context, never evidence by itself of crop failure cause.
- The repository also lists **30 official report references** in `migration/nisr-report-manifest.json` (reviewed snapshot). The actual PDF files are **not included** in this ZIP, and its latest manifest should be read directly before report integration.

## Required agent source audit
1. Confirm latest manifest entries and URL status via authorized HTTP access. Record final destination, status, content type, size, downloaded SHA-256, source license/usage conditions and date retrieved; no guessed hashes.
2. Check same survey release and year/season; display source table/sheet/page if known.
3. Compare with `migration/real-data-import-report.json` and local dataset validation scripts.
4. Do not treat report PDF text as an observation unless an official table supports it and extraction method is valid.
5. Do not copy local archives, respondent data, user details or credentials into this ZIP, coding prompts or public git.
6. For AHS/CFSVA use actual published aggregation and survey methodology; do not invent district breakdowns.

## Relevant repo scripts
`python scripts/discover-nisr-sources.py`; `python scripts/download-nisr-data.py`; `python scripts/index-published-reports.py`; `python scripts/prepare-real-data.py`; `node scripts/import-local-data.js`; `node scripts/check-real-data.js`.
