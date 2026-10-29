import { ArrowDownRight, ArrowUpRight, CircleCheck, ClipboardList, Database, FileUp, Gauge, Layers3, MapPin, Minus, Sprout, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber, formatSignedPercent, NOT_AVAILABLE } from "@/lib/format";

const DELTA_TONE = {
  up: "text-primary",
  down: "text-amber-700",
  flat: "text-muted-foreground",
  none: "text-muted-foreground",
};

function DeltaIcon({ direction }) {
  if (direction === "up") return <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />;
  if (direction === "down") return <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />;
  return <Minus className="h-3.5 w-3.5" aria-hidden />;
}

/**
 * One indicator card. Always shows the unit, the period it refers to and the
 * comparison it is measured against, so no number is left without context.
 */
export function StatCard({
  label,
  value,
  unitShort,
  digits = 0,
  deltaPct,
  deltaLabel,
  footnote,
  notCalculableReason,
  icon,
}) {
  const hasDelta = deltaPct !== null && deltaPct !== undefined && !Number.isNaN(Number(deltaPct));
  const direction = !hasDelta ? "none" : Number(deltaPct) > 0 ? "up" : Number(deltaPct) < 0 ? "down" : "flat";
  const tone = DELTA_TONE[direction];
  const name = label.toLowerCase();
  const Icon = icon ?? (name.includes("production") ? Sprout : name.includes("yield") ? Gauge : name.includes("area") ? Layers3 : name.includes("district") ? MapPin : name.includes("completeness") ? CircleCheck : name.includes("warning") || name.includes("overdue") || name.includes("attention") ? TriangleAlert : name.includes("import") ? FileUp : name.includes("dataset") || name.includes("source") ? Database : ClipboardList);
  const missing = value === NOT_AVAILABLE || value === null || value === undefined;

  return (
    <div className="panel relative min-w-0 overflow-hidden p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px] font-medium text-muted-foreground">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/80 text-primary"><Icon className="h-4 w-4" aria-hidden /></span>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-1.5">
        <span className="num text-[1.9rem] font-semibold leading-none tracking-[-0.04em] text-foreground">
          {missing ? NOT_AVAILABLE : formatNumber(value, digits)}
        </span>
        {unitShort ? <span className="text-xs font-medium text-muted-foreground">{unitShort}</span> : null}
      </div>

      {hasDelta ? (
        <p className={cn("mt-3 flex flex-wrap items-center gap-1 text-[11px] font-medium", tone)}>
          <DeltaIcon direction={direction} />
          <span className="num">{formatSignedPercent(deltaPct)}</span>
          {deltaLabel ? <span className="font-normal text-muted-foreground">{deltaLabel}</span> : null}
        </p>
      ) : notCalculableReason ? (
        <p className="mt-3 text-xs text-muted-foreground">{notCalculableReason}</p>
      ) : null}

      {footnote ? <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground/80">{footnote}</p> : null}
      {missing && !footnote && <p className="mt-3 text-[10.5px] text-muted-foreground">Awaiting compatible records</p>}
    </div>
  );
}
