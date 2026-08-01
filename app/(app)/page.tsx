import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { getOverallBalances, getUserGroups } from "@/lib/queries";
import { formatMoneyAbs } from "@/lib/money";
import { AvatarStack } from "@/components/avatar";
import { Balance } from "@/components/money";
import { EmptyState } from "@/components/form-error";

export default async function DashboardPage() {
  const user = await requireUser();
  const [groups, overall] = await Promise.all([
    getUserGroups(user.id),
    getOverallBalances(user.id),
  ]);

  const active = groups.filter((g) => !g.archivedAt);
  const currencies = [...overall.totals.entries()].filter(([, v]) => v !== 0n);

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="border-b bg-[var(--surface-2)] px-5 py-3">
          <h1 className="text-sm font-semibold text-[var(--text-muted)]">Tu saldo total</h1>
        </div>

        {currencies.length === 0 ? (
          <p className="px-5 py-6 text-[var(--text-muted)]">
            Estás a mano con todo el mundo. 🎉
          </p>
        ) : (
          <div className="divide-y">
            {currencies.map(([currency, cents]) => (
              <div key={currency} className="flex items-baseline justify-between px-5 py-4">
                <span className="text-sm text-[var(--text-muted)]">
                  {cents > 0n ? "En total te deben" : "En total debés"}
                  <span className="ml-1.5 rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] font-medium">
                    {currency}
                  </span>
                </span>
                <span
                  className={
                    cents > 0n
                      ? "text-2xl font-bold tabular-nums text-owed-500 dark:text-owed-400"
                      : "text-2xl font-bold tabular-nums text-debt-500 dark:text-debt-400"
                  }
                >
                  {formatMoneyAbs(cents, currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Tus grupos</h2>
          <Link href="/grupos/nuevo" className="btn-secondary text-xs">
            + Nuevo grupo
          </Link>
        </div>

        {active.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="👥"
              title="Todavía no tenés grupos"
              description="Un grupo es cualquier cosa que compartan: un viaje, el depto, las juntadas."
              action={
                <Link href="/grupos/nuevo" className="btn-primary">
                  Crear mi primer grupo
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {active.map((group) => (
              <li key={group.id}>
                <Link
                  href={`/grupos/${group.id}`}
                  className="card flex h-full items-center gap-3 p-4 transition-colors hover:bg-[var(--surface-2)]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-xl">
                    {group.emoji}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{group.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <AvatarStack people={group.members} />
                      <span className="text-xs text-[var(--text-muted)]">
                        {group.expenseCount} {group.expenseCount === 1 ? "gasto" : "gastos"}
                      </span>
                    </div>
                  </div>

                  <Balance cents={group.myBalanceCents} currency={group.currency} withLabel />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {overall.people.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Con quién estás en deuda</h2>
          <ul className="card divide-y">
            {overall.people.map((person) => (
              <li key={person.user.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <AvatarStack people={[person.user]} />
                  <span className="truncate text-sm font-medium">{person.user.name}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {[...person.byCurrency.entries()]
                    .filter(([, v]) => v !== 0n)
                    .map(([currency, cents]) => (
                      <Balance key={currency} cents={cents} currency={currency} withLabel />
                    ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
