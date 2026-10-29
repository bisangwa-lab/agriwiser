// Formatting helpers. Explicit locale and time zone so values render identically
// everywhere and never shift with the viewer's clock.

const LOCALE = "en-US";
const TIME_ZONE = "UTC";

export const NOT_AVAILABLE = "—";

export function isNumber(value) {
  return value !== null && value !== undefined && value !== "" && !Number.isNaN(Number(value));
}

export function formatNumber(value, digits = 0) {
  if (!isNumber(value)) return NOT_AVAILABLE;
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value));
}

export function formatValue(value, unitShort, digits = 0) {
  const formatted = formatNumber(value, digits);
  return formatted === NOT_AVAILABLE ? NOT_AVAILABLE : `${formatted} ${unitShort}`;
}

export function formatSignedPercent(value, digits = 1) {
  if (!isNumber(value)) return NOT_AVAILABLE;
  const n = Number(value);
  const sign = n > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n)}%`;
}

export function formatDateTime(value) {
  if (!value) return NOT_AVAILABLE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NOT_AVAILABLE;
  return `${date.toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  })} ${date.toLocaleTimeString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  })}`;
}

export function formatDate(value) {
  if (!value) return NOT_AVAILABLE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NOT_AVAILABLE;
  return date.toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  });
}

export function formatPeriod(period) {
  if (!period) return NOT_AVAILABLE;
  return String(period).replace(/^(\d{4})\s+(Season [ABC])$/, "$1 $2");
}

/** Deterministic display string for a period key: "2024 Season A" → "2024 Season A". */
export function periodKey(year, season) {
  return `${year} ${season}`;
}

export function parsePeriod(value) {
  const match = String(value ?? "").match(/^(\d{4})\s+(.+)$/);
  if (!match) return { year: null, season: null };
  return { year: Number(match[1]), season: match[2] };
}

export function titleCase(value) {
  if (!value) return NOT_AVAILABLE;
  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function truncate(value, max = 140) {
  const text = String(value ?? "");
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}