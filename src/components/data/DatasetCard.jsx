import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ToneTag } from "@/components/common/ToneTag";
import { DatasetDetailDialog } from "@/components/data/DatasetDetailDialog";
import { formatDate, formatNumber } from "@/lib/format";
import { INDICATORS } from "@/lib/constants";
import { ExternalLink, Info } from "lucide-react";

const QUALITY_TONE = { verified: "primary", provisional: "warning", demonstration: "info" };

/** One dataset description: what it is, who published it and what it cannot do. */
export function DatasetCard({ dataset }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="panel border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <ToneTag tone={QUALITY_TONE[dataset.quality_status] ?? "neutral"}>
                {dataset.quality_status === "demonstration"
                  ? "Demonstration"
                  : dataset.quality_status === "verified"
                    ? "Verified"
                    : "Provisional"}
              </ToneTag>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {dataset.geography_level || "Geography not stated"} · {dataset.version || "no version"}
              </span>
            </div>
            <CardTitle className="text-[15px] leading-snug">{dataset.name}</CardTitle>
            <p className="text-[12.5px] text-muted-foreground">{dataset.publisher}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            <Info className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Dataset detail
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <dl className="grid gap-x-6 gap-y-2 text-[12px] sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Reporting period</dt>
            <dd className="font-medium text-foreground">{dataset.reporting_period || "Not stated"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Coverage</dt>
            <dd className="font-medium text-foreground">{dataset.geographic_coverage || "Not stated"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Retrieved</dt>
            <dd className="font-medium text-foreground">{dataset.retrieval_date ? formatDate(dataset.retrieval_date) : "Not recorded"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Imported content</dt>
            <dd className="num font-medium text-foreground">
              {dataset.table_count ? `${formatNumber(dataset.table_count)} full source tables` : ""}
              {dataset.table_count ? <br /> : null}
              {dataset.row_count !== undefined ? `${formatNumber(dataset.row_count)} normalized crop measurements` : "Record count not recorded"}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          {(dataset.indicators ?? []).map((key) => (
            <ToneTag key={key} tone="outline">
              {INDICATORS[key]?.label ?? key}
            </ToneTag>
          ))}
        </div>

        {(dataset.quality_warnings ?? []).length ? (
          <ul className="space-y-1 rounded-lg border border-amber-300/70 bg-amber-50/70 p-3 text-[11.5px] leading-relaxed text-amber-900">
            {(dataset.quality_warnings ?? []).map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        ) : null}

        {dataset.source_url ? (
          <a
            href={dataset.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Source reference
          </a>
        ) : null}
      </CardContent>

      <DatasetDetailDialog dataset={dataset} open={open} onOpenChange={setOpen} />
    </Card>
  );
}
