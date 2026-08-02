"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fromDateInput } from "@/lib/dates";
import { getTimezone } from "@/lib/settings";
import { parseAmountToCents } from "@/lib/money";
import { computePayers, computeShares, resplitWith, type SplitType } from "@/lib/split";
import { getCategory } from "@/lib/categories";

export type ActionState = { error?: string; success?: string };

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Extrae los campos "prefijo:userId" del formulario. */
function prefixed(formData: FormData, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith(prefix)) out[key.slice(prefix.length)] = String(value);
  }
  return out;
}

type ParsedExpense = {
  description: string;
  amountCents: bigint;
  date: Date;
  category: string;
  notes: string | null;
  splitType: SplitType;
  payers: { userId: string; amountCents: bigint }[];
  shares: { userId: string; amountCents: bigint; weight: number | null }[];
};

async function parseExpenseForm(
  formData: FormData,
  groupId: string,
): Promise<{ ok: true; data: ParsedExpense } | { ok: false; error: string }> {
  const memberIds = new Set(
    (await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } })).map(
      (m) => m.userId,
    ),
  );

  const description = text(formData, "description");
  if (description.length < 1) return { ok: false, error: "Poné una descripción." };
  if (description.length > 120) return { ok: false, error: "La descripción es muy larga." };

  const amountCents = parseAmountToCents(text(formData, "amount"));
  if (amountCents === null || amountCents <= 0n) {
    return { ok: false, error: "El importe no es válido." };
  }

  const dateRaw = text(formData, "date");
  const date = dateRaw ? fromDateInput(dateRaw, await getTimezone()) : new Date();
  if (Number.isNaN(date.getTime())) return { ok: false, error: "La fecha no es válida." };

  const category = getCategory(text(formData, "category")).id;
  const notes = text(formData, "notes") || null;

  const splitType = text(formData, "splitType") as SplitType;
  if (!["EQUAL", "EXACT", "PERCENT", "SHARES"].includes(splitType)) {
    return { ok: false, error: "Tipo de división inválido." };
  }

  // --- quién pagó
  const payerMode = text(formData, "payerMode") || "single";
  let payerEntries: { userId: string; raw: string }[];

  if (payerMode === "single") {
    const payerId = text(formData, "payerId");
    if (!memberIds.has(payerId)) return { ok: false, error: "Quien pagó no es miembro del grupo." };
    payerEntries = [{ userId: payerId, raw: text(formData, "amount") }];
  } else {
    const raw = prefixed(formData, "payer:");
    payerEntries = Object.entries(raw)
      .filter(([userId]) => memberIds.has(userId))
      .map(([userId, value]) => ({ userId, raw: value }));
  }

  const payersResult = computePayers(amountCents, payerEntries);
  if (!payersResult.ok) return { ok: false, error: payersResult.error };

  // --- entre quiénes se divide
  const participants = formData
    .getAll("participants")
    .map(String)
    .filter((id) => memberIds.has(id));

  const sharesResult = computeShares(
    amountCents,
    splitType,
    participants,
    prefixed(formData, "share:"),
  );
  if (!sharesResult.ok) return { ok: false, error: sharesResult.error };

  return {
    ok: true,
    data: {
      description,
      amountCents,
      date,
      category,
      notes,
      splitType,
      payers: payersResult.payers,
      shares: sharesResult.shares,
    },
  };
}

export async function createExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const groupId = text(formData, "groupId");

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!membership) return { error: "No sos miembro de este grupo." };

  const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId } });
  if (group.archivedAt) return { error: "El grupo está archivado." };

  const parsed = await parseExpenseForm(formData, groupId);
  if (!parsed.ok) return { error: parsed.error };

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        groupId,
        description: parsed.data.description,
        amountCents: parsed.data.amountCents,
        currency: group.currency,
        date: parsed.data.date,
        category: parsed.data.category,
        notes: parsed.data.notes,
        splitType: parsed.data.splitType,
        createdById: user.id,
        payers: { create: parsed.data.payers },
        shares: { create: parsed.data.shares },
      },
    });

    await tx.activity.create({
      data: {
        type: "EXPENSE_CREATED",
        groupId,
        actorId: user.id,
        expenseId: created.id,
        meta: {
          description: created.description,
          amountCents: created.amountCents.toString(),
          currency: created.currency,
        },
      },
    });

    await tx.group.update({ where: { id: groupId }, data: { updatedAt: new Date() } });
    return created;
  });

  revalidatePath(`/grupos/${groupId}`, "layout");
  revalidatePath("/");
  redirect(`/grupos/${groupId}/gastos/${expense.id}`);
}

export async function updateExpenseAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const expenseId = text(formData, "expenseId");

  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!existing || existing.deletedAt) return { error: "Ese gasto ya no existe." };

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: existing.groupId, userId: user.id } },
  });
  if (!membership) return { error: "No sos miembro de este grupo." };

  const parsed = await parseExpenseForm(formData, existing.groupId);
  if (!parsed.ok) return { error: parsed.error };

  await prisma.$transaction(async (tx) => {
    await tx.expensePayer.deleteMany({ where: { expenseId } });
    await tx.expenseShare.deleteMany({ where: { expenseId } });

    await tx.expense.update({
      where: { id: expenseId },
      data: {
        description: parsed.data.description,
        amountCents: parsed.data.amountCents,
        date: parsed.data.date,
        category: parsed.data.category,
        notes: parsed.data.notes,
        splitType: parsed.data.splitType,
        payers: { create: parsed.data.payers },
        shares: { create: parsed.data.shares },
      },
    });

    await tx.activity.create({
      data: {
        type: "EXPENSE_UPDATED",
        groupId: existing.groupId,
        actorId: user.id,
        expenseId,
        meta: {
          description: parsed.data.description,
          amountCents: parsed.data.amountCents.toString(),
          currency: existing.currency,
        },
      },
    });
  });

  revalidatePath(`/grupos/${existing.groupId}`, "layout");
  revalidatePath("/");
  redirect(`/grupos/${existing.groupId}/gastos/${expenseId}`);
}

/**
 * Suma gente a gastos que ya estaban cargados y recalcula el reparto.
 * Resuelve el caso típico: armaste el grupo, cargaste gastos y recién
 * después se sumaron los que faltaban.
 */
export async function includeInExpensesAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const groupId = text(formData, "groupId");

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!membership) return { error: "No sos miembro de este grupo." };

  const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId } });
  if (group.archivedAt) return { error: "El grupo está archivado." };

  const addedUserIds = formData.getAll("addedUserIds").map(String).filter(Boolean);
  const expenseIds = formData.getAll("expenseIds").map(String).filter(Boolean);

  if (addedUserIds.length === 0) return { error: "Elegí a quién querés sumar." };
  if (expenseIds.length === 0) return { error: "Elegí al menos un gasto." };

  const members = await prisma.groupMember.findMany({
    where: { groupId, userId: { in: addedUserIds } },
    select: { userId: true, user: { select: { name: true } } },
  });
  if (members.length !== addedUserIds.length) {
    return { error: "Todas las personas tienen que ser miembros del grupo." };
  }

  const expenses = await prisma.expense.findMany({
    where: { id: { in: expenseIds }, groupId, deletedAt: null },
    include: { shares: { select: { userId: true, weight: true } } },
  });

  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const expense of expenses) {
      const shares = resplitWith(
        expense.amountCents,
        expense.splitType,
        expense.shares,
        addedUserIds,
      );
      // null = montos exactos o porcentajes: no se puede repartir solo.
      if (!shares) continue;

      await tx.expenseShare.deleteMany({ where: { expenseId: expense.id } });
      await tx.expense.update({
        where: { id: expense.id },
        data: { shares: { create: shares } },
      });
      updated++;
    }

    if (updated > 0) {
      await tx.activity.create({
        data: {
          type: "EXPENSES_RESPLIT",
          groupId,
          actorId: user.id,
          meta: {
            names: members.map((m) => m.user.name),
            count: updated,
          },
        },
      });
    }
  });

  if (updated === 0) {
    return { error: "Ninguno de los gastos elegidos se puede recalcular automáticamente." };
  }

  revalidatePath(`/grupos/${groupId}`, "layout");
  revalidatePath("/");
  redirect(`/grupos/${groupId}`);
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const expenseId = String(formData.get("expenseId") ?? "");

  const expense = await prisma.expense.findUnique({ where: { id: expenseId } });
  if (!expense || expense.deletedAt) return;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: expense.groupId, userId: user.id } },
  });
  if (!membership) throw new Error("No sos miembro de este grupo.");

  await prisma.$transaction([
    prisma.expense.update({ where: { id: expenseId }, data: { deletedAt: new Date() } }),
    prisma.activity.create({
      data: {
        type: "EXPENSE_DELETED",
        groupId: expense.groupId,
        actorId: user.id,
        meta: {
          description: expense.description,
          amountCents: expense.amountCents.toString(),
          currency: expense.currency,
        },
      },
    }),
  ]);

  revalidatePath(`/grupos/${expense.groupId}`, "layout");
  revalidatePath("/");
  redirect(`/grupos/${expense.groupId}`);
}
