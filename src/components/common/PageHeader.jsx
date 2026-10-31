import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";

export function PageHeader({ eyebrow, title, description, actions, className }) {
  const { t } = useLanguage();
  return (
    <header className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl space-y-2">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/65">{t(eyebrow)}</p>
        ) : null}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.035em] text-foreground sm:text-[30px]">{t(title)}</h1>
        {description ? <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground">{t(description)}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
