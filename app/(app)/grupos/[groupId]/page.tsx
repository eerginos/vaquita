import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGroupDetail, getGroupTimeline } from "@/lib/queries";
import { formatDate, formatMonthYear, monthKey } from "@/lib/dates";
import { getCategory } from "@/lib/categories";
import { formatMoney, formatMoneyAbs } from "@/lib/money";
import { Avatar, AvatarStack } from "@/components/avatar";
import { Balance } from "@/components/money";
import { EmptyState } from "@/components/form-error";

export async function generateMetadata({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
  return { title: group?.name ?? "Grupo" };
}

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser();

  const group = await getGroupDetail(groupId);
  if (!group) notFound();
  if (!group.members.some((m) => m.id === user.id)) notFound();

  const timeline = await getGroupTimeline(groupId);
  const myBalance = group.net.get(user.id) ?? 0n;
  const nameOf = (id: string) => group.members.find((m) => m.id === id)?.name ?? "alguien";

  // Agrupo la lista por mes para que se lea como un extracto.
  const months = new Map<string, typeof timeline>();
  for (const item of timeline) {
    const key = monthKey(item.date);
    if (!months.has(key)) months.set(key, []);
    months.get(key)!.push(item);
  }

  return (
    <div className="space-y-6">
      <header className="card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-2)] text-2xl">
            {group.emoji}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{group.name}</h1>
              {group.archivedAt && (
                <span className="chip border-transparent bg-[var(--surface-2)] text-[var(--text-muted)]">
                  archivado
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <AvatarStack people={group.members} max={6} />
              <span className="text-xs text-[var(--text-muted)]">
                {group.members.length} personas · {group.currency}
              </span>
            </div>
          </div>

          <Link
            href={`/grupos/${groupId}/configuracion`}
            className="btn-ghost px-2 py-1.5 text-xs"
            title="Configuración del grupo"
          >
            ⚙️ Ajustes
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm">
            {myBalance === 0n ? (
              <span className="text-[var(--text-muted)]">Estás al día en este grupo.</span>
            ) : (
              <>
                <span className="text-[var(--text-muted)]">
                  {myBalance > 0n ? "En este grupo te deben " : "En este grupo debés "}
                </span>
                <Balance cents={myBalance} currency={group.currency} />
              </>
            )}
          </p>

          {!group.archivedAt && (
            <div className="flex gap-2">
              <Link href={`/grupos/${groupId}/saldar`} className="btn-secondary text-sm">
                Saldar cuentas
              </Link>
              <Link href={`/grupos/${groupId}/gastos/nuevo`} className="btn-primary text-sm">
                + Agregar gasto
              </Link>
            </div>
          )}
        </div>
      </header>

      <section className="card">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">
            Quién le debe a quién
          </h2>
          {group.simplifyDebts && (
            <span className="chip border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300">
              deudas simplificadas
            </span>
          )}
        </div>

        {group.transfers.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--text-muted)]">
            Todos están a mano. No hay deudas pendientes. 🎉
          </p>
        ) : (
          <ul className="divide-y">
            {group.transfers.map((t, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 px-5 py-3 text-sm">
                <Avatar
                  name={nameOf(t.fromUserId)}
                  color={group.members.find((m) => m.id === t.fromUserId)?.color}
                  size="xs"
                />
                <span className="font-medium">
                  {t.fromUserId === user.id ? "Vos" : nameOf(t.fromUserId)}
                </span>
                <span className="text-[var(--text-muted)]">le debe a</span>
                <Avatar
                  name={nameOf(t.toUserId)}
                  color={group.members.find((m) => m.id === t.toUserId)?.color}
                  size="xs"
                />
                <span className="font-medium">
                  {t.toUserId === user.id ? "vos" : nameOf(t.toUserId)}
                </span>
                <span className="ml-auto font-semibold tabular-nums">
                  {formatMoney(t.amountCents, group.currency)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <details className="border-t">
          <summary className="cursor-pointer px-5 py-3 text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
            Ver saldo de cada integrante
          </summary>
          <ul className="divide-y border-t">
            {group.members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-5 py-2.5">
                <Avatar name={member.name} color={member.color} size="xs" />
                <span className="flex-1 truncate text-sm">
                  {member.name}
                  {member.id === user.id && (
                    <span className="ml-1 text-xs text-[var(--text-muted)]">(vos)</span>
                  )}
                </span>
                <Balance cents={group.net.get(member.id) ?? 0n} currency={group.currency} withLabel />
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">Movimientos</h2>

        {timeline.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="🧾"
              title="Todavía no hay gastos"
              description="Cargá el primero y empezamos a llevar la cuenta."
              action={
                !group.archivedAt ? (
                  <Link href={`/grupos/${groupId}/gastos/nuevo`} className="btn-primary">
                    Agregar gasto
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="space-y-5">
            {[...months.entries()].map(([key, items]) => (
              <div key={key}>
                <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {formatMonthYear(items[0].date)}
                </h3>

                <ul className="card divide-y">
                  {items.map((item) =>
                    item.kind === "expense" ? (
                      <ExpenseRow
                        key={item.data.id}
                        groupId={groupId}
                        userId={user.id}
                        currency={group.currency}
                        expense={item.data}
                      />
                    ) : (
                      <SettlementRow
                        key={item.data.id}
                        userId={user.id}
                        currency={group.currency}
                        settlement={item.data}
                      />
                    ),
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type TimelineItem = Awaited<ReturnType<typeof getGroupTimeline>>[number];
type ExpenseItem = Extract<TimelineItem, { kind: "expense" }>["data"];
type SettlementItem = Extract<TimelineItem, { kind: "settlement" }>["data"];

function ExpenseRow({
  groupId,
  userId,
  currency,
  expense,
}: {
  groupId: string;
  userId: string;
  currency: string;
  expense: ExpenseItem;
}) {
  const category = getCategory(expense.category);
  const paid = expense.payers.find((p) => p.userId === userId)?.amountCents ?? 0n;
  const owed = expense.shares.find((s) => s.userId === userId)?.amountCents ?? 0n;
  const delta = paid - owed;

  const payerLabel =
    expense.payers.length === 1
      ? expense.payers[0].userId === userId
        ? "Pagaste vos"
        : `Pagó ${expense.payers[0].user.name}`
      : `Pagaron ${expense.payers.length} personas`;

  return (
    <li>
      <Link
        href={`/grupos/${groupId}/gastos/${expense.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-lg">
          {category.emoji}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{expense.description}</p>
          <p className="truncate text-xs text-[var(--text-muted)]">
            {formatDate(expense.date)} · {payerLabel} {formatMoney(expense.amountCents, currency)}
            {expense._count.comments > 0 && <> · 💬 {expense._count.comments}</>}
          </p>
        </div>

        <div className="text-right">
          {delta === 0n ? (
            <span className="text-xs text-[var(--text-muted)]">no participás</span>
          ) : (
            <>
              <span className="block text-[11px] text-[var(--text-muted)]">
                {delta > 0n ? "prestaste" : "debés"}
              </span>
              <span
                className={
                  delta > 0n
                    ? "text-sm font-semibold tabular-nums text-owed-500 dark:text-owed-400"
                    : "text-sm font-semibold tabular-nums text-debt-500 dark:text-debt-400"
                }
              >
                {formatMoneyAbs(delta, currency)}
              </span>
            </>
          )}
        </div>
      </Link>
    </li>
  );
}

function SettlementRow({
  userId,
  currency,
  settlement,
}: {
  userId: string;
  currency: string;
  settlement: SettlementItem;
}) {
  const from = settlement.fromUserId === userId ? "Vos" : settlement.from.name;
  const to = settlement.toUserId === userId ? "vos" : settlement.to.name;

  return (
    <li className="flex items-center gap-3 bg-brand-500/[0.04] px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-lg">
        💸
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {from} le pagó a {to}
        </p>
        <p className="truncate text-xs text-[var(--text-muted)]">
          {formatDate(settlement.date)}
          {settlement.note && ` · ${settlement.note}`}
        </p>
      </div>
      <span className="text-sm font-semibold tabular-nums">
        {formatMoney(settlement.amountCents, currency)}
      </span>
    </li>
  );
}
