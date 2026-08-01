import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteExpenseAction } from "@/app/actions/expenses";
import { deleteCommentAction } from "@/app/actions/comments";
import { getCategory } from "@/lib/categories";
import { formatDate, formatRelative } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { SPLIT_TYPES } from "@/lib/split";
import { Avatar } from "@/components/avatar";
import { CommentForm } from "@/components/comment-form";
import { SubmitButton } from "@/components/submit-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ expenseId: string }>;
}) {
  const { expenseId } = await params;
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { description: true },
  });
  return { title: expense?.description ?? "Gasto" };
}

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; expenseId: string }>;
}) {
  const { groupId, expenseId } = await params;
  const user = await requireUser();

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      group: { select: { id: true, name: true, emoji: true, currency: true, archivedAt: true } },
      createdBy: { select: { id: true, name: true, color: true, emoji: true } },
      payers: {
        orderBy: { amountCents: "desc" },
        include: { user: { select: { id: true, name: true, color: true, emoji: true } } },
      },
      shares: {
        orderBy: { amountCents: "desc" },
        include: { user: { select: { id: true, name: true, color: true, emoji: true } } },
      },
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, name: true, color: true, emoji: true } } },
      },
    },
  });

  if (!expense || expense.deletedAt || expense.groupId !== groupId) notFound();

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (!membership) notFound();

  const category = getCategory(expense.category);
  const currency = expense.group.currency;
  const splitLabel = SPLIT_TYPES.find((s) => s.id === expense.splitType)!.label;

  const myPaid = expense.payers.find((p) => p.userId === user.id)?.amountCents ?? 0n;
  const myShare = expense.shares.find((s) => s.userId === user.id)?.amountCents ?? 0n;
  const myDelta = myPaid - myShare;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={`/grupos/${groupId}`} className="text-sm text-[var(--text-muted)] hover:underline">
        ← {expense.group.emoji} {expense.group.name}
      </Link>

      <article className="card overflow-hidden">
        <header className="flex items-start gap-4 border-b p-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-2xl">
            {category.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{expense.description}</h1>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              {formatDate(expense.date)} · {category.label}
            </p>
          </div>
          <p className="text-right text-2xl font-bold tabular-nums">
            {formatMoney(expense.amountCents, currency)}
          </p>
        </header>

        <section className="grid gap-5 p-5 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Quién pagó
            </h2>
            <ul className="space-y-2">
              {expense.payers.map((payer) => (
                <li key={payer.id} className="flex items-center gap-2.5">
                  <Avatar name={payer.user.name} color={payer.user.color} emoji={payer.user.emoji} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {payer.user.id === user.id ? "Vos" : payer.user.name}
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {formatMoney(payer.amountCents, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Cómo se dividió · {splitLabel}
            </h2>
            <ul className="space-y-2">
              {expense.shares.map((share) => (
                <li key={share.id} className="flex items-center gap-2.5">
                  <Avatar name={share.user.name} color={share.user.color} emoji={share.user.emoji} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {share.user.id === user.id ? "Vos" : share.user.name}
                    {expense.splitType === "PERCENT" && share.weight !== null && (
                      <span className="ml-1 text-xs text-[var(--text-muted)]">
                        ({(share.weight / 100).toLocaleString("es-AR")}%)
                      </span>
                    )}
                    {expense.splitType === "SHARES" && share.weight !== null && (
                      <span className="ml-1 text-xs text-[var(--text-muted)]">
                        ({share.weight} {share.weight === 1 ? "parte" : "partes"})
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {formatMoney(share.amountCents, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {expense.notes && (
          <section className="border-t px-5 py-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Nota
            </h2>
            <p className="whitespace-pre-wrap text-sm">{expense.notes}</p>
          </section>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-[var(--surface-2)] px-5 py-3">
          <p className="text-sm">
            {myDelta === 0n ? (
              <span className="text-[var(--text-muted)]">Este gasto no te afecta el saldo.</span>
            ) : myDelta > 0n ? (
              <>
                <span className="text-[var(--text-muted)]">Te quedaron debiendo </span>
                <span className="font-semibold text-owed-500 dark:text-owed-400">
                  {formatMoney(myDelta, currency)}
                </span>
              </>
            ) : (
              <>
                <span className="text-[var(--text-muted)]">Te toca poner </span>
                <span className="font-semibold text-debt-500 dark:text-debt-400">
                  {formatMoney(-myDelta, currency)}
                </span>
              </>
            )}
          </p>

          {!expense.group.archivedAt && (
            <div className="flex gap-2">
              <Link
                href={`/grupos/${groupId}/gastos/${expenseId}/editar`}
                className="btn-secondary text-xs"
              >
                Editar
              </Link>
              <form action={deleteExpenseAction}>
                <input type="hidden" name="expenseId" value={expenseId} />
                <SubmitButton
                  className="btn-ghost text-xs text-debt-500"
                  pendingLabel="Borrando…"
                  confirm="¿Borrar este gasto? Se va a recalcular el saldo del grupo."
                >
                  Borrar
                </SubmitButton>
              </form>
            </div>
          )}
        </footer>
      </article>

      <p className="px-1 text-xs text-[var(--text-muted)]">
        Cargado por {expense.createdBy.id === user.id ? "vos" : expense.createdBy.name}{" "}
        {formatRelative(expense.createdAt)}
      </p>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-semibold">
          Comentarios{expense.comments.length > 0 && ` (${expense.comments.length})`}
        </h2>

        {expense.comments.length > 0 && (
          <ul className="mb-4 space-y-3">
            {expense.comments.map((comment) => (
              <li key={comment.id} className="flex gap-3">
                <Avatar name={comment.user.name} color={comment.user.color} emoji={comment.user.emoji} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{comment.user.name}</span>{" "}
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatRelative(comment.createdAt)}
                    </span>
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-[var(--text)]">{comment.body}</p>
                </div>
                {comment.userId === user.id && (
                  <form action={deleteCommentAction}>
                    <input type="hidden" name="commentId" value={comment.id} />
                    <button
                      type="submit"
                      className="text-xs text-[var(--text-soft)] hover:text-debt-500"
                      title="Borrar comentario"
                    >
                      ✕
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}

        <CommentForm expenseId={expenseId} />
      </section>
    </div>
  );
}
