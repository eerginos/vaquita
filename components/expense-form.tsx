"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

import type { ActionState } from "@/app/actions/expenses";
import { CATEGORIES } from "@/lib/categories";
import { centsToInput, formatMoney, parseAmountToCents, splitEvenly, sum } from "@/lib/money";
import { computePayers, computeShares, SPLIT_TYPES, type SplitType } from "@/lib/split";
import { shortNames } from "@/lib/names";
import { Avatar } from "@/components/avatar";
import { FormError } from "@/components/form-error";
import { MoneyInput } from "@/components/money-input";
import { SubmitButton } from "@/components/submit-button";

export type Member = { id: string; name: string; color: string; emoji: string | null };

export type ExpenseInitial = {
  id: string;
  description: string;
  amountInput: string;
  date: string;
  category: string;
  notes: string;
  splitType: SplitType;
  payers: { userId: string; amountInput: string }[];
  shares: { userId: string; amountInput: string; weight: number | null }[];
};

const initialState: ActionState = {};

export function ExpenseForm({
  action,
  groupId,
  currency,
  members,
  currentUserId,
  initial,
  cancelHref,
  defaultDate,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  groupId: string;
  currency: string;
  members: Member[];
  currentUserId: string;
  initial?: ExpenseInitial;
  cancelHref: string;
  /** Hoy según la zona horaria del servidor, no la del navegador. */
  defaultDate: string;
}) {
  const [state, formAction] = useActionState(action, initialState);

  const [amountInput, setAmountInput] = useState(initial?.amountInput ?? "");
  const [splitType, setSplitType] = useState<SplitType>(initial?.splitType ?? "EQUAL");
  const [payerMode, setPayerMode] = useState<"single" | "multiple">(
    initial && initial.payers.length > 1 ? "multiple" : "single",
  );
  const [payerId, setPayerId] = useState(initial?.payers[0]?.userId ?? currentUserId);
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries((initial?.payers ?? []).map((p) => [p.userId, p.amountInput])),
  );
  const [participants, setParticipants] = useState<string[]>(
    () => initial?.shares.map((s) => s.userId) ?? members.map((m) => m.id),
  );
  // Participantes cuyo monto escribió la persona a mano. El resto se completa
  // solo con lo que sobra, repartido en partes iguales.
  const [touchedShares, setTouchedShares] = useState<string[]>(() =>
    initial && (initial.splitType === "EXACT" || initial.splitType === "PERCENT")
      ? initial.shares.map((s) => s.userId)
      : [],
  );

  const [shareValues, setShareValues] = useState<Record<string, string>>(() => {
    if (!initial) return {};
    return Object.fromEntries(
      initial.shares.map((s) => [
        s.userId,
        initial.splitType === "EXACT"
          ? s.amountInput
          : initial.splitType === "PERCENT"
            ? centsToInput(s.weight ?? 0)
            : String(s.weight ?? 1),
      ]),
    );
  });

  const totalCents = parseAmountToCents(amountInput) ?? 0n;

  /**
   * Autocompletado del reparto: lo que queda después de los montos escritos
   * a mano se divide en partes iguales entre los que todavía no se tocaron.
   * Gasto de 100.000 entre 4 → si A pone 40.000, B, C y D quedan en 20.000;
   * si después B pone 40.000, C y D pasan a 10.000.
   */
  const autoShares = useMemo(() => {
    if (splitType !== "EXACT" && splitType !== "PERCENT") return {};

    const target = splitType === "PERCENT" ? 10_000n : totalCents;
    const untouched = participants.filter((id) => !touchedShares.includes(id));
    if (untouched.length === 0 || target <= 0n) return {};

    let assigned = 0n;
    for (const id of participants) {
      if (!touchedShares.includes(id)) continue;
      assigned += parseAmountToCents(shareValues[id] ?? "") ?? 0n;
    }

    const remaining = target - assigned;
    const parts =
      remaining > 0n ? splitEvenly(remaining, untouched.length) : untouched.map(() => 0n);

    return Object.fromEntries(untouched.map((id, i) => [id, centsToInput(parts[i])]));
  }, [splitType, totalCents, participants, touchedShares, shareValues]);

  /** Lo que realmente se manda: escrito a mano donde lo hay, autocompletado en el resto. */
  const effectiveShares = useMemo(() => {
    const out: Record<string, string> = {};
    for (const id of participants) {
      out[id] = touchedShares.includes(id) ? (shareValues[id] ?? "") : (autoShares[id] ?? "");
    }
    return out;
  }, [participants, touchedShares, shareValues, autoShares]);

  const preview = useMemo(
    () => computeShares(totalCents, splitType, participants, effectiveShares),
    [totalCents, splitType, participants, effectiveShares],
  );

  const payersPreview = useMemo(() => {
    if (payerMode === "single") {
      return computePayers(totalCents, [{ userId: payerId, raw: amountInput }]);
    }
    return computePayers(
      totalCents,
      members.map((m) => ({ userId: m.id, raw: payerAmounts[m.id] ?? "" })),
    );
  }, [payerMode, payerId, payerAmounts, amountInput, totalCents, members]);

  /**
   * Cambiar de tipo de división limpia lo escrito: un monto de 90.000 no
   * significa nada como porcentaje ni como cantidad de partes.
   */
  const changeSplitType = (next: SplitType) => {
    setSplitType(next);
    setTouchedShares([]);
    setShareValues(
      next === "SHARES" ? Object.fromEntries(members.map((m) => [m.id, "1"])) : {},
    );
  };

  const toggleParticipant = (id: string) =>
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  const setShare = (id: string, value: string) => {
    setShareValues((prev) => ({ ...prev, [id]: value }));
    // Vaciar el campo lo devuelve al reparto automático.
    setTouchedShares((prev) =>
      value.trim() === ""
        ? prev.filter((p) => p !== id)
        : prev.includes(id)
          ? prev
          : [...prev, id],
    );
  };

  const short = shortNames(members);
  const shortOf = (id: string) => short.get(id) ?? "alguien";

  const orderedParticipants = members.filter((m) => participants.includes(m.id));
  const shareAmountOf = (userId: string) => {
    if (!preview.ok) return null;
    return preview.shares.find((s) => s.userId === userId)?.amountCents ?? null;
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="groupId" value={groupId} />
      {initial && <input type="hidden" name="expenseId" value={initial.id} />}
      <input type="hidden" name="splitType" value={splitType} />
      <input type="hidden" name="payerMode" value={payerMode} />
      {participants.map((id) => (
        <input key={id} type="hidden" name="participants" value={id} />
      ))}

      <FormError message={state.error} />

      {/* ---------------------------------------------------------- básicos */}
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="description">
            ¿Qué gasto fue?
          </label>
          <input
            id="description"
            name="description"
            required
            autoFocus
            maxLength={120}
            defaultValue={initial?.description}
            className="input"
            placeholder="Cena del viernes"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="amount">
              Importe ({currency})
            </label>
            <MoneyInput
              id="amount"
              name="amount"
              required
              value={amountInput}
              onChange={setAmountInput}
              className="text-lg font-semibold"
              placeholder="0,00"
            />
            {totalCents > 0n && (
              <p className="hint mt-1">{formatMoney(totalCents, currency)}</p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="date">
              Fecha
            </label>
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={initial?.date ?? defaultDate}
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="category">
            Categoría
          </label>
          <select
            id="category"
            name="category"
            defaultValue={initial?.category ?? "otros"}
            className="input"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ------------------------------------------------------- quién pagó */}
      <fieldset className="space-y-3 rounded-xl border p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <legend className="text-sm font-semibold">Quién pagó</legend>
          <button
            type="button"
            onClick={() => setPayerMode(payerMode === "single" ? "multiple" : "single")}
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            {payerMode === "single" ? "Pagaron varios" : "Pagó una sola persona"}
          </button>
        </div>

        {payerMode === "single" ? (
          <select
            name="payerId"
            value={payerId}
            onChange={(e) => setPayerId(e.target.value)}
            className="input"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === currentUserId ? `${m.name} (vos)` : m.name}
              </option>
            ))}
          </select>
        ) : (
          <>
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <Avatar name={m.name} color={m.color} emoji={m.emoji} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">{shortOf(m.id)}</span>
                  <MoneyInput
                    name={`payer:${m.id}`}
                    value={payerAmounts[m.id] ?? ""}
                    onChange={(next) => setPayerAmounts((prev) => ({ ...prev, [m.id]: next }))}
                    className="w-24 shrink-0 text-right sm:w-32"
                    placeholder="0,00"
                  />
                </li>
              ))}
            </ul>
            {!payersPreview.ok && totalCents > 0n && (
              <p className="text-xs text-debt-500">{payersPreview.error}</p>
            )}
          </>
        )}
      </fieldset>

      {/* ---------------------------------------------------- cómo se divide */}
      <fieldset className="space-y-3 rounded-xl border p-3 sm:p-4">
        <legend className="text-sm font-semibold">Cómo se divide</legend>

        <div className="flex flex-wrap gap-1.5">
          {SPLIT_TYPES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => changeSplitType(option.id)}
              className={clsx(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                splitType === option.id
                  ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  : "text-[var(--text-muted)] hover:bg-[var(--surface-2)]",
              )}
              aria-pressed={splitType === option.id}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="hint">{SPLIT_TYPES.find((s) => s.id === splitType)!.hint}</p>
          {(splitType === "EXACT" || splitType === "PERCENT") && touchedShares.length > 0 && (
            <button
              type="button"
              onClick={() => setTouchedShares([])}
              className="shrink-0 text-xs font-medium text-brand-600 hover:underline"
            >
              Volver a repartir parejo
            </button>
          )}
        </div>

        <ul className="divide-y rounded-lg border">
          {members.map((m) => {
            const included = participants.includes(m.id);
            const amount = shareAmountOf(m.id);

            return (
              <li key={m.id} className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-3">
                <input
                  type="checkbox"
                  checked={included}
                  onChange={() => toggleParticipant(m.id)}
                  className="h-4 w-4 shrink-0 accent-[var(--color-brand-600)]"
                  aria-label={`Incluir a ${m.name}`}
                />
                <Avatar name={m.name} color={m.color} emoji={m.emoji} size="sm" />

                <span className="min-w-0 flex-1">
                  <span
                    className={clsx(
                      "block truncate text-sm",
                      !included && "text-[var(--text-soft)] line-through",
                    )}
                  >
                    {shortOf(m.id)}
                  </span>
                  {/* En mobile el importe va debajo del nombre; en desktop tiene columna propia. */}
                  <span className="block text-xs tabular-nums text-[var(--text-muted)] sm:hidden">
                    {included && amount !== null ? formatMoney(amount, currency) : "—"}
                  </span>
                </span>

                {/* Las "partes" son un entero, no plata: ese va sin formatear. */}
                {included && splitType === "SHARES" && (
                  <input
                    name={`share:${m.id}`}
                    inputMode="numeric"
                    value={shareValues[m.id] ?? ""}
                    onChange={(e) => setShare(m.id, e.target.value.replace(/\D/g, ""))}
                    className="input w-24 shrink-0 text-right tabular-nums sm:w-28"
                    placeholder="1"
                  />
                )}

                {included && (splitType === "EXACT" || splitType === "PERCENT") && (
                  <MoneyInput
                    name={`share:${m.id}`}
                    value={effectiveShares[m.id] ?? ""}
                    onChange={(next) => setShare(m.id, next)}
                    title={
                      touchedShares.includes(m.id)
                        ? undefined
                        : "Calculado solo con lo que queda. Escribí un monto para fijarlo."
                    }
                    className={clsx(
                      "w-24 shrink-0 text-right sm:w-28",
                      // Los autocompletados se ven apagados para distinguirlos
                      // de los que escribió la persona.
                      !touchedShares.includes(m.id) && "text-[var(--text-muted)] italic",
                    )}
                    placeholder="0,00"
                  />
                )}

                <span className="hidden w-28 shrink-0 text-right text-sm tabular-nums text-[var(--text-muted)] sm:block">
                  {included && amount !== null ? formatMoney(amount, currency) : "—"}
                </span>
              </li>
            );
          })}
        </ul>

        {!preview.ok && totalCents > 0n && participants.length > 0 && (
          <p className="text-xs text-debt-500">{preview.error}</p>
        )}

        {preview.ok && (
          <p className="hint">
            Total repartido:{" "}
            <strong className="tabular-nums">
              {formatMoney(sum(preview.shares.map((s) => s.amountCents)), currency)}
            </strong>{" "}
            entre {orderedParticipants.length}{" "}
            {orderedParticipants.length === 1 ? "persona" : "personas"}
          </p>
        )}
      </fieldset>

      <div>
        <label className="label" htmlFor="notes">
          Nota <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={500}
          defaultValue={initial?.notes}
          className="input resize-y"
          placeholder="Detalles, quién falta pagar, link al ticket…"
        />
      </div>

      <div className="flex gap-2">
        <SubmitButton className="btn-primary flex-1">
          {initial ? "Guardar cambios" : "Agregar gasto"}
        </SubmitButton>
        <Link href={cancelHref} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
