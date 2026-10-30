import { createContext, useContext, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Sprout, Search, Zap, Calculator, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CROPS, DISTRICT_NAMES, SEASONS, YEARS } from "@/lib/constants";

// ─── Shared context ──────────────────────────────────────────────────────────
export const AgriculturalSolutionsContext = createContext(null);

export function useAgriculturalSolutions() {
  const ctx = useContext(AgriculturalSolutionsContext);
  if (!ctx) throw new Error("useAgriculturalSolutions must be used inside AgriculturalSolutionsLayout");
  return ctx;
}

const ACTIVITIES = [
  {
    key: "find",
    label: "Find Problems",
    icon: Search,
    to: "/agricultural-solutions",
    description: "Identify where agricultural problems are occurring and which districts need attention.",
  },
  {
    key: "compare",
    label: "Compare Solutions",
    icon: Zap,
    to: "/agricultural-solutions/compare",
    description: "Evaluate possible interventions with transparent scenario modeling.",
  },
  {
    key: "plan",
    label: "Prepare Action Plan",
    icon: Calculator,
    to: "/agricultural-solutions/plan",
    description: "Turn a selected intervention into an authorized, actionable proposal.",
  },
];

// ─── Layout component ─────────────────────────────────────────────────────────
export function AgriculturalSolutionsLayout({ children }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const activeKey =
    pathname.startsWith("/agricultural-solutions/plan") ? "plan"
    : pathname.startsWith("/agricultural-solutions/compare") ? "compare"
    : "find";

  const [context, setContext] = useState({
    district: "all",
    crop: "Maize",
    season: "Season B",
    year: Math.max(...YEARS),
  });

  // Scenario selected in Compare Solutions — carried forward to Prepare Action Plan
  const [selectedScenario, setSelectedScenario] = useState(null);

  const contextValue = {
    ...context,
    setContext,
    selectedScenario,
    setSelectedScenario,
  };

  const activeActivity = ACTIVITIES.find((a) => a.key === activeKey);

  return (
    <AgriculturalSolutionsContext.Provider value={contextValue}>
      <div className="space-y-0">
        {/* ── Page header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
            <Sprout className="h-3.5 w-3.5 text-primary" aria-hidden />
            <span>Analytics &amp; Planning</span>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span>Agricultural Solutions</span>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="text-foreground font-medium">{activeActivity?.label}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Agricultural Solutions</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Find agricultural problems, compare possible solutions, and prepare evidence-based action plans.
          </p>
        </div>

        {/* ── Context filter bar ── */}
        <div className="rounded-xl border bg-card p-4 mb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-4">
              <FilterSelect
                id="as-crop"
                label="Crop"
                value={context.crop}
                onValueChange={(v) => setContext((c) => ({ ...c, crop: v }))}
                width="w-[160px]"
              >
                {CROPS.map((crop) => (
                  <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                ))}
              </FilterSelect>

              <FilterSelect
                id="as-district"
                label="District"
                value={context.district}
                onValueChange={(v) => setContext((c) => ({ ...c, district: v }))}
                width="w-[180px]"
              >
                <SelectItem value="all">All districts</SelectItem>
                {DISTRICT_NAMES.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </FilterSelect>

              <FilterSelect
                id="as-season"
                label="Season"
                value={context.season}
                onValueChange={(v) => setContext((c) => ({ ...c, season: v }))}
                width="w-[140px]"
              >
                {SEASONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </FilterSelect>

              <FilterSelect
                id="as-year"
                label="Year"
                value={String(context.year)}
                onValueChange={(v) => setContext((c) => ({ ...c, year: Number(v) }))}
                width="w-[100px]"
              >
                {[...YEARS].sort((a, b) => b - a).map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </FilterSelect>
            </div>
          </div>

          <Separator className="my-4" />

          {/* ── Activity tabs ── */}
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Agricultural Solutions activities">
            {ACTIVITIES.map((act) => {
              const active = act.key === activeKey;
              const Icon = act.icon;
              return (
                <Link
                  key={act.key}
                  to={act.to}
                  role="tab"
                  aria-selected={active}
                  data-activity={act.key}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {act.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Page content (child routes) ── */}
        <div role="tabpanel">
          {children}
        </div>
      </div>
    </AgriculturalSolutionsContext.Provider>
  );
}

// ── Shared filter select ──────────────────────────────────────────────────────
function FilterSelect({ id, label, value, onValueChange, width, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} className={cn("h-8 text-xs", width)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
