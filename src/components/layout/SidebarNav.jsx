import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BellRing,
  ClipboardCheck,
  ClipboardList,
  Database,
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Sprout,
  TrendingUp,
  CloudRain,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BrandMark } from "@/components/layout/BrandMark";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { displayName, initials } from "@/lib/roles";
import { PANELS, PANEL_ORDER, ROLE_BY_KEY, normalizeRole, panelForPath, roleLabel } from "@/lib/rbac";

// Each panel's own navigation. A signed-in user sees only the pages of the
// panel they are in — so each panel is a separate experience, not one merged
// view. Super admins get a panel switcher (below) to oversee every panel.
const NAV_BY_PANEL = {
  admin: [
    { to: "/admin", label: "Administration", icon: ShieldCheck },
    { to: "/data-sources", label: "Data management", icon: Database },
    { to: "/weather", label: "Weather & climate", icon: CloudRain },
    { to: "/settings", label: "Account settings", icon: Settings },
  ],
  analytics: [
    { to: "/analytics", label: "Home", icon: LayoutDashboard },
    { to: "/explore", label: "Explore data", icon: TrendingUp },
    { to: "/compare", label: "Compare", icon: ArrowLeftRight },
    { to: "/weather", label: "Weather & climate", icon: CloudRain },
    { to: "/alerts", label: "Alerts", icon: BellRing },
    { to: "/reports", label: "Reports", icon: FileText },
  ],
  field_operations: [
    { to: "/field-operations", label: "Field operations", icon: ClipboardCheck },
    { to: "/weather", label: "Weather & climate", icon: CloudRain },
    { to: "/investigations", label: "Investigations", icon: ClipboardList },
  ],
  community_business: [{ to: "/community-business", label: "Community & business", icon: Sprout }],
  public_insights: [{ to: "/public-insights", label: "Public insights", icon: Eye }],
};

/** The primary navigation. `pathname` is resolved once by the shell and shared. */
export function SidebarNav({ user, pathname }) {
  const { logout } = useAuth();
  const role = normalizeRole(user);
  const isSuperAdmin = role === "super_admin";
  const currentPanel = pathname === "/weather" ? ROLE_BY_KEY[role]?.panel : panelForPath(pathname);
  const items = currentPanel ? NAV_BY_PANEL[currentPanel] ?? [] : [];

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 pb-3 pt-6">
        <BrandMark />
      </div>

      {isSuperAdmin ? <PanelSwitcher current={currentPanel} /> : null}

      <p className="px-6 pb-3 pt-5 text-[9px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/40">Workspace navigation</p>

      <nav className="flex-1 space-y-0.5 px-3" aria-label="Main">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
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
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        {isSuperAdmin ? (
          <p className="mb-3 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-sidebar-primary">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Super admin
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
          Sign out
        </button>
      </div>
    </div>
  );
}

// Super admins oversee every panel. This switcher moves between the five
// separate panels; the sidebar then shows only that panel's pages, so each
// panel stays a distinct experience.
function PanelSwitcher({ current }) {
  const navigate = useNavigate();
  const currentLabel = current ? PANELS[current].label : "Choose panel";

  return (
    <div className="px-3 pb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Switch panel: ${currentLabel}`}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-[12.5px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/70"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-sidebar-primary" aria-hidden />
              <span className="truncate">{currentLabel}</span>
            </span>
            <span className="text-[10px] text-sidebar-foreground/50">switch</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          <DropdownMenuLabel>Oversee a panel</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PANEL_ORDER.map((key) => {
            const panel = PANELS[key];
            return (
              <DropdownMenuItem
                key={key}
                onSelect={() => navigate({ to: panel.path })}
                className={cn(key === current && "bg-accent text-accent-foreground")}
              >
                {panel.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
