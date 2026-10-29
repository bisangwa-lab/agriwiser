import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { requireWorkspace } from "@/lib/route-access";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/PageHeader";
import { FilterBar } from "@/components/common/FilterBar";
import { EmptyState } from "@/components/common/EmptyState";
import { ToneTag, investigationStatusLabel, investigationStatusTone } from "@/components/common/ToneTag";
import { NewInvestigationDialog } from "@/components/investigations/NewInvestigationDialog";
import { useInvestigations } from "@/hooks/useAgriRecords";
import { useAuth } from "@/lib/AuthContext";
import { CROPS, DISTRICT_NAMES, INVESTIGATION_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { ArrowRight, ClipboardList, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/_authed/investigations/")({
  beforeLoad: requireWorkspace(["officer", "data_manager"]),
  head: () => ({ meta: [{ title: "Investigations · HingaSmart Rwanda" }] }),
  component: InvestigationsPage,
});

const DEFAULT_FILTERS = { status: "all", crop: "all", district: "all", assignment: "all" };

const FILTER_FIELDS = [
  {
    key: "status",
    label: "Status",
    allLabel: "All statuses",
    options: INVESTIGATION_STATUSES.map((item) => ({ value: item.key, label: item.label })),
  },
  {
    key: "assignment",
    label: "Assignment",
    allLabel: "Anyone",
    options: [
      { value: "mine", label: "Assigned to me" },
      { value: "unassigned", label: "Unassigned" },
    ],
  },
  { key: "crop", label: "Crop", allLabel: "All crops", options: CROPS.map((c) => ({ value: c, label: c })) },
  {
    key: "district",
    label: "District",
    allLabel: "All districts",
    options: DISTRICT_NAMES.map((name) => ({ value: name, label: name })),
  },
];

function InvestigationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: investigations = [], isLoading, error, refetch } = useInvestigations();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return investigations.filter((item) => {
      if (filters.status !== "all" && item.status !== filters.status) return false;
      if (filters.crop !== "all" && item.crop !== filters.crop) return false;
      if (filters.district !== "all" && item.district !== filters.district) return false;
      if (filters.assignment === "mine" && (item.assignee_email || "") !== (user?.email || "")) return false;
      if (filters.assignment === "unassigned" && item.assignee_name) return false;
      if (!term) return true;
      return [item.title, item.description, item.reason, item.district, item.crop]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [investigations, filters, search, user]);

  const counts = useMemo(
    () => ({
      open: investigations.filter((item) => item.status === "open" || item.status === "in_progress").length,
      awaiting: investigations.filter((item) => item.status === "awaiting_evidence").length,
      completed: investigations.filter((item) => item.status === "completed").length,
      mine: investigations.filter((item) => (item.assignee_email || "") === (user?.email || "")).length,
    }),
    [investigations, user],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Investigations"
        title="Investigation workspace"
        description="A place to record why a finding deserves attention, what evidence supports it, what a person checked, and what happened next. The evidence and calculation that triggered an investigation are preserved on the record."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            New investigation
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <ToneTag tone="primary">{counts.open} open or in progress</ToneTag>
        <ToneTag tone="warning">{counts.awaiting} awaiting evidence</ToneTag>
        <ToneTag tone="neutral">{counts.completed} completed</ToneTag>
        <ToneTag tone="info">{counts.mine} assigned to me</ToneTag>
      </div>

      <FilterBar
        fields={FILTER_FIELDS}
        filters={filters}
        onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
        onReset={() => {
          setFilters(DEFAULT_FILTERS);
          setSearch("");
        }}
      >
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, reason, district"
            className="h-9 w-full pl-8 text-[13px] sm:w-[280px]"
            aria-label="Search investigations"
          />
        </div>
      </FilterBar>

      <Card className="panel border-0 shadow-none">
        <CardContent className="pt-5">
          {error ? (
            <EmptyState icon={ClipboardList} title="Investigations could not be loaded" description={error.message} />
          ) : isLoading ? (
            <p className="py-8 text-center text-[13px] text-muted-foreground">Loading investigations…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={investigations.length === 0 ? "No investigations yet" : "Nothing matches these filters"}
              description={
                investigations.length === 0
                  ? "Create an investigation from an alert, or start one here from any finding you want traced to a conclusion."
                  : "Widen a filter or clear the search to see more records."
              }
              action={
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  Create the first investigation
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investigation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Assigned to</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="max-w-[320px]">
                        <Link
                          to="/investigations/$investigationId"
                          params={{ investigationId: item.id }}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {item.title}
                        </Link>
                        {item.reason ? (
                          <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted-foreground">{item.reason}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <ToneTag tone={investigationStatusTone(item.status)}>
                          {investigationStatusLabel(item.status)}
                        </ToneTag>
                      </TableCell>
                      <TableCell className="text-[12.5px] text-muted-foreground">
                        {[item.crop, item.district, item.period].filter(Boolean).join(" · ") || "Not set"}
                      </TableCell>
                      <TableCell className="text-[12.5px]">{item.assignee_name || "Unassigned"}</TableCell>
                      <TableCell className="text-[12.5px] text-muted-foreground">
                        {item.due_date ? formatDate(item.due_date) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate({
                              to: "/investigations/$investigationId",
                              params: { investigationId: item.id },
                            })
                          }
                        >
                          Open
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <NewInvestigationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={async (created) => {
          await refetch();
          if (created?.id) {
            navigate({ to: "/investigations/$investigationId", params: { investigationId: created.id } });
          }
        }}
      />
    </div>
  );
}