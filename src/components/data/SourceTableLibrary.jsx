import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44, isLocalAuth } from "@/api/base44Client";
import { fetchAll } from "@/lib/fetch-all";
import { downloadCsv, toCsv } from "@/lib/csv";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Database, Download, ExternalLink } from "lucide-react";
import { SourceReports } from "./SourceReports";

const columnName = index => {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + (n - 1) % 26) + name;
  return name;
};
const selectClass = "h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-xs";
function TableSelect({ label, value, onChange, options }) {
  return <label className="min-w-0 space-y-1.5 text-[11px] text-muted-foreground"><span>{label}</span><select aria-label={label} className={selectClass} value={value} onChange={e => onChange(e.target.value)}>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}

export function SourceTableLibrary() {
  const [year, setYear] = useState("all");
  const [topic, setTopic] = useState("all");
  const [family, setFamily] = useState("all");
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState("");
  const [rowSearch, setRowSearch] = useState("");
  const [page, setPage] = useState(0);
  const catalogue = useQuery({ queryKey: ["source-table-index"], enabled: isLocalAuth,
    queryFn: () => fetchAll(base44.entities.SourceTableIndex), staleTime: 120_000 });
  const all = catalogue.data ?? [];
  const matches = useMemo(() => all.filter(item => (year === "all" || item.year === Number(year)) && (topic === "all" || item.topic === topic) && (family === "all" || item.family === family) && [item.name, item.sheet, item.dataset_name].join(" ").toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a,b) => b.year-a.year || a.dataset_name.localeCompare(b.dataset_name) || a.sheet.localeCompare(b.sheet, "en", { numeric: true })), [all, year, topic, family, search]);
  const selected = matches.find(item => item.id === selection) ?? matches[0];
  const detail = useQuery({ queryKey: ["source-table", selected?.id], enabled: Boolean(selected),
    queryFn: () => base44.entities.SourceTable.get(selected.id), staleTime: 120_000 });
  const rows = (detail.data?.rows ?? []).map((cells,index) => ({ cells, row: index + 1 }))
    .filter(item => !rowSearch || item.cells.some(cell => String(cell ?? "").toLowerCase().includes(rowSearch.toLowerCase())));
  const columns = Array.from({ length: detail.data?.column_count ?? 0 }, (_,index) => columnName(index));
  const changeFilter = setter => value => { setter(value); setPage(0); setRowSearch(""); };
  const exportTable = () => {
    const text = value => typeof value === "string" && /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
    const values = rows.map(item => Object.fromEntries([["Source URL",selected.source_url],["Source reference",selected.source_reference],["Source row",item.row], ...columns.map((key,i) => [key,text(item.cells[i])]) ]));
    downloadCsv(`hingasmart-${selected.id}.csv`, toCsv(values, ["Source URL", "Source reference", "Source row", ...columns]));
  };
  if (!isLocalAuth) return null;
  return <div id="published-tables" className="scroll-mt-24"><DashboardCard title="Full published data library" subtitle={`${all.length.toLocaleString("en-GB")} source tables · crop statistics, inputs, practices, land use, households, livestock and survey quality`}>
    <p className="mb-4 text-xs leading-relaxed text-muted-foreground">Browse every populated worksheet in the imported NISR workbooks. Original units, headings, geographic levels, missing cells and source coordinates are retained. These tables include information beyond the crop charts.</p>
    <div className="grid gap-3 sm:grid-cols-3">
      <TableSelect label="Table year" value={year} onChange={changeFilter(setYear)} options={[["all","All available years"], ...[...new Set(all.map(item=>item.year))].sort((a,b)=>b-a).map(value=>[String(value),String(value)])]} />
      <TableSelect label="Survey family" value={family} onChange={changeFilter(setFamily)} options={[["all","All survey families"], ["SAS","Seasonal Agricultural Survey"], ["AHS","Agricultural Household Survey"], ["CFSVA","Food Security & Vulnerability Analysis"]]} />
      <TableSelect label="Table topic" value={topic} onChange={changeFilter(setTopic)} options={[["all","All topics"], ...[...new Set(all.map(item=>item.topic))].sort().map(value=>[value,value])]} />
    </div>
    <div className="my-3"><Input aria-label="Search published tables" placeholder="Search tables, for example irrigation, livestock or fertilizer" value={search} onChange={e=>changeFilter(setSearch)(e.target.value)} /></div>
    {catalogue.isLoading ? <p className="py-6 text-sm text-muted-foreground">Loading the published table catalogue…</p> : catalogue.error ? <p role="alert" className="text-sm text-destructive">The published table catalogue could not be loaded.</p> : !matches.length ? <p className="py-6 text-sm text-muted-foreground">No published tables match these filters.</p> : <>
      <TableSelect label={`Published table (${matches.length} available)`} value={selected.id} onChange={changeFilter(setSelection)} options={matches.map(item=>[item.id,`${item.dataset_name} · ${item.name}`])} />
      <div className="my-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground"><div className="flex min-w-0 items-center gap-2"><Database className="h-4 w-4 shrink-0" /><span className="break-words">{selected.source_reference}</span></div><a href={selected.publication_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">NISR publication<ExternalLink className="h-3 w-3" /></a></div>
      <div className="mb-3 flex flex-wrap gap-3"><Input aria-label="Find a row in this table" className="sm:max-w-xs" placeholder="Find a district, crop or other row" value={rowSearch} onChange={e=>{setRowSearch(e.target.value);setPage(0);}} /><Button variant="outline" size="sm" onClick={exportTable} disabled={!rows.length}><Download className="mr-2 h-3.5 w-3.5" />Export table CSV</Button></div>
      {detail.error ? <p role="alert" className="text-sm text-destructive">This source table could not be loaded.</p> : detail.isLoading ? <p className="py-8 text-sm text-muted-foreground">Loading source cells…</p> : <div className="max-h-[500px] overflow-auto rounded-lg border border-border"><table className="w-full border-collapse text-left text-[11px]"><thead className="sticky top-0 z-10 bg-muted"><tr><th className="border-b border-r border-border px-3 py-2">Row</th>{columns.map(key=><th className="min-w-[100px] border-b border-border px-3 py-2" key={key}>{key}</th>)}</tr></thead><tbody>{rows.slice(page*100,(page+1)*100).map(item=><tr key={item.row} className="border-b border-border/60 hover:bg-accent/30"><th className="bg-muted/40 px-3 py-2 text-muted-foreground">{item.row}</th>{columns.map((key,i)=><td key={key} className="max-w-[360px] whitespace-normal break-words px-3 py-2 align-top">{item.cells[i]===null || item.cells[i]===undefined ? <span className="text-muted-foreground/40">—</span> : typeof item.cells[i]==="number" ? item.cells[i].toLocaleString("en-GB",{maximumFractionDigits:6}) : String(item.cells[i])}</td>)}</tr>)}</tbody></table></div>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground"><span>{rows.length.toLocaleString("en-GB")} matching source rows · blank cells display as — · export retains source precision</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page===0} onClick={()=>setPage(value=>value-1)}>Previous</Button><span>Page {page+1} of {Math.max(1,Math.ceil(rows.length/100))}</span><Button variant="outline" size="sm" disabled={(page+1)*100>=rows.length} onClick={()=>setPage(value=>value+1)}>Next</Button></div></div>
    </>}
    <SourceReports />
  </DashboardCard></div>;
}
