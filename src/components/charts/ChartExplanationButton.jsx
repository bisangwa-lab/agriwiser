import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HelpCircle, Copy, Check, FileText } from "lucide-react";
import { explainChart } from "@/lib/explain";
import { useNavigate } from "@tanstack/react-router";
import { useLanguage } from "@/lib/LanguageContext";

/**
 * Unobtrusive eye/help icon for charts throughout the platform.
 * Keeps dashboard visually clean, but allows one-click access to
 * the 4-part empirical chart explanation:
 *  1. What the chart shows
 *  2. What changed or differs
 *  3. Which source supports it
 *  4. What cannot be concluded
 */
export function ChartExplanationButton({
  chartType = "trend chart",
  title = "Indicator Over Time",
  indicator = "production",
  scope = "All districts",
  period = "Observed period",
  data = [],
  series = [],
  dataset = null,
  filters = {},
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const explanation = explainChart({
    chartType,
    title,
    indicator,
    scope,
    period,
    data,
    series,
    dataset,
  });

  const copyExplanation = () => {
    const text = [
      explanation.title,
      "",
      `1. What this chart shows: ${explanation.whatItShows}`,
      "",
      `2. What changed or differs: ${explanation.whatChanged}`,
      "",
      `3. Evidence and source: ${explanation.evidenceAndSource}`,
      "",
      `4. What cannot be concluded: ${explanation.limitations}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const includeInReport = () => {
    setOpen(false);
    navigate({
      to: "/reports",
      search: {
        crop: filters.crop !== "all" ? filters.crop : undefined,
        district: filters.district !== "all" ? filters.district : undefined,
        indicator: filters.indicator || indicator,
        season: filters.season || undefined,
      },
    });
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground/70 hover:text-foreground"
        onClick={() => setOpen(true)}
        title={t("Explain this chart")}
        aria-label={t("Explain this chart")}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="brand-serif text-lg">{t(title)}</DialogTitle>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={copyExplanation}>
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  {copied ? t("Copied") : t("Copy")}
                </Button>
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={includeInReport}>
                  <FileText className="h-3 w-3" />
                  {t("Include in Report")}
                </Button>
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("Statistical interpretation grounded in validated observations.")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2 text-xs">
            <section className="space-y-1 rounded-md border border-border/60 bg-muted/30 p-2.5">
              <h4 className="font-semibold uppercase tracking-wider text-primary text-[11px]">
                {t("1. What this chart shows")}
              </h4>
              <p className="leading-relaxed text-foreground/90">{explanation.whatItShows}</p>
            </section>

            <section className="space-y-1 rounded-md border border-border/60 bg-muted/30 p-2.5">
              <h4 className="font-semibold uppercase tracking-wider text-primary text-[11px]">
                {t("2. What changed or differs")}
              </h4>
              <p className="leading-relaxed text-foreground/90">{explanation.whatChanged}</p>
            </section>

            <section className="space-y-1 rounded-md border border-border/60 bg-muted/30 p-2.5">
              <h4 className="font-semibold uppercase tracking-wider text-primary text-[11px]">
                {t("3. Source and evidence")}
              </h4>
              <p className="leading-relaxed text-foreground/90">{explanation.evidenceAndSource}</p>
            </section>

            <section className="space-y-1 rounded-md border border-border/60 bg-muted/30 p-2.5">
              <h4 className="font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 text-[11px]">
                {t("4. What cannot be concluded")}
              </h4>
              <p className="leading-relaxed text-muted-foreground">{explanation.limitations}</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
