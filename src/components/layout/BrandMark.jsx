import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

/** The product mark: an agricultural glyph plus the wordmark. */
export function BrandMark({ className, compact = false }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-sidebar-primary text-sidebar-primary-foreground">
        <Sprout className="h-[18px] w-[18px]" aria-hidden />
      </span>
      {compact ? null : (
        <span className="min-w-0">
          <span className="brand-serif block text-[15px] font-semibold leading-tight text-sidebar-foreground">
            AgriWiser
          </span>
          <span className="block text-[10.5px] font-medium uppercase tracking-[0.22em] text-sidebar-foreground/55">
            Rwanda
          </span>
        </span>
      )}
    </div>
  );
}