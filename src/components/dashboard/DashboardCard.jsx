import { ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";

export function DashboardCard({ title, subtitle, action, children, className, contentClassName }) {
  const { t } = useLanguage();
  return <section className={cn("dashboard-card min-w-0", className)}>
    <div className="dashboard-card-heading">
      <div><h2 className="text-[14px] font-semibold tracking-tight">{t(title)}</h2>
        {subtitle && <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{t(subtitle)}</p>}
      </div>
      {action}
    </div>
    <div className={cn("p-5", contentClassName)}>{children}</div>
  </section>;
}

export function DashboardLink({ to, children }) {
  const { t } = useLanguage();
  return <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-semibold text-primary hover:underline">
    {typeof children === "string" ? t(children) : children}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
  </Link>;
}
