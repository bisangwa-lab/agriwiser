export function sourceColumnName(index) {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name;
  return name;
}

/** Labels use only cells in that column. Never guess merged headings. */
export function sourceTableView(table, { original = false, search = "" } = {}) {
  const source = table?.rows ?? [];
  const populated = value => value !== null && value !== undefined && String(value).trim() !== "";
  const firstData = source.findIndex(cells => {
    const numbers = cells.filter(value => typeof value === "number");
    return numbers.length > 0 && numbers.some(value => value < 1900 || value > 2100) && cells.some(value => typeof value === "string" && value.trim());
  });
  const headings = firstData < 0 ? [] : source.slice(Math.max(0, firstData - 6), firstData);
  const columns = Array.from({ length: table?.column_count ?? 0 }, (_, index) => {
    const parts = [...new Set(headings.map(row => row[index]).filter(value => populated(value) && !/^\s*(table|figure)\s*\d/i.test(String(value))).map(String))];
    const coordinate = sourceColumnName(index);
    return { index, coordinate, label: original ? coordinate : parts.slice(-3).join(" · ") || `Column ${coordinate}` };
  }).filter(column => original || source.some(row => populated(row[column.index])));
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = source.map((cells, index) => ({ cells, row: index + 1 })).filter(item => {
    if (!original && !item.cells.some(populated)) return false;
    const text = item.cells.map(value => String(value ?? "")).join(" ").toLowerCase();
    return terms.every(term => text.includes(term));
  });
  return { columns, rows, headingRows: headings, firstData };
}
