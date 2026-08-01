import type { Metadata } from "next";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { revokeInviteAction } from "@/app/actions/groups";
import { toggleAdminAction } from "@/app/actions/admin";
import { formatDate, formatRelative } from "@/lib/dates";
import { inviteUrl, isInviteUsable, usesLabel } from "@/lib/invites";
import { Avatar } from "@/components/avatar";
import { SubmitButton } from "@/components/submit-button";
import { CopyField } from "@/components/copy-field";
import { InviteForm } from "./invite-form";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Administración" };

export default async function AdminPage() {
  const me = await requireAdmin();

  const [users, allInvites] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        color: true,
        emoji: true,
        isAdmin: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
    }),
    prisma.invitation.findMany({
      // Se filtran por usos restantes en memoria: Prisma no compara dos columnas.
      where: { expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        group: { select: { name: true, emoji: true } },
      },
    }),
  ]);

  const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const invites = allInvites.filter((i) => isInviteUsable(i));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Administración</h1>
        <p className="text-sm text-[var(--text-muted)]">
          El registro es cerrado: sólo entra quien tenga un link de invitación.
        </p>
      </div>

      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold">Invitar a alguien nuevo</h2>
        <p className="hint mb-4">
          Genera un link para crear cuenta sin quedar en ningún grupo. Para invitar directo a un
          grupo, usá la configuración de ese grupo.
        </p>
        <InviteForm />
      </section>

      {invites.length > 0 && (
        <section className="card">
          <h2 className="border-b px-5 py-3 text-sm font-semibold">
            Invitaciones pendientes ({invites.length})
          </h2>
          <ul className="divide-y">
            {invites.map((invite) => (
              <li key={invite.id} className="space-y-2 px-5 py-3">
                <CopyField value={inviteUrl(appUrl, invite.code)} />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="hint">
                    {invite.label && <strong>{invite.label} · </strong>}
                    {invite.group ? `${invite.group.emoji} ${invite.group.name} · ` : "sin grupo · "}
                    {usesLabel(invite)} · vence el {formatDate(invite.expiresAt)}
                  </p>
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <SubmitButton className="btn-ghost px-2 py-1 text-xs text-debt-500" pendingLabel="…">
                      Revocar
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2 className="border-b px-5 py-3 text-sm font-semibold">Personas ({users.length})</h2>
        <ul className="divide-y">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <Avatar name={user.name} color={user.color} emoji={user.emoji} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user.name}
                  {user.isAdmin && (
                    <span className="ml-2 chip border-brand-500/30 bg-brand-500/10 text-[10px] text-brand-700 dark:text-brand-300">
                      admin
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {user.email} · {user._count.memberships}{" "}
                  {user._count.memberships === 1 ? "grupo" : "grupos"} · se registró{" "}
                  {formatRelative(user.createdAt)}
                </p>
              </div>

              {user.id !== me.id && (
                <form action={toggleAdminAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <SubmitButton className="btn-ghost px-2 py-1 text-xs" pendingLabel="…">
                    {user.isAdmin ? "Quitar admin" : "Hacer admin"}
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold">Restablecer una contraseña</h2>
        <p className="hint mb-4">
          No hay envío de mails: generá el link y pasáselo vos a la persona. Vence en 24 horas.
        </p>
        <ResetPasswordForm users={users.map((u) => ({ id: u.id, name: u.name, email: u.email }))} />
      </section>
    </div>
  );
}
