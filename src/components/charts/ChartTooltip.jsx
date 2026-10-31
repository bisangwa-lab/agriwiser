import { formatNumber } from "@/lib/format";
import { useLanguage } from "@/lib/LanguageContext";

/** Shared tooltip: label, then each series with its unit. */
export function ChartTooltip({ active, payload, label, unitShort, digits = 0, seriesLabels }) {
  const { t } = useLanguage();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((entry) => {
          const name = seriesLabels?.[entry.dataKey] ?? entry.name ?? entry.dataKey;
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-[12px]">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: entry.color ?? entry.stroke ?? entry.fill }}
                  aria-hidden
                />
                {t(name)}
              </span>
              <span className="num font-medium text-foreground">
                {formatNumber(entry.value, digits)}
                {unitShort ? <span className="ml-1 font-normal text-muted-foreground">{unitShort}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
