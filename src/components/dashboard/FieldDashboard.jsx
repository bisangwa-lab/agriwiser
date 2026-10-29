import { Link } from "@tanstack/react-router";
import { WeatherContext } from '@/components/weather/WeatherContext';
import { useEffect, useState } from "react";
import { ClipboardCheck, ClipboardList, Clock3, Flag, MapPin, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag, investigationStatusLabel, investigationStatusTone } from "@/components/common/ToneTag";
import { DashboardCard, DashboardLink } from "./DashboardCard";
import { DistributionChart } from "./DistributionChart";
import { useAllFollowUps, useInvestigations } from "@/hooks/useAgriRecords";
import { useAuth } from "@/lib/AuthContext";

export default function FieldDashboard() {
  const { user } = useAuth();
  const investigations = useInvestigations();
  const followUps = useAllFollowUps();
  const [today, setToday] = useState(null);
  useEffect(() => { setToday(new Date()); }, []);
  const all = investigations.data ?? [];
  const actions = followUps.data ?? [];
  const mine = all.filter((item) => item.assignee_email?.toLowerCase() === user?.email?.toLowerCase());
  const inProgress = all.filter((item) => item.status === "open" || item.status === "in_progress");
  const awaiting = all.filter((item) => item.status === "awaiting_evidence");
  const completed = all.filter((item) => item.status === "completed");
  const openActions = actions.filter((item) => item.status === "pending" || item.status === "in_progress");
  const dateOf = (value) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value + (value.length === 10 ? "T23:59:59+02:00" : "")) : null;
  const dueSoon = openActions.filter((item) => today && dateOf(item.due_date) !== null && dateOf(item.due_date) >= today.getTime() && dateOf(item.due_date) - today.getTime() <= 7 * 86400000);
  const overdue = openActions.filter((item) => today && dateOf(item.due_date) !== null && dateOf(item.due_date) < today.getTime());
  const recent = [...all].sort((a, b) => (b.updated_date ?? "").localeCompare(a.updated_date ?? "")).slice(0, 8);

  return <div className="space-y-5">
    <PageHeader eyebrow="Panel 3 · Field operations" title="Field operations overview" description="A clear view of assigned work, evidence to collect and actions due next."
      actions={<Button asChild size="sm" className="gap-2 text-xs"><Link to="/investigations"><ClipboardList className="h-3.5 w-3.5" aria-hidden />Open investigations</Link></Button>} />
    <section aria-label="Workload" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Assigned to me" value={mine.length} icon={ClipboardList} footnote="Matched to your account" />
      <StatCard label="In progress" value={inProgress.length} icon={ClipboardCheck} footnote="Open or being investigated" />
      <StatCard label="Awaiting evidence" value={awaiting.length} icon={Flag} footnote="Further evidence is needed" />
      <StatCard label="Actions due soon" value={dueSoon.length} icon={Clock3} footnote="Within the next seven days" />
      <StatCard label="Overdue actions" value={overdue.length} icon={TriangleAlert} footnote="Past due and still open" />
    </section>
    <WeatherContext />
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <DashboardCard title="Investigation queue" subtitle="Recently updated records you are authorized to view" action={<DashboardLink to="/investigations">View all</DashboardLink>} contentClassName="p-0">
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-[12px]">
            <thead className="border-b border-border/70 bg-muted/35 text-[10px] uppercase tracking-wider text-muted-foreground"><tr>{["Investigation", "Location", "Assigned to", "Status"].map((title) => <th key={title} className="px-5 py-3 font-medium">{title}</th>)}</tr></thead>
            <tbody className="divide-y divide-border/60">{recent.map((item) => <tr key={item.id} className="hover:bg-muted/25">
              <td className="max-w-[280px] px-5 py-4"><Link to="/investigations/$investigationId" params={{ investigationId: item.id }} className="font-medium hover:text-primary hover:underline">{item.title}</Link><p className="mt-1 text-[10.5px] text-muted-foreground">{item.crop ?? "Crop not recorded"} · {item.period ?? "Period not recorded"}</p></td>
              <td className="px-5 py-4 text-muted-foreground">{item.district ?? "Not recorded"}</td><td className="px-5 py-4 text-muted-foreground">{item.assignee_name || "Unassigned"}</td><td className="px-5 py-4"><ToneTag tone={investigationStatusTone(item.status)}>{investigationStatusLabel(item.status)}</ToneTag></td>
            </tr>)}</tbody>
          </table></div>
          {!recent.length && <EmptyState icon={ClipboardList} title="No investigations in your queue" description="Authorized tasks will appear here with their question, location, assignee and current status." className="py-14" />}
        </DashboardCard>
        <DashboardCard title="Upcoming follow-up actions" subtitle="Keep evidence collection moving">
          {dueSoon.length ? <ul className="divide-y divide-border/60">{dueSoon.slice(0, 5).map((item) => <li key={item.id} className="flex items-center justify-between gap-3 py-3"><span className="text-[12px] font-medium">{item.title}</span><span className="whitespace-nowrap text-[11px] text-muted-foreground">{item.due_date}</span></li>)}</ul>
            : <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-4"><Clock3 className="mt-0.5 h-5 w-5 text-primary" aria-hidden /><div><p className="text-[12px] font-medium">No actions due in the next seven days</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Actions with a recorded due date will be listed here.</p></div></div>}
        </DashboardCard>
      </div>
      <div className="space-y-5">
        <DashboardCard title="Investigation status" subtitle="Across your visible records">
          <DistributionChart rows={[{ name: "Open / in progress", value: inProgress.length }, { name: "Awaiting evidence", value: awaiting.length }, { name: "Completed", value: completed.length }, { name: "Other", value: all.length - inProgress.length - awaiting.length - completed.length }]} unit="investigations" />
        </DashboardCard>
        <DashboardCard title="Before your next visit" subtitle="Keep findings traceable">
          <ol className="space-y-4">{["Read the original question and evidence.", "Confirm the location, crop and reporting period.", "Record what you observed and what remains unknown.", "Submit findings through the investigation workspace."].map((text, index) => <li key={text} className="flex gap-2.5 text-[11.5px] leading-relaxed text-muted-foreground"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-primary">{index + 1}</span>{text}</li>)}</ol>
          <p className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-[10.5px] text-muted-foreground"><MapPin className="h-3 w-3" aria-hidden />An unusual value is a signal to check, not a diagnosis.</p>
        </DashboardCard>
      </div>
    </div>
  </div>;
}
