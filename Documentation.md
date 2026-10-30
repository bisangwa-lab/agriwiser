# AGRIWISER
## Product Requirements, System Architecture and AI Coding Agent Implementation Specification

**Project:** AgriWiser  
**Implementation Agent:** OpenAI Codex  
**Product Category:** Agricultural Intelligence and Decision-Support Platform  
**Primary Data Context:** Rwanda  
**Status:** Working technical specification. Validate all assumptions against the existing repository and supplied datasets.

---

# 1. PROJECT OVERVIEW

## 1.1 Project Purpose

AgriWiser is an agricultural intelligence and decision-support platform designed to help users discover, understand, investigate, follow up, and report on agricultural conditions in Rwanda.

The platform uses reliable agricultural statistics, climate information, geographic analysis, and data-driven insights to support agricultural analysis and decision-making.

The system must prioritize:
- Reliable and traceable data.
- Accurate agricultural calculations.
- Secure access and role-based permissions.
- Meaningful analytics and visualizations.
- Integration with authorized external data providers.
- Clear communication of missing data and uncertainty.
- Functional workflows rather than static dashboards.

## 1.2 Core Product Journey

The entire platform should follow this journey:

1. **Discover:** Find agricultural datasets, indicators, districts, crops, seasons, and reports.
2. **Understand:** Analyze trends, distributions, comparisons, maps, and data quality.
3. **Investigate:** Explore unusual patterns, compare indicators, and examine possible relationships.
4. **Follow Up:** Record investigations, assign tasks, and track follow-up activities where authorized.
5. **Report:** Generate evidence-based reports with sources, calculations, and limitations.

## 1.3 Core Product Rules

- Never fabricate NISR statistics.
- Never present demo data as official data.
- Missing values must remain missing, not zero.
- Distinguish official agricultural statistics from external climate estimates.
- Correlation must never be presented as causation.
- Weather estimates must not be presented as direct farm measurements.
- Predictions must not be presented as validated forecasts without proper validation.
- Every important indicator must have a clear definition, unit, period, and source.
- Preserve existing project functionality when implementing new features.

---

# 2. SYSTEM USERS AND ROLE-BASED PANELS

Implement five separate panels with role-based navigation and permissions.

## 2.1 Administration Panel

**Route:** `/admin`

**Roles:**
- Super Admin
- Data Manager

**Responsibilities:**
- Manage user accounts and permissions.
- Manage datasets and data imports.
- Review data quality and validation errors.
- Monitor external API connections.
- Manage approved system configurations.
- View system activity and audit logs.
- Monitor data refresh and integration status.

Super Admin has system-level permissions.

Data Manager manages datasets and data quality but should not automatically receive unrestricted security or user-management permissions.

## 2.2 Analytics & Planning Panel

**Route:** `/analytics`

**Roles:**
- Agricultural Analyst
- Policy Maker

**Responsibilities:**
- Agricultural overview.
- Explore agricultural datasets.
- Compare crops, districts, seasons, and years.
- Analyze production, harvested area, and valid yield.
- District-level agricultural maps where data supports them.
- What-if scenario simulator.
- Weather and agricultural productivity comparisons.
- Reports and exports.
- Data quality analysis.

Agricultural Analysts may have analysis and investigation permissions.

Policy Makers should primarily have authorized read, comparison, and reporting permissions.

## 2.3 Field Operations Panel

**Route:** `/field-operations`

**Roles:**
- Agricultural Officer
- Field Investigator
- Field Supervisor

**Responsibilities:**
- View assigned locations.
- Access relevant agricultural information.
- Review approved indicators and investigation tasks.
- Record field observations when the feature is implemented.
- Add follow-up notes.
- Track task status.
- Allow supervisors to review and assign tasks.

Never present estimated satellite weather data as a direct field observation.

## 2.4 Agricultural Community & Business Panel

**Route:** `/community-business`

**Roles:**
- Farmer
- Cooperative
- Buyer
- Agribusiness

Provide role-specific functionality and permissions.

Potential capabilities:
- Farmers: relevant agricultural insights and approved information.
- Cooperatives: authorized aggregated production and area insights.
- Buyers: verified production or market context when a reliable source exists.
- Agribusinesses: approved aggregated agricultural information.

Do not invent market prices, buyer demand, farmer records, or unsupported recommendations.

## 2.5 Public Insights Panel

**Route:** `/public-insights`

**Role:** Public Viewer

**Responsibilities:**
- View published agricultural indicators.
- Explore public charts and maps.
- Read approved reports.
- View data sources and methodology.

This panel must be read-only and must never expose private or restricted records.

## 2.6 Authentication and Authorization

Implement:
- Shared login page: `/login`.
- Automatic role-based redirection.
- Protected routes.
- Backend permission enforcement.
- Secure session management.
- Role assignment restricted to authorized administrators.
- Audit logging for sensitive operations.

Hiding a button in the frontend is not sufficient security. Every protected backend operation must validate the user's permissions.

---

# 3. ANALYTICS & PLANNING PANEL

Implement the following modules.

## 3.1 Agricultural Overview

Display available agricultural indicators from the actual NISR datasets.

Potential indicators, only when supported by the data:
- Total production.
- Harvested area.
- Yield.
- Crop distribution.
- District comparisons.
- Seasonal performance.
- Yearly trends.

Provide filters for:
- Year.
- Season.
- District.
- Crop.
- Other available dataset dimensions.

Display units, sources, definitions, and missing-data information.

## 3.2 Explore Data

Allow analysts to:
- Browse available datasets.
- Search indicators.
- Filter records.
- View tables.
- Inspect metadata.
- Examine missing values.
- Export authorized data.

All filters must work with actual backend data.

## 3.3 Compare

Support:
- District comparisons.
- Crop comparisons.
- Seasonal comparisons.
- Year-to-year comparisons.

Only compare compatible indicators, units, geographic levels, and reporting periods.

## 3.4 District Map

Display agricultural indicators geographically using verified district boundaries and identifiers.

Requirements:
- District selection.
- Indicator selection.
- Year and season filters.
- Map legends and units.
- Missing-data handling.
- District-level information panels.

Do not show missing district data as zero.

## 3.5 What-If Simulator

Build an interactive scenario simulator.

Requirements:
- Allow users to change explicit assumptions.
- Display baseline and scenario values separately.
- Explain formulas and assumptions.
- Allow users to reset scenarios.
- Label outputs as simulated results.

A scenario is not a prediction. Do not call it a forecast unless a validated predictive model is implemented.

## 3.6 Alerts and Investigations

Allow authorized users to investigate documented unusual indicators.

Every alert must show:
- Indicator.
- Location.
- Period.
- Source.
- Triggering threshold or rule.
- Explanation.
- Investigation status.

Do not present statistical anomalies as official disaster warnings.

## 3.7 Reports

Generate reports from real filtered data.

Include:
- Report title.
- Generation date.
- Filters.
- Indicators and units.
- Data sources.
- Calculation methods.
- Missing-data notes.
- Limitations.

---

# 4. NISR AGRICULTURAL DATA INTEGRATION

NISR is the primary source for official agricultural statistics supplied to AgriWiser.

## 4.1 Dataset Inspection

Before building the database or analytics, inspect every supplied NISR dataset.

Identify:
- File format.
- Sheet and table structure.
- Actual column names.
- Data types.
- Geographic coverage.
- Reporting periods.
- Crop classifications.
- Season definitions.
- Units.
- Missing-value conventions.
- Dataset metadata.
- Access and usage restrictions.

Never assume that all datasets contain district, season, crop, production, harvested area, or yield fields.

Use only verified fields.

## 4.2 Data Import Pipeline

Implement a controlled data import process:

1. Authorized Data Manager uploads a dataset.
2. Validate file type and size.
3. Preview the dataset.
4. Map actual source columns.
5. Validate data types, units, dates, and geographic identifiers.
6. Detect duplicate records.
7. Display errors and warnings.
8. Require confirmation before importing.
9. Store source metadata and import history.
10. Record the result of the import.

Preserve original source data and document all transformations.

## 4.3 Agricultural Calculation Rules

Yield:

`Yield = Production / Harvested Area`

Only calculate when:
- Production is valid.
- Harvested area is valid.
- Units are compatible.
- Harvested area is greater than zero.

If harvested area is zero or missing, yield must be unavailable.

Percentage change must not be calculated when the baseline is zero or missing.

Never silently convert missing values into zero.

---

# 5. WEATHER & CLIMATE MODULE

Weather & Climate is a separate module that provides climate context for agricultural analysis.

Its data must not be presented as NISR statistics.

## 5.1 Data Providers

### A. NASA POWER

Official documentation:

https://power.larc.nasa.gov/docs/services/api/

Use NASA POWER as the initial programmatic weather data source.

Potential variables:
- Precipitation.
- Minimum temperature where supported.
- Maximum temperature where supported.
- Mean temperature.
- Other useful agroclimatology parameters when verified.

Use the appropriate daily or monthly endpoints.

Official documentation:
- Daily API: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- Monthly API: https://power.larc.nasa.gov/docs/services/api/temporal/monthly/
- Temporal APIs: https://power.larc.nasa.gov/docs/services/api/temporal/

Verify parameter codes, units, temporal coverage, and spatial resolution before implementation.

NASA POWER provides gridded meteorological products. Do not present them as direct measurements from individual farms or weather stations.

Avoid unnecessary repeated requests. Implement caching and reuse retrieved grid-cell data.

Do not invent API credentials if the selected public endpoint does not require authentication.

### B. Meteo Rwanda

Official website:

https://www.meteorwanda.gov.rw/

Climate data request guidance:

https://support.irembo.gov.rw/en/support/solutions/articles/47001263560-how-to-request-for-climate-data

Meteo Rwanda provides an official process for requesting climate data for specified locations and time periods.

The documented process may require:
- Applicant identification.
- Phone number or email.
- Recommendation letter.
- Requested locations.
- Climate parameters.
- Requested time period.
- Reason for the request.

Verify current application requirements before submission.

Do not assume Meteo Rwanda provides a public API.

First determine whether an official API, data portal, downloadable dataset, or authorized delivery mechanism exists.

If data is supplied as CSV, Excel, PDF, or another format, implement an appropriate import workflow.

If access approval or credentials are required, do not bypass them.

## 5.2 Weather & Climate Features

### Phase 1 — Core Features

1. Rainfall Trends.
2. Temperature Analysis.
3. Seasonal Climate Comparison.
4. Data Sources & Quality.

### Phase 2 — Advanced Features

5. District Weather Map.
6. Rainfall Anomaly Analysis.
7. Climate Risk Indicators.

### Phase 3 — Agricultural Integration

8. Weather vs Agricultural Productivity.

Only compare weather and NISR agricultural indicators when location, reporting period, units, and definitions are compatible.

Correlation must not be interpreted as causation.

## 5.3 Rainfall Trends

Display historical precipitation by:
- Date range.
- Month.
- Year.
- Agricultural season where definitions are available.
- Supported location.

Display the unit, source, period, and missing-data status.

## 5.4 Temperature Analysis

Display supported:
- Minimum temperature.
- Maximum temperature.
- Mean temperature.

Allow comparisons across compatible years and periods.

## 5.5 Seasonal Climate Comparison

Compare rainfall and temperature across seasons.

Use verified Rwanda agricultural season definitions. Do not invent season dates.

## 5.6 Rainfall Anomaly

Compare rainfall against a documented historical baseline.

Display:
- Baseline period.
- Current period.
- Difference.
- Percentage difference where mathematically valid.
- Calculation method.

## 5.7 Climate Risk Indicators

Potential indicators:
- Rainfall deficit.
- Unusually high temperature.
- Unusual rainfall patterns.

Use documented thresholds and label outputs as analytical indicators, not official warnings.

## 5.8 Weather Data Quality

For each weather dataset, record:
- Provider.
- Dataset.
- Parameter.
- Unit.
- Location.
- Time coverage.
- Temporal resolution.
- Spatial resolution where available.
- Observed or estimated classification.
- Retrieval date.
- Missing-data status.

Clearly distinguish station observations, satellite-derived estimates, and model-derived data.

---

# 6. EXTERNAL API INTEGRATION AND SECURITY

All protected external API calls must be made through the backend.

Requirements:
- Use server-side API routes, backend functions, or services.
- Store actual credentials in secure environment variables or a secrets manager.
- Never expose secrets in frontend code.
- Never commit real credentials to source control.
- Validate all external API responses.
- Validate coordinates, date ranges, units, and parameters.
- Handle timeouts and provider errors.
- Implement safe retry and backoff behavior.
- Apply sensible rate limits.
- Cache repeated requests.
- Avoid duplicate data storage.
- Log integration status without exposing secrets.

For Meteo Rwanda, integrate only an official and authorized access method.

If a provider is unavailable, show a clear status and instructions instead of fake data.

---

# 7. DATA MODEL AND DATABASE

Inspect the existing database before introducing new tables or migrations.

Use the existing architecture where possible.

The weather data model should support:

- Provider.
- Dataset.
- Parameter.
- Value.
- Unit.
- Timestamp or reporting period.
- Latitude and longitude.
- Geographic identifier.
- Temporal resolution.
- Spatial resolution where known.
- Measurement classification.
- Retrieval timestamp.
- Quality status.
- Source reference.

Keep provider-specific records identifiable.

Do not silently average or merge NASA POWER and Meteo Rwanda data.

For agricultural records, preserve:
- Original source values.
- Source metadata.
- Geographic and temporal dimensions.
- Derived indicators separately from source data.

Use safe upserts and appropriate indexes.

---

# 8. MAPS AND GEOGRAPHIC ANALYSIS

Use verified geographic boundaries.

Requirements:
- Stable district identifiers.
- Validated geographic joins.
- Correct coordinate reference systems.
- Map legends and units.
- Missing-data distinction.
- Source attribution.

If weather data has coarse spatial resolution, explain that limitation.

Do not imply that a gridded estimate represents an exact district or farm measurement.

---

# 9. FOLLOW-UP WORKFLOW

Where supported by the project scope, implement an investigation workflow.

Potential statuses:
- Open.
- In Progress.
- Awaiting Review.
- Closed.

Allow authorized users to:
- Create investigations.
- Link indicators and locations.
- Add notes.
- Assign responsible users.
- Record follow-up actions.
- Track status changes.

Maintain audit history.

Automated indicators must not automatically become confirmed field incidents.

---

# 10. REPORTING

Reports must be generated from actual data.

Include:
- Title.
- Date generated.
- Filters.
- Indicators.
- Units.
- Sources.
- Definitions.
- Calculations.
- Missing-data notes.
- Limitations.

Clearly separate:
- Official NISR statistics.
- NASA POWER data.
- Meteo Rwanda data.
- Simulated what-if results.

Apply RBAC to report access and exports.

---

# 11. SECURITY AND RBAC

Implement least-privilege access.

Requirements:
- Protected frontend routes.
- Backend permission enforcement.
- Secure authentication.
- Safe session handling.
- No self-assignment of privileged roles.
- Secure upload validation.
- API secret protection.
- Audit logs.
- Safe error messages.
- Protection of confidential and personal information.

Every sensitive operation must validate the authenticated user's role and permissions.

---

# 12. TESTING AND QUALITY ASSURANCE

Implement unit, integration, and UI tests.

Test the following:

## Authentication
- Correct login.
- Role-based redirection.
- Unauthorized route blocking.
- Backend permission enforcement.
- Prevention of privilege escalation.

## NISR Data
- Import validation.
- Missing values.
- Invalid units.
- Duplicate records.
- Yield calculations.
- Percentage-change edge cases.

## Weather APIs
- NASA POWER successful retrieval.
- Response parsing.
- Unit validation.
- Missing values.
- Invalid date ranges.
- API timeout.
- Provider outage.
- Rate limits.
- Cache behavior.
- Secret protection.

Test Meteo Rwanda only with authorized data or an authorized integration environment.

## Analytics
- Filters update results.
- Comparisons use compatible data.
- Maps use valid geographic joins.
- What-if results are labelled simulated.

## Reports
- Correct calculations.
- Source attribution.
- Missing-data notes.
- Permission checks.

Do not use mocked API responses as production data.

---

# 13. IMPLEMENTATION ROADMAP

Build incrementally.

## Stage 0 — Repository and Data Audit

- Inspect repository.
- Identify framework and architecture.
- Inspect database and authentication.
- Inspect current routes and panels.
- Inspect supplied NISR datasets.
- Identify existing features and missing features.
- Document actual data fields and limitations.
- Produce an implementation plan.

Do not begin by redesigning the entire application.

## Stage 1 — Authentication and RBAC

- Shared login.
- Five role-based panels.
- Route protection.
- Backend permission checks.
- Audit logging.

## Stage 2 — NISR Data Foundation

- Dataset inspection.
- Data import.
- Validation.
- Normalization.
- Data dictionary.
- Agricultural calculations.

## Stage 3 — Analytics & Planning

- Overview.
- Explore Data.
- Compare.
- Data Quality.
- District Map where supported.
- What-If Simulator.
- Reports.

## Stage 4 — NASA POWER Integration

- Server-side API adapter.
- Historical rainfall.
- Temperature data.
- Data normalization.
- Caching.
- Source attribution.
- Functional Weather & Climate UI.

## Stage 5 — Meteo Rwanda Integration

- Verify official access method.
- Request authorized data if necessary.
- Inspect delivered files and metadata.
- Implement import or API adapter.
- Validate measurements and coverage.
- Integrate into Weather & Climate.

## Stage 6 — Advanced Climate Analytics

- Rainfall anomalies.
- Climate indicators.
- Seasonal comparisons.
- Weather versus agricultural productivity.

## Stage 7 — Field, Community and Public Panels

- Implement agreed role-specific workflows.
- Follow-up and investigations.
- Approved public insights.

## Stage 8 — Final Testing and Deployment

- Security review.
- Full tests.
- Performance checks.
- Documentation.
- Deployment configuration.
- Final release checklist.

---

# 14. REQUIRED DOCUMENTATION FILES

Maintain these files in the repository:

- `README.md`
- `docs/PRODUCT_SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/RBAC_MATRIX.md`
- `docs/DATA_DICTIONARY.md`
- `docs/DATA_SOURCES.md`
- `docs/API_INTEGRATION.md`
- `docs/TEST_PLAN.md`
- `.env.example`

Only document functionality that actually exists or is explicitly planned.

---

# 15. MASTER INSTRUCTION TO CODEX

You are the senior full-stack engineer responsible for implementing AgriWiser.

Treat this specification, the existing repository, and the supplied datasets as the primary sources of truth.

Your first task is NOT to create a new dashboard or rewrite the application.

Start by auditing the repository:

1. Identify the actual framework, architecture, database, authentication, routes, roles, components and tests.
2. Locate and inspect all supplied NISR agricultural datasets and their metadata.
3. Identify what is implemented, incomplete, missing or broken.
4. Identify missing information, API access requirements, credentials and deployment dependencies.
5. Produce an implementation plan mapped to this specification.
6. Document risks and blockers.
7. Do not invent data, schema fields, credentials or provider capabilities.

After the audit, implement the roadmap stage by stage.

Important implementation requirements:

- Work directly in the existing codebase.
- Reuse existing components and infrastructure where appropriate.
- Build real backend functionality.
- Enforce RBAC on the backend.
- Keep NISR, NASA POWER, Meteo Rwanda and simulated data separate.
- Protect all secrets.
- Validate imported and externally retrieved data.
- Preserve source attribution and data quality.
- Build functional loading, empty, error and success states.
- Write and run tests.
- Keep the application runnable after each stage.
- Avoid unrelated rewrites.

At the end of every stage, report:

1. What was implemented.
2. Files created or modified.
3. Database changes or migrations.
4. APIs actually tested and their results.
5. Tests, linting and type checks completed.
6. Remaining limitations and blockers.
7. Any action required from the project owner.

Never claim that a feature is complete if it has not been tested.

**Begin with Stage 0: Repository and Dataset Audit.**