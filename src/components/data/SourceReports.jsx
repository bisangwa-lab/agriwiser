import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appClient, usesAppData } from "@/api/appClient";
import { fetchAll } from "@/lib/fetch-all";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SourceReports() {
  const [open,setOpen]=useState(false),[reportId,setReportId]=useState(""),[query,setQuery]=useState(""),[page,setPage]=useState(0);
  const reports=useQuery({queryKey:["source-reports"],enabled:usesAppData&&open,queryFn:async()=> (await fetchAll(appClient.entities.SourceReportIndex)).sort((a,b)=>b.year-a.year||a.family.localeCompare(b.family)||a.name.localeCompare(b.name)),staleTime:120_000});
  const selected=reports.data?.find(item=>item.id===reportId)??reports.data?.[0];
  const content=useQuery({queryKey:["source-report-pages",selected?.id],enabled:Boolean(selected)&&open,queryFn:()=>fetchAll(appClient.entities.SourceReportPage,{report_id:selected.id}),staleTime:120_000});
  const pages=(content.data??[]).filter(item=>item.text.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.page-b.page);
  const current=pages[page];
  return <details className="mt-6 rounded-xl border border-border p-4" open={open} onToggle={event=>setOpen(event.currentTarget.open)}><summary className="cursor-pointer text-sm font-semibold">Published reports & methodology, including food security</summary>
    {open&&<div className="mt-4 space-y-3"><p className="text-xs leading-relaxed text-muted-foreground">Search full report text alongside the tables. Open the original PDF to inspect charts, maps, table layout and footnotes. Text extraction does not create district measurements.</p>
      {reports.error||content.error?<p role="alert" className="text-xs text-destructive">The report library could not be loaded.</p>:reports.isLoading?<p className="text-xs">Loading report catalogue…</p>:<>
        <label className="block text-xs">Published report<select aria-label="Published report" className="mt-2 h-10 w-full rounded-lg border bg-background px-3" value={selected?.id??""} onChange={event=>{setReportId(event.target.value);setPage(0);setQuery("");}}>{(reports.data??[]).map(item=><option key={item.id} value={item.id}>{item.family} {item.year} · {item.name}</option>)}</select></label>
        {selected&&<p className="text-xs text-muted-foreground">{reports.data?.length} reports · {selected.page_count} PDF pages · <a className="text-primary underline" target="_blank" rel="noreferrer" href={selected.source_url}>Open original NISR PDF</a></p>}
        <Input aria-label="Search report text" placeholder="Find a district, crop, food security indicator or methodology" value={query} onChange={event=>{setQuery(event.target.value);setPage(0);}} />
        {content.isLoading?<p className="text-xs">Loading report pages…</p>:current?<><p className="text-xs text-muted-foreground">PDF page {current.page} · {pages.length} matching pages · <a href={current.source_url} className="text-primary underline" target="_blank" rel="noreferrer">View this PDF page</a></p><pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/35 p-4 font-sans text-xs leading-relaxed">{current.text||"No extractable text on this page. Open the original PDF."}</pre><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page===0} onClick={()=>setPage(value=>value-1)}>Previous PDF page</Button><Button size="sm" variant="outline" disabled={page+1>=pages.length} onClick={()=>setPage(value=>value+1)}>Next PDF page</Button></div></>:<p className="text-xs text-muted-foreground">No report pages match this search.</p>}
      </>}
    </div>}
  </details>;
}
