import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createExpenseAction } from "@/app/actions/expenses";
import { ExpenseForm } from "@/components/expense-form";

export const metadata: Metadata = { title: "Nuevo gasto" };

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const user = await requireUser();

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        orderBy: { joinedAt: "asc" },
        select: { user: { select: { id: true, name: true, color: true } } },
      },
    },
  });

  if (!group || !group.members.some((m) => m.user.id === user.id)) notFound();
  if (group.archivedAt) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/grupos/${groupId}`} className="text-sm text-[var(--text-muted)] hover:underline">
        ← {group.emoji} {group.name}
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Nuevo gasto</h1>

      <div className="card p-5">
        <ExpenseForm
          action={createExpenseAction}
          groupId={groupId}
          currency={group.currency}
          members={group.members.map((m) => m.user)}
          currentUserId={user.id}
          cancelHref={`/grupos/${groupId}`}
        />
      </div>
    </div>
  );
}
