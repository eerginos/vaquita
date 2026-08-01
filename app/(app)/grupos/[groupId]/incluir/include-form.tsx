"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import clsx from "clsx";

import { includeInExpensesAction, type ActionState } from "@/app/actions/expenses";
import { settlementPlan } from "@/lib/balances";
import { getCategory } from "@/lib/categories";
import { formatMoney } from "@/lib/money";
import { canResplit, resplitWith, type SplitType } from "@/lib/split";
import { Avatar } from "@/components/avatar";
import { EmptyState, FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

type Member = { id: string; name: string; color: string; emoji: string | null };

export type ClientExpense = {
  id: string;
  description: string;
  dateLabel: string;
  category: string;
  amountCents: string;
  splitType: SplitType;
  payers: { userId: string; amountCents: string }[];
  shares: { userId: string; amountCents: string; weight: number | null }[];
};

type ClientSettlement = { fromUserId: string; toUserId: string; amountCents: string };

const initial: ActionState = {};

export function IncludeForm({
  groupId,
  currency,
  simplifyDebts,
  members,
  currentUserId,
  expenses,
  settlements,
  preselected,
}: {
  groupId: string;
  currency: string;
  simplifyDebts: boolean;
  members: Member[];
  currentUserId: string;
  expenses: ClientExpense[];
  settlements: ClientSettlement[];
  preselected: string;
}) {
  const [state, action] = useActionState(includeInExpensesAction, initial);

  const [added, setAdded] = useState<string[]>(() =>
    preselected && members.some((m) => m.id === preselected) ? [preselected] : [],
  );

  // Gastos donde falta al menos uno de los elegidos y el reparto se puede rehacer solo.
  const candidates = useMemo(() => {
    if (added.length === 0) return [];
    return expenses.filter((e) => {
      const inIt = new Set(e.shares.map((s) => s.userId));
      return added.some((id) => !inIt.has(id));
    });
  }, [expenses, added]);

  const eligible = candidates.filter((e) => canResplit(e.splitType));
  const manual = candidates.filter((e) => !canResplit(e.splitType));

  const [excluded, setExcluded] = useState<string[]>([]);
  const selectedIds = eligible.filter((e) => !excluded.includes(e.id)).map((e) => e.id);

  const toggleMember = (id: string) => {
    setAdded((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
    setExcluded([]);
  };

  const toggleExpense = (id: string) =>
    setExcluded((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  // Vista previa: recalcula los saldos como quedarían si aplicaras los cambios.
  const preview = useMemo(() => {
    const parsedSettlements = settlements.map((s) => ({
      fromUserId: s.fromUserId,
      toUserId: s.toUserId,
      amountCents: BigInt(s.amountCents),
    }));
    const memberIds = members.map((m) => m.id);

    const build = (applyIds: string[]) => {
      const set = new Set(applyIds);
      const mapped = expenses.map((e) => {
        const payers = e.payers.map((p) => ({
          userId: p.userId,
          amountCents: BigInt(p.amountCents),
        }));

        if (!set.has(e.id)) {
          return {
            payers,
            shares: e.shares.map((s) => ({ userId: s.userId, amountCents: BigInt(s.amountCents) })),
          };
        }

        const next = resplitWith(BigInt(e.amountCents), e.splitType, e.shares, added);
        return {
          payers,
          shares: (next ?? e.shares.map((s) => ({ ...s, amountCents: BigInt(s.amountCents) }))).map(
            (s) => ({ userId: s.userId, amountCents: s.amountCents }),
          ),
        };
      });

      return settlementPlan(mapped, parsedSettlements, { simplify: simplifyDebts, memberIds }).net;
    };

    return { before: build([]), after: build(selectedIds) };
  }, [expenses, settlements, members, added, selectedIds, simplifyDebts]);

  const changed = members.filter(
    (m) => (preview.before.get(m.id) ?? 0n) !== (preview.after.get(m.id) ?? 0n),
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="groupId" value={groupId} />
      {added.map((id) => (
        <input key={id} type="hidden" name="addedUserIds" value={id} />
      ))}
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="expenseIds" value={id} />
      ))}

      <FormError message={state.error} />

      <fieldset className="card p-4 sm:p-5">
        <legend className="px-1 text-sm font-semibold">¿A quién querés sumar?</legend>
        <ul className="mt-2 space-y-1">
          {members.map((m) => (
            <li key={m.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--surface-2)]">
                <input
                  type="checkbox"
                  checked={added.includes(m.id)}
                  onChange={() => toggleMember(m.id)}
                  className="h-4 w-4 shrink-0 accent-[var(--color-brand-600)]"
                />
                <Avatar name={m.name} color={m.color} emoji={m.emoji} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {m.name}
                  {m.id === currentUserId && (
                    <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">(vos)</span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {added.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="👆"
            title="Elegí a alguien para empezar"
            description="Te vamos a mostrar en qué gastos anteriores no está incluido."
          />
        </div>
      ) : candidates.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="✅"
            title="Ya está en todos los gastos"
            description="No hay nada que recalcular."
          />
        </div>
      ) : (
        <>
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <h2 className="text-sm font-semibold">
                Gastos a recalcular ({selectedIds.length} de {eligible.length})
              </h2>
              {eligible.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setExcluded(excluded.length === 0 ? eligible.map((e) => e.id) : [])
                  }
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  {excluded.length === 0 ? "Desmarcar todos" : "Marcar todos"}
                </button>
              )}
            </div>

            {eligible.length === 0 ? (
              <p className="px-4 py-4 text-sm text-[var(--text-muted)]">
                Ninguno de estos gastos se puede recalcular automáticamente.
              </p>
            ) : (
              <ul className="divide-y">
                {eligible.map((e) => {
                  const checked = !excluded.includes(e.id);
                  return (
                    <li key={e.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleExpense(e.id)}
                          className="h-4 w-4 shrink-0 accent-[var(--color-brand-600)]"
                        />
                        <span className="text-base" aria-hidden>
                          {getCategory(e.category).emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{e.description}</span>
                          <span className="block text-xs text-[var(--text-muted)]">
                            {e.dateLabel} · entre {e.shares.length}
                            {e.splitType === "SHARES" && " · por partes"}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-[var(--text-muted)]">
                          {formatMoney(BigInt(e.amountCents), currency)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {manual.length > 0 && (
            <section className="card border-debt-500/30">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Estos hay que editarlos a mano</h2>
                <p className="hint mt-0.5">
                  Tienen montos exactos o porcentajes fijos, así que no hay forma de adivinar cuánto
                  le toca a quien se suma.
                </p>
              </div>
              <ul className="divide-y">
                {manual.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/grupos/${groupId}/gastos/${e.id}/editar`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)]"
                    >
                      <span className="text-base" aria-hidden>
                        {getCategory(e.category).emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{e.description}</span>
                        <span className="block text-xs text-[var(--text-muted)]">
                          {e.dateLabel} ·{" "}
                          {e.splitType === "EXACT" ? "montos exactos" : "porcentajes"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-medium text-brand-600">Editar →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {selectedIds.length > 0 && (
            <section className="card">
              <h2 className="border-b px-4 py-3 text-sm font-semibold">Cómo quedarían los saldos</h2>
              {changed.length === 0 ? (
                <p className="px-4 py-4 text-sm text-[var(--text-muted)]">
                  No cambia ningún saldo.
                </p>
              ) : (
                <ul className="divide-y">
                  {changed.map((m) => {
                    const after = preview.after.get(m.id) ?? 0n;
                    return (
                      <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Avatar name={m.name} color={m.color} emoji={m.emoji} size="xs" />
                        <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                        {/* Los dos lados van con signo: mostrar el "antes" con signo y el
                            "después" en valor absoluto se lee como si cambiara de sentido. */}
                        <span className="flex items-center gap-2 text-sm">
                          <span className="tabular-nums text-[var(--text-soft)]">
                            {formatMoney(preview.before.get(m.id) ?? 0n, currency)}
                          </span>
                          <span className="text-[var(--text-soft)]" aria-hidden>
                            →
                          </span>
                          <span
                            className={clsx(
                              "font-semibold tabular-nums",
                              after > 0n && "text-owed-500 dark:text-owed-400",
                              after < 0n && "text-debt-500 dark:text-debt-400",
                              after === 0n && "text-[var(--text-muted)]",
                            )}
                          >
                            {formatMoney(after, currency)}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {changed.length > 0 && (
                <p className="border-t px-4 py-2.5 text-xs text-[var(--text-muted)]">
                  En verde a quien le deben, en rojo quien debe. El saldo negativo significa que esa
                  persona pasa a deber plata.
                </p>
              )}
            </section>
          )}

          <div className="flex gap-2">
            <SubmitButton
              className={clsx("btn-primary flex-1", selectedIds.length === 0 && "pointer-events-none opacity-50")}
              pendingLabel="Recalculando…"
              confirm="Cambian los saldos de todos. ¿Seguimos?"
            >
              Recalcular {selectedIds.length} gasto{selectedIds.length === 1 ? "" : "s"}
            </SubmitButton>
            <Link href={`/grupos/${groupId}/configuracion`} className="btn-secondary">
              Cancelar
            </Link>
          </div>
        </>
      )}
    </form>
  );
}
