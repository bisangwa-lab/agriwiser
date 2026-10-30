import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, Grid2X2, Menu, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { BrandMark } from "@/components/layout/BrandMark";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { usesAppData } from "@/api/appClient";
import { PANELS, panelForPath, resolveWorkspacePanel, roleLabel } from "@/lib/rbac";
import { displayName, initials } from "@/lib/roles";
import { useDatasets } from "@/hooks/useAgriRecords";

/**
 * The application shell: a persistent dark-green sidebar on desktop and a
 * slide-over navigation on mobile, with one scrollable content column.
 */
export function AppShell({ user, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const search = useRouterState({ select: (state) => state.location.search });
  const activePanelKey = resolveWorkspacePanel(user, pathname, search);
  const panel = PANELS[activePanelKey];
  const { data: datasets = [], isLoading: loadingDatasets, error: datasetError } = useDatasets();
  const quickEntry = usesAppData && import.meta.env.DEV && import.meta.env.VITE_LOCAL_QUICK_LOGIN === "true";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[244px_minmax(0,1fr)]">
      <aside className="no-print sticky top-0 hidden h-screen overflow-y-auto border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarNav user={user} pathname={pathname} />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="no-print sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-3 border-b border-border/80 bg-card/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
            className="-ml-1 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="lg:hidden"><BrandMark compact /></div>
          <div className="hidden items-center gap-2 text-xs sm:flex"><Sprout className="h-4 w-4 text-primary" aria-hidden /><span className="text-muted-foreground">Workspace</span><ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden /><span className="font-medium">{panel?.label ?? "AgriWiser"}</span>{pathname === "/weather" && (<><ChevronRight className="h-3 w-3 text-muted-foreground/50" aria-hidden /><span className="text-muted-foreground font-medium">Weather & climate</span></>)}</div>
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            {quickEntry && <Link to="/login" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"><Grid2X2 className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Workspaces</span><span className="sr-only sm:hidden">Choose workspace</span></Link>}
            <div className="flex items-center gap-2.5 border-l border-border pl-3 sm:pl-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">{initials(user)}</span>
              <div className="hidden leading-tight sm:block"><p className="max-w-[150px] truncate text-[12px] font-semibold">{displayName(user)}</p><p className="mt-1 text-[10px] text-muted-foreground">{roleLabel(user)}</p></div>
            </div>
          </div>
        </header>
        {usesAppData && <p className="border-b border-border/60 bg-accent/40 px-4 py-1.5 text-[10px] text-accent-foreground/75 sm:px-6 lg:px-8">AgriWiser workspace · {loadingDatasets ? "Loading source catalogue…" : datasetError ? "Source catalogue unavailable" : datasets.length ? `NISR published statistics · ${datasets.length} releases · all available crop categories · coverage varies by period` : "No agricultural datasets imported yet"}</p>}

        <main className="mx-auto w-full max-w-[1536px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">{children}</main>

        <footer className="no-print border-t border-border/70 px-4 py-5 sm:px-6 lg:px-9">
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            AgriWiser — agricultural intelligence and decision support. Findings, alerts and
            reports are evidence for review by people, not conclusions about cause.
          </p>
        </footer>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[272px] border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav user={user} pathname={pathname} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
