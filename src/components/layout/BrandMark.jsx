import { cn } from "@/lib/utils";

/** AgriWiser's supplied product logo. */
export function BrandMark({ className, compact = false }) {
  return (
    <div className={cn("flex items-center", className)}>
      <img
        src="/agriwiser-logo.png"
        alt="AgriWiser Rwanda"
        className={cn(
          "h-14 w-auto max-w-full rounded-md object-contain transition-transform duration-300 ease-out hover:scale-[1.035] hover:drop-shadow-[0_2px_7px_rgba(92,220,115,0.3)] motion-reduce:transition-none motion-reduce:hover:transform-none",
          compact && "h-9 w-14",
        )}
      />
    </div>
  );
}
