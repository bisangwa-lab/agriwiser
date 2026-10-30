import { Sparkles } from "lucide-react";
import { ToneTag } from "@/components/common/ToneTag";

/**
 * A notice used on the future-workspace panels so a visitor can see the planned
 * layout without mistaking it for a live feature. Per the spec (§12), non-functional
 * features are clearly marked as planned or unavailable.
 */
export function FutureWorkspaceNotice({ description }) {
  return (
    <div className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <ToneTag tone="outline" icon={Sparkles}>Future workspace</ToneTag>
          <ToneTag tone="neutral">Planned · not yet available</ToneTag>
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {description ??
            "This workspace is part of the AgriWiser roadmap. Its requirements, data sources and safeguards will be validated before it is built. The layout below shows the pages planned for it."}
        </p>
      </div>
    </div>
  );
}

/** A single planned-page tile, used to lay out a future workspace. */
export function PlannedPageCard({ icon: Icon, title, description }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-primary/70" aria-hidden /> : null}
        <p className="text-[13.5px] font-medium text-foreground">{title}</p>
      </div>
      {description ? (
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        Planned
      </p>
    </div>
  );
}