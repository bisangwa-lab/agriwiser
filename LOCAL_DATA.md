# Local agricultural data

The system imports all populated worksheets from the official NISR workbooks in `migration/nisr-source-manifest.json`. It does not restrict the crop import to a selected list. The generated `migration/real-data-import-report.json` records exact counts, normalized coverage, source hashes, ambiguity checks and district/national reconciliation results.

## What is available

- All main crop categories and the separately reported banana/bean subtypes found in the source district tables. Historical releases additionally contain chia seeds and bean categories that are not available in every later release.
- Production (metric tonnes), harvested and cultivated area (hectares), and source-published yield (kg/ha), wherever the original table identifies the district and season unambiguously.
- Seasons A, B and C wherever reported. A missing crop, season, year or measure is unavailable, not zero. The crop and year options are generated from the imported data, not maintained as a six-crop whitelist.
- The full published data library in Explore data, Public insights and Administration includes all source worksheets: national/provincial/district statistics, land use, seeds, fertilizer, pesticides, irrigation, erosion, agricultural practices, livestock, households, food security and survey-quality tables. Original rows, columns, units and blank cells are retained; CSV exports preserve underlying numeric precision.
- Published reports and methodology are indexed by PDF page. The original NISR PDFs remain the authority for charts, maps, layout, footnotes and interpretation. Extracted report text is not automatically treated as a district measurement.
- All 32 supplied archives (845 files) are retained locally. Administration indexes all 837 readable survey data files, their 27,430 variable definitions and sample-record counts. Six macOS metadata files and two XML/RDF metadata documents are not respondent datasets. One file labelled SAV actually contains Stata data; the profiler detects and reads its real format.

## Calculation and quality rules

- All-crop totals include main categories only. Banana and bean subtypes can be selected individually; they are never added to their parent totals.
- Crop-group subtotals and national/provincial totals remain in the original tables and are not added again to district observations.
- Derived yield requires production and harvested area with matching crop, district, season, year and release. Missing or incompatible components produce an unavailable result. Published source yield is a separate measure; rates are never added across districts or crops.
- Blank, negative and nonnumeric cells remain missing, while numeric source zero is retained. No replacement values are invented.
- Source reconciliation differences are retained as explicit quality flags, not silently corrected. The preparation report lists every check and its tolerance.
- Old tables can use different geographic levels, crop definitions, survey designs, or ambiguous repeated headers. Their complete original tables remain accessible. Unresolved columns are not assigned invented district meanings.
- Dashboard/report comparisons use a selected season so a complete year is not compared with an incomplete annual period. Coverage is the proportion of available source cells with numeric values, not survey confidence or a claim of complete national coverage.
- Pagination reads all matching observations and fails visibly on broken cursors. Display tables have page controls and complete CSV exports; there is no 8,000-record cutoff.

## Reproduce the import

Use the bundled Python runtime (or a compatible Python with openpyxl, xlrd, pyreadstat, narwhals and pypdf). Optional reader dependencies are installed inside ignored `data/private/python-packages`, not in the application runtime.

1. `python scripts/inspect-surveys.py` inventories every supplied ZIP member.
2. `python scripts/profile-survey-archives.py` indexes all readable schemas without publishing respondent rows.
3. `python scripts/discover-nisr-sources.py` discovers linked official workbook/report downloads and records missing releases explicitly.
4. `python scripts/download-nisr-data.py` downloads fixed official HTTPS workbook URLs from the manifest.
5. `python scripts/index-published-reports.py` downloads and indexes full official report text.
6. `python scripts/prepare-real-data.py` prepares the full normalized import and generated frontend coverage catalogue. This delegates to `prepare-full-data.py`.
7. `node scripts/import-local-data.js` upserts the prepared records into local D1. Large intact JSON records are assembled in private staging to stay within D1 SQL statement limits. `--catalogue-only` refreshes source tables/dictionaries/reports without reimporting unchanged observations.
8. `node scripts/check-real-data.js` checks the running server's full row counts, pagination, source tables, filters, provenance and access controls.

Raw survey files, downloaded source workbooks/PDFs, prepared records, staging SQL and the local database remain ignored and blocked from Vite's file server. Respondent records are not sent to an external platform or published in the web app. Household/plot microdata requires its survey design, weights and a validated aggregation definition; it is never simply summed and presented as national production. Account/session data and existing investigations/findings are preserved during imports.
