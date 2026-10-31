import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BellRing,
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Sprout,
  Users,
  TrendingUp,
  CloudRain,
  Phone,
} from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { displayName, initials } from "@/lib/roles";
import { PANELS, normalizeRole, resolveWorkspacePanel, roleLabel } from "@/lib/rbac";

// Each panel's own navigation. A signed-in user sees only the pages of the
// panel they are in — so each panel is a separate experience, not one merged
// view. Super admins get a panel switcher in the header.
const NAV_BY_PANEL = {
  admin: [
    { to: "/admin", label: "Administration", icon: ShieldCheck },
    { to: "/data-sources", label: "Data management", icon: Database },
    { to: "/weather", search: { panel: "admin" }, label: "Weather & climate", icon: CloudRain },
    { to: "/settings", label: "Account settings", icon: Settings },
  ],
  analytics: [
    { to: "/analytics", search: { view: "overview" }, label: "Home", icon: LayoutDashboard },
    { to: "/explore", label: "Explore data", icon: TrendingUp },
    { to: "/compare", label: "Compare", icon: ArrowLeftRight },
    { to: "/analytics", search: { view: "planning-tools" }, label: "Agricultural Planning Tools", icon: ClipboardCheck },
    { to: "/agricultural-solutions", label: "Agricultural Solutions", icon: Sprout },
    { to: "/weather", search: { panel: "analytics" }, label: "Weather & climate", icon: CloudRain },
    { to: "/alerts", label: "Alerts", icon: BellRing },
    { to: "/reports", label: "Reports", icon: FileText },
  ],
  field_operations: [
    { to: "/field-operations", label: "Field operations", icon: ClipboardCheck },
    { to: "/weather", search: { panel: "field_operations" }, label: "Weather & climate", icon: CloudRain },
    { to: "/investigations", label: "Investigations", icon: ClipboardList },
  ],
  community_business: [
    { to: "/community-business", label: "Community & business", icon: Sprout },
    { to: "/agriculture-snapshot", label: "Rwanda Agriculture Snapshot", icon: BarChart3 },
    { to: "/market-prices", label: "Market Prices & Trends", icon: TrendingUp },
    { to: "/directory-services", label: "Directory & Services", icon: Users },
  ],
  public_insights: [{ to: "/public-insights", label: "USSD Simulator", icon: Phone }],
};

/** The primary navigation. `pathname` is resolved once by the shell and shared. */
export function SidebarNav({ user, pathname }) {
  const { language, setLanguage, t } = useLanguage();
  const { logout } = useAuth();
  const search = useRouterState({ select: (state) => state.location.search });
  const role = normalizeRole(user);
  const isSuperAdmin = role === "super_admin";
  const currentPanel = resolveWorkspacePanel(user, pathname, search);
  const items = currentPanel ? NAV_BY_PANEL[currentPanel] ?? [] : [];

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 pb-3 pt-6">
        <BrandMark />
      </div>

      <div className="px-5 pt-3">
        <label htmlFor="sidebar-language" className="mb-1 block text-[10px] text-sidebar-foreground/55">{t("language")}</label>
        <select id="sidebar-language" value={language} onChange={(event) => setLanguage(event.target.value)} className="w-full rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2 py-1.5 text-xs text-sidebar-foreground">
          <option value="en">{t("english")}</option><option value="rw">{t("kinyarwanda")}</option>
        </select>
      </div>

      <p className="px-6 pb-3 pt-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/40">{t("workspaceNavigation")}</p>

      <nav className="flex-1 space-y-0.5 px-3" aria-label={t("mainNavigation")}>
        {items.map((item) => {
          const active = item.to === "/analytics"
            ? pathname === item.to && (search.view === item.search?.view || (!search.view && item.search?.view === "overview"))
            : pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to + (item.search?.panel ?? item.search?.view ?? "")}
              to={item.to}
              {...(item.search ? { search: item.search } : {})}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-white/5"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-[17px] w-[17px] shrink-0 transition-colors",
                  active ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-primary",
                )}
                aria-hidden
              />
              {t(({ "Account settings": "accountSettings", Administration: "administration", "Data management": "dataManagement", "Weather & climate": "weatherClimate", Home: "home", "Explore data": "exploreData", Compare: "compare", "Agricultural Planning Tools": "agriculturalPlanningTools", "Agricultural Solutions": "agriculturalSolutions", Alerts: "alerts", Reports: "reports", "Field operations": "fieldOperations", Investigations: "investigations", "Community & business": "communityBusiness", "Rwanda Agriculture Snapshot": "rwandaAgricultureSnapshot", "Market Prices & Trends": "marketPricesTrends", "Directory & Services": "directoryServices", "USSD Simulator": "ussdSimulator" })[item.label] ?? item.label)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        {isSuperAdmin ? (
          <p className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-sidebar-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            {language === "rw" ? "Umuyobozi mukuru" : "Super admin"}
          </p>
        ) : null}
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-accent-foreground">
            {initials(user)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-sidebar-foreground">{displayName(user)}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/55">{roleLabel(user)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[12.5px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          {t("signOut")}
        </button>
      </div>
    </div>
  );
}