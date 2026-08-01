"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";

import type { ActionState } from "@/app/actions/expenses";
import { CATEGORIES } from "@/lib/categories";
import { centsToInput, formatMoney, parseAmountToCents, sum } from "@/lib/money";
import { computePayers, computeShares, SPLIT_TYPES, type SplitType } from "@/lib/split";
import { Avatar } from "@/components/avatar";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

export type Member = { id: string; name: string; color: string };

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

  const preview = useMemo(
    () => computeShares(totalCents, splitType, participants, shareValues),
    [totalCents, splitType, participants, shareValues],
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

  const toggleParticipant = (id: string) =>
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );

  const setShare = (id: string, value: string) =>
    setShareValues((prev) => ({ ...prev, [id]: value }));

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
            placeholder="Asado del sábado"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="amount">
              Importe ({currency})
            </label>
            <input
              id="amount"
              name="amount"
              required
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="input text-lg font-semibold tabular-nums"
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
                  <Avatar name={m.name} color={m.color} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm">{m.name}</span>
                  <input
                    name={`payer:${m.id}`}
                    inputMode="decimal"
                    value={payerAmounts[m.id] ?? ""}
                    onChange={(e) =>
                      setPayerAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))
                    }
                    className="input w-24 shrink-0 text-right tabular-nums sm:w-32"
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
              onClick={() => setSplitType(option.id)}
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

        <p className="hint">{SPLIT_TYPES.find((s) => s.id === splitType)!.hint}</p>

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
                <Avatar name={m.name} color={m.color} size="sm" />

                <span className="min-w-0 flex-1">
                  <span
                    className={clsx(
                      "block truncate text-sm",
                      !included && "text-[var(--text-soft)] line-through",
                    )}
                  >
                    {m.name}
                  </span>
                  {/* En mobile el importe va debajo del nombre; en desktop tiene columna propia. */}
                  <span className="block text-xs tabular-nums text-[var(--text-muted)] sm:hidden">
                    {included && amount !== null ? formatMoney(amount, currency) : "—"}
                  </span>
                </span>

                {included && splitType !== "EQUAL" && (
                  <input
                    name={`share:${m.id}`}
                    inputMode="decimal"
                    value={shareValues[m.id] ?? ""}
                    onChange={(e) => setShare(m.id, e.target.value)}
                    className="input w-24 shrink-0 text-right tabular-nums sm:w-28"
                    placeholder={
                      splitType === "PERCENT" ? "0,00%" : splitType === "SHARES" ? "1" : "0,00"
                    }
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
