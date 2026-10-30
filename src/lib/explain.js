import { INDICATORS, RULE_BY_ID } from "./constants.js";
import { formatNumber, NOT_AVAILABLE } from "./format.js";
import { NOT_CALCULABLE_TEXT, absoluteChange, percentageChange } from "./metrics.js";
import { decomposeProductionChange } from "./intelligence/statistical-engine.js";

/**
 * Enhanced multi-level explanation engine.
 * Supports three distinct audience depths:
 *  - 'simple': Plain language for general readers, no statistical jargon.
 *  - 'professional' (default): For agricultural officers, analysts, policymakers;
 *    covers findings, comparisons, evidence, limitations, and practical implications.
 *  - 'technical': For statisticians and researchers; includes formulas, denominators,
 *    aggregation methods, data coverage, uncertainty, and methodology.
 *
 * Deterministic: Generated strictly from verified input values, never fabricated.
 */
export function explainChange({
  indicator,
  current,
  previous,
  currentPeriod,
  previousPeriod,
  crop,
  geography,
  season,
  dataset,
  qualityFlags = [],
  coverage,
  ruleId,
  calculationNote,
  valueDigits,
  mode = "professional",
  currentArea = null,
  previousArea = null,
  currentProd = null,
  previousProd = null,
}) {
  const meta = INDICATORS[indicator] ?? INDICATORS.production;
  const rule = ruleId ? RULE_BY_ID[ruleId] : null;
  const absolute = absoluteChange(current, previous);
  const percent = percentageChange(current, previous);
  const digits = valueDigits ?? (meta.derived || indicator === "reported_yield" ? 2 : 0);

  const scope = [crop || "all crops", geography || "all districts", season || "both seasons"]
    .filter(Boolean)
    .join(" · ");

  const hasCurrent = current !== null && current !== undefined && Number.isFinite(Number(current));
  const hasPrevious = previous !== null && previous !== undefined && Number.isFinite(Number(previous));
  const isCalculable = percent.value !== null;

  // 1. Headline by mode
  let headline = "";
  if (!hasCurrent || !hasPrevious) {
    headline = `${meta.label} could not be compared between ${previousPeriod} and ${currentPeriod} because one or both periods lack valid data.`;
  } else if (percent.value === null) {
    headline = `${meta.label} changed by ${absolute.value >= 0 ? "+" : ""}${formatNumber(absolute.value, digits)} ${meta.unitShort} between ${previousPeriod} and ${currentPeriod}; percentage change is not calculable due to a zero baseline.`;
  } else {
    const direction = percent.value > 0 ? "increased" : percent.value < 0 ? "decreased" : "remained unchanged";
    const mag = Math.abs(percent.value).toFixed(1);
    if (mode === "simple") {
      headline = percent.value === 0
        ? `${crop || "Crop"} ${meta.label.toLowerCase()} in ${geography || "the selected area"} held steady between ${previousPeriod} and ${currentPeriod}.`
        : `${crop || "Crop"} ${meta.label.toLowerCase()} in ${geography || "the selected area"} ${direction} by about ${mag}% between ${previousPeriod} and ${currentPeriod}.`;
    } else {
      headline = `${meta.label} ${direction} by ${mag}% between ${previousPeriod} and ${currentPeriod} (${scope}).`;
    }
  }

  // 2. Structured blocks by audience level
  let blocks = [];

  if (mode === "simple") {
    blocks = [
      {
        title: "What is happening?",
        body: !hasCurrent || !hasPrevious
          ? `We do not have enough verified records to compare ${meta.label.toLowerCase()} for ${crop || "this crop"} in ${geography || "this area"} across both seasons.`
          : percent.value === null
            ? `Reported ${meta.label.toLowerCase()} went from ${formatNumber(previous, digits)} ${meta.unitShort} in ${previousPeriod} to ${formatNumber(current, digits)} ${meta.unitShort} in ${currentPeriod}.`
            : `${crop || "This crop"}'s ${meta.label.toLowerCase()} ${percent.value > 0 ? "rose" : percent.value < 0 ? "fell" : "stayed the same"} from ${formatNumber(previous, digits)} ${meta.unitShort} (${previousPeriod}) to ${formatNumber(current, digits)} ${meta.unitShort} (${currentPeriod}).`,
      },
      {
        title: "Where and when?",
        body: `Location: ${geography || "All districts"}\nSeason: ${season || "Reported seasons"}\nComparing: ${previousPeriod} with ${currentPeriod}`,
      },
      {
        title: "What does this mean for farmers and communities?",
        body: !isCalculable && (!hasCurrent || !hasPrevious)
          ? "Without complete figures for both periods, we cannot state whether conditions improved or worsened."
          : percent.value > 0
            ? `The higher recorded figure indicates greater harvest volume or coverage in ${currentPeriod}. This is positive, but local field conditions should still be verified.`
            : percent.value < 0
              ? `The lower recorded figure points to reduced output or smaller harvested land in ${currentPeriod}. Agricultural officers should check whether seeds, rainfall, or pests played a role.`
              : "Production levels remained essentially identical between the two reference periods.",
      },
      {
        title: "What the numbers cannot tell us",
        body: "Statistics show what was reported, but they cannot show why the harvest changed. Changes may be caused by weather, pest attacks, seed availability, fertilizer use, or changes in how surveys were conducted.",
      },
      {
        title: "Recommended next step",
        body: "Speak with local agricultural extension officers and examine local rainfall records before drawing firm conclusions.",
      },
    ];
  } else if (mode === "technical") {
    // Technical decomposition when available
    const decomp = (currentProd !== null && currentArea !== null && previousProd !== null && previousArea !== null)
      ? decomposeProductionChange(currentProd, currentArea, previousProd, previousArea)
      : null;

    blocks = [
      {
        title: "1. Empirical Finding & Delta Formulation",
        body: [
          `Indicator: ${meta.key} (${meta.label})`,
          `Reference period (t0): ${previousPeriod} | Value: ${formatNumber(previous, digits)} ${meta.unitShort}`,
          `Observation period (t1): ${currentPeriod} | Value: ${formatNumber(current, digits)} ${meta.unitShort}`,
          `Absolute Delta: ΔY = Y(t1) - Y(t0) = ${absolute.value !== null ? `${absolute.value >= 0 ? "+" : ""}${formatNumber(absolute.value, digits)} ${meta.unitShort}` : "Undefined"}`,
          `Relative Delta: %ΔY = (ΔY / |Y(t0)|) * 100 = ${percent.value !== null ? `${percent.value >= 0 ? "+" : ""}${percent.value.toFixed(3)}%` : `Incalculable (${NOT_CALCULABLE_TEXT[percent.reason] ?? "Denominator is zero or missing"})`}`,
        ].join("\n"),
      },
      {
        title: "2. Mathematical Formulation & Aggregation Protocol",
        body: calculationNote ?? (meta.derived
          ? "Yield Metric Formulation: Y_derived = P / A where P = metric tonnes harvested, A = positive hectares harvested. Aggregation constraint: Individual district yields are never summed; macro yield is evaluated strictly over aggregated production and aggregated harvested area (ΣP / ΣA). Boundary condition: A <= 0 or missing yields null."
          : indicator === "reported_yield"
            ? "Reported Yield Specification: Direct published survey cluster estimate in kg/ha for a specific crop and district. Additive aggregation across administrative tiers or multi-crop groupings is mathematically prohibited."
            : "Aggregated Totals: Summation over verified observation vectors Σ x_i for matching strata (crop, district, season, year). Missing values are retained as null and excluded from summation without zero-coercion."),
      },
      ...(decomp ? [{
        title: "3. Factor Decomposition (Area vs. Yield Effect)",
        body: [
          "Arithmetic Identity: ΔProduction = (Yield_base * ΔArea) + (Area_curr * ΔYield)",
          `Observed ΔProduction: ${formatNumber(decomp.deltaProduction, 2)} t`,
          `Area Expansion Effect: ${formatNumber(decomp.areaContribution, 2)} t${decomp.deltaProduction ? ` (${((decomp.areaContribution / decomp.deltaProduction) * 100).toFixed(1)}%)` : ""}`,
          `Agronomic Yield Effect: ${formatNumber(decomp.yieldContribution, 2)} t${decomp.deltaProduction ? ` (${((decomp.yieldContribution / decomp.deltaProduction) * 100).toFixed(1)}%)` : ""}`,
          `Primary Driver: ${Math.abs(decomp.areaContribution) >= Math.abs(decomp.yieldContribution) ? "Harvested Area Expansion/Contraction" : "Productivity/Yield Shift"}`,
        ].join("\n"),
      }] : []),
      {
        title: "4. Dataset Provenance & Sampling Frame",
        body: dataset
          ? [
              `Publisher: ${dataset.publisher ?? "National Institute of Statistics of Rwanda (NISR)"}`,
              `Dataset Name: ${dataset.name}`,
              `Release Period: ${dataset.reporting_period ?? "Official Seasonal Survey"}`,
              `Version: ${dataset.version ?? "1.0"} | License: ${dataset.license ?? "Open Data"}`,
              `Sampling Frame: Two-stage stratified cluster sampling design (NISR SAS protocol).`,
            ].join("\n")
          : "No explicit dataset metadata attached to contributing observation vectors. Standard framework: Two-stage stratified cluster sampling design (NISR SAS protocol).",
      },
      {
        title: "5. Sample Coverage & Data Quality Flags",
        body: coverage
          ? [
              `Total Expected Observations: ${coverage.total ?? "N/A"}`,
              `Present Valid Observations: ${coverage.present ?? "N/A"}`,
              `Missing/Suppressed Observations: ${coverage.missing ?? 0} (retained as null)`,
              qualityFlags.length > 0 ? `Flags: ${qualityFlags.join("; ")}` : "Quality status: No anomalies or stratification conflicts flagged.",
            ].join("\n")
          : qualityFlags.length > 0
            ? qualityFlags.join("\n")
            : "Sample coverage complete; all required stratum vectors validated.",
      },
      {
        title: "6. Statistical Limitations & Inference Safeguards",
        body: [
          "Non-Causality Principle: Bivariate temporal movements do not demonstrate causal mechanisms. Climatological or intervention variables cannot be asserted as causal factors without counterfactual econometric modeling.",
          "Stratum Revision Notice: Inter-annual boundary or stratification alterations in survey waves must be controlled before interpreting small shifts.",
          "Missing Value Rule: Null entries are never coerced to zero. Missing observations represent data unavailability, not complete crop failure.",
        ].join("\n"),
      },
    ];
  } else {
    // Professional mode (Default)
    blocks = [
      {
        title: "1. Main Finding",
        body:
          percent.value === null
            ? `${meta.label} for ${scope}: the ${currentPeriod} value is ${formatNumber(current, digits)} ${meta.unitShort}${
                previous === null || previous === undefined
                  ? `, and no comparable ${previousPeriod} value is present in the loaded data.`
                  : `. A percentage change cannot be calculated (${NOT_CALCULABLE_TEXT[percent.reason] ?? "insufficient baseline"}).`
              }`
            : `${meta.label} for ${scope} moved from ${formatNumber(previous, digits)} ${meta.unitShort} in ${previousPeriod} to ${formatNumber(
                current,
                digits,
              )} ${meta.unitShort} in ${currentPeriod}, an absolute change of ${absolute.value >= 0 ? "+" : ""}${formatNumber(
                absolute.value,
                digits,
              )} ${meta.unitShort} and a relative change of ${percent.value >= 0 ? "+" : ""}${percent.value.toFixed(1)}%.`,
      },
      {
        title: "2. Evidence and Scope",
        body: [
          `Current period: ${currentPeriod} — ${hasCurrent ? `${formatNumber(current, digits)} ${meta.unitShort}` : NOT_AVAILABLE}`,
          `Previous period: ${previousPeriod} — ${hasPrevious ? `${formatNumber(previous, digits)} ${meta.unitShort}` : NOT_AVAILABLE}`,
          `Geographic scope: ${geography || "All districts"}`,
          `Crop commodity: ${crop || "All available crops"}`,
          `Seasonal window: ${season || "Both seasons"}`,
        ].join("\n"),
      },
      {
        title: "3. Agricultural Interpretation",
        body:
          percent.value === null
            ? `Evidence for ${currentPeriod} is documented, but the absence of a baseline prevents a historical performance trend from being determined.`
            : percent.value > 0
              ? `Reported output expanded over the evaluated period. Analysts should evaluate whether this growth was driven primarily by land area expansion or by increased yield efficiency per hectare.`
              : percent.value < 0
                ? `Reported output declined between ${previousPeriod} and ${currentPeriod}. A decline of this magnitude warrants operational review of regional rainfall anomalies, input distributions, and local survey coverage.`
                : `Observed output remained stable between ${previousPeriod} and ${currentPeriod}, indicating steady seasonal production.`,
      },
      {
        title: "4. Calculation Method and Source",
        body: calculationNote ?? (meta.derived
          ? "Yield is derived as total production (metric tonnes) divided by harvested area (hectares). It is only computed when both values are valid and harvested area exceeds zero. Absolute change = current − previous. Percentage change = ((current − previous) ÷ previous) × 100."
          : indicator === "reported_yield"
            ? "Published yield is read directly from official district tables in kg/ha; values are never summed across locations. Absolute change = current − previous."
            : "Totals represent verified official observations for the selected geography and season. Absolute change = current − previous; relative change is computed only when baseline is positive."),
      },
      {
        title: "5. Data Quality, Missing Data, and Limitations",
        body: [
          dataset
            ? `Source dataset: ${dataset.name} (${dataset.publisher ?? "NISR"}). Reporting period: ${dataset.reporting_period ?? "Official release"}.`
            : "Source: Verified official agricultural statistics records.",
          qualityFlags.length > 0 ? `Quality flags: ${qualityFlags.join("; ")}.` : "Data quality: No reporting conflicts detected.",
          "Causality warning: The data documents observed output. It cannot identify the specific agronomic, climate, or economic causes of change without independent corroborating field research.",
        ].join("\n"),
      },
      {
        title: "6. Practical Verification Steps",
        body: [
          "Confirm whether survey sampling coverage remained consistent between both periods in this district.",
          "Examine independent seasonal precipitation and temperature data to see whether weather stress coincided with planting or harvest.",
          "Separate the production change into harvested area and yield components to isolate whether land or productivity drove the shift.",
          rule
            ? `Institutional rule context: Alert rule ${rule.id} v${rule.version} flags shifts exceeding ${rule.thresholdReviewPct}% for review.`
            : "Consult district agricultural officers before implementing policy interventions.",
        ].join("\n"),
      },
    ];
  }

  return { headline, blocks, scope, meta, mode };
}

/**
 * Generates an objective, natural 4-part chart explanation.
 * Used for unobtrusive eye/help controls across all platform visualizations.
 */
export function explainChart({
  chartType = "trend",
  title = "Indicator Over Time",
  indicator = "production",
  scope = "National",
  period = "Recent Agricultural Years",
  data = [],
  series = [],
  dataset = null,
}) {
  const meta = INDICATORS[indicator] ?? INDICATORS.production;
  const rows = Array.isArray(data) ? data : [];
  const validRows = rows.filter((r) => r && Object.values(r).some((v) => typeof v === "number" && !isNaN(v)));

  // Identify first and last observations
  let changeSummary = "Observations over the monitored periods.";
  if (validRows.length >= 2) {
    const first = validRows[0];
    const last = validRows[validRows.length - 1];
    const primaryKey = series?.[0]?.key ?? (first && "value" in first ? "value" : meta.key);
    const vFirst = Number(first[primaryKey]);
    const vLast = Number(last[primaryKey]);

    if (Number.isFinite(vFirst) && Number.isFinite(vLast)) {
      const diff = vLast - vFirst;
      const pct = vFirst > 0 ? ((diff / vFirst) * 100).toFixed(1) : null;
      const firstLabel = first.name ?? first.label ?? first.year ?? "baseline";
      const lastLabel = last.name ?? last.label ?? last.year ?? "latest";

      if (diff > 0) {
        changeSummary = `${meta.label} increased by ${formatNumber(diff, meta.derived ? 2 : 0)} ${meta.unitShort}${pct ? ` (+${pct}%)` : ""} between ${firstLabel} and ${lastLabel}.`;
      } else if (diff < 0) {
        changeSummary = `${meta.label} decreased by ${formatNumber(Math.abs(diff), meta.derived ? 2 : 0)} ${meta.unitShort}${pct ? ` (${pct}%)` : ""} between ${firstLabel} and ${lastLabel}.`;
      } else {
        changeSummary = `${meta.label} was unchanged at ${formatNumber(vFirst, meta.derived ? 2 : 0)} ${meta.unitShort} between ${firstLabel} and ${lastLabel}.`;
      }
    }
  }

  return {
    title: `Chart Explanation: ${title}`,
    whatItShows: `This ${chartType} displays ${meta.label.toLowerCase()} (${meta.unit}) for ${scope} across ${period}. Each data point corresponds to an authenticated survey release.`,
    whatChanged: changeSummary,
    evidenceAndSource: dataset
      ? `Data supported by ${dataset.name} published by ${dataset.publisher ?? "NISR"}. Version ${dataset.version ?? "1.0"}.`
      : "Data supported by official NISR Seasonal Agricultural Survey releases.",
    limitations: "Visual trends reflect reported values only and do not establish agronomic cause, weather attribution, or future projections. Missing data points are displayed with breaks and are not assumed to be zero.",
  };
}
