# AgriWiser Current Product Guide

**Product:** Agricultural intelligence and decision support for Rwanda
**Primary user:** Agricultural analysts<br />
**Supporting users:** Policy makers, field teams, administrators and community-facing users
**Implementation reference:** Read alongside the source and the linked technical documents. Available data and permitted actions depend on the deployment and the signed-in user's current role.

## Product purpose

Agricultural analysts work with evidence that can differ by source, indicator, unit, geography, reporting period and quality. The analytical challenge is to compare only compatible data, keep its context attached, explain what a result supports, and carry a relevant finding into a brief or field-verification request.

AgriWiser supports that analyst task in one role-aware application. Its primary workflow is to discover agricultural evidence, check its provenance and limits, compare and investigate patterns, prepare a source-backed report, and request authorized field follow-up when appropriate. Policy makers use the resulting analysis; field teams record what they can verify. Community-facing and public-insight tools serve separate supporting purposes.

The system is designed to support decisions, not replace source verification or professional judgment. It makes the origin and status of information visible so users can distinguish published statistics, external estimates, demonstrations and model-generated scenarios.

## How the system works

1. **Select evidence.** Analysts choose from the datasets and periods available to the deployment. Views retain context such as source, indicator, unit, district, season and date.
2. **Check comparability.** The analysis tools preserve gaps and withhold calculations when source, unit, geography, period or definition does not support a valid comparison.
3. **Explore and interpret.** Analysts use charts, maps, comparisons, climate context, risk review, scenarios and research tools to examine the evidence. Outputs retain limitations and distinguish observed data from estimates and scenarios.
4. **Explain the finding.** Analysts prepare reports and exports from selected evidence with calculations and source context.
5. **Request field verification when warranted.** The server recomputes the risk assessment from current evidence. Authorized Field Operations staff then assign the case and record evidence, review and follow-up.

## Workspaces and capabilities

| Workspace | Main capabilities | Typical roles |
| --- | --- | --- |
| **Administration** | Account and system administration, data management, operational views and account settings. | Super administrator, data manager; exact actions are separately authorized. |
| **Analytics & Planning** | Agricultural overview, dataset exploration, comparisons, maps, planning tools, Agricultural Solutions, weather and climate, alerts, risk intelligence, Digital Twin scenarios, AI Agricultural Analyst, model governance and reports. | Agricultural analyst, policy maker. |
| **Field Operations** | Field operations dashboard, investigations, assignments, evidence, notes, review decisions and follow-up actions; weather and climate context is available as a separate analytical source. | Agricultural officer, field investigator, field supervisor. |
| **Community & Business** | Community agricultural information, season comparison, guidance, saved interests, Rwanda Agriculture Snapshot, Market Prices & Trends, and Directory & Services. | Farmer, cooperative, buyer, agribusiness. |
| **Public Insights** | English/Kinyarwanda USSD-menu simulator for previewing a basic-phone service. | Public viewer. |

Workspace navigation is a way to move between product areas, not a grant of access to every record or action. Server functions and database policies enforce permissions for protected operations. Super administrator access is separately controlled. See [Security and RBAC](SECURITY_AND_RBAC.md).

## Feature guide

### Agricultural data and community information

- **Overview and exploration:** Browse published agricultural observations and available indicators across crops, districts, seasons and years. Use charts, maps, filters and source context to examine the available evidence.
- **Compare:** Compare compatible crop, district, season and period selections. Production, area and yield are only combined or derived when definitions, units and source releases support the calculation.
- **Community & Business:** Review agriculture information, compare seasons, browse approved guidance and save personal crop or district interests. Saved interests are associated with the signed-in account.
- **Rwanda Agriculture Snapshot:** Review traceable published records using crop, district, season and measure filters. A snapshot is a view of available published data, not a claim about current farm conditions.

### Market Prices & Trends

The feature displays a minimized historical extract of Rwanda food-price observations from the World Food Programme Price Database distributed through HDX. Users can filter by commodity, unit, price type, time period, district and market, inspect mapped markets, and review monthly medians and record coverage.

The across-market trend is a median of reporting market records, not a national price. Markets can have different observation dates. Missing months stay missing; any visually bridged gaps or exploratory line projection are identified as estimates, not observations or validated forecasts. This feature is not connected to live eSoko prices and does not guarantee an offer. See [Price Data Sources](PRICE_DATA_SOURCES.md) for acquisition, filtering, dates, licensing context and interpretation.

### Directory & Services

The directory presents listed cooperatives and approved sourcing opportunities in the application. Listings are informational: users should confirm current membership, services, availability and commercial terms directly with the named organization. A listing is not a guarantee of inventory, buyer demand, eligibility or a completed transaction.

### USSD Simulator

The simulator previews a numbered phone-menu experience in English and Kinyarwanda. Example paths cover historical market-price references, published crop statistics, recent weather context, farmer-support information and practical next steps for common questions.

It is a user-interface demonstration. It places no phone call, does not connect to a telecom gateway, does not enroll a farmer, does not verify program eligibility, and does not submit a support request. Weather values are historical estimates rather than a forecast or a measurement on a user's farm. The simulator's available published-data paths require the configured sign-in and server access.

### Weather and climate

Weather views retrieve authorized source data and preserve provider identity, dates, spatial coverage, native resolution, units and missing values. District or grid estimates are not direct farm measurements. Climate comparisons describe statistical relationships and do not establish causal effects on production. Provider outages, coverage gaps and source limitations must remain visible. See [Weather](../WEATHER.md) and [Data Provenance](DATA_PROVENANCE.md).

### Risk intelligence and field follow-up

The risk engine evaluates available agricultural observations under documented comparison and data-quality rules. Signals can be reviewed in Analytics & Planning. When the current server-derived evidence supports a handoff, an authorized user can request a field investigation. The server validates the selected geography, crop and season, recomputes the assessment, and applies workflow authorization. Field workflows retain versioning, evidence references, audit history and review gates.

A risk signal is a prompt for review, not proof of an incident, explanation or cause. An investigation records what must be verified; it does not transform an estimate into an observed field fact. See [Risk Engine](RISK_ENGINE.md), [Intelligence Architecture](INTELLIGENCE_ARCHITECTURE.md), and the field workflow implementation guidance.

### Digital Twin, AI Analyst and reports

- **Digital Twin:** Runs deterministic what-if scenarios against a supported, traceable baseline. Results depend on the selected baseline and stated assumptions. They describe hypothetical outcomes, not forecasts or observed program effects.
- **AI Agricultural Analyst:** Answers agricultural research questions using the application's available evidence and registered research tools. Its outputs should be reviewed with their cited source context and limitations; they are not a substitute for official publications or expert review.
- **Reports and exports:** Assemble selected observations, calculations, explanations and provenance into report formats. The selected data scope and source context should be checked before external use.
- **Model governance:** Provides model and method information to support review of assumptions and appropriate use.

See [Digital Twin](DIGITAL_TWIN.md), [AI Agricultural Analyst](AI_AGRICULTURAL_ANALYST.md), [Model Governance](MODEL_GOVERNANCE.md), [Statistical Methods](STATISTICAL_METHODS.md) and [Data Provenance](DATA_PROVENANCE.md).

## Data interpretation rules

- A missing observation is unavailable, not zero.
- A reported zero remains distinct from a missing value.
- Units, geography, reporting period, season and source release matter when comparing values.
- Derived yield requires valid production and harvested-area inputs from compatible records.
- Published agricultural production is historical for its stated period; it is not current inventory, supply or demand.
- WFP prices are historical market observations; farmer-reported survey prices have a different source and meaning and must not be casually merged with them.
- Weather estimates preserve their source coverage and resolution and are not farm readings.
- A model scenario or statistical association is not an observed outcome or a causal explanation.
- Demonstration and sample content is labeled and kept distinct from official or live records.

The data inventory and method-specific references are listed in the [Project Documentation](PROJECT_DOCUMENTATION.md#reference-library).

## Architecture and trust boundaries

The application uses React 19, JavaScript/JSX, TanStack Start, Vite, Cloudflare Workers and Supabase. The UI communicates with authenticated server functions for protected operations. Server code verifies identity, reads current roles from `hingasmart_profiles`, checks permissions and validates bounded inputs before privileged database access. Row Level Security remains enabled, and private helper functions stay outside exposed schemas.

Supabase is the configured application backend. Local SQLite support is retained for offline development and migration testing. User data must be preserved when moving between those paths. Server secrets belong only in ignored server settings or hosting secrets; credentials, respondent-level files and backups must not enter source control or static assets.

`src/routes/__root.jsx` owns the document shell. Routes are file-based, and `src/routeTree.gen.ts` is generated output. Preserve the current SSR and plugin structure when changing the application.

## Operations and readiness

For local setup, quality checks, migration review and deployment, follow [the README](../README.md), [Supabase setup](../SUPABASE_SETUP.md) and [Integration Tests](INTEGRATION_TESTS.md). A successful lint, test run or build confirms only that local check; it does not prove that production credentials, external providers, deployed RLS policies or telecom integrations are configured.

The USSD simulator is not a live telecom integration. The market-price view is not a live eSoko connection. Deployment-specific datasets and permissions determine what a user can see. These are current product boundaries and should be updated when the corresponding integrations are actually established.
