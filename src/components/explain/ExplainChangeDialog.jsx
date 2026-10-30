import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wand2, Copy, Check, FileText } from "lucide-react";
import { explainChange } from "@/lib/explain";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";

/**
 * "Explain this change" dialog.
 * Offers 3 distinct explanation levels:
 *  - Simple: Plain language for farmers, citizens, and general readers
 *  - Professional (Default): Rigorous analysis for agricultural officers and policy makers
 *  - Technical: Mathematical equations, decomposition, and sampling frame for researchers
 */
export function ExplainChangeButton({ payload, label = "Explain this change", variant = "outline", size = "sm" }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("professional");
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const explanation = useMemo(() => {
    if (!payload) return null;
    return explainChange({ ...payload, mode });
  }, [payload, mode]);

  const copyToClipboard = () => {
    if (!explanation) return;
    const text = [
      explanation.headline,
      "",
      ...explanation.blocks.map((b) => `## ${b.title}\n${b.body}\n`),
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInReports = () => {
    setOpen(false);
    navigate({
      to: "/reports",
      search: {
        crop: payload?.crop,
        district: payload?.geography,
        indicator: payload?.indicator,
        season: payload?.season,
      },
    });
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} disabled={!payload}>
        <Wand2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
              <DialogTitle className="brand-serif text-xl">Explain This Change</DialogTitle>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={copyToClipboard}>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={openInReports}>
                  <FileText className="h-3.5 w-3.5" />
                  Open in Reports
                </Button>
              </div>
            </div>
            <DialogDescription className="text-[12.5px]">
              Evidence-based explanation grounded strictly in verified observations. Select depth below:
            </DialogDescription>
          </DialogHeader>

          {/* Mode Selector Tabs */}
          <div className="pt-1">
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="simple" className="text-xs">
                  Simple (General)
                </TabsTrigger>
                <TabsTrigger value="professional" className="text-xs">
                  Professional (Default)
                </TabsTrigger>
                <TabsTrigger value="technical" className="text-xs">
                  Technical (Researchers)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {explanation ? (
            <div className="space-y-4 pt-2">
              <p className="rounded-lg border border-primary/20 bg-accent/60 p-3.5 text-[13.5px] font-medium leading-relaxed text-accent-foreground">
                {explanation.headline}
              </p>
              {explanation.blocks.map((block) => (
                <section key={block.title} className="space-y-1.5 rounded-md border border-border/50 bg-card/50 p-3">
                  <h3 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-primary">
                    {block.title}
                  </h3>
                  <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-foreground/90">
                    {block.body}
                  </p>
                </section>
              ))}
              <div className="flex items-center justify-between border-t border-border pt-3 text-[11px] text-muted-foreground">
                <span>Deterministic statistical computation · No unverified model speculation</span>
                <span>Depth: {mode.toUpperCase()}</span>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
