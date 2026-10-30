import { useState } from 'react';
import {
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
  Database,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToneTag } from '@/components/common/ToneTag';
import { queryAIAnalyst } from '@/lib/intelligence/server-fns';
import { toast } from 'sonner';

const SAMPLE_PROMPTS = [
  'Which districts recorded the largest verified maize production declines?',
  'Compare bean production and yield in Bugesera across available seasons',
  'Inspect data quality and completeness across 2024 Season A',
  'How does rainfall deficit impact district crop productivity?',
];

export function AIAnalystPanel() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const handleAsk = async (textToAsk) => {
    const q = textToAsk || question;
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await queryAIAnalyst({ data: { question: q } });
      setResponse(res);
      setQuestion(q);
      toast.success('Evidence analyzed and cited.');
    } catch (err) {
      toast.error('Query failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-semibold">Evidence-Grounded AI Agricultural Analyst</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ask research questions about Rwanda agricultural trends, district comparisons, and climate interactions.
          Every quantitative answer is grounded in authentic NISR survey publications with mathematical formulas and source citations.
        </p>

        {/* Input box */}
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder="e.g. Which districts had the largest maize declines in 2024?"
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs font-medium placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
          />
          <Button
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
            className="gap-1.5 text-xs font-medium bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            Analyze Evidence
          </Button>
        </div>

        {/* Quick prompt pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <span className="text-[11px] font-medium text-muted-foreground">Quick queries:</span>
          {SAMPLE_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => handleAsk(p)}
              className="rounded-full border bg-muted/30 px-3 py-1 text-[11px] text-foreground/80 hover:bg-muted/70 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Answer Output */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border bg-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Executing deterministic tool calculations & retrieving source citations...
          </div>
        </div>
      ) : response ? (
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
          {/* Finding Banner */}
          <div className="space-y-2 border-b pb-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Analytical Finding
              </span>
              <ToneTag tone="accent">{response.classification}</ToneTag>
            </div>
            <p className="text-sm font-semibold leading-relaxed text-foreground">{response.finding}</p>
          </div>

          {/* Supporting Evidence Table */}
          {response.supportingEvidence?.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Supporting Evidence & Authentic Citations
              </h4>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 font-medium text-muted-foreground">
                      <th className="p-2.5">District / Subject</th>
                      <th className="p-2.5">Baseline</th>
                      <th className="p-2.5">Current Period</th>
                      <th className="p-2.5">Verified Change</th>
                      <th className="p-2.5">Source Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {response.supportingEvidence.map((ev, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-medium">{ev.district || ev.datasetName}</td>
                        <td className="p-2.5 font-mono">
                          {ev.baselineProductionTonnes?.toLocaleString() ?? '—'} t
                        </td>
                        <td className="p-2.5 font-mono">
                          {ev.currentProductionTonnes?.toLocaleString() ?? '—'} t
                        </td>
                        <td className="p-2.5 font-mono text-red-600 dark:text-red-400">
                          {ev.percentDecline !== undefined ? `${ev.percentDecline.toFixed(1)}%` : '—'}
                        </td>
                        <td className="p-2.5 text-[11px] text-muted-foreground">
                          {ev.sourceCitation || ev.sourceUrl || 'NISR Seasonal Agriculture Survey'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Calculation & Methodology */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Calculation & Formula
              </span>
              <p className="font-mono text-xs text-foreground/90">{response.calculation?.formula || response.calculation?.method}</p>
              <p className="text-[11px] text-muted-foreground">
                Strict zero-baseline protection: {response.calculation?.zeroBaselineProtected ? 'Active' : 'N/A'}
              </p>
            </div>

            <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Interpretation & Context
              </span>
              <p className="text-xs leading-relaxed text-foreground/90">{response.interpretation}</p>
            </div>
          </div>

          {/* Uncertainty & Recommended Actions */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-2 dark:border-amber-950 dark:bg-amber-950/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                Uncertainty & Data Limitations
              </div>
              <p className="text-xs text-amber-900/90 dark:text-amber-300/90 leading-relaxed">{response.uncertainty}</p>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-2 dark:border-emerald-950 dark:bg-emerald-950/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Recommended Action
              </div>
              <p className="text-xs text-emerald-900/90 dark:text-emerald-300/90 leading-relaxed">
                {response.recommendedAction}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
