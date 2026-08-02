"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fromDateInput } from "@/lib/dates";
import { getTimezone } from "@/lib/settings";
import { parseAmountToCents } from "@/lib/money";
import { settlementPlan } from "@/lib/balances";
import { loadLedgers } from "@/lib/queries";

export type ActionState = { error?: string; success?: string };

export async function createSettlementAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const fromUserId = String(formData.get("fromUserId") ?? "");
  const toUserId = String(formData.get("toUserId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const dateRaw = String(formData.get("date") ?? "").trim();

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!membership) return { error: "No sos miembro de este grupo." };

  if (fromUserId === toUserId) return { error: "El que paga y el que cobra no pueden ser la misma persona." };

  const members = await prisma.groupMember.findMany({
    where: { groupId, userId: { in: [fromUserId, toUserId] } },
    select: { userId: true },
  });
  if (members.length !== 2) return { error: "Ambas personas tienen que ser del grupo." };

  const amountCents = parseAmountToCents(String(formData.get("amount") ?? ""));
  if (amountCents === null || amountCents <= 0n) return { error: "El importe no es válido." };

  const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId } });

  await prisma.$transaction(async (tx) => {
    const settlement = await tx.settlement.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amountCents,
        currency: group.currency,
        date: dateRaw ? fromDateInput(dateRaw, await getTimezone()) : new Date(),
        note,
        createdById: user.id,
      },
      include: { from: { select: { name: true } }, to: { select: { name: true } } },
    });

    await tx.activity.create({
      data: {
        type: "SETTLEMENT_CREATED",
        groupId,
        actorId: user.id,
        settlementId: settlement.id,
        meta: {
          fromName: settlement.from.name,
          toName: settlement.to.name,
          amountCents: amountCents.toString(),
          currency: group.currency,
        },
      },
    });
  });

  revalidatePath(`/grupos/${groupId}`, "layout");
  revalidatePath("/");
  redirect(`/grupos/${groupId}`);
}

/**
 * Registra de un click un pago sugerido en "quién le debe a quién".
 * Antes de escribir vuelve a calcular el plan y verifica que esa
 * transferencia siga existiendo por ese monto: si la pantalla quedó vieja
 * (otro cargó un gasto mientras tanto) no registra nada equivocado.
 */
export async function quickSettleAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const fromUserId = String(formData.get("fromUserId") ?? "");
  const toUserId = String(formData.get("toUserId") ?? "");
  const amountCents = BigInt(String(formData.get("amountCents") ?? "0"));

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!membership) throw new Error("No sos miembro de este grupo.");

  const group = await prisma.group.findUniqueOrThrow({
    where: { id: groupId },
    include: { members: { select: { userId: true } } },
  });
  if (group.archivedAt) throw new Error("El grupo está archivado.");

  const ledger = (await loadLedgers([groupId])).get(groupId)!;
  const { transfers } = settlementPlan(ledger.expenses, ledger.settlements, {
    simplify: group.simplifyDebts,
    memberIds: group.members.map((m) => m.userId),
  });

  const stillValid = transfers.some(
    (t) => t.fromUserId === fromUserId && t.toUserId === toUserId && t.amountCents === amountCents,
  );
  if (!stillValid) {
    throw new Error(
      "Los saldos cambiaron desde que se cargó la pantalla. Recargá y fijate el monto actualizado.",
    );
  }

  const [from, to] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: fromUserId }, select: { name: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: toUserId }, select: { name: true } }),
  ]);

  await prisma.$transaction(async (tx) => {
    const settlement = await tx.settlement.create({
      data: {
        groupId,
        fromUserId,
        toUserId,
        amountCents,
        currency: group.currency,
        date: new Date(),
        createdById: user.id,
      },
    });

    await tx.activity.create({
      data: {
        type: "SETTLEMENT_CREATED",
        groupId,
        actorId: user.id,
        settlementId: settlement.id,
        meta: {
          fromName: from.name,
          toName: to.name,
          amountCents: amountCents.toString(),
          currency: group.currency,
        },
      },
    });
  });

  revalidatePath(`/grupos/${groupId}`, "layout");
  revalidatePath("/");
}

export async function deleteSettlementAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const settlementId = String(formData.get("settlementId") ?? "");

  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: { from: { select: { name: true } }, to: { select: { name: true } } },
  });
  if (!settlement || settlement.deletedAt) return;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: settlement.groupId, userId: user.id } },
  });
  if (!membership) throw new Error("No sos miembro de este grupo.");

  await prisma.$transaction([
    prisma.settlement.update({ where: { id: settlementId }, data: { deletedAt: new Date() } }),
    prisma.activity.create({
      data: {
        type: "SETTLEMENT_DELETED",
        groupId: settlement.groupId,
        actorId: user.id,
        meta: {
          fromName: settlement.from.name,
          toName: settlement.to.name,
          amountCents: settlement.amountCents.toString(),
          currency: settlement.currency,
        },
      },
    }),
  ]);

  revalidatePath(`/grupos/${settlement.groupId}`, "layout");
  revalidatePath("/");
  redirect(`/grupos/${settlement.groupId}`);
}
