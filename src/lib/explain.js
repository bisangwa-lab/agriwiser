import { INDICATORS, RULE_BY_ID } from "@/lib/constants";
import { formatNumber, NOT_AVAILABLE } from "@/lib/format";
import { NOT_CALCULABLE_TEXT, absoluteChange, percentageChange } from "@/lib/metrics";

/**
 * "Explain this change" — built from the real selected values, never from a
 * model. Every block states which figures were compared, which calculation was
 * used, where the data came from, what is uncertain, and what the data cannot
 * establish.
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
}) {
  const meta = INDICATORS[indicator] ?? INDICATORS.production;
  const rule = ruleId ? RULE_BY_ID[ruleId] : null;
  const absolute = absoluteChange(current, previous);
  const percent = percentageChange(current, previous);
  const digits = valueDigits ?? (meta.derived || indicator === "reported_yield" ? 2 : 0);

  const scope = [crop || "all crops", geography || "all districts", season || "both seasons"]
    .filter(Boolean)
    .join(" · ");

  const headline = percent.value === null
    ? `${meta.label} could not be compared between ${previousPeriod} and ${currentPeriod}.`
    : `${meta.label} ${percent.value >= 0 ? "increased" : "decreased"} by ${Math.abs(percent.value).toFixed(1)}% between ${previousPeriod} and ${currentPeriod} (${scope}).`;

  const blocks = [
    {
      title: "What changed",
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
      title: "The values and periods being compared",
      body: [
        `Current: ${formatNumber(current, digits)} ${meta.unitShort} — ${currentPeriod}`,
        `Previous: ${previous === null || previous === undefined ? NOT_AVAILABLE : `${formatNumber(previous, digits)} ${meta.unitShort}`} — ${previousPeriod}`,
        `Scope: ${scope}`,
      ].join("\n"),
    },
    {
      title: "The calculation used",
      body: calculationNote ?? (meta.derived
        ? "Yield = production (t) ÷ harvested area (ha). It is derived, never stored, and is only produced when both values exist for the same crop, district, period and unit, and harvested area is greater than zero. Absolute change = current − previous. Percentage change = ((current − previous) ÷ previous) × 100."
        : indicator === "reported_yield" ? "Published yield is read from one crop and one district, in kg/ha; rates are never summed. Absolute change = current − previous. Percentage change = ((current − previous) ÷ previous) × 100 with a non-zero baseline." : "Totals are summed from the approved observations for the selected crop, geography and period. Absolute change = current − previous. Percentage change = ((current − previous) ÷ previous) × 100, and is only produced when the previous value is present and not zero."),
    },
    {
      title: "Source dataset",
      body: dataset
        ? [
            [dataset.name, dataset.publisher].filter(Boolean).join(" — "),
            `Reporting period: ${dataset.reporting_period ?? "see the dataset record in Data sources"}.`,
            `Retrieved: ${dataset.retrieval_date ?? "not recorded"}.`,
            `Indicator definition: ${meta.definition}`,
          ].join(" ")
        : "No dataset is recorded for this figure. Open Data sources for dataset descriptions, units and limitations.",
    },
    {
      title: "Data-quality warnings",
      body:
        qualityFlags.length
          ? qualityFlags.join("\n")
          : coverage
            ? `${coverage.present} observations present of ${coverage.total} in scope${
                coverage.missing ? `; ${coverage.missing} missing and left missing` : ""
              }. No quality flags were raised on the contributing records.`
            : "No quality flags were raised on the contributing records.",
    },
    {
      title: "What this data can and cannot establish",
      body: [
        "It can establish: what was reported for each period, how large the difference is, and whether the required values are available for this calculation.",
        "It cannot establish: why the change happened. Reported changes can reflect weather, inputs, pests, prices, market access, measurement, reporting coverage or a revision to the source table.",
        "Correlation between two series — for example rainfall and production — is not evidence that one caused the other.",
      ].join("\n"),
    },
    {
      title: "Questions and evidence that would help",
      body: [
        "Was reporting coverage for this district and season the same in both periods?",
        "Did the source table change definition, unit, boundary or revision since the previous release?",
        "Does splitting production into harvested area and yield explain where the change sits?",
        "Is there seasonal rainfall, input, pest, price or extension evidence for the same district and season?",
        rule
          ? `Rule context: ${rule.id} version ${rule.version} flags a change at ${rule.thresholdReviewPct}% for review and ${rule.thresholdPriorityPct}% as priority. These thresholds are product rules, not official classifications.`
          : "These questions are prompts for review, not a diagnosis.",
      ].join("\n"),
    },
  ];

  return { headline, blocks, scope, meta };
}
