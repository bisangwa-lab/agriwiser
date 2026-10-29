import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The provenance strip that accompanies a figure, chart or table: source,
 * period, geography and unit. Every important number carries one.
 */
export function SourceNote({ dataset, period, geography, unit, quality, className }) {
  const parts = [
    dataset ? { label: "Source", value: dataset } : null,
    period ? { label: "Period", value: period } : null,
    geography ? { label: "Geography", value: geography } : null,
    unit ? { label: "Unit", value: unit } : null,
    quality ? { label: "Status", value: quality } : null,
  ].filter(Boolean);

  if (!parts.length) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/70 pt-3 text-[11.5px] text-muted-foreground",
        className,
      )}
    >
      <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
      {parts.map((part) => (
        <span key={part.label}>
          <span className="font-medium text-muted-foreground/70">{part.label}:</span> {part.value}
        </span>
      ))}
    </div>
  );
}