import { ExternalLink } from "lucide-react";

export function SourcePublications({ sources = [] }) {
  if (!sources.length) return null;
  return <div className="rounded-xl border border-border/80 bg-card px-5 py-4">
    <h2 className="text-[12px] font-semibold">Source publications</h2>
    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">{sources.map((source) => <a key={source.id} href={source.publication_url ?? source.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline">{source.name}<ExternalLink className="h-3 w-3" aria-hidden /></a>)}</div>
    <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">All available crop categories and subtypes are selectable. Totals exclude overlapping subtypes. Coverage varies by crop, year, season and measure; it describes available source cells, not survey confidence.</p>
  </div>;
}
