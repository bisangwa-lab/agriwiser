import { useMemo, useState } from "react";
import { useDistrictCropHistory } from "@/hooks/useAgriRecords";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToneTag } from "@/components/common/ToneTag";
import { Button } from "@/components/ui/button";
import { computeYield, toNumber } from "@/lib/metrics";
import { formatNumber } from "@/lib/format";
import { CheckCircle2, ChevronDown, ChevronUp, Database, ExternalLink, HelpCircle, Table } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PublishedEvidenceViewer({ district, crop, currentPeriod }) {
  const [expanded, setExpanded] = useState(false);
  const { data: rows = [], isLoading, error } = useDistrictCropHistory(district, crop);

  // Group by year and season
  const periods = useMemo(() => {
    if (!rows.length) return [];
    const map = new Map();

    for (const row of rows) {
      const year = Number(row.year);
      const season = row.season;
      if (!Number.isFinite(year) || !season) continue;
      const key = `${year} ${season}`;

      if (!map.has(key)) {
        map.set(key, {
          period: key,
          year,
          season,
          production: null,
          harvested_area: null,
          reported_yield: null,
          dataset_name: row.dataset_name || "NISR Seasonal Agriculture Survey",
          source_reference: row.source_reference || "",
          source_url: row.source_url || "",
          quality_status: row.quality_status || "verified",
        });
      }

      const entry = map.get(key);
      const val = toNumber(row.value);
      if (row.indicator === "production") entry.production = val;
      if (row.indicator === "harvested_area") entry.harvested_area = val;
      if (row.indicator === "reported_yield") entry.reported_yield = val;
      if (row.source_reference && !entry.source_reference) entry.source_reference = row.source_reference;
      if (row.source_url && !entry.source_url) entry.source_url = row.source_url;
      if (row.dataset_name && !entry.dataset_name) entry.dataset_name = row.dataset_name;
    }

    return [...map.values()]
      .map((entry) => ({
        ...entry,
        yield: computeYield(entry.production, entry.harvested_area),
      }))
      .sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return b.season.localeCompare(a.season);
      });
  }, [rows]);

  if (!district || !crop) {
    return (
      <Card className="panel border-0 shadow-none">
        <CardContent className="py-6 text-center text-xs text-muted-foreground">
          Select a district and crop in Step 1 to load matching published agricultural survey records.
        </CardContent>
      </Card>
    );
  }

  const displayedPeriods = expanded ? periods : periods.slice(0, 4);

  return (
    <Card className="panel border-0 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Table className="h-4 w-4 text-primary" aria-hidden />
            <div>
              <CardTitle className="text-base">Published agricultural statistics · {district} ({crop})</CardTitle>
              <CardDescription className="text-[12.5px]">
                Official survey figures from the National Institute of Statistics of Rwanda (NISR).
              </CardDescription>
            </div>
          </div>
          <ToneTag tone="primary">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            Official NISR records
          </ToneTag>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Loading published records for {district}…</p>
        ) : error ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            Could not load published agricultural records: {error.message}
          </div>
        ) : !periods.length ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-900 flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden />
            <div>
              <p className="font-semibold">Insufficient evidence in published records</p>
              <p className="mt-1 leading-relaxed">
                No official published agricultural observations are available for {crop} in {district}.
                Do not assume production is zero. Check historical publications in the Data Management library.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-muted/40 text-[11px] font-medium text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5">Reporting period</th>
                    <th className="px-3 py-2.5">Production (tonnes)</th>
                    <th className="px-3 py-2.5">Harvested area (ha)</th>
                    <th className="px-3 py-2.5">Derived yield (t/ha)</th>
                    <th className="px-3 py-2.5">Source reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {displayedPeriods.map((item) => {
                    const isTarget = currentPeriod && item.period.toLowerCase().includes(currentPeriod.toLowerCase());
                    return (
                      <tr
                        key={item.period}
                        className={`transition-colors ${isTarget ? "bg-accent/40 font-medium" : "hover:bg-muted/20"}`}
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          {item.period}
                          {isTarget && <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">Investigated</span>}
                        </td>
                        <td className="px-3 py-2">
                          {item.production !== null ? formatNumber(item.production) : <span className="text-muted-foreground italic">Not published</span>}
                        </td>
                        <td className="px-3 py-2">
                          {item.harvested_area !== null ? formatNumber(item.harvested_area) : <span className="text-muted-foreground italic">Not published</span>}
                        </td>
                        <td className="px-3 py-2">
                          {item.yield !== null ? (
                            <span>{item.yield.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground italic">Not calculable</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-muted-foreground max-w-[200px] truncate">
                          {item.source_url ? (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              {item.source_reference || item.dataset_name}
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            item.source_reference || item.dataset_name
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>
                Showing {displayedPeriods.length} of {periods.length} recorded seasons · Derived yield = production ÷ harvested area
              </span>
              <div className="flex items-center gap-2">
                {periods.length > 4 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setExpanded((prev) => !prev)}
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="mr-1 h-3 w-3" /> Show fewer seasons
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-1 h-3 w-3" /> Show all {periods.length} seasons
                      </>
                    )}
                  </Button>
                )}
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                  <Link to="/data-sources">
                    <Database className="mr-1 h-3 w-3" />
                    Open data catalogue
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
