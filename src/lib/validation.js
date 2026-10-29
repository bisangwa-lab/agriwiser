import { ALL_INDICATORS, CROPS, CSV_REQUIRED_COLUMNS, DISTRICT_NAMES, INDICATORS, SEASONS } from "@/lib/constants";

/**
 * Validation for an uploaded agricultural table. Nothing is coerced: a value
 * that cannot be read as a number is rejected rather than becoming zero, a
 * missing value stays missing, and every rejected row says why.
 */

const EXPECTED_UNIT = {
  production: "metric tonnes",
  harvested_area: "hectares",
  rainfall_mm: "millimetres",
};

const SUSPICIOUS_LIMITS = {
  production: 6000000,
  harvested_area: 900000,
  rainfall_mm: 4000,
};

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function rowKey(row) {
  return [row.geography, row.crop, row.season, row.year, row.indicator].join("|").toLowerCase();
}

export function validateObservationRows(rawRows, { yearMin = 2000, yearMax = 2030 } = {}) {
  const accepted = [];
  const rejected = [];
  const warnings = [];
  const seen = new Set();
  const headers = rawRows.length ? Object.keys(rawRows[0]).map(normalizeHeader) : [];
  const missingColumns = CSV_REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

  if (missingColumns.length) {
    return {
      accepted,
      rejected,
      warnings,
      missingColumns,
      summary: {
        total: rawRows.length,
        accepted: 0,
        rejected: rawRows.length,
        warnings: 0,
        blocked: true,
      },
    };
  }

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2; // header is line 1
    const row = {};
    for (const [key, value] of Object.entries(raw)) row[normalizeHeader(key)] = typeof value === "string" ? value.trim() : value;

    const fail = (message) => rejected.push({ rowNumber, message, row });

    for (const column of CSV_REQUIRED_COLUMNS) {
      if (row[column] === undefined || row[column] === null || String(row[column]).length === 0) {
        return fail(`Missing required value for "${column}". Missing values are not treated as zero.`);
      }
    }

    const indicator = row.indicator;
    if (!ALL_INDICATORS.includes(indicator)) {
      return fail(`Unknown indicator "${indicator}". Expected one of: ${ALL_INDICATORS.join(", ")}.`);
    }

    if (indicator !== "rainfall_mm") {
      if (!CROPS.includes(row.crop)) return fail(`Unknown crop "${row.crop}".`);
    }

    if (!DISTRICT_NAMES.includes(row.geography)) {
      return fail(`Unknown district "${row.geography}".`);
    }

    if (!SEASONS.includes(row.season)) {
      return fail(`Unknown season "${row.season}". Expected: ${SEASONS.join(" or ")}.`);
    }

    const year = Number(row.year);
    if (!Number.isInteger(year)) return fail(`Year "${row.year}" is not a whole number.`);
    if (year < yearMin || year > yearMax) return fail(`Year ${year} is outside the expected range ${yearMin}–${yearMax}.`);

    const numericValue = Number(row.value);
    if (row.value === "" || Number.isNaN(numericValue)) {
      return fail(`Value "${row.value}" is not a number. It was not replaced with zero.`);
    }
    if (numericValue < 0) return fail(`Negative value ${numericValue} is not a valid ${INDICATORS[indicator].unit} figure.`);

    const expectedUnit = EXPECTED_UNIT[indicator];
    if (expectedUnit && row.unit && row.unit !== expectedUnit) {
      return fail(
        `Unexpected unit "${row.unit}" for ${indicator}. This indicator is recorded in ${expectedUnit}; convert the column before importing.`,
      );
    }

    const key = rowKey({ ...row, year });
    if (seen.has(key)) {
      const message = `Duplicate of an earlier row for ${row.geography} / ${row.crop ?? "rainfall"} / ${row.season} / ${year} / ${indicator}.`;
      warnings.push(`Row ${rowNumber}: ${message} The first occurrence was kept.`);
      return rejected.push({ rowNumber, message, row });
    }
    seen.add(key);

    const limit = SUSPICIOUS_LIMITS[indicator];
    if (limit && numericValue > limit) {
      warnings.push(
        `Row ${rowNumber}: ${numericValue} ${row.unit || expectedUnit} is far above the expected range for ${indicator}. Imported, but flagged for review.`,
      );
    }

    const value = {
      geography: row.geography,
      crop: indicator === "rainfall_mm" ? null : row.crop,
      season: row.season,
      year,
      period: `${year} ${row.season}`,
      indicator,
      value: numericValue,
      unit: row.unit || expectedUnit || "",
      observation_status: row.observation_status || "observed",
      domain: indicator === "rainfall_mm" ? "climate" : "crop",
      dataset_id: row.dataset_id || "",
      quality_flags: [],
      is_demo: false,
      source_row: rowNumber,
    };

    accepted.push(value);
  });

  return {
    accepted,
    rejected,
    warnings,
    missingColumns: [],
    summary: {
      total: rawRows.length,
      accepted: accepted.length,
      rejected: rejected.length,
      warnings: warnings.length,
      blocked: false,
    },
  };
}