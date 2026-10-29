import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ToneTag } from "@/components/common/ToneTag";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { Loader2, Database } from "lucide-react";

/**
 * Loads (or reloads) the labelled demonstration dataset. The loader endpoint
 * writes in resumable batches and reports what is left, so this drives it until
 * it completes rather than firing one oversized request.
 */
export function DemoDataPanel({ counts, onLoaded }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      let offset = counts?.observations ?? 0;
      let guard = 0;
      let last = null;
      while (guard < 20) {
        guard += 1;
        const response = await fetch(`/api/demo-data?offset=${offset}&batch=700`, { method: "POST" });
        if (!response.ok) throw new Error(`The loader answered ${response.status}.`);
        const result = await response.json();
        last = result;
        setProgress({ written: result.written, total: result.total });
        if (result.status === "complete" || result.nextOffset === null) break;
        offset = result.nextOffset;
      }
      setProgress(null);
      onLoaded?.(last);
    } catch (err) {
      setError(err?.message ?? "The demonstration data could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="panel border-0 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Demonstration data</CardTitle>
        <CardDescription className="text-[12.5px]">
          Loads the clearly labelled demonstration set: four years of production and harvested area for six
          crops across all 30 districts, plus district seasonal rainfall for context. It never deletes or
          overwrites existing records.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
          <ToneTag tone="outline">{counts?.datasets ?? 0} datasets</ToneTag>
          <ToneTag tone="outline">{counts?.observations ?? 0} observations</ToneTag>
          <ToneTag tone="outline">{counts?.alerts ?? 0} alerts</ToneTag>
        </div>
        {progress ? (
          <p className="text-[12px] text-muted-foreground">
            Writing {progress.written} of {progress.total} observations…
          </p>
        ) : null}
        {error ? <p className="text-[12.5px] text-destructive">{error}</p> : null}
        <Button size="sm" onClick={load} disabled={busy}>
          {busy ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Database className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          )}
          {counts?.observations ? "Reload demonstration data" : "Load demonstration data"}
        </Button>
      </CardContent>
    </Card>
  );
}