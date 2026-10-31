import { useLanguage } from "@/lib/LanguageContext";

// Full-screen card shared by the auth pages; it sets its own color tokens so it stays readable under any theme.
export function AuthLayout({ icon: Icon, title, subtitle, footer, children, wide = false }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-md"}`}>
        <div className="mb-4 flex justify-end">
          <label className="sr-only" htmlFor="auth-language">{t("language")}</label>
          <select id="auth-language" value={language} onChange={(event) => setLanguage(event.target.value)} className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground">
            <option value="en">{t("english")}</option><option value="rw">{t("kinyarwanda")}</option>
          </select>
        </div>
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Icon className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm">{children}</div>
        {footer && <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>}
      </div>
    </div>
  );
}
