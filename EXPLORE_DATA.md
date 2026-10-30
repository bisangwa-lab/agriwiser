# Explore data

The Explore page has two workspaces: **Crop trends & next steps** and **Published tables & reports**. Crop, district, season, measure, trend years, baseline year and active workspace are validated URL parameters, so refreshing or copying the selection link retains the analysis. Legacy `/explore#published-tables` links open the library.

## Trustworthy comparisons

`src/lib/explore-data.js` builds a fixed set of crop × district × year cells. All-district selections require all 30 known Rwanda districts. All-crop selections use a fixed union of main categories from the displayed and baseline periods, excluding banana and bean subtypes. Missing source records are represented explicitly, separately from records whose source cell is missing.

A total is withheld if any required value is absent, negative, nonnumeric, forecast, duplicated or in the wrong unit. Duplicate releases are not silently added or arbitrarily chosen. Sample and published data cannot be combined or compared. A complete source selection measures availability; it does not establish survey confidence, statistical significance or unchanged definitions.

Derived yield uses production and harvested-area pairs from the same release for each crop/district/season/year. The aggregate is total production divided by total harvested area, not the sum or simple mean of rates. A zero-production, zero-area pair contributes zero weight and has no individual rate. Positive production with zero area is incompatible. Published yield remains a separate source rate requiring one crop and district.

The current year and baseline are explicit, use the same agricultural season, and may be non-adjacent. A missing baseline is never replaced by an older observation. Percentage change is withheld for a zero baseline or incomplete inputs. Missing years break the chart. Year-by-year coverage and district drilldowns explain unavailable comparisons.

The selected measure is the only measure shown in the analysis table and CSV. Derived-yield exports include the original component values and source references. Table search and the gap checkbox filter both the table and its export, across all pages. Exports retain source precision and mark entirely absent records; formula-like strings are escaped for spreadsheet use.

## Investigation workflow

Summary cards describe the selected year, the baseline change and source availability. The district comparison list provides drilldowns, ordered by descriptive percentage change with unavailable comparisons last. Area and yield comparisons help the user investigate the pattern without attributing a cause.

Selecting a district enables an explicit **Load matching rainfall** action. It uses the existing authenticated weather server function and provider cache for the two exact seasonal date ranges. No example district or annual sum is substituted. Incomplete rainfall totals and provider failures stay visible; the full weather analysis link retains district, year and season. Weather remains contextual evidence, not a causal diagnosis.

## Publications

The original worksheet library supports topic shortcuts, publication-year/survey/topic filters, row search, and an explicit action to apply the trend's publication years. Its filters are independent of the crop chart. Readable mode hides empty rows/columns and takes labels only from source cells in the same column; merged headings are never inferred. Original worksheet view retains every row/column. Original source coordinates and all columns remain in exports. Reports and methodology remain searchable through the report browser.


## Verification

Run `node --test tests/*.test.js`, `npm run lint` and `npm run build`. `tests/explore-data.test.js` covers incomplete/absent districts, indicator consistency, fixed crop scope, gaps and explicit baselines, incompatible units/releases, yield weighting, published-rate restrictions, sample mixing, export precision/safety, district drilldowns and original worksheet coordinates.
