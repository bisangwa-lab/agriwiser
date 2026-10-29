import { ArrowRight, ClipboardCheck, Eye, Loader2, Lock, LogIn, Mail, ShieldCheck, Sprout, TrendingUp } from "lucide-react";
import { useState } from "react";
import { base44, isLocalAuth } from "@/api/base44Client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthError, AuthLink, GoogleButton, OrDivider, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";
import { destinationAfterSignIn, signIn, signInError } from "@/lib/sign-in";
import { QUICK_LOCAL_ACCOUNTS } from "@/lib/local-quick-login";

const quickLoginEnabled = isLocalAuth && import.meta.env.DEV && import.meta.env.VITE_LOCAL_QUICK_LOGIN === "true";
const PANEL_ICONS = { admin: ShieldCheck, analytics: TrendingUp, field_operations: ClipboardCheck, community_business: Sprout, public_insights: Eye };

// The /login page. ?returnTo= (or the platform's ?from_url=) is where the visitor
// goes after signing in — the login gate and the MCP consent page send people here with it.
export function LoginPage() {
  const returnTo = safeReturnTo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [quickAccount, setQuickAccount] = useState(null);

  async function quickSignIn(account) {
    setError("");
    setBusy(true);
    setQuickAccount(account);
    try {
      await base44.auth.quickLogin(account);
      const user = await base44.auth.me();
      if (!user?.id) throw new Error("Your session could not be verified. Please try again.");
      window.location.assign(destinationAfterSignIn(user, QUICK_LOCAL_ACCOUNTS[account].path));
    } catch (err) {
      setError(signInError(err));
      setBusy(false);
      setQuickAccount(null);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { destination } = await signIn(base44.auth, { email, password, returnTo });
      window.location.assign(destination);
    } catch (err) {
      setError(isLocalAuth && /invalid email or password/i.test(err?.message ?? "")
        ? "Email or password not recognized. Check your local account details, or create an account."
        : signInError(err));
      setBusy(false);
    }
  }

  return (
    <AuthLayout icon={LogIn} title="Welcome to HingaSmart" subtitle={quickLoginEnabled ? "Choose one of the five panels to start" : "Sign in to your assigned workspace"} wide={quickLoginEnabled}>
      <GoogleButton returnTo={returnTo} />
      <OrDivider />
      <AuthError>{error}</AuthError>
      {quickLoginEnabled && <section aria-label="Quick local sign-in" className="mb-6 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Choose a panel</h2>
          <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-medium text-accent-foreground">Local development</span>
        </div>
        <p className="text-xs text-muted-foreground">One click opens that panel with its own account and navigation. No password needed here.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(QUICK_LOCAL_ACCOUNTS).map(([key, account]) => {
            const Icon = PANEL_ICONS[account.key];
            return <button key={key} type="button" onClick={() => quickSignIn(key)} disabled={busy}
              aria-label={`Open ${account.label} panel`}
              className={`group flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-accent/40 p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 ${key === "viewer" ? "sm:col-span-2" : ""}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Icon className="h-5 w-5" aria-hidden /></span>
              <span className="flex-1"><span className="block text-sm font-semibold">{account.label}</span><span className="block text-xs text-muted-foreground">{account.description}</span></span>
              {quickAccount === key ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowRight className="h-4 w-4 text-primary" aria-hidden />}
            </button>;
          })}
        </div>
      </section>}
      <details open={!quickLoginEnabled}>
      <summary className={quickLoginEnabled ? "mb-4 cursor-pointer text-xs font-medium text-primary" : "hidden"}>Use email and password instead</summary>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="login-email" type="email" autoComplete="email" autoFocus={!quickLoginEnabled} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 pl-10" disabled={busy} required />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            {!isLocalAuth && <AuthLink to="/forgot-password" returnTo={returnTo} className="text-xs text-primary hover:underline">
              Forgot password?
            </AuthLink>}
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-10" disabled={busy} required />
          </div>
        </div>
        <SubmitButton busy={busy} busyLabel="Logging in...">
          Log in
        </SubmitButton>
      </form>
      </details>
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        {isLocalAuth
          ? "Local accounts are stored on this computer. Use your local account; your assigned role determines which workspace opens."
          : "Use the same account as the published HingaSmart app. Your assigned role determines which workspace opens."}
      </p>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <AuthLink to="/register" returnTo={returnTo}>
          Create one
        </AuthLink>
      </p>
    </AuthLayout>
  );
}
