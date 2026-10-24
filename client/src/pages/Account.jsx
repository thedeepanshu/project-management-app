import { useApolloClient } from "@apollo/client/react";
import { BadgeCheck, KeyRound, Laptop, LogOut, Mail, ShieldCheck, Smartphone, Trash2, UserRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PasswordInput } from "../components/auth/PasswordInput";
import { PROVIDERS } from "../components/auth/providers";
import { PageHeader } from "../components/layout/PageHeader";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Field, Input } from "../components/ui/Field";
import { Modal } from "../components/ui/Modal";
import { Card, Skeleton } from "../components/ui/States";
import { useAppConfig } from "../hooks/useAppConfig";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { authClient, authErrorMessage } from "../lib/authClient";
import { describeDevice } from "../lib/device";
import { formatRelative } from "../lib/format";

function Section({ icon: Icon, title, description, children }) {
  return (
    <Card className="p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-twill-500/10 text-twill-600 dark:text-twill-300">
          <Icon className="size-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

function ProfileSection({ user }) {
  const [name, setName] = useState(user.name ?? "");
  const [saving, setSaving] = useState(false);
  const changed = name.trim() !== (user.name ?? "") && name.trim().length >= 2;

  async function save(event) {
    event.preventDefault();
    if (name.trim().length < 2 || name.trim().length > 80) return toast.error("Name must be 2–80 characters.");
    setSaving(true);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setSaving(false);
    if (error) toast.error(authErrorMessage(error));
    else toast.success("Profile updated");
  }

  return (
    <Section icon={UserRound} title="Profile" description="How you appear in Twillboard.">
      <form onSubmit={save} className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <Avatar name={user.name || user.email} src={user.image} size="lg" />
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            {(a11y) => <Input {...a11y} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />}
          </Field>
          <Field label="Email">
            {(a11y) => (
              <div className="relative">
                <Input {...a11y} value={user.email} readOnly className="pr-24 text-muted" />
                {user.emailVerified && (
                  <span className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <BadgeCheck className="size-4" /> Verified
                  </span>
                )}
              </div>
            )}
          </Field>
        </div>
        <Button type="submit" variant="secondary" loading={saving} disabled={!changed}>
          Save
        </Button>
      </form>
    </Section>
  );
}

function SignInMethods({ accounts, reload }) {
  const { auth } = useAppConfig();
  const [busy, setBusy] = useState(null);
  const linked = new Set(accounts.map((account) => account.providerId));
  const hasPassword = linked.has("credential");

  async function connect(provider) {
    setBusy(provider);
    const { error } = await authClient.linkSocial({ provider, callbackURL: "/account?linked=1" });
    if (error) {
      setBusy(null);
      toast.error(authErrorMessage(error));
    }
  }

  async function disconnect(providerId) {
    setBusy(providerId);
    const { error } = await authClient.unlinkAccount({ providerId });
    setBusy(null);
    if (error) toast.error(authErrorMessage(error));
    else {
      toast.success(`${PROVIDERS[providerId]?.label ?? providerId} disconnected`);
      reload();
    }
  }

  const rows = [
    ...(hasPassword ? [{ id: "credential", label: "Email & password", icon: <Mail className="size-5 text-muted" />, linked: true }] : []),
    ...Object.entries(PROVIDERS)
      .filter(([id]) => auth.providers.includes(id) || linked.has(id))
      .map(([id, { label, Icon }]) => ({ id, label, icon: <Icon />, linked: linked.has(id) })),
  ];

  return (
    <Section icon={ShieldCheck} title="Sign-in methods" description="Ways you can sign in to this account.">
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span className="grid size-9 place-items-center rounded-xl bg-elevated ring-1 ring-line">{row.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{row.label}</p>
              <p className="text-xs text-subtle">{row.linked ? "Connected" : "Not connected"}</p>
            </div>
            {row.id === "credential" ? null : row.linked ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => disconnect(row.id)}
                loading={busy === row.id}
                disabled={accounts.length <= 1}
                title={accounts.length <= 1 ? "You need at least one way to sign in" : undefined}
              >
                Disconnect
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => connect(row.id)} loading={busy === row.id}>
                Connect
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function PasswordSection({ hasPassword, email }) {
  const { auth } = useAppConfig();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  if (!hasPassword) {
    async function sendSetLink() {
      setSaving(true);
      const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
      setSaving(false);
      if (error) toast.error(authErrorMessage(error));
      else setLinkSent(true);
    }
    return (
      <Section icon={KeyRound} title="Password" description="You sign in with a connected account and don't have a password yet.">
        {linkSent ? (
          <p className="text-sm text-muted">We've emailed {email} a link to set a password. It expires in 30 minutes.</p>
        ) : (
          <Button variant="secondary" onClick={sendSetLink} loading={saving}>
            Email me a link to set a password
          </Button>
        )}
      </Section>
    );
  }

  async function save(event) {
    event.preventDefault();
    if (!current) return toast.error("Enter your current password.");
    if (next.length < auth.password.min) return toast.error(`New password needs at least ${auth.password.min} characters.`);
    if (next === current) return toast.error("Choose a password different from the current one.");
    setSaving(true);
    const { error } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: signOutOthers,
    });
    setSaving(false);
    if (error) return toast.error(authErrorMessage(error));
    setCurrent("");
    setNext("");
    toast.success(signOutOthers ? "Password changed. Other devices were signed out." : "Password changed");
  }

  return (
    <Section icon={KeyRound} title="Password" description="Use a long password you don't use anywhere else.">
      <form onSubmit={save} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password">
            {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}
          </Field>
          <Field label="New password">
            {(a11y) => (
              <PasswordInput
                {...a11y}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                maxLength={auth.password.max}
                minLength={auth.password.min}
                showStrength
              />
            )}
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={signOutOthers} onChange={(e) => setSignOutOthers(e.target.checked)} className="size-4 accent-twill-600" />
            Sign out of other devices
          </label>
          <Button type="submit" variant="secondary" loading={saving}>
            Change password
          </Button>
        </div>
      </form>
    </Section>
  );
}

function SessionsSection({ sessions, currentToken, reload }) {
  const [busy, setBusy] = useState(null);

  async function revoke(token) {
    setBusy(token);
    const { error } = await authClient.revokeSession({ token });
    setBusy(null);
    if (error) toast.error(authErrorMessage(error));
    else {
      toast.success("Device signed out");
      reload();
    }
  }

  async function revokeOthers() {
    setBusy("others");
    const { error } = await authClient.revokeOtherSessions();
    setBusy(null);
    if (error) toast.error(authErrorMessage(error));
    else {
      toast.success("Signed out of all other devices");
      reload();
    }
  }

  const sorted = [...sessions].sort((a, b) => (a.token === currentToken ? -1 : b.token === currentToken ? 1 : new Date(b.updatedAt) - new Date(a.updatedAt)));

  return (
    <Section icon={Laptop} title="Active sessions" description="Devices currently signed in to your account.">
      <ul className="divide-y divide-line">
        {sorted.map((session) => {
          const device = describeDevice(session.userAgent);
          const current = session.token === currentToken;
          return (
            <li key={session.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="grid size-9 place-items-center rounded-xl bg-elevated text-muted ring-1 ring-line">
                {device.mobile ? <Smartphone className="size-4" /> : <Laptop className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {device.label}
                  {current && <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">This device</span>}
                </p>
                <p className="truncate text-xs text-subtle">
                  {/* Hide local/placeholder addresses (e.g. masked IPv6 localhost shows as all zeros). */}
                  {session.ipAddress && !/^[0:.]*$|^::1$|^127\./.test(session.ipAddress) ? `${session.ipAddress} · ` : ""}
                  Active {formatRelative(session.updatedAt)}
                </p>
              </div>
              {!current && (
                <Button variant="ghost" size="sm" onClick={() => revoke(session.token)} loading={busy === session.token}>
                  Sign out
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {sessions.length > 1 && (
        <Button variant="secondary" size="sm" className="mt-5" onClick={revokeOthers} loading={busy === "others"}>
          <LogOut /> Sign out of all other devices
        </Button>
      )}
    </Section>
  );
}

function DeleteAccount({ user, hasPassword }) {
  const apollo = useApolloClient();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const ready = confirmText.trim().toLowerCase() === "delete" && (!hasPassword || password.length > 0);

  async function remove() {
    setDeleting(true);
    setError(null);
    const { error: deleteError } = await authClient.deleteUser(hasPassword ? { password } : {});
    setDeleting(false);
    if (deleteError) {
      if (deleteError.code === "SESSION_NOT_FRESH" || deleteError.code === "SESSION_EXPIRED") {
        setError("For your security, sign out and sign in again, then delete your account within 15 minutes.");
      } else setError(authErrorMessage(deleteError));
      return;
    }
    // A full page load (not an in-app navigation): the account is gone, so drop
    // everything in memory, and don't race the route guard's own redirect.
    await apollo.clearStore();
    window.location.replace("/sign-in?deleted=1");
  }

  return (
    <Card className="border border-red-500/25 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight text-red-600 dark:text-red-400">Delete account</h2>
          <p className="text-sm text-muted">Permanently delete your account, all clients, projects and uploaded files.</p>
        </div>
        <Button variant="danger" onClick={() => setOpen(true)}>
          <Trash2 /> Delete account
        </Button>
      </div>

      <Modal open={open} onClose={() => !deleting && setOpen(false)} title="Delete your account?" size="sm">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">
            This permanently deletes <strong className="text-ink">{user.email}</strong> and everything in it. It can't be undone.
          </p>
          {error && <p role="alert" className="rounded-xl bg-red-500/8 px-3 py-2 text-sm text-red-700 ring-1 ring-red-500/20 dark:text-red-300">{error}</p>}
          {hasPassword && (
            <Field label="Your password">
              {(a11y) => <PasswordInput {...a11y} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            </Field>
          )}
          <Field label='Type "delete" to confirm'>
            {(a11y) => <Input {...a11y} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />}
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} loading={deleting} disabled={!ready}>
              Delete forever
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

async function fetchSecurity() {
  const [accounts, sessions] = await Promise.all([authClient.listAccounts(), authClient.listSessions()]);
  return { accounts: accounts.data ?? [], sessions: sessions.data ?? [] };
}

export default function Account() {
  useDocumentTitle("Account");
  const { data: session } = authClient.useSession();
  const [accounts, setAccounts] = useState(null);
  const [sessions, setSessions] = useState(null);

  const apply = useCallback((result) => {
    setAccounts(result.accounts);
    setSessions(result.sessions);
  }, []);
  const load = useCallback(() => fetchSecurity().then(apply), [apply]);

  useEffect(() => {
    let active = true;
    fetchSecurity().then((result) => active && apply(result));
    // Coming back from connecting a provider.
    const params = new URLSearchParams(window.location.search);
    if (params.has("linked")) toast.success("Account connected", { id: "account-linked" });
    if (params.get("error")) toast.error("That account couldn't be connected. It may already be linked to another Twillboard account.", { id: "account-link-error" });
    return () => {
      active = false;
    };
  }, [apply]);

  if (!session) return null;
  const user = session.user;
  const hasPassword = accounts?.some((account) => account.providerId === "credential");

  return (
    <>
      <PageHeader eyebrow="Settings" title="Account">
        Manage your profile, how you sign in, and your security.
      </PageHeader>
      <div className="max-w-3xl space-y-6">
        <ProfileSection user={user} />
        {accounts === null || sessions === null ? (
          <>
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </>
        ) : (
          <>
            <SignInMethods accounts={accounts} reload={load} />
            <PasswordSection hasPassword={hasPassword} email={user.email} />
            <SessionsSection sessions={sessions} currentToken={session.session.token} reload={load} />
            <DeleteAccount user={user} hasPassword={hasPassword} />
          </>
        )}
      </div>
    </>
  );
}
