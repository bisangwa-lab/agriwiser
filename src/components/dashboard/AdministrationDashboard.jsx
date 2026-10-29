import { Link } from "@tanstack/react-router";
import { WeatherIntegrationStatus } from '@/components/weather/WeatherIntegrationStatus';
import { Database, FileUp, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag } from "@/components/common/ToneTag";
import { DashboardCard, DashboardLink } from "./DashboardCard";
import { DistributionChart } from "./DistributionChart";
import { useDatasets, useImportLogs } from "@/hooks/useAgriRecords";
import { useAuth } from "@/lib/AuthContext";
import { normalizeRole, roleLabel } from "@/lib/rbac";
import { isLocalAuth } from "@/api/base44Client";
import { formatNumber } from "@/lib/format";

const IMPORT_STATUS = { completed: { tone: "primary", label: "Completed" }, completed_with_warnings: { tone: "warning", label: "Review needed" }, failed: { tone: "danger", label: "Failed" } };
const dateLabel = (value) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString("en-GB", { timeZone: "Africa/Johannesburg", day: "numeric", month: "short", year: "numeric" }) : "Not recorded";

export default function AdministrationDashboard() {
  const { user } = useAuth();
  const datasets = useDatasets();
  const imports = useImportLogs();
  const ds = datasets.data ?? [];
  const logs = imports.data ?? [];
  const provisional = ds.filter((item) => item.quality_status === "provisional").length;
  const verified = ds.filter((item) => item.quality_status === "verified").length;
  const demonstration = ds.filter((item) => item.quality_status === "demonstration").length;
  const missingSources = ds.filter((item) => !item.source_url).length;
  const importsForReview = logs.filter((item) => item.status === "completed_with_warnings" || item.status === "failed").length;
  const warnings = logs.reduce((sum, item) => sum + (item.warning_count ?? 0), 0);
  const superAdmin = normalizeRole(user) === "super_admin";
  const sourceCoverage = ds.length ? Math.round((ds.length - missingSources) / ds.length * 100) : null;

  return <div className="space-y-5">
    <PageHeader eyebrow="Panel 1 · Administration" title="Administration overview" description="Keep agricultural data organized, traceable and ready for review."
      actions={<Button asChild size="sm" className="gap-2 text-xs"><Link to="/data-sources"><Database className="h-3.5 w-3.5" aria-hidden />Dataset catalogue</Link></Button>} />
    {(datasets.error || imports.error) && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Some administration records could not be loaded. Counts may be unavailable.</p>}
    <section aria-label="Data operations" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Registered datasets" value={datasets.error ? undefined : ds.length} icon={Database} footnote="Descriptions in the catalogue" />
      <StatCard label="Needing attention" value={datasets.error ? undefined : provisional} icon={TriangleAlert} footnote="Provisional datasets to review" />
      <StatCard label="Missing source metadata" value={datasets.error ? undefined : missingSources} icon={FileUp} footnote="No source URL recorded" />
      <StatCard label="Imports needing review" value={imports.error ? undefined : importsForReview} icon={FileUp} footnote="Warnings or failed imports" />
      <StatCard label="Validation warnings" value={imports.error ? undefined : warnings} icon={ShieldCheck} footnote="Across recorded imports" />
    </section>
    <WeatherIntegrationStatus />
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <DashboardCard title="Recent imports" subtitle="Track what was received and what needs checking" action={<DashboardLink to="/data-sources">View catalogue</DashboardLink>} contentClassName="p-0">
          <div className="overflow-x-auto"><table className="w-full min-w-[550px] text-left text-[12px]">
            <thead className="border-b border-border/70 bg-muted/35 text-[10px] uppercase tracking-wider text-muted-foreground"><tr>{["File", "Imported rows", "Warnings", "Completed", "Status"].map((title) => <th className="px-5 py-3 font-medium" key={title}>{title}</th>)}</tr></thead>
            <tbody className="divide-y divide-border/60">{logs.slice(0, 8).map((log) => {
              const status = IMPORT_STATUS[log.status] ?? { tone: "neutral", label: log.status ?? "Unknown" };
              return <tr key={log.id} className="hover:bg-muted/25"><td className="max-w-[240px] px-5 py-4 font-medium">{log.file_name || "Untitled import"}</td><td className="num px-5 py-4">{formatNumber(log.imported_rows ?? 0)}</td><td className="num px-5 py-4 text-muted-foreground">{formatNumber(log.warning_count ?? 0)}</td><td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{dateLabel(log.completed_date)}</td><td className="px-5 py-4"><ToneTag tone={status.tone}>{status.label}</ToneTag></td></tr>;
            })}</tbody>
          </table></div>
          {!logs.length && <EmptyState icon={FileUp} title="Your import history starts here" description="Recorded imports will show their validation outcome, warnings and completion date." className="py-14" />}
        </DashboardCard>
        <DashboardCard title="Source readiness" subtitle="A successful upload is only the beginning">
          <div className="grid gap-5 sm:grid-cols-[1fr_auto]"><div><p className="text-[12px] leading-relaxed text-muted-foreground">Sources, periods, units and geographic coverage should be checked before a dataset is used in an analysis.</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">{sourceCoverage !== null && <div className="h-full rounded-full bg-primary" style={{ width: sourceCoverage + "%" }} />}</div>
            <p className="mt-2 text-[11px] text-muted-foreground">{sourceCoverage === null ? "No datasets available to assess." : sourceCoverage + "% of datasets have a source URL. This does not establish data validity."}</p>
          </div><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary"><ShieldCheck className="h-6 w-6" aria-hidden /></span></div>
        </DashboardCard>
      </div>
      <div className="space-y-5">
        <DashboardCard title="Dataset quality" subtitle="Catalogue status, not an impact measure">
          <DistributionChart rows={[{ name: "Verified", value: verified }, { name: "Provisional", value: provisional }, { name: "Demonstration", value: demonstration }, { name: "Other / unclassified", value: ds.length - verified - provisional - demonstration }]} unit="datasets" />
        </DashboardCard>
        <DashboardCard title="Account access" subtitle="Your assigned responsibilities" action={<Users className="h-4 w-4 text-primary" aria-hidden />}>
          <ToneTag tone="primary">{roleLabel(user)}</ToneTag>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">{isLocalAuth
            ? "Local accounts are stored on this computer. The person managing it assigns roles; account management from this panel is planned."
            : superAdmin ? "Manage account roles in the Base44 workspace under App Users. Use the panel switcher for oversight." : "Look after datasets and data quality within your assigned permissions."}</p>
          <div className="mt-4 border-t border-border/70 pt-3"><DashboardLink to="/settings">Account settings</DashboardLink></div>
        </DashboardCard>
      </div>
    </div>
  </div>;
}
