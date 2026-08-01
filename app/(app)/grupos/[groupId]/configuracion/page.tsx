import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getGroupDetail } from "@/lib/queries";
import {
  createGroupInviteAction,
  deleteGroupAction,
  removeMemberAction,
  revokeInviteAction,
  toggleArchiveGroupAction,
} from "@/app/actions/groups";
import { formatDate } from "@/lib/dates";
import { Avatar } from "@/components/avatar";
import { Balance } from "@/components/money";
import { SubmitButton } from "@/components/submit-button";
import { CopyField } from "@/components/copy-field";
import { GroupSettingsForm } from "./group-settings-form";
import { AddMembersForm } from "./add-members-form";

export const metadata: Metadata = { title: "Configuración del grupo" };

export default async function GroupSettingsPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await requireUser();

  const group = await getGroupDetail(groupId);
  if (!group || !group.members.some((m) => m.id === user.id)) notFound();

  const isOwner = group.members.find((m) => m.id === user.id)?.role === "OWNER";
  const memberIds = group.members.map((m) => m.id);

  const [candidates, invites, hasMovements] = await Promise.all([
    prisma.user.findMany({
      where: { id: { notIn: memberIds } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, color: true, emoji: true },
    }),
    prisma.invitation.findMany({
      where: { groupId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.expense.count({ where: { groupId, deletedAt: null } }),
  ]);

  const appUrl = process.env.APP_URL ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`/grupos/${groupId}`} className="text-sm text-[var(--text-muted)] hover:underline">
        ← {group.emoji} {group.name}
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Configuración del grupo</h1>

      <section className="card p-5">
        <GroupSettingsForm
          group={{
            id: group.id,
            name: group.name,
            emoji: group.emoji,
            currency: group.currency,
            simplifyDebts: group.simplifyDebts,
          }}
          lockCurrency={hasMovements > 0}
        />
      </section>

      <section className="card">
        <h2 className="border-b px-5 py-3 text-sm font-semibold">
          Integrantes ({group.members.length})
        </h2>
        <ul className="divide-y">
          {group.members.map((member) => {
            const balance = group.net.get(member.id) ?? 0n;
            const canRemove =
              (member.id === user.id || isOwner) && balance === 0n && group.members.length > 1;

            return (
              <li key={member.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={member.name} color={member.color} emoji={member.emoji} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.name}
                    {member.id === user.id && (
                      <span className="ml-1 text-xs text-[var(--text-muted)]">(vos)</span>
                    )}
                    {member.role === "OWNER" && (
                      <span className="ml-2 chip border-transparent bg-[var(--surface-2)] text-[10px] text-[var(--text-muted)]">
                        admin
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{member.email}</p>
                </div>

                <Balance cents={balance} currency={group.currency} />

                {canRemove && (
                  <form action={removeMemberAction}>
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="userId" value={member.id} />
                    <SubmitButton
                      className="btn-ghost px-2 py-1 text-xs text-debt-500"
                      pendingLabel="…"
                      confirm={
                        member.id === user.id
                          ? "¿Salir de este grupo?"
                          : `¿Sacar a ${member.name} del grupo?`
                      }
                    >
                      {member.id === user.id ? "Salir" : "Sacar"}
                    </SubmitButton>
                  </form>
                )}
              </li>
            );
          })}
        </ul>

        {candidates.length > 0 && (
          <div className="border-t p-5">
            <AddMembersForm groupId={groupId} candidates={candidates} />
          </div>
        )}

        {hasMovements > 0 && !group.archivedAt && (
          <div className="border-t p-5">
            <p className="text-sm font-medium">¿Alguien se sumó tarde?</p>
            <p className="hint mt-0.5 mb-3">
              Si cargaste gastos antes de que estuvieran todos, podés agregarlos a los gastos
              anteriores y recalcular el reparto de una sola vez.
            </p>
            <Link href={`/grupos/${groupId}/incluir`} className="btn-secondary text-sm">
              Sumar a gastos anteriores
            </Link>
          </div>
        )}
      </section>

      <section className="card">
        <div className="border-b px-5 py-3">
          <h2 className="text-sm font-semibold">Invitar gente nueva</h2>
          <p className="hint mt-0.5">
            Generá un link y mandáselo por WhatsApp. Quien lo abra crea su cuenta y entra directo a
            este grupo. Vence a los 14 días y se usa una sola vez.
          </p>
        </div>

        {invites.length > 0 && (
          <ul className="divide-y">
            {invites.map((invite) => (
              <li key={invite.id} className="space-y-2 px-5 py-3">
                <CopyField value={`${appUrl}/registro?code=${invite.code}`} />
                <div className="flex items-center justify-between">
                  <p className="hint">
                    Creado por {invite.createdBy.name} · vence el {formatDate(invite.expiresAt)}
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
        )}

        <div className="border-t p-5">
          <form action={createGroupInviteAction} className="flex gap-2">
            <input type="hidden" name="groupId" value={groupId} />
            <input
              name="label"
              className="input"
              placeholder="Para quién es (opcional)"
              maxLength={60}
            />
            <SubmitButton className="btn-secondary shrink-0 text-sm" pendingLabel="Generando…">
              Generar link
            </SubmitButton>
          </form>
        </div>
      </section>

      {isOwner && (
        <section className="card border-debt-500/30">
          <h2 className="border-b px-5 py-3 text-sm font-semibold text-debt-500">Zona peligrosa</h2>
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">
                  {group.archivedAt ? "Desarchivar grupo" : "Archivar grupo"}
                </p>
                <p className="hint">
                  {group.archivedAt
                    ? "Vuelve a permitir cargar gastos."
                    : "Queda de sólo lectura, pero no se borra nada."}
                </p>
              </div>
              <form action={toggleArchiveGroupAction}>
                <input type="hidden" name="groupId" value={groupId} />
                <SubmitButton className="btn-secondary text-sm" pendingLabel="…">
                  {group.archivedAt ? "Desarchivar" : "Archivar"}
                </SubmitButton>
              </form>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div>
                <p className="text-sm font-medium">Eliminar grupo</p>
                <p className="hint">Borra el grupo y todos sus gastos. No se puede deshacer.</p>
              </div>
              <form action={deleteGroupAction}>
                <input type="hidden" name="groupId" value={groupId} />
                <SubmitButton
                  className="btn-danger text-sm"
                  pendingLabel="Borrando…"
                  confirm={`¿Eliminar "${group.name}" con todos sus gastos? Esto no se puede deshacer.`}
                >
                  Eliminar grupo
                </SubmitButton>
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
