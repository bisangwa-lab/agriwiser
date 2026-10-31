# Price data sources collected for AgriWiser

Checked: 2026-10-31

## Downloaded: WFP Rwanda Food Prices via HDX

- Dataset: [Rwanda - Food Prices](https://data.humdata.org/dataset/wfp-food-prices-for-rwanda)
- Provider: World Food Programme (WFP) Price Database; HDX is the distribution portal.
- License in HDX metadata: Creative Commons Attribution for Intergovernmental Organisations (CC BY-IGO). Preserve attribution and check the license text before redistributing derived extracts.
- Local files: `data/private/prices/wfp_food_prices_rwa.csv` and `data/private/prices/wfp_markets_rwa.csv`.
- HDX package metadata snapshot: `data/private/prices/hdx-wfp-rwanda-package-metadata.json`.
- Downloaded 2026-10-31. Price file has 153,204 records, dates 2000-01-15 through 2026-08-15; the market lookup has 109 rows. HDX metadata had last modified 2026-10-19.
- The source describes its database as updated weekly, but the latest Rwanda observation in this downloaded snapshot is 2026-08-15. Treat this as historical market context, not a live quote. Keep `date`, `market`, `commodity`, `unit`, `price type`, `price flag`, and currency together. The file includes food and non-food commodities and varied units; filter and validate before analysis.
- Source endpoints in the metadata snapshot are HDX resources; no credentials or API secrets were used.

## NISR farm selling-price survey files already in private project storage

These respondent/plot-level survey archives are already present under the ignored folder `Track 1 - Agricultural Productivity/`. The survey catalogue is `data/private/survey-file-catalogue.json`. Do not copy respondent rows into public assets, Git, or browser responses.

- SAS 2024 archive: `Track 1 - Agricultural Productivity/T1 Agriculture - Seasonal Agriculture Survey 2024.zip`; NISR catalogue [SAS 2024](https://microdata.statistics.gov.rw/index.php/catalog/113). The production files cover Seasons A, B, and C and include the farmer-reported selling price per kilogram (`s2q28`, RWF/kg) and market channel field.
- SAS 2025 archive: `Track 1 - Agricultural Productivity/T1 Agriculture - Seasonal Agriculture Survey 2025.zip`; NISR catalogue [SAS 2025](https://microdata.statistics.gov.rw/index.php/catalog/124). Local archive profiling confirms production files for Seasons A, B, and C include selling-price field `s2q28` (RWF/kg) and a market field. NISR catalogue metadata identifies the 2025 microdata release as an edited anonymized dataset for public use. Confirm the applicable access and redistribution terms before publishing derived outputs.
- Plot and screening questionnaires for SAS 2025 are saved in this folder to support variable interpretation. NISR's [2025 annual report](https://www.statistics.gov.rw/sites/default/files/documents/2025-12/SAS%202025%20Final%20report.pdf) is linked as the official report source.
- Older SAS microdata archives are also present locally. The survey-file catalogue shows crop selling-price fields in the production datasets for 2018–2023; variable names and questionnaire definitions may change between releases and must be checked before combining series.
- These are farmer-reported prices from survey seasons, not current market quotes. Any district/crop/season estimate needs an appropriate survey-weighted method, response counts, missing-value handling, outlier review, and a minimum sample threshold. Do not simply average plot records or interpret the arithmetic mean as a current market price.

## Not acquired as a downloadable series

- NISR's published SAS aggregate workbooks through 2026 cover production, area, yield, and other published indicators; they are not an itemized current crop-price series.
- MINAGRI's eSoko is identified by the Food Security Portal/IFPRI as the government's market price platform, but the price-history export/API was not publicly accessible from this session. No login was used and no access control was bypassed. For a fresher Rwanda-specific market series, request an authorized export or API agreement from MINAGRI/eSoko.
- The NISR SAS 2026 microdata price file was not found in the NISR microdata catalogue. Latest local survey microdata with profiled price questions is SAS 2025.

## Market Prices & Trends feature

The Panel 4 `Market Prices & Trends` view uses a minimized, non-personal WFP extract at `src/data/wfp-market-prices.json`. It is generated from the private source CSVs by `scripts/prepare-market-price-data.js`; the raw private files are not copied into browser assets. The extract contains positive food-price observations from 2018 onward flagged `actual` or `actual,aggregate`, plus market names and coordinates. Every market point in the extract was checked against its listed district using the available 2012 boundary file. This check validates the map location, not the price itself.

The extract contains 32,083 records from 39 markets. Although the source snapshot contains records dated 2026-08-15, those are aggregate-only; the latest included observed/actual record is 2026-07-15. The UI states this and labels the data historical. There is no live eSoko integration or forecast. Server functions require a signed-in user and a Community & Business role (or super admin), and return only the aggregated view needed by the interface.

The UI shows monthly medians and market medians for the selected period. Market records do not necessarily share the same observation dates, so cross-market comparisons include each market's latest date and number of records. The across-market trend is explicitly labeled as a median of reporting market records, not a national price. Do not combine these WFP market observations with NISR farmer-reported selling prices without a separate, documented method.
