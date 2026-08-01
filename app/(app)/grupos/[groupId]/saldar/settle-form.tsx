"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { createSettlementAction, type ActionState } from "@/app/actions/settlements";
import { formatMoney, parseAmountToCents } from "@/lib/money";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

type Member = { id: string; name: string; color: string };

type Suggestion = {
  fromUserId: string;
  toUserId: string;
  amountInput: string;
  label: string;
};

const initial: ActionState = {};

export function SettleForm({
  groupId,
  currency,
  members,
  currentUserId,
  suggestions,
  preset,
  defaultDate,
}: {
  groupId: string;
  currency: string;
  members: Member[];
  currentUserId: string;
  suggestions: Suggestion[];
  preset: { fromUserId: string; toUserId: string; amountInput: string };
  /** Hoy según la zona horaria del servidor, no la del navegador. */
  defaultDate: string;
}) {
  const [state, action] = useActionState(createSettlementAction, initial);

  const [fromUserId, setFromUserId] = useState(preset.fromUserId || currentUserId);
  const [toUserId, setToUserId] = useState(
    preset.toUserId || members.find((m) => m.id !== currentUserId)?.id || "",
  );
  const [amountInput, setAmountInput] = useState(preset.amountInput);

  const cents = parseAmountToCents(amountInput);

  const apply = (s: Suggestion) => {
    setFromUserId(s.fromUserId);
    setToUserId(s.toUserId);
    setAmountInput(s.amountInput);
  };

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="groupId" value={groupId} />
      <FormError message={state.error} />

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <span className="label">Sugerencias</span>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => apply(s)}
                className="rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-[var(--surface-2)]"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="fromUserId">
            Paga
          </label>
          <select
            id="fromUserId"
            name="fromUserId"
            value={fromUserId}
            onChange={(e) => setFromUserId(e.target.value)}
            className="input"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === currentUserId ? `${m.name} (vos)` : m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="toUserId">
            Cobra
          </label>
          <select
            id="toUserId"
            name="toUserId"
            value={toUserId}
            onChange={(e) => setToUserId(e.target.value)}
            className="input"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === currentUserId ? `${m.name} (vos)` : m.name}
              </option>
            ))}
          </select>
        </div>
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
          {cents !== null && cents > 0n && (
            <p className="hint mt-1">{formatMoney(cents, currency)}</p>
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
            defaultValue={defaultDate}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="note">
          Nota <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
        </label>
        <input
          id="note"
          name="note"
          maxLength={200}
          className="input"
          placeholder="Transferencia, efectivo, MercadoPago…"
        />
      </div>

      {fromUserId === toUserId && (
        <p className="text-xs text-debt-500">Elegí dos personas distintas.</p>
      )}

      <div className="flex gap-2">
        <SubmitButton className="btn-primary flex-1">Registrar pago</SubmitButton>
        <Link href={`/grupos/${groupId}`} className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
