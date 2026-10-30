import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appClient, usesAppData } from "@/api/appClient";
import { fetchAll } from "@/lib/fetch-all";
import { downloadCsv, toCsv } from "@/lib/csv";
import { sourceTableView, sourceColumnName } from "@/lib/source-table-view";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, Download, ExternalLink, Search } from "lucide-react";
import { SourceReports } from "./SourceReports";

const control = "h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-xs";
function TableSelect({ label, value, onChange, options }) {
  return <label className="min-w-0 space-y-1.5 text-xs text-muted-foreground"><span>{label}</span><select aria-label={label} className={control} value={value} onChange={event => onChange(event.target.value)}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

export function SourceTableLibrary({ trendSelection }) {
  const [year, setYear] = useState("all"), [topic, setTopic] = useState("all"), [family, setFamily] = useState("all");
  const [search, setSearch] = useState(""), [selection, setSelection] = useState(""), [rowSearch, setRowSearch] = useState("");
  const [page, setPage] = useState(0), [original, setOriginal] = useState(false);
  const catalogue = useQuery({ queryKey: ["source-table-index"], enabled: usesAppData,
    queryFn: () => fetchAll(appClient.entities.SourceTableIndex), staleTime: 120_000 });
  const all = catalogue.data ?? [];
  const matches = useMemo(() => all.filter(item =>
    (year === "all" || (year === "trend" ? item.year >= trendSelection.fromYear && item.year <= trendSelection.toYear : item.year === Number(year))) &&
    (topic === "all" || item.topic === topic) && (family === "all" || item.family === family) &&
    search.trim().toLowerCase().split(/\s+/).every(term => [item.name, item.sheet, item.dataset_name, item.topic].join(" ").toLowerCase().includes(term)))
    .sort((a, b) => b.year - a.year || a.dataset_name.localeCompare(b.dataset_name) || a.sheet.localeCompare(b.sheet, "en", { numeric: true })), [all, year, topic, family, search, trendSelection]);
  const selected = matches.find(item => item.id === selection) ?? matches[0];
  const detail = useQuery({ queryKey: ["source-table", selected?.id], enabled: usesAppData && Boolean(selected),
    queryFn: () => appClient.entities.SourceTable.get(selected.id), staleTime: 120_000 });
  const { rows, columns } = useMemo(() => sourceTableView(detail.data, { original, search: rowSearch }), [detail.data, original, rowSearch]);
  const lastPage = Math.max(0, Math.ceil(rows.length / 100) - 1), shownPage = Math.min(page, lastPage);
  const change = setter => value => { setter(value); setPage(0); };
  function reset() { setYear("all"); setTopic("all"); setFamily("all"); setSearch(""); setRowSearch(""); setSelection(""); setPage(0); }
  function exportTable() {
    const keys = Array.from({ length: detail.data.column_count }, (_, index) => sourceColumnName(index));
    const safe = value => typeof value === "string" && /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
    const values = rows.map(item => Object.fromEntries([["Source URL", selected.source_url], ["Source reference", selected.source_reference], ["Source row", item.row], ...keys.map((key, i) => [key, safe(item.cells[i])])]));
    downloadCsv(`agriwiser-${selected.id}.csv`, toCsv(values, ["Source URL", "Source reference", "Source row", ...keys]));
  }
  if (!usesAppData) return <DashboardCard title="Published tables & reports"><p className="text-sm text-muted-foreground">The worksheet catalogue is available with the local NISR collection. Connected crop observations remain available in Crop trends.</p></DashboardCard>;
  return <div id="published-tables" className="scroll-mt-24"><DashboardCard title="Published tables & reports" subtitle={`${all.length.toLocaleString("en-GB")} original worksheets · inputs, irrigation, livestock, households, land use and survey quality`}>
    <p className="mb-4 text-xs leading-relaxed text-muted-foreground">Find a topic, open a table, then search its rows. These filters apply to original publications; crop-trend filters stay in the other tab. Original headings, units and source coordinates remain visible.</p>
    <div className="mb-4 flex flex-wrap gap-2">{["Irrigation", "Fertilizer", "Livestock", "Household"].map(value => <Button key={value} size="sm" variant="outline" onClick={() => { reset(); setSearch(value); }}>{value}</Button>)}{trendSelection && <Button size="sm" variant="outline" onClick={() => change(setYear)("trend")}>Use trend years ({trendSelection.fromYear}–{trendSelection.toYear})</Button>}</div>
    <div className="grid gap-3 sm:grid-cols-3">
      <TableSelect label="Publication year" value={year} onChange={change(setYear)} options={[["all", "All publication years"], ...(trendSelection ? [["trend", `Trend years: ${trendSelection.fromYear}–${trendSelection.toYear}`]] : []), ...[...new Set(all.map(item => item.year))].sort((a, b) => b - a).map(value => [String(value), String(value)])]} />
      <TableSelect label="Survey family" value={family} onChange={change(setFamily)} options={[["all", "All surveys"], ["SAS", "Seasonal Agricultural Survey"], ["AHS", "Agricultural Household Survey"], ["CFSVA", "Food Security & Vulnerability Analysis"]]} />
      <TableSelect label="Table topic" value={topic} onChange={change(setTopic)} options={[["all", "All topics"], ...[...new Set(all.map(item => item.topic))].sort().map(value => [value, value])]} />
    </div>
    <div className="my-3 flex flex-wrap items-center gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden /><Input className="pl-9" aria-label="Search published tables" placeholder="Search a topic or table title" value={search} onChange={event => change(setSearch)(event.target.value)} /></div><Button variant="ghost" size="sm" onClick={reset}>Clear library filters</Button></div>
    {catalogue.isLoading ? <p role="status" className="py-6 text-sm">Loading published tables…</p> : catalogue.error ? <div role="alert"><p>The published catalogue could not be loaded.</p><Button variant="outline" size="sm" onClick={() => catalogue.refetch()}>Retry catalogue</Button></div> : !matches.length ? <p className="py-6 text-sm text-muted-foreground">No tables match. Clear the filters or try a broader topic.</p> : <>
      <TableSelect label={`Choose a published table (${matches.length} matches)`} value={selected.id} onChange={value => { setSelection(value); setPage(0); setRowSearch(""); }} options={matches.map(item => [item.id, `${item.dataset_name} · ${item.name}`])} />
      <div className="my-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><div className="flex min-w-0 items-center gap-2"><Database className="h-4 w-4 shrink-0" aria-hidden /><span className="break-words">{selected.source_reference}</span></div><a href={selected.publication_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">Original NISR publication<ExternalLink className="h-3 w-3" aria-hidden /></a></div>
      <div className="mb-3 flex flex-wrap items-center gap-3"><Input aria-label="Find a row in this table" className="sm:max-w-xs" placeholder="Find a district, crop or phrase" value={rowSearch} onChange={event => change(setRowSearch)(event.target.value)} />{trendSelection?.district !== "all" && trendSelection?.district && <Button size="sm" variant="outline" onClick={() => change(setRowSearch)(trendSelection.district)}>Find {trendSelection.district}</Button>}<label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={original} onChange={event => change(setOriginal)(event.target.checked)} />Original worksheet view</label><Button variant="outline" size="sm" onClick={exportTable} disabled={!rows.length || detail.isFetching || Boolean(detail.error)}><Download className="mr-2 h-3.5 w-3.5" aria-hidden />Export matching source rows</Button></div>
      <p className="mb-3 text-xs text-muted-foreground">Readable view hides empty rows and columns. Labels come from source cells in each column; merged headings and footnotes must be checked in the original worksheet. Search does not change the source coordinates.</p>
      {detail.error ? <div role="alert"><p>This table could not be loaded.</p><Button size="sm" variant="outline" onClick={() => detail.refetch()}>Retry table</Button></div> : detail.isLoading ? <p role="status" className="py-8 text-sm">Loading source cells…</p> : !rows.length ? <p className="py-8 text-sm">No rows match this search. Clear the row search to see headings and footnotes.</p> : <div className="max-h-[540px] overflow-auto rounded-lg border border-border"><table className="w-full border-collapse text-left text-xs"><caption className="sr-only">{selected.name}, original source rows and column coordinates</caption><thead className="sticky top-0 z-20 bg-muted"><tr><th className="border-b border-r px-3 py-3">Source row</th>{columns.map(column => <th className="min-w-[130px] max-w-[260px] border-b px-3 py-3 align-bottom" key={column.coordinate}><span className="block">{column.label}</span>{!original && <span className="font-normal text-muted-foreground">Column {column.coordinate}</span>}</th>)}</tr></thead><tbody>{rows.slice(shownPage * 100, (shownPage + 1) * 100).map(item => <tr key={item.row} className="border-b border-border/60 hover:bg-accent/30"><th className="bg-muted/40 px-3 py-2 text-muted-foreground">{item.row}</th>{columns.map((column, index) => <td key={column.coordinate} className={`${index === 0 ? "sticky left-0 z-10 bg-background font-medium " : ""}max-w-[360px] whitespace-normal break-words px-3 py-2 align-top`}>{item.cells[column.index] === null || item.cells[column.index] === undefined ? <span className="text-muted-foreground">—</span> : typeof item.cells[column.index] === "number" ? item.cells[column.index].toLocaleString("en-GB", { maximumFractionDigits: 6 }) : String(item.cells[column.index])}</td>)}</tr>)}</tbody></table></div>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{rows.length.toLocaleString("en-GB")} matching rows · export preserves numeric precision</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={shownPage === 0} onClick={() => setPage(shownPage - 1)}>Previous rows</Button><span>Page {shownPage + 1} of {lastPage + 1}</span><Button variant="outline" size="sm" disabled={shownPage >= lastPage} onClick={() => setPage(shownPage + 1)}>Next rows</Button></div></div>
    </>}
    <SourceReports />
  </DashboardCard></div>;
}
