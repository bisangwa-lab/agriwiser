import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Layers, Activity, Lock, Cpu, Sparkles } from 'lucide-react';
import { ToneTag } from '@/components/common/ToneTag';
import { getModelRegistryCatalog } from '@/lib/intelligence/server-fns';

export function ModelGovernancePanel() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await getModelRegistryCatalog();
        if (active) setModels(res?.models ?? []);
      } catch (err) {
        // Fallback
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-semibold">Model Governance & Scientific Validation Registry</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          In compliance with the AgriWiser Master Directive, every predictive model, digital twin simulation engine, and analytical composite algorithm must maintain chronological validation metrics, explicit assumptions, and known limitations.
        </p>
      </div>

      <div className="grid gap-6">
        {models.map((model) => (
          <div key={model.id} className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">{model.id}</span>
                  <ToneTag tone={model.status === 'active' ? 'accent' : 'warning'}>{model.status.toUpperCase()}</ToneTag>
                  <span className="text-[11px] text-muted-foreground">v{model.version}</span>
                </div>
                <h4 className="mt-1 text-sm font-semibold">{model.name}</h4>
              </div>

              <div className="text-right text-xs">
                <span className="text-muted-foreground">Type: </span>
                <span className="font-medium capitalize">{model.type.replace(/_/g, ' ')}</span>
              </div>
            </div>

            {/* Target and Metrics */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground">Model Target / Objective</span>
                <p className="text-xs text-foreground/90 leading-relaxed">{model.target}</p>
              </div>

              {model.evaluationMetrics && (
                <div className="space-y-1 rounded-lg bg-muted/20 p-3">
                  <span className="text-[11px] font-medium text-muted-foreground">Scientific Evaluation Metrics</span>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                    {Object.entries(model.evaluationMetrics).map(([k, v]) => (
                      <div key={k}>
                        <span className="text-muted-foreground text-[10px] uppercase">{k}: </span>
                        <span className="font-semibold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Assumptions & Limitations */}
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  Documented Assumptions
                </span>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  {model.assumptions?.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  Known Scientific Limitations
                </span>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  {model.limitations?.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
