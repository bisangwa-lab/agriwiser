import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A row of labelled filters plus a documented reset. `fields` is
 * [{ key, label, allLabel, options: [{ value, label }] }].
 */
export function FilterBar({ fields, filters, onChange, onReset, className, children, disabled = false }) {
  return (
    <div className={cn("panel p-4 sm:p-5", className)}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`filter-${field.key}`} className="text-[11.5px] font-medium text-muted-foreground">
              {field.label}
            </Label>
            <Select value={filters[field.key] ?? "all"} onValueChange={(value) => onChange(field.key, value)} disabled={disabled}>
              <SelectTrigger id={`filter-${field.key}`} className="h-10 border-border/80 bg-muted/30 text-[12px]">
                <SelectValue placeholder={field.allLabel ?? "All"} />
              </SelectTrigger>
              <SelectContent>
                {field.allowAll !== false && <SelectItem value="all">{field.allLabel ?? "All"}</SelectItem>}
                {field.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        {children}
        <Button variant="ghost" size="sm" onClick={onReset} disabled={disabled} className="h-7 text-[11px]">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
          Reset filters
        </Button>
      </div>
    </div>
  );
}
