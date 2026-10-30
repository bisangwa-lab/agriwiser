import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { appClient } from "@/api/appClient";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ToneTag } from "@/components/common/ToneTag";
import { formatNumber } from "@/lib/format";

export function SourceArchiveCatalogue() {
  const [archive, setArchive] = useState("");
  const [fileId, setFileId] = useState("");
  const [search, setSearch] = useState("");
  const { data: archives = [], error } = useQuery({
    queryKey: ["source-archives"],
    queryFn: async () => (await appClient.entities.SourceArchive.list({ sort: "-year", limit: 100 })).items,
    staleTime: 120_000,
  });
  const files = useQuery({ queryKey: ["survey-files", archive], enabled: Boolean(archive), staleTime: 120_000,
    queryFn: async () => (await appClient.entities.SurveyFile.filter({ archive }, { limit: 1000 })).items });
  const file = files.data?.find(item => item.id === fileId) ?? files.data?.[0];
  const variables = (file?.variables ?? []).filter(item => [item.name,item.label].join(" ").toLowerCase().includes(search.toLowerCase()));
  return <DashboardCard title="Your supplied survey archives" subtitle={archives.length + " archives · " + formatNumber(archives.reduce((sum, item) => sum + item.file_count, 0)) + " source files"} contentClassName="p-0">
    <p className="border-b border-border px-5 py-4 text-[12px] leading-relaxed text-muted-foreground">All supplied files are retained locally. Readable data dictionaries and sample-record counts are indexed below. Multiple formats can contain the same responses. Population charts use published NISR estimates; respondent rows are not published or summed as national totals.</p>
    {error && <p role="alert" className="p-5 text-sm text-destructive">The archive catalogue could not be loaded.</p>}
    <div className="max-h-[440px] overflow-auto"><table className="w-full min-w-[600px] text-left text-xs">
      <thead className="sticky top-0 bg-muted text-[10px] uppercase tracking-wide text-muted-foreground"><tr>{["Survey archive", "Year", "Files", "Formats", "Status"].map((label) => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-border/60">{archives.map((item) => <tr key={item.id}><td className="max-w-sm px-5 py-3 font-medium"><button className="text-left text-primary hover:underline" onClick={()=>{setArchive(item.name);setFileId("");setSearch("");}}>{item.name.replace("T1 Agriculture - ", "").replace(".zip", "")}</button></td><td className="num px-5 py-3">{item.year}</td><td className="num px-5 py-3">{item.file_count}</td><td className="px-5 py-3 uppercase text-muted-foreground">{item.formats.join(", ")}</td><td className="px-5 py-3"><ToneTag tone="outline">{item.profiled_files ?? 0} file schemas indexed</ToneTag></td></tr>)}</tbody>
    </table></div>
    {archive && <div className="space-y-3 border-t border-border p-5"><h3 className="text-sm font-semibold">Source data dictionary</h3><p className="break-words text-xs text-muted-foreground">{archive}</p>
      {files.isLoading ? <p className="text-xs">Loading file schemas…</p> : files.error ? <p role="alert" className="text-xs text-destructive">File schemas could not be loaded.</p> : <>
        <label className="block text-xs">Survey file<select aria-label="Survey file" className="mt-2 h-10 w-full rounded-lg border bg-background px-3 text-xs" value={file?.id ?? ""} onChange={event=>{setFileId(event.target.value);setSearch("");}}>{(files.data ?? []).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <p className="text-xs text-muted-foreground">{file?.row_count?.toLocaleString("en-GB") ?? "Unknown"} sample records · {file?.variables.length ?? 0} variables · {file?.status}{file?.error ? " · "+file.error : ""}. Sample sizes are not population totals.</p>
        <Input aria-label="Search survey variables" placeholder="Find a variable, crop, input, survey weight or geography" value={search} onChange={event=>setSearch(event.target.value)} />
        <div className="max-h-80 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">Variable</th><th className="p-2">Definition</th><th className="p-2">Type</th></tr></thead><tbody>{variables.map(item=><tr key={item.name} className="border-t"><td className="break-all p-2 font-mono">{item.name}</td><td className="p-2">{item.label}</td><td className="p-2">{item.type}</td></tr>)}</tbody></table></div>
      </>}
    </div>}
  </DashboardCard>;
}
