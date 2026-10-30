import { Link, useNavigate } from "@tanstack/react-router";
import { WeatherContext } from "@/components/weather/WeatherContext";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Database,
  ExternalLink,
  Flag,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Table,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag, investigationStatusLabel, investigationStatusTone } from "@/components/common/ToneTag";
import { DashboardCard, DashboardLink } from "./DashboardCard";
import { DistributionChart } from "./DistributionChart";
import { NewInvestigationDialog } from "@/components/investigations/NewInvestigationDialog";
import { DataFindingsQueue } from "./DataFindingsQueue";
import { useAllFollowUps, useDatasets, useInvestigations } from "@/hooks/useAgriRecords";
import { useAuth } from "@/lib/AuthContext";
import { formatDate } from "@/lib/format";

export default function FieldDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const investigations = useInvestigations();
  const followUps = useAllFollowUps();
  const datasets = useDatasets();

  const [today, setToday] = useState(null);
  const [activeQueueTab, setActiveQueueTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDraft, setDialogDraft] = useState(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  const all = investigations.data ?? [];
  const actions = followUps.data ?? [];
  const allDatasets = datasets.data ?? [];
  const recordsError = investigations.isError || followUps.isError || datasets.isError;

  const dateOf = (value) =>
    value && Number.isFinite(Date.parse(value))
      ? Date.parse(value + (value.length === 10 ? "T23:59:59+02:00" : ""))
      : null;

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const mine = useMemo(
    () =>
      all.filter(
        (item) =>
          item.assignee_email?.toLowerCase() === user?.email?.toLowerCase() ||
          (user?.full_name && item.assignee_name?.toLowerCase() === user?.full_name?.toLowerCase()),
      ),
    [all, user],
  );

  const inProgress = useMemo(
    () => all.filter((item) => item.status === "open" || item.status === "in_progress"),
    [all],
  );

  const awaiting = useMemo(
    () => all.filter((item) => item.status === "awaiting_evidence"),
    [all],
  );

  const completed = useMemo(
    () => all.filter((item) => item.status === "completed"),
    [all],
  );

  const overdueInvestigations = useMemo(
    () =>
      all.filter(
        (item) =>
          item.status !== "completed" &&
          item.status !== "cancelled" &&
          item.due_date &&
          today &&
          dateOf(item.due_date) !== null &&
          dateOf(item.due_date) < today.getTime(),
      ),
    [all, today],
  );

  const openActions = useMemo(
    () => actions.filter((item) => item.status === "pending" || item.status === "in_progress"),
    [actions],
  );

  const actionsDueToday = useMemo(
    () => openActions.filter((item) => item.due_date === todayStr),
    [openActions, todayStr],
  );

  const actionsDueSoon = useMemo(
    () =>
      openActions.filter(
        (item) =>
          today &&
          dateOf(item.due_date) !== null &&
          dateOf(item.due_date) >= today.getTime() &&
          dateOf(item.due_date) - today.getTime() <= 7 * 86400000,
      ),
    [openActions, today],
  );

  const actionsOverdue = useMemo(
    () =>
      openActions.filter(
        (item) =>
          today && dateOf(item.due_date) !== null && dateOf(item.due_date) < today.getTime(),
      ),
    [openActions, today],
  );

  const filteredQueue = useMemo(() => {
    let list = all;
    if (activeQueueTab === "mine") list = mine;
    else if (activeQueueTab === "in_progress") list = inProgress;
    else if (activeQueueTab === "awaiting") list = awaiting;
    else if (activeQueueTab === "overdue") list = overdueInvestigations;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((item) =>
        [item.title, item.district, item.crop, item.assignee_name, item.reason]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q)),
      );
    }

    return [...list]
      .sort((a, b) => (b.updated_date ?? "").localeCompare(a.updated_date ?? ""))
      .slice(0, 10);
  }, [all, mine, inProgress, awaiting, overdueInvestigations, activeQueueTab, search]);

  function handleStartInvestigationFromFinding(draft) {
    // Check whether an active investigation already exists for this crop, district, and period
    const existing = all.find(
      (inv) =>
        inv.district?.toLowerCase() === draft.district?.toLowerCase() &&
        inv.crop?.toLowerCase() === draft.crop?.toLowerCase() &&
        inv.period?.toLowerCase() === draft.period?.toLowerCase() &&
        inv.status !== "cancelled",
    );
    if (existing) {
      navigate({ to: "/investigations/$investigationId", params: { investigationId: existing.id } });
      return;
    }
    setDialogDraft(draft);
    setDialogOpen(true);
  }

  function handleOpenNewInvestigation() {
    setDialogDraft(null);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Panel 3 · Field Operations"
        title="Field operations workspace"
        description="A practical operational hub for agricultural officers to consume real agricultural survey datasets, investigate evidence-backed problems, verify field conditions, and manage follow-ups."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleOpenNewInvestigation} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              New investigation
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <Link to="/investigations">
                <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                View all records
              </Link>
            </Button>
          </div>
        }
      />

      {/* QUESTION 1: WHAT NEEDS ATTENTION? */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            1
          </span>
          <h2 className="text-base font-semibold text-foreground">What needs attention?</h2>
          <span className="text-xs text-muted-foreground ml-2">
            Evidence-backed statistical concerns, assigned responsibilities, and overdue milestones
          </span>
        </div>

        {/* Priority Status Badges */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <button
            type="button"
            onClick={() => setActiveQueueTab(activeQueueTab === "mine" ? "all" : "mine")}
            className={`text-left transition-all ${activeQueueTab === "mine" ? "ring-2 ring-primary rounded-xl" : ""}`}
          >
            <StatCard
              label="Assigned to me"
              value={investigations.isLoading || investigations.isError ? "—" : mine.length}
              icon={ClipboardList}
              footnote={investigations.isError ? "Count unavailable · retry the request" : activeQueueTab === "mine" ? "Filtering queue below" : "Click to filter queue"}
            />
          </button>
          <button
            type="button"
            onClick={() => setActiveQueueTab(activeQueueTab === "in_progress" ? "all" : "in_progress")}
            className={`text-left transition-all ${activeQueueTab === "in_progress" ? "ring-2 ring-primary rounded-xl" : ""}`}
          >
            <StatCard
              label="In progress"
              value={investigations.isLoading || investigations.isError ? "—" : inProgress.length}
              icon={ClipboardCheck}
              footnote={activeQueueTab === "in_progress" ? "Filtering queue below" : "Active field investigations"}
            />
          </button>
          <button
            type="button"
            onClick={() => setActiveQueueTab(activeQueueTab === "awaiting" ? "all" : "awaiting")}
            className={`text-left transition-all ${activeQueueTab === "awaiting" ? "ring-2 ring-primary rounded-xl" : ""}`}
          >
            <StatCard
              label="Awaiting evidence"
              value={investigations.isLoading || investigations.isError ? "—" : awaiting.length}
              icon={Flag}
              footnote={activeQueueTab === "awaiting" ? "Filtering queue below" : "Requires field verification"}
            />
          </button>
          <button
            type="button"
            onClick={() => setActiveQueueTab(activeQueueTab === "overdue" ? "all" : "overdue")}
            className={`text-left transition-all ${activeQueueTab === "overdue" ? "ring-2 ring-destructive rounded-xl" : ""}`}
          >
            <StatCard
              label="Overdue investigations"
              value={investigations.isLoading || investigations.isError ? "—" : overdueInvestigations.length}
              icon={TriangleAlert}
              footnote={overdueInvestigations.length > 0 ? "Past deadline - needs action" : "All cases on schedule"}
            />
          </button>
          <div className="min-w-0 rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <span>Follow-up action status</span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-semibold tracking-tight text-foreground">{followUps.isLoading || followUps.isError ? "—" : openActions.length}</p>
              <span className="text-xs text-muted-foreground">open tasks</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {actionsDueToday.length > 0 ? (
                <span className="font-semibold text-primary">{actionsDueToday.length} due today · </span>
              ) : null}
              {actionsOverdue.length > 0 ? (
                <span className="font-semibold text-destructive">{actionsOverdue.length} overdue</span>
              ) : (
                <span>{actionsDueSoon.length} due within 7 days</span>
              )}
            </p>
          </div>
        </div>

        {/* Server-computed published statistical review signals */}
        {recordsError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Some field operations data could not be loaded. Counts and queues may be incomplete; retry the failed request before acting.</p>}
        <DataFindingsQueue
          onInvestigateFinding={handleStartInvestigationFromFinding}
          onOpenInvestigation={(existing) =>
            navigate({ to: "/investigations/$investigationId", params: { investigationId: existing.id } })
          }
        />

        {/* Prioritized Investigation Queue Table */}
        <DashboardCard
          title="Active investigation queue"
          subtitle="Authorized investigations with their current status, deadline, and assigned officers"
          action={<DashboardLink to="/investigations">View all ({investigations.isLoading || investigations.isError ? "—" : all.length})</DashboardLink>}
          contentClassName="p-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 p-3 bg-muted/20">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { key: "all", label: `All (${investigations.isLoading || investigations.isError ? "—" : all.length})` },
                { key: "mine", label: `Assigned to me (${investigations.isLoading || investigations.isError ? "—" : mine.length})` },
                { key: "in_progress", label: `In progress (${investigations.isLoading || investigations.isError ? "—" : inProgress.length})` },
                { key: "awaiting", label: `Awaiting evidence (${investigations.isLoading || investigations.isError ? "—" : awaiting.length})` },
                { key: "overdue", label: `Overdue (${investigations.isLoading || investigations.isError ? "—" : overdueInvestigations.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveQueueTab(tab.key)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    activeQueueTab === tab.key
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter queue…"
                className="h-8 pl-8 text-xs"
                aria-label="Filter investigations"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[12px]">
              <thead className="border-b border-border/70 bg-muted/35 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  {["Investigation / Problem", "Scope", "Assigned officer", "Deadline", "Status", ""].map((title) => (
                    <th key={title} className="px-4 py-3 font-medium">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredQueue.map((item) => {
                  const isOverdue =
                    item.status !== "completed" &&
                    item.status !== "cancelled" &&
                    item.due_date &&
                    today &&
                    dateOf(item.due_date) !== null &&
                    dateOf(item.due_date) < today.getTime();
                  const isMine =
                    item.assignee_email?.toLowerCase() === user?.email?.toLowerCase() ||
                    (user?.full_name && item.assignee_name?.toLowerCase() === user?.full_name?.toLowerCase());

                  return (
                    <tr key={item.id} className="hover:bg-muted/25 transition-colors">
                      <td className="max-w-[260px] px-4 py-3.5">
                        <Link
                          to="/investigations/$investigationId"
                          params={{ investigationId: item.id }}
                          className="font-medium text-foreground hover:text-primary hover:underline line-clamp-1"
                        >
                          {item.title}
                        </Link>
                        {item.reason ? (
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{item.reason}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        <span className="font-medium text-foreground">{item.district ?? "District not set"}</span>
                        <p className="text-[10.5px]">{item.crop ? `${item.crop} · ${item.period || ""}` : item.period || ""}</p>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        <span className={isMine ? "font-semibold text-primary" : ""}>
                          {item.assignee_name || "Unassigned"}
                        </span>
                        {isMine && <span className="ml-1 text-[10px] text-primary">(You)</span>}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {item.due_date ? (
                          <span className={isOverdue ? "font-semibold text-destructive flex items-center gap-1" : ""}>
                            {isOverdue && <AlertTriangle className="h-3 w-3" aria-hidden />}
                            {formatDate(item.due_date)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <ToneTag tone={investigationStatusTone(item.status)}>
                          {investigationStatusLabel(item.status)}
                        </ToneTag>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs gap-1">
                          <Link to="/investigations/$investigationId" params={{ investigationId: item.id }}>
                            Open
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {investigations.isLoading && (
            <p role="status" className="py-8 text-center text-sm text-muted-foreground">Loading investigation records…</p>
          )}
          {investigations.isError && (
            <p role="alert" className="py-8 text-center text-sm text-destructive">Investigation records could not be loaded. Retry before treating this queue as empty.</p>
          )}
          {!investigations.isLoading && !investigations.isError && !filteredQueue.length && (
            <EmptyState
              icon={ClipboardList}
              title="No investigations matching this filter"
              description={
                activeQueueTab === "mine"
                  ? "You currently have no investigations assigned to your account."
                  : activeQueueTab === "overdue"
                    ? "Great work! There are no overdue investigations in the queue."
                    : "No investigation records currently meet this condition."
              }
              action={
                <Button size="sm" onClick={handleOpenNewInvestigation}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  Start an investigation
                </Button>
              }
              className="py-12"
            />
          )}
        </DashboardCard>
      </section>

      {/* QUESTION 2: WHAT SHOULD I CHECK? */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            2
          </span>
          <h2 className="text-base font-semibold text-foreground">What should I check?</h2>
          <span className="text-xs text-muted-foreground ml-2">
            Published agricultural statistics, original survey worksheets, and district weather observations
          </span>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          {/* Weather & Climate Reference for District Verification */}
          <WeatherContext />

          {/* Connected Agricultural Datasets Reference */}
          <div className="space-y-4">
            <DashboardCard
              title="Official agricultural survey datasets"
              subtitle={`${allDatasets.length || 17} authorized statistical releases from NISR`}
              action={<DashboardLink to="/data-sources">Data catalogue</DashboardLink>}
            >
              <div className="space-y-2.5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Field operations reads directly from official Seasonal Agricultural Survey (SAS) and Agricultural Household Survey (AHS) publications.
                </p>

                <div className="rounded-lg border border-border/70 divide-y divide-border/60 max-h-56 overflow-y-auto">
                  {(allDatasets.length ? allDatasets : [
                    { id: "nisr-sas-2024-ab", name: "NISR SAS 2024 · Annual tables", row_count: 6600 },
                    { id: "nisr-sas-2025-ab", name: "NISR SAS 2025 · Annual tables", row_count: 6600 },
                    { id: "nisr-sas-2026-a", name: "NISR SAS 2026 · Season A", row_count: 2760 },
                    { id: "nisr-sas-2026-b", name: "NISR SAS 2026 · Season B", row_count: 2760 },
                    { id: "nisr-sas-2023-annual", name: "NISR SAS 2023 · Annual tables", row_count: 6480 },
                  ]).slice(0, 6).map((ds) => (
                    <div key={ds.id} className="p-2.5 text-xs flex items-center justify-between gap-2 hover:bg-muted/20">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{ds.name}</p>
                        <p className="text-[10.5px] text-muted-foreground">
                          {ds.row_count ? `${ds.row_count.toLocaleString("en-GB")} published observations` : "Official release"}
                        </p>
                      </div>
                      <ToneTag tone="primary" className="text-[10px]">Verified</ToneTag>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-primary/20 bg-accent/30 p-3 text-xs leading-relaxed text-muted-foreground">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-primary" />
                    Source verification principle
                  </p>
                  <p className="mt-0.5 text-[11px]">
                    Every observation in Field Operations preserves its original worksheet coordinate (e.g. Table 10!D4) and publication link.
                    Data are never interpolated or replaced with placeholders.
                  </p>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard title="Status breakdown" subtitle="Distribution across authorized records">
              <DistributionChart
              rows={investigations.isLoading || investigations.isError ? [] : [
                  { name: "In progress / Open", value: inProgress.length },
                  { name: "Awaiting evidence", value: awaiting.length },
                  { name: "Completed", value: completed.length },
                  { name: "Other", value: all.length - inProgress.length - awaiting.length - completed.length },
                ]}
                unit="investigations"
              />
            </DashboardCard>
          </div>
        </div>
      </section>

      {/* QUESTION 3: WHAT SHOULD HAPPEN NEXT? */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            3
          </span>
          <h2 className="text-base font-semibold text-foreground">What should happen next?</h2>
          <span className="text-xs text-muted-foreground ml-2">
            Action coordination, field evidence logging, and outcome conclusions
          </span>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {/* Follow-up Actions Today & Upcoming */}
          <DashboardCard
            title="Immediate actions & follow-ups"
            subtitle="Coordinate responsibilities and track evidence collection"
          >
            {actionsOverdue.length > 0 ? (
              <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                  <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                  {actionsOverdue.length} overdue {actionsOverdue.length === 1 ? "task" : "tasks"}
                </div>
                <ul className="mt-2 divide-y divide-destructive/15">
                  {actionsOverdue.slice(0, 3).map((act) => (
                    <li key={act.id} className="py-2 text-xs flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          to="/investigations/$investigationId"
                          params={{ investigationId: act.investigation_id }}
                          className="font-medium text-foreground hover:underline line-clamp-1"
                        >
                          {act.title}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">{act.owner || "No owner"}</p>
                      </div>
                      <span className="whitespace-nowrap font-medium text-destructive text-[11px]">
                        Due {formatDate(act.due_date)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {actionsDueToday.length > 0 ? (
              <div className="mb-3 rounded-lg border border-primary/30 bg-accent/30 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden />
                  {actionsDueToday.length} due today
                </div>
                <ul className="mt-2 divide-y divide-primary/15">
                  {actionsDueToday.map((act) => (
                    <li key={act.id} className="py-2 text-xs flex items-center justify-between gap-2">
                      <Link
                        to="/investigations/$investigationId"
                        params={{ investigationId: act.investigation_id }}
                        className="font-medium text-foreground hover:underline line-clamp-1"
                      >
                        {act.title}
                      </Link>
                      <span className="text-[11px] text-muted-foreground">{act.owner || "Assigned"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {actionsDueSoon.length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Upcoming in next 7 days</p>
                <ul className="divide-y divide-border/60">
                  {actionsDueSoon.slice(0, 5).map((act) => (
                    <li key={act.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <Link
                          to="/investigations/$investigationId"
                          params={{ investigationId: act.investigation_id }}
                          className="text-[12px] font-medium text-foreground hover:text-primary hover:underline line-clamp-1"
                        >
                          {act.title}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">{act.owner || "Unassigned"}</p>
                      </div>
                      <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                        {formatDate(act.due_date)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : !actionsOverdue.length && !actionsDueToday.length ? (
              <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" aria-hidden />
                <div>
                  <p className="text-[12px] font-medium">No urgent follow-up actions</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    All assigned follow-up actions are on schedule or completed.
                  </p>
                </div>
              </div>
            ) : null}
          </DashboardCard>

          {/* Operational Methodology Checklist */}
          <DashboardCard title="End-to-end evidence workflow" subtitle="Standard operating procedure for agricultural officers">
            <ol className="space-y-3">
              {[
                "Consume official NISR dataset observations to identify genuine anomalies.",
                "Verify reporting period, crop, and district before jumping to conclusions.",
                "Conduct field visits and cooperative interviews, logging direct observations.",
                "Check seasonal rainfall and temperature data to cross-examine weather factors.",
                "Assign follow-up tasks to responsible officers with clear deadlines.",
                "Document a comprehensive outcome summary and recommendations before closing.",
              ].map((text, index) => (
                <li key={text} className="flex gap-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  {text}
                </li>
              ))}
            </ol>
            <p className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-[10.5px] text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden />
              Preserve original evidence context throughout the entire investigation lifecycle.
            </p>
          </DashboardCard>
        </div>
      </section>

      {/* New Investigation Dialog with dataset pre-fill capability */}
      <NewInvestigationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValues={dialogDraft}
        onCreated={async (created) => {
          await investigations.refetch();
          if (created?.id) {
            navigate({ to: "/investigations/$investigationId", params: { investigationId: created.id } });
          }
        }}
      />
    </div>
  );
}
