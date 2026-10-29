import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wand2 } from "lucide-react";
import { explainChange } from "@/lib/explain";

/**
 * "Explain this change" — opens a plain-language explanation built entirely from
 * the selected values: what changed, which periods were compared, the formula,
 * the source, the quality warnings and what the data cannot establish. It is
 * deterministic: the same inputs always produce the same explanation, and no
 * figure appears that is not in the underlying records.
 */
export function ExplainChangeButton({ payload, label = "Explain this change", variant = "outline", size = "sm" }) {
  const [open, setOpen] = useState(false);
  const explanation = useMemo(() => (payload ? explainChange(payload) : null), [payload]);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} disabled={!explanation}>
        <Wand2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[86vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="brand-serif text-xl">Explain this change</DialogTitle>
            <DialogDescription className="text-[12.5px]">
              Generated from the values selected on this screen. It states what the data shows and what it
              cannot establish.
            </DialogDescription>
          </DialogHeader>

          {explanation ? (
            <div className="space-y-5">
              <p className="rounded-lg border border-primary/20 bg-accent/60 p-3.5 text-[13.5px] font-medium leading-relaxed text-accent-foreground">
                {explanation.headline}
              </p>
              {explanation.blocks.map((block) => (
                <section key={block.title} className="space-y-1.5">
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                    {block.title}
                  </h3>
                  <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
                    {block.body}
                  </p>
                </section>
              ))}
              <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground/80">
                This explanation is generated from the application's own calculations. It contains no model
                output and no hypothesis presented as a finding.
              </p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}