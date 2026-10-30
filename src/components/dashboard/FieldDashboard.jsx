import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, ClipboardList, CloudRain, MapPin, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ToneTag, investigationStatusLabel, investigationStatusTone } from "@/components/common/ToneTag";
import { EmptyState } from "@/components/common/EmptyState";
import { DashboardCard } from "./DashboardCard";
import { NewInvestigationDialog } from "@/components/investigations/NewInvestigationDialog";
import { WeatherContext } from "@/components/weather/WeatherContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllFollowUps, useInvestigations } from "@/hooks/useAgriRecords";
import { useAuth } from "@/lib/AuthContext";

const isOpen = (item) => !["completed", "cancelled"].includes(item.status);
const day = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
const urgency = (item, today) => {
  if (!isOpen(item)) return 5;
  if (day(item.due_date) && item.due_date < today) return 0;
  if (!item.assignee_email) return 1;
  if (item.status === "awaiting_evidence") return 2;
  if (item.priority === "elevated") return 3;
  return 4;
};
const nextStep = (item, today) => {
  if (!isOpen(item)) return "Review the outcome and any remaining follow-up.";
  if (day(item.due_date) && item.due_date < today) return "Past due — review the investigation and update its plan.";
  if (!item.assignee_email) return "Choose who is responsible for checking this finding.";
  if (item.status === "awaiting_evidence") return "Add the missing observations or source checks.";
  if (item.status === "open") return "Review the original question and start collecting evidence.";
  return "Record verified findings and agree the next action.";
};

export default function FieldDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const investigations = useInvestigations();
  const followUps = useAllFollowUps();
  const [filter, setFilter] = useState("attention");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const today = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 10); // Rwanda UTC+02, without DST.
  const items = investigations.data ?? [];
  const actions = followUps.data ?? [];
  const myEmail = (user?.email ?? "").toLowerCase();
  const mine = items.filter((item) => isOpen(item) && item.assignee_email?.toLowerCase() === myEmail);
  const unassigned = items.filter((item) => isOpen(item) && !item.assignee_email);
  const overdue = items.filter((item) => isOpen(item) && day(item.due_date) && item.due_date < today);
  const awaiting = items.filter((item) => isOpen(item) && item.status === "awaiting_evidence");
  const pendingActions = actions.filter((action) => ["pending", "in_progress"].includes(action.status));
  const overdueActions = pendingActions.filter((action) => day(action.due_date) && action.due_date < today);
  const filters = [
    { key: "attention", label: "Needs attention", count: [...new Set([...overdue, ...unassigned, ...awaiting].map(item => item.id))].length },
    { key: "mine", label: "Assigned to me", count: mine.length },
    { key: "unassigned", label: "Unassigned", count: unassigned.length },
    { key: "all", label: "All investigations", count: items.length },
  ];
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const selected = items.filter((item) => {
      if (filter === "attention" && !(overdue.some(row => row.id === item.id) || unassigned.some(row => row.id === item.id) || awaiting.some(row => row.id === item.id))) return false;
      if (filter === "mine" && !(isOpen(item) && item.assignee_email?.toLowerCase() === myEmail)) return false;
      if (filter === "unassigned" && !(isOpen(item) && !item.assignee_email)) return false;
      return !term || [item.title, item.reason, item.crop, item.district].some(value => String(value ?? "").toLowerCase().includes(term));
    });
    return selected.sort((a, b) => urgency(a, today) - urgency(b, today) || (a.due_date || "9999").localeCompare(b.due_date || "9999") || (b.updated_date || "").localeCompare(a.updated_date || ""));
  }, [items, filter, search, myEmail, today, overdue, unassigned, awaiting]);
  const orderedActions = [...pendingActions].sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999")).slice(0, 5);

  return <div className="space-y-6">
    <PageHeader eyebrow="Field operations" title="Turn findings into action"
      description="Know what needs checking, record what you found, and follow up until the next step is clear."
      actions={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4"/>Start an investigation</Button>} />

    <section aria-label="Field work at a glance" className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground">My active investigations</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{mine.length}</p>
        <button className="mt-2 text-xs font-medium text-primary underline" onClick={() => setFilter("mine")}>View assigned work</button>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground">Unassigned investigations</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{unassigned.length}</p>
        <button className="mt-2 text-xs font-medium text-primary underline" onClick={() => setFilter("unassigned")}>Review ownership</button>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs text-muted-foreground">Overdue work</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums">{overdue.length + overdueActions.length}</p>
        <p className="mt-2 text-xs text-muted-foreground">{overdue.length} investigations · {overdueActions.length} follow-ups</p>
      </div>
    </section>

    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-xs font-semibold text-foreground">How to move a finding forward</p>
      <ol className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-4">
        {[
          ["1", "Review the concern", "Read the original figures and reporting period."],
          ["2", "Check the evidence", "Record observations, gaps and source checks."],
          ["3", "Agree the next action", "Assign a responsible person and due date."],
          ["4", "Record the outcome", "State what was established and what is still unknown."],
        ].map(([number, label, description]) => <li key={number} className="flex gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{number}</span>
          <span><strong className="block text-foreground">{label}</strong><span className="mt-1 block leading-relaxed">{description}</span></span>
        </li>)}
      </ol>
    </div>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.8fr)]">
      <DashboardCard title="Investigation queue" subtitle="Start with work that is late, unassigned or waiting for evidence."
        action={<Button asChild size="sm" variant="outline"><Link to="/investigations">See all <ArrowRight className="ml-1.5 h-3.5 w-3.5"/></Link></Button>}>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter investigations">
          {filters.map(option => <Button key={option.key} size="sm" variant={filter === option.key ? "default" : "outline"} aria-pressed={filter === option.key} onClick={() => setFilter(option.key)}>
            {option.label} <span className="ml-1.5 tabular-nums opacity-70">{option.count}</span>
          </Button>)}
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input className="pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a crop, district or investigation" aria-label="Search the field investigation queue"/>
        </div>
        {investigations.error ? <p role="alert" className="mt-4 text-sm text-destructive">{investigations.error.message}</p>
          : investigations.isLoading ? <p role="status" className="mt-5 text-sm text-muted-foreground">Loading your field work…</p>
          : visible.length === 0 ? <EmptyState icon={ClipboardList} title={items.length ? "No matching investigations" : "No investigations yet"}
              description={items.length ? "Choose another filter to see active or completed work." : "Start by documenting a finding that needs verification."}
              action={<Button size="sm" onClick={() => setCreateOpen(true)}>Start an investigation</Button>} className="py-8"/>
          : <ul className="mt-4 divide-y">
              {visible.slice(0, 8).map(item => <li key={item.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <Link to="/investigations/$investigationId" params={{investigationId:item.id}} className="text-sm font-semibold hover:underline">{item.title}</Link>
                    <p className="mt-1 text-xs text-muted-foreground">{[item.district, item.crop, item.period].filter(Boolean).join(" · ") || "Scope needs confirmation"}</p>
                  </div>
                  <ToneTag tone={investigationStatusTone(item.status)}>{investigationStatusLabel(item.status)}</ToneTag>
                </div>
                <p className="mt-2 text-xs leading-relaxed">{nextStep(item, today)}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{item.assignee_name || "Not assigned"}{item.due_date ? " · Due " + item.due_date : " · No due date"}</span>
                  <Link to="/investigations/$investigationId" params={{investigationId:item.id}} className="inline-flex items-center font-medium text-primary hover:underline">Open case <ArrowRight className="ml-1 h-3.5 w-3.5"/></Link>
                </div>
              </li>)}
              {visible.length > 8 && <li className="pt-3 text-xs text-muted-foreground">Showing 8 of {visible.length} matches. <Link to="/investigations" className="font-semibold text-primary underline">Open the full list</Link></li>}
            </ul>}
      </DashboardCard>

      <div className="space-y-5">
        <DashboardCard title="Follow-up tasks" subtitle="Actions that someone has agreed to complete">
          {followUps.error ? <p role="alert" className="text-xs text-destructive">{followUps.error.message}</p>
            : followUps.isLoading ? <p className="text-xs text-muted-foreground">Loading actions…</p>
            : orderedActions.length ? <ul className="space-y-3">
                {orderedActions.map(action => <li key={action.id} className="rounded-lg border p-3">
                  <p className="text-xs font-semibold">{action.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{action.owner || "Owner not assigned"} · {action.due_date || "Due date not recorded"}</p>
                  {day(action.due_date) && action.due_date < today ? <p className="mt-1 flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5"/>Overdue</p> : null}
                  <Link to="/investigations/$investigationId" params={{investigationId:action.investigation_id}} className="mt-2 inline-flex items-center text-xs font-medium text-primary hover:underline">View investigation <ArrowRight className="ml-1 h-3 w-3"/></Link>
                </li>)}
              </ul>
            : <p className="text-xs leading-relaxed text-muted-foreground">No outstanding follow-up actions. Add one from an investigation when a next step is agreed.</p>}
        </DashboardCard>
        <DashboardCard title="Helpful evidence" subtitle="Use context, not assumptions">
          <div className="space-y-3 text-xs text-muted-foreground">
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary"/>Confirm the district, crop, period and original source before making a conclusion.</p>
            <p className="flex items-start gap-2"><CloudRain className="mt-0.5 h-4 w-4 shrink-0 text-primary"/>Weather can help explain context, but does not establish the cause of a change.</p>
            <Button asChild size="sm" variant="outline"><Link to="/weather">Explore weather & climate <ArrowRight className="ml-1 h-3.5 w-3.5"/></Link></Button>
            <button type="button" onClick={() => setShowWeather(value => !value)} aria-expanded={showWeather} className="block text-left text-xs font-medium text-primary underline">{showWeather ? "Hide" : "Load"} seasonal weather context</button>
          </div>
        </DashboardCard>
      </div>
    </div>
    {showWeather && <div aria-label="Seasonal weather context"><WeatherContext/></div>}
    <NewInvestigationDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={created => {
      queryClient.invalidateQueries({queryKey:["investigations"]});
      if (created?.id) navigate({to:"/investigations/$investigationId",params:{investigationId:created.id}});
    }}/>
  </div>;
}
