import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { requireWorkspace } from "@/lib/route-access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { ToneTag } from "@/components/common/ToneTag";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { displayName, isAdmin, workspaceRole, workspaceRoleLabel } from "@/lib/roles";
import { WORKSPACE_ROLES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Loader2, ShieldCheck, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authed/settings")({
  beforeLoad: requireWorkspace(["data_manager"]),
  head: () => ({ meta: [{ title: "Settings · HingaSmart Rwanda" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, refresh } = useAuth();
  const admin = isAdmin(user);

  const [workspace, setWorkspace] = useState(null);
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState(null);

  const currentWorkspace = workspace ?? workspaceRole(user);

  async function saveWorkspace(value) {
    setWorkspace(value);
    setSavingWorkspace(true);
    setNotice(null);
    try {
      await base44.auth.updateMe({ workspace_role: value });
      await refresh();
      setNotice(`Saved. Your workspace preference is now ${workspaceRoleLabel({ workspace_role: value })}.`);
    } catch (err) {
      setNotice(err?.message ?? "The workspace preference could not be saved.");
    } finally {
      setSavingWorkspace(false);
    }
  }

  async function invite(event) {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setNotice(null);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      setNotice(`An invitation was sent to ${inviteEmail.trim()} with the ${inviteRole === "admin" ? "administrator" : "member"} role.`);
      setInviteEmail("");
    } catch (err) {
      setNotice(err?.message ?? "The invitation could not be sent.");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Account, workspace and permissions"
        description="Who can do what is decided by the account role and enforced on the stored records. A workspace changes which tools are in front of you and which defaults you see; it never grants access that the records do not already allow."
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="panel border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your account</CardTitle>
            <CardDescription className="text-[12.5px]">
              The account role is what the platform checks whenever a record is read or changed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-x-6 gap-y-3 text-[12.5px] sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium text-foreground">{displayName(user)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-words font-medium text-foreground">{user?.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Account role</dt>
                <dd>
                  <ToneTag tone={admin ? "primary" : "neutral"}>
                    {admin ? (
                      <>
                        <ShieldCheck className="h-3 w-3" aria-hidden />
                        Administrator
                      </>
                    ) : (
                      "Member"
                    )}
                  </ToneTag>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Workspace</dt>
                <dd className="font-medium text-foreground">{workspaceRoleLabel(user)}</dd>
              </div>
            </dl>
            {user?.created_date ? (
              <p className="text-[11.5px] text-muted-foreground">Account created {formatDate(user.created_date)}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="panel border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Workspace preference</CardTitle>
            <CardDescription className="text-[12.5px]">
              This only changes which tools are emphasised for you. It does not change what you can read or
              change — that is decided by the permission rules below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="workspace-select">Workspace</Label>
              <Select value={currentWorkspace} onValueChange={saveWorkspace} disabled={savingWorkspace}>
                <SelectTrigger id="workspace-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKSPACE_ROLES.map((role) => (
                    <SelectItem key={role.key} value={role.key}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {WORKSPACE_ROLES.map((role) => (
              <div key={role.key} className="rounded-lg border border-border/80 p-3">
                <p className="text-[13px] font-medium text-foreground">{role.label}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{role.description}</p>
              </div>
            ))}
            {notice ? <p className="text-[12.5px] text-muted-foreground">{notice}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card className="panel border-0 shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Permissions enforced on the records</CardTitle>
          <CardDescription className="text-[12.5px]">
            These rules are applied to every read and write, whoever is signed in and whatever workspace they
            chose. Nothing here is protected by hiding a button.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-[12.5px] leading-relaxed text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Signed-in accounts</span> can read datasets,
              observations, alerts, investigations and their observations and follow-up actions.
            </li>
            <li>
              <span className="font-medium text-foreground">Administrators only</span> can create, change or
              delete datasets, observations and import logs — which covers every import and every dataset
              description.
            </li>
            <li>
              <span className="font-medium text-foreground">Investigations, follow-up actions and observations</span>{" "}
              form a shared team workspace: signed-in members can add and progress them, and only administrators
              can delete them.
            </li>
            <li>
              <span className="font-medium text-foreground">Nothing is public.</span> The whole platform requires
              a signed-in account, so no indicator or investigation is readable by an anonymous visitor.
            </li>
          </ul>
        </CardContent>
      </Card>

      {admin ? (
        <Card className="panel border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invite an account</CardTitle>
            <CardDescription className="text-[12.5px]">
              Invitations create the account and send an email. Administrators can invite both roles; members can
              only invite members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={invite} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px] flex-1 space-y-1.5">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="colleague@example.rw"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role" className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Member</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                {inviting ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                )}
                Send invitation
              </Button>
            </form>
            <p className="text-[11.5px] leading-relaxed text-muted-foreground">
              Seeing the list of accounts, changing someone's role, or removing access happens in the app
              dashboard, on the App Users page — not from inside the app. That keeps account administration
              separate from the agricultural workflow.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="panel border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Accounts and roles</CardTitle>
            <CardDescription className="text-[12.5px]">
              Invitations, role changes and access are managed by an administrator from the app dashboard's App
              Users page.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}