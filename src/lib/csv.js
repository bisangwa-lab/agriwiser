import { CSV_TEMPLATE_HEADER } from "@/lib/constants";

/** Minimal RFC 4180 style CSV reader: handles quoted fields and escaped quotes. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const input = String(text ?? "").replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (char === "\r") continue;
    field += char;
  }
  row.push(field);
  rows.push(row);

  const nonEmpty = rows.filter((line) => line.some((value) => String(value).trim() !== ""));
  if (!nonEmpty.length) return { headers: [], rows: [] };

  const headers = nonEmpty[0].map((header) => String(header).trim());
  const records = nonEmpty.slice(1).map((line) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = line[index] === undefined ? "" : String(line[index]).trim();
    });
    return record;
  });

  return { headers, rows: records };
}

function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows, columns) {
  const keys = columns ?? Object.keys(rows[0] ?? {});
  const lines = [keys.join(",")];
  for (const row of rows) lines.push(keys.map((key) => escapeCell(row[key])).join(","));
  return lines.join("\n");
}

/** Export helper used by every table on the reports and explore screens. */
export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function templateCsv() {
  return `${CSV_TEMPLATE_HEADER}\nHuye,Maize,Season A,2024,production,18420,metric tonnes,observed,ds-demo-crop-production`;
}