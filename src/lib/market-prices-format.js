export function formatPrice(value, currency = "RWF", unit = "") {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Price unavailable";
  const amount = new Intl.NumberFormat("en-RW", { maximumFractionDigits: 2 }).format(Number(value));
  return `${currency} ${amount}${unit ? ` / ${unit}` : ""}`;
}

export function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
