import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { getGroupDetail, getGroupStats } from "@/lib/queries";
import { getCategory } from "@/lib/categories";
import { formatDate, fromDateInput, toDateInput } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/form-error";

export const metadata: Metadata = { title: "Estadísticas" };

export default async function StatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ desde?: string; hasta?: string; quien?: string }>;
}) {
  const { groupId } = await params;
  const { desde, hasta, quien } = await searchParams;
  const user = await requireUser();

  const group = await getGroupDetail(groupId);
  if (!group || !group.members.some((m) => m.id === user.id)) notFound();

  const filterUserId = quien && group.members.some((m) => m.id === quien) ? quien : undefined;

  const stats = await getGroupStats(groupId, {
    from: desde ? fromDateInput(desde) : undefined,
    to: hasta ? fromDateInput(hasta) : undefined,
    userId: filterUserId,
  });

  const currency = group.currency;
  const nameOf = (id: string) => group.members.find((m) => m.id === id)?.name ?? "alguien";
  const perDay = stats.days > 0 ? stats.totalCents / BigInt(stats.days) : 0n;

  const topLoader = [...stats.countByUser.entries()].sort((a, b) => b[1] - a[1])[0];
  const topPayer = [...stats.paidByUser.entries()].sort((a, b) => (b[1] > a[1] ? 1 : -1))[0];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href={`/grupos/${groupId}`} className="text-sm text-[var(--text-muted)] hover:underline">
        ← {group.emoji} {group.name}
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Estadísticas</h1>

      <form className="card space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="desde">
              Desde
            </label>
            <input
              id="desde"
              name="desde"
              type="date"
              defaultValue={desde ?? (stats.firstDate ? toDateInput(stats.firstDate) : "")}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="hasta">
              Hasta
            </label>
            <input
              id="hasta"
              name="hasta"
              type="date"
              defaultValue={hasta ?? (stats.lastDate ? toDateInput(stats.lastDate) : "")}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="quien">
              Persona
            </label>
            <select id="quien" name="quien" defaultValue={filterUserId ?? ""} className="input">
              <option value="">Todo el grupo</option>
              {group.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === user.id ? `${m.name} (vos)` : m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="btn-primary text-sm">
            Aplicar
          </button>
          <Link href={`/grupos/${groupId}/estadisticas`} className="btn-ghost text-sm">
            Limpiar
          </Link>
        </div>

        {filterUserId && (
          <p className="hint">
            Mostrando sólo la parte que le tocó a {nameOf(filterUserId)}, no el total de esos gastos.
          </p>
        )}
      </form>

      {stats.expenseCount === 0 ? (
        <div className="card">
          <EmptyState
            icon="📊"
            title="No hay gastos en ese período"
            description="Probá ampliando el rango de fechas."
          />
        </div>
      ) : (
        <>
          <section className="card grid grid-cols-2 divide-x divide-y sm:grid-cols-4 sm:divide-y-0">
            <Stat label="Total" value={formatMoney(stats.totalCents, currency)} />
            <Stat label="Por día" value={formatMoney(perDay, currency)} hint={`${stats.days} días`} />
            <Stat label="Gastos" value={String(stats.expenseCount)} />
            <Stat
              label="Promedio"
              value={formatMoney(stats.totalCents / BigInt(stats.expenseCount), currency)}
              hint="por gasto"
            />
          </section>

          <section className="card">
            <h2 className="border-b px-4 py-3 text-sm font-semibold">Por categoría</h2>
            <ul className="divide-y">
              {stats.byCategory.map(([categoryId, cents]) => {
                const category = getCategory(categoryId);
                const percent =
                  stats.totalCents > 0n ? Number((cents * 1000n) / stats.totalCents) / 10 : 0;

                return (
                  <li key={categoryId} className="px-4 py-3">
                    <div className="flex items-center gap-2.5 text-sm">
                      <span className="text-base" aria-hidden>
                        {category.emoji}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{category.label}</span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatMoney(cents, currency)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${Math.max(percent, 1)}%` }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right text-xs tabular-nums text-[var(--text-muted)]">
                        {percent.toLocaleString("es-AR", { maximumFractionDigits: 1 })}% ·{" "}
                        {formatMoney(cents / BigInt(stats.days), currency)}/día
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {!filterUserId && (
            <section className="card">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Por persona</h2>
                <p className="hint mt-0.5">
                  El número grande es lo que consumió cada uno. Al lado, cuánto puso de su bolsillo.
                </p>
              </div>
              <ul className="divide-y">
                {group.members.map((m) => {
                  const cost = stats.costByUser.get(m.id) ?? 0n;
                  const paid = stats.paidByUser.get(m.id) ?? 0n;
                  const percent =
                    stats.totalCents > 0n ? Number((cost * 1000n) / stats.totalCents) / 10 : 0;

                  return (
                    <li key={m.id} className="px-4 py-3">
                      <div className="flex items-center gap-2.5 text-sm">
                        <Avatar name={m.name} color={m.color} emoji={m.emoji} size="xs" />
                        <span className="min-w-0 flex-1 truncate">
                          {m.name}
                          {m.id === user.id && (
                            <span className="ml-1 text-xs text-[var(--text-muted)]">(vos)</span>
                          )}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">
                          {formatMoney(cost, currency)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.max(percent, 1)}%`, backgroundColor: m.color }}
                          />
                        </div>
                        <span className="w-32 shrink-0 text-right text-xs tabular-nums text-[var(--text-muted)]">
                          puso {formatMoney(paid, currency)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="card">
            <h2 className="border-b px-4 py-3 text-sm font-semibold">Datos sueltos</h2>
            <dl className="divide-y">
              {stats.biggest && (
                <Fact
                  icon="🏆"
                  label="El gasto más caro"
                  value={`${stats.biggest.description} · ${formatMoney(stats.biggest.amountCents, currency)}`}
                  hint={formatDate(stats.biggest.date)}
                />
              )}
              {topLoader && (
                <Fact
                  icon="⌨️"
                  label="Quien más gastos cargó"
                  value={nameOf(topLoader[0])}
                  hint={`${topLoader[1]} ${topLoader[1] === 1 ? "gasto" : "gastos"}`}
                />
              )}
              {topPayer && (
                <Fact
                  icon="💵"
                  label="Quien más plata adelantó"
                  value={nameOf(topPayer[0])}
                  hint={formatMoney(topPayer[1], currency)}
                />
              )}
              {stats.firstDate && stats.lastDate && (
                <Fact
                  icon="📅"
                  label="Período"
                  value={`${formatDate(stats.firstDate)} — ${formatDate(stats.lastDate)}`}
                />
              )}
            </dl>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-[var(--text-soft)]">{hint}</p>}
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
  hint,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    // En mobile se apila para que no se corte el texto; desde sm va en una línea.
    <div className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <dt className="flex shrink-0 items-center gap-2 text-xs text-[var(--text-muted)]">
        <span className="text-base" aria-hidden>
          {icon}
        </span>
        {label}
      </dt>
      <dd className="pl-6 text-sm font-medium sm:ml-auto sm:min-w-0 sm:pl-0 sm:text-right">
        {value}
        {hint && <span className="ml-1.5 font-normal text-[var(--text-muted)]">{hint}</span>}
      </dd>
    </div>
  );
}
