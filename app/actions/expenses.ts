"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fromDateInput } from "@/lib/dates";
import { parseAmountToCents } from "@/lib/money";
import { computePayers, computeShares, type SplitType } from "@/lib/split";
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
  const date = dateRaw ? fromDateInput(dateRaw) : new Date();
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
