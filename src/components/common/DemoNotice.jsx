import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visible, non-dismissible statement that the values on screen are demonstration
 * values and not official statistics. Shown wherever demonstration data renders.
 */
export function DemoNotice({ className, children }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-amber-300/70 bg-amber-50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-amber-900",
        className,
      )}
      role="note"
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>
        {children ?? (
          <>
            <span className="font-semibold">Demonstration data.</span> These values are generated for
            demonstrating the workflow. They are not official NISR figures and must not be quoted as
            statistics.
          </>
        )}
      </p>
    </div>
  );
}

export function DemoBadge({ className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-amber-800",
        className,
      )}
    >
      Demo data
    </span>
  );
}