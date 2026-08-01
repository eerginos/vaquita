import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { updateExpenseAction } from "@/app/actions/expenses";
import { ExpenseForm, type ExpenseInitial } from "@/components/expense-form";
import { centsToInput } from "@/lib/money";
import { toDateInput } from "@/lib/dates";

export const metadata: Metadata = { title: "Editar gasto" };

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>;
}) {
  const { groupId, expenseId } = await params;
  const user = await requireUser();

  const [group, expense] = await Promise.all([
    prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          orderBy: { joinedAt: "asc" },
          select: { user: { select: { id: true, name: true, color: true } } },
        },
      },
    }),
    prisma.expense.findUnique({
      where: { id: expenseId },
      include: { payers: true, shares: true },
    }),
  ]);

  if (!group || !group.members.some((m) => m.user.id === user.id)) notFound();
  if (!expense || expense.deletedAt || expense.groupId !== groupId) notFound();

  const initial: ExpenseInitial = {
    id: expense.id,
    description: expense.description,
    amountInput: centsToInput(expense.amountCents),
    date: toDateInput(expense.date),
    category: expense.category,
    notes: expense.notes ?? "",
    splitType: expense.splitType,
    payers: expense.payers.map((p) => ({
      userId: p.userId,
      amountInput: centsToInput(p.amountCents),
    })),
    shares: expense.shares.map((s) => ({
      userId: s.userId,
      amountInput: centsToInput(s.amountCents),
      weight: s.weight,
    })),
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href={`/grupos/${groupId}/gastos/${expenseId}`}
        className="text-sm text-[var(--text-muted)] hover:underline"
      >
        ← Volver al gasto
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Editar gasto</h1>

      <div className="card p-4 sm:p-5">
        <ExpenseForm
          action={updateExpenseAction}
          groupId={groupId}
          currency={group.currency}
          members={group.members.map((m) => m.user)}
          currentUserId={user.id}
          initial={initial}
          cancelHref={`/grupos/${groupId}/gastos/${expenseId}`}
          defaultDate={toDateInput(new Date())}
        />
      </div>
    </div>
  );
}
