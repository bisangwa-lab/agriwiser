import { BarChart3 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export function ChartPlaceholder({ title = "No observations to display", description = "Charts appear here when compatible data is available.", height = 250, icon: Icon = BarChart3 }) {
  const { t } = useLanguage();
  return <div className="dashboard-grid-empty relative flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/20" style={{ minHeight: height }}>
    <div className="relative mx-4 max-w-xs rounded-2xl border border-border/60 bg-card/95 px-6 py-5 text-center shadow-sm">
      <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary"><Icon className="h-5 w-5" aria-hidden /></span>
      <h3 className="text-[13px] font-semibold">{t(title)}</h3>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{t(description)}</p>
    </div>
  </div>;
}
