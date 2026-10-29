import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToneTag } from "@/components/common/ToneTag";
import { formatDate } from "@/lib/format";
import { INDICATORS } from "@/lib/constants";

const FIELDS = [
  { key: "publisher", label: "Publisher" },
  { key: "source_url", label: "Source URL / file reference" },
  { key: "source_reference", label: "Source notes" },
  { key: "retrieval_date", label: "Retrieval date", date: true },
  { key: "reporting_period", label: "Reporting period" },
  { key: "geographic_coverage", label: "Geographic coverage" },
  { key: "geography_level", label: "Geography level" },
  { key: "units", label: "Units" },
  { key: "version", label: "Version / update identifier" },
  { key: "license", label: "License" },
  { key: "update_cadence", label: "Update cadence" },
];

/** The full provenance record for a dataset, including what is known to be wrong with it. */
export function DatasetDetailDialog({ dataset, open, onOpenChange }) {
  if (!dataset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="brand-serif text-xl">{dataset.name}</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Everything recorded about this dataset: origin, period, units, method and limitations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {(dataset.indicators ?? []).map((key) => (
              <ToneTag key={key} tone="outline">
                {INDICATORS[key]?.label ?? key}
              </ToneTag>
            ))}
          </div>

          <dl className="grid gap-x-6 gap-y-3 text-[12.5px] sm:grid-cols-2">
            {FIELDS.map((field) => {
              const value = dataset[field.key];
              if (!value) return null;
              return (
                <div key={field.key}>
                  <dt className="text-muted-foreground">{field.label}</dt>
                  <dd className="break-words font-medium text-foreground">
                    {field.date ? formatDate(value) : String(value)}
                  </dd>
                </div>
              );
            })}
          </dl>

          {dataset.methodology ? (
            <section className="space-y-1.5">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">Methodology</h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{dataset.methodology}</p>
            </section>
          ) : null}

          {dataset.limitations ? (
            <section className="space-y-1.5">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">Known limitations</h3>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{dataset.limitations}</p>
            </section>
          ) : null}

          {(dataset.quality_warnings ?? []).length ? (
            <section className="space-y-1.5">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">
                Data-quality warnings
              </h3>
              <ul className="space-y-1.5 rounded-lg border border-amber-300/70 bg-amber-50/70 p-3 text-[12.5px] leading-relaxed text-amber-900">
                {(dataset.quality_warnings ?? []).map((warning) => (
                  <li key={warning}>• {warning}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-2 border-t border-border pt-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-primary/80">
              Indicator definitions and units
            </h3>
            {(dataset.indicators ?? []).map((key) => {
              const meta = INDICATORS[key];
              if (!meta) return null;
              return (
                <div key={key} className="text-[12.5px] leading-relaxed">
                  <p className="font-medium text-foreground">
                    {meta.label} <span className="font-normal text-muted-foreground">({meta.unit})</span>
                  </p>
                  <p className="text-muted-foreground">{meta.definition}</p>
                </div>
              );
            })}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}