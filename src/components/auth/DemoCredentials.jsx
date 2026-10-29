import { KeyRound, UserRound } from "lucide-react";

// Example sign-ins, one per workspace, shown on the login page so a reviewer can
// pick the role they want to see. These are EXAMPLE credentials — the matching
// accounts still have to be created in the dashboard's App Users page (and given
// these passwords) before they will actually sign in.
// One example sign-in per panel. Clicking "Use" fills the form; signing in sends
// the user straight to that panel. The matching accounts must be created in the
// dashboard's App Users page (with these passwords) before they actually sign in.
const DEMO_ACCOUNTS = [
  {
    workspace: "Administration · Data manager",
    email: "admin@hingasmart.rw",
    password: "demo1234",
    note: "Lands in the Administration panel — datasets, validation, users.",
  },
  {
    workspace: "Analytics & planning · Analyst",
    email: "planner@hingasmart.rw",
    password: "demo1234",
    note: "Lands in the Analytics & planning panel — explore, compare, alerts, reports.",
  },
  {
    workspace: "Field operations · Officer",
    email: "officer@hingasmart.rw",
    password: "demo1234",
    note: "Lands in the Field operations panel — assigned investigations and observations.",
  },
];

export function DemoCredentials({ onUse }) {
  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" aria-hidden />
        <p className="text-sm font-semibold">Demo workspaces</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Example sign-ins for each workspace. Create the matching accounts in the dashboard's App Users page
        before using them.
      </p>
      <ul className="mt-3 space-y-2">
        {DEMO_ACCOUNTS.map((account) => (
          <li
            key={account.email}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-card px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{account.workspace}</p>
              <p className="truncate text-[11.5px] text-muted-foreground">
                <UserRound className="mr-1 inline h-3 w-3 align-text-bottom" aria-hidden />
                {account.email} · {account.password}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/80">{account.note}</p>
            </div>
            <button
              type="button"
              onClick={() => onUse?.(account)}
              className="shrink-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              Use
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}