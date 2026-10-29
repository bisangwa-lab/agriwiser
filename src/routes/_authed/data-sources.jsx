import { useEffect, useState } from "react";
import { WeatherIntegrationStatus } from '@/components/weather/WeatherIntegrationStatus';
import { createFileRoute } from "@tanstack/react-router";
import { requireWorkspace } from "@/lib/route-access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag } from "@/components/common/ToneTag";
import { DatasetCard } from "@/components/data/DatasetCard";
import { CsvImportPanel } from "@/components/data/CsvImportPanel";
import { DemoDataPanel } from "@/components/data/DemoDataPanel";
import { SourceArchiveCatalogue } from "@/components/data/SourceArchiveCatalogue";
import { SourceTableLibrary } from "@/components/data/SourceTableLibrary";
import { isLocalAuth } from "@/api/base44Client";
import { useDatasets } from "@/hooks/useAgriRecords";
import { useAuth } from "@/lib/AuthContext";
import { isAdmin } from "@/lib/roles";
import { INDICATORS } from "@/lib/constants";
import { Database, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authed/data-sources")({
  beforeLoad: requireWorkspace(["data_manager"]),
  head: () => ({ meta: [{ title: "Data sources · HingaSmart Rwanda" }] }),
  component: DataSourcesPage,
});

const EXPECTED_SOURCES = [
  {
    name: "NISR Seasonal Agricultural Survey (SAS) — data dictionary",
    url: "https://microdata.statistics.gov.rw/index.php/catalog/124/data-dictionary",
    note: "Primary candidate source for crop production, harvested area and yield by district and season.",
  },
  {
    name: "NISR Agriculture Household Survey 2024 — overview",
    url: "https://microdata.statistics.gov.rw/index.php/catalog/123/overview",
    note: "Household-level agricultural context, including inputs and livestock.",
  },
  {
    name: "NISR SAS 2024 — overview",
    url: "https://microdata.statistics.rw/index.php/catalog/113/overview",
    note: "Seasonal survey release notes, coverage and methodology.",
  },
  {
    name: "NASA POWER",
    url: "https://power.larc.nasa.gov/",
    note: "Gridded climate data used for the seasonal rainfall context series. Areal estimates, not station measurements.",
  },
];

function DataSourcesPage() {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const { data: datasets = [], isLoading, error, refetch } = useDatasets();
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    if (isLocalAuth) return;
    let cancelled = false;
    fetch("/api/demo-data")
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (!cancelled && result) setCounts(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data sources"
        title="Data sources and quality"
        description="Every dataset used here, with its publisher, period, coverage, units, method and known limitations. Nothing on this platform is presented as an official statistic unless the dataset record says so."
      />

      <WeatherIntegrationStatus />
      <Card className="panel border-0 shadow-none">
        <CardContent className="space-y-3 pt-5">
          <div className="flex flex-wrap items-center gap-2">
            <ToneTag tone="outline">{datasets.length} dataset records</ToneTag>
            {isLocalAuth ? <ToneTag tone="outline">{datasets.reduce((sum, item) => sum + (item.row_count ?? 0), 0).toLocaleString("en-GB")} published observations stored</ToneTag> : counts ? <ToneTag tone="outline">{counts.observations} observations stored</ToneTag> : null}
            {admin ? (
              <ToneTag tone="primary">
                <ShieldCheck className="h-3 w-3" aria-hidden />
                {isLocalAuth ? "Local data catalogue" : "Administrator: import and dataset management available"}
              </ToneTag>
            ) : (
              <ToneTag tone="neutral">Read-only view of datasets</ToneTag>
            )}
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {isLocalAuth ? "Published NISR tables feed the live dashboard. Source files, exact table references, units and limitations are retained. Original respondent microdata stays outside the published collections." : <>Access is enforced on the stored records, not by hiding buttons: only administrators can create,
            change or delete dataset and observation records, or import a file. Every account can read the
            approved indicators and their provenance.</>}
          </p>
        </CardContent>
      </Card>

      {error ? (
        <Card>
          <EmptyState icon={Database} title="Datasets could not be loaded" description={error.message} />
        </Card>
      ) : null}

      {isLoading ? (
        <p className="text-[13px] text-muted-foreground">Loading dataset records…</p>
      ) : datasets.length === 0 ? (
        <Card className="panel border-0 shadow-none">
          <EmptyState
            icon={Database}
            title="No dataset has been loaded yet"
            description={
              admin
                ? "Load the labelled demonstration dataset below, or import an approved file. Dataset descriptions, units and limitations are recorded before any value is shown."
                : "No dataset has been loaded yet. An administrator can load approved data; until then nothing is displayed as a statistic."
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {datasets.map((dataset) => (
            <DatasetCard key={dataset.id} dataset={dataset} />
          ))}
        </div>
      )}

      {admin && !isLocalAuth ? (
        <>
          <DemoDataPanel
            counts={counts}
            onLoaded={async (result) => {
              await refetch();
              const response = await fetch("/api/demo-data");
              if (response.ok) setCounts(await response.json());
              return result;
            }}
          />
          <CsvImportPanel
            datasets={datasets}
            onImported={async () => {
              await refetch();
              const response = await fetch("/api/demo-data");
              if (response.ok) setCounts(await response.json());
            }}
          />
        </>
      ) : null}

      <SourceTableLibrary />
      {isLocalAuth && admin && <SourceArchiveCatalogue />}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="panel border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Indicator definitions and units</CardTitle>
            <CardDescription className="text-[12.5px]">
              The canonical definitions used by every calculation on this platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.values(INDICATORS).map((meta) => (
              <div key={meta.key} className="rounded-lg border border-border/80 p-3">
                <p className="text-[13px] font-medium text-foreground">
                  {meta.label} <span className="font-normal text-muted-foreground">({meta.unit})</span>
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{meta.definition}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="panel border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Source catalogue to verify</CardTitle>
            <CardDescription className="text-[12.5px]">
              Candidate reference points. Before this platform is used operationally, the latest publication,
              exact table, definitions, terms of use and update cadence must be verified with the publisher.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {EXPECTED_SOURCES.map((source) => (
              <div key={source.name} className="rounded-lg border border-border/80 p-3">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] font-medium text-primary hover:underline"
                >
                  {source.name}
                </a>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{source.note}</p>
              </div>
            ))}
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              {isLocalAuth ? "All populated worksheets from the imported NISR workbooks are available in the published data library. Crop charts use district records with resolved geography, period and units. Availability varies by crop and season. The supplied survey files and their data dictionaries are indexed separately below." : "Until an official release is imported and its licence confirmed, the platform runs on the clearly labelled demonstration dataset and says so on every screen that shows a value."}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
