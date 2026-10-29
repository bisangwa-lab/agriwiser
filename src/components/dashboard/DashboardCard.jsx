import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function DashboardCard({ title, subtitle, action, children, className, contentClassName }) {
  return <section className={cn("dashboard-card min-w-0", className)}>
    <div className="dashboard-card-heading">
      <div><h2 className="text-[14px] font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className={cn("p-5", contentClassName)}>{children}</div>
  </section>;
}

export function DashboardLink({ to, children }) {
  return <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-primary hover:underline">
    {children}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
  </Link>;
}
