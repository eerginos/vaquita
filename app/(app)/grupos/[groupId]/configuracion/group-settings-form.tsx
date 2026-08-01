"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";

import { updateGroupAction, type ActionState } from "@/app/actions/groups";
import { GROUP_EMOJIS } from "@/lib/categories";
import { CURRENCIES } from "@/lib/money";
import { FormError, FormSuccess } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = {};

export function GroupSettingsForm({
  group,
  lockCurrency,
}: {
  group: { id: string; name: string; emoji: string; currency: string; simplifyDebts: boolean };
  lockCurrency: boolean;
}) {
  const [state, action] = useActionState(updateGroupAction, initial);
  const [emoji, setEmoji] = useState(group.emoji);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="groupId" value={group.id} />
      <input type="hidden" name="emoji" value={emoji} />
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div>
        <label className="label" htmlFor="name">
          Nombre
        </label>
        <div className="flex gap-2">
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border bg-[var(--surface-2)] text-lg">
            {emoji}
          </span>
          <input id="name" name="name" required defaultValue={group.name} className="input" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {GROUP_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={clsx(
                "h-8 w-8 rounded-lg border text-base transition",
                emoji === e
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-transparent hover:bg-[var(--surface-2)]",
              )}
              aria-pressed={emoji === e}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="currency">
          Moneda
        </label>
        <select
          id="currency"
          name="currency"
          defaultValue={group.currency}
          disabled={lockCurrency}
          className="input"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.label}
            </option>
          ))}
        </select>
        {lockCurrency && (
          <>
            {/* El select deshabilitado no se envía: mando el valor actual. */}
            <input type="hidden" name="currency" value={group.currency} />
            <p className="hint mt-1">
              No se puede cambiar porque el grupo ya tiene gastos cargados.
            </p>
          </>
        )}
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
        <input
          type="checkbox"
          name="simplifyDebts"
          defaultChecked={group.simplifyDebts}
          className="mt-0.5 h-4 w-4 accent-[var(--color-brand-600)]"
        />
        <span>
          <span className="block text-sm font-medium">Simplificar deudas</span>
          <span className="hint">
            Reduce la cantidad de pagos necesarios. Si A le debe a B y B le debe a C, se sugiere que
            A le pague directo a C.
          </span>
        </span>
      </label>

      <SubmitButton className="btn-primary">Guardar cambios</SubmitButton>
    </form>
  );
}
