"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { newToken, requireUser } from "@/lib/auth";
import { settlementPlan } from "@/lib/balances";
import { loadLedgers } from "@/lib/queries";
import { CURRENCIES } from "@/lib/money";
import { GROUP_EMOJIS } from "@/lib/categories";

export type ActionState = { error?: string; success?: string };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function assertMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) throw new Error("No sos miembro de este grupo.");
  return membership;
}

async function assertOwner(groupId: string, userId: string) {
  const membership = await assertMember(groupId, userId);
  if (membership.role !== "OWNER") throw new Error("Sólo quien administra el grupo puede hacer esto.");
  return membership;
}

export async function createGroupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const name = text(formData, "name");
  const emoji = text(formData, "emoji") || "👥";
  const currency = text(formData, "currency") || "ARS";
  const memberIds = formData.getAll("memberIds").map(String).filter(Boolean);

  if (name.length < 2) return { error: "Poné un nombre para el grupo." };
  if (!CURRENCIES.some((c) => c.code === currency)) return { error: "Moneda inválida." };
  if (!GROUP_EMOJIS.includes(emoji)) return { error: "Ese ícono no está disponible." };

  const others = memberIds.filter((id) => id !== user.id);
  const valid = await prisma.user.findMany({
    where: { id: { in: others } },
    select: { id: true },
  });

  const group = await prisma.$transaction(async (tx) => {
    const created = await tx.group.create({
      data: {
        name,
        emoji,
        currency,
        createdById: user.id,
        members: {
          create: [
            { userId: user.id, role: "OWNER" },
            ...valid.map((u) => ({ userId: u.id, role: "MEMBER" as const })),
          ],
        },
      },
    });

    await tx.activity.create({
      data: {
        type: "GROUP_CREATED",
        groupId: created.id,
        actorId: user.id,
        meta: { name: created.name },
      },
    });

    return created;
  });

  revalidatePath("/");
  redirect(`/grupos/${group.id}`);
}

export async function updateGroupAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const groupId = text(formData, "groupId");
  const name = text(formData, "name");
  const emoji = text(formData, "emoji");
  const currency = text(formData, "currency");
  const simplifyDebts = formData.get("simplifyDebts") === "on";

  try {
    await assertMember(groupId, user.id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (name.length < 2) return { error: "El nombre necesita al menos 2 caracteres." };
  if (!CURRENCIES.some((c) => c.code === currency)) return { error: "Moneda inválida." };

  const hasMovements =
    (await prisma.expense.count({ where: { groupId, deletedAt: null } })) > 0 ||
    (await prisma.settlement.count({ where: { groupId, deletedAt: null } })) > 0;

  const current = await prisma.group.findUniqueOrThrow({ where: { id: groupId } });
  if (hasMovements && currency !== current.currency) {
    return { error: "No se puede cambiar la moneda: el grupo ya tiene gastos cargados." };
  }

  await prisma.group.update({
    where: { id: groupId },
    data: { name, emoji, currency, simplifyDebts },
  });

  revalidatePath(`/grupos/${groupId}`, "layout");
  revalidatePath("/");
  return { success: "Grupo actualizado." };
}

export async function addMembersAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const groupId = text(formData, "groupId");
  const userIds = formData.getAll("userIds").map(String).filter(Boolean);

  try {
    await assertMember(groupId, user.id);
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (userIds.length === 0) return { error: "Elegí al menos una persona." };

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const u of users) {
      const exists = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: u.id } },
      });
      if (exists) continue;

      await tx.groupMember.create({ data: { groupId, userId: u.id } });
      await tx.activity.create({
        data: {
          type: "MEMBER_JOINED",
          groupId,
          actorId: user.id,
          meta: { name: u.name },
        },
      });
    }
  });

  revalidatePath(`/grupos/${groupId}`, "layout");
  return { success: `Se sumaron ${users.length} persona(s).` };
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const targetId = String(formData.get("userId") ?? "");

  const membership = await assertMember(groupId, user.id);
  // Cualquiera puede irse solo; sacar a otro requiere ser owner.
  if (targetId !== user.id && membership.role !== "OWNER") {
    throw new Error("Sólo quien administra el grupo puede sacar a otra persona.");
  }

  const group = await prisma.group.findUniqueOrThrow({
    where: { id: groupId },
    include: { members: { select: { userId: true } } },
  });

  const ledger = (await loadLedgers([groupId])).get(groupId)!;
  const { net } = settlementPlan(ledger.expenses, ledger.settlements, {
    simplify: group.simplifyDebts,
    memberIds: group.members.map((m) => m.userId),
  });

  if ((net.get(targetId) ?? 0n) !== 0n) {
    throw new Error("Esa persona tiene saldo pendiente en el grupo. Salden las cuentas primero.");
  }

  const target = await prisma.user.findUniqueOrThrow({ where: { id: targetId } });

  await prisma.$transaction([
    prisma.groupMember.delete({ where: { groupId_userId: { groupId, userId: targetId } } }),
    prisma.activity.create({
      data: { type: "MEMBER_LEFT", groupId, actorId: user.id, meta: { name: target.name } },
    }),
  ]);

  revalidatePath(`/grupos/${groupId}`, "layout");
  revalidatePath("/");

  if (targetId === user.id) redirect("/grupos");
}

export async function toggleArchiveGroupAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  await assertOwner(groupId, user.id);

  const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId } });
  await prisma.group.update({
    where: { id: groupId },
    data: { archivedAt: group.archivedAt ? null : new Date() },
  });

  revalidatePath("/", "layout");
  redirect(`/grupos/${groupId}`);
}

export async function deleteGroupAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  await assertOwner(groupId, user.id);

  await prisma.group.delete({ where: { id: groupId } });

  revalidatePath("/", "layout");
  redirect("/grupos");
}

export async function createGroupInviteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  await assertMember(groupId, user.id);

  await prisma.invitation.create({
    data: {
      code: newToken(),
      groupId,
      createdById: user.id,
      label: String(formData.get("label") ?? "").trim() || null,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath(`/grupos/${groupId}/configuracion`);
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const inviteId = String(formData.get("inviteId") ?? "");

  const invite = await prisma.invitation.findUnique({ where: { id: inviteId } });
  if (!invite) return;
  if (invite.createdById !== user.id && !user.isAdmin) {
    if (invite.groupId) await assertOwner(invite.groupId, user.id);
    else throw new Error("No podés revocar esa invitación.");
  }

  await prisma.invitation.delete({ where: { id: inviteId } });

  if (invite.groupId) revalidatePath(`/grupos/${invite.groupId}/configuracion`);
  revalidatePath("/admin");
}
