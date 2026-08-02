"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";

import { updateProfileAction, type ActionState } from "@/app/actions/auth";
import { emojiForSeed, USER_EMOJIS } from "@/lib/emojis";
import { Avatar } from "@/components/avatar";
import { FormError, FormSuccess } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = {};

export function ProfileForm({
  name,
  color,
  emoji,
  payAlias,
}: {
  name: string;
  color: string;
  emoji: string | null;
  payAlias: string | null;
}) {
  const [state, action] = useActionState(updateProfileAction, initial);
  const [selected, setSelected] = useState(emoji || emojiForSeed(name));
  const [currentName, setCurrentName] = useState(name);

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div>
        <label className="label" htmlFor="name">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          required
          defaultValue={name}
          onChange={(e) => setCurrentName(e.target.value)}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="payAlias">
          Dónde te transfieren{" "}
          <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
        </label>
        <input
          id="payAlias"
          name="payAlias"
          defaultValue={payAlias ?? ""}
          maxLength={120}
          className="input"
          placeholder="Alias, CBU, IBAN o link de pago"
        />
        <p className="hint mt-1">
          Se le muestra sólo a quien te tenga que pagar, para que no tenga que pedírtelo. Lo pueden
          copiar de un click.
        </p>
      </div>

      <div>
        <span className="label">Tu emoji</span>
        <input type="hidden" name="emoji" value={selected} />

        <div className="mb-3 flex items-center gap-3 rounded-lg border bg-[var(--surface-2)] p-3">
          <Avatar name={currentName} color={color} emoji={selected} size="lg" />
          <p className="text-sm text-[var(--text-muted)]">
            Así te van a ver el resto en los grupos, los gastos y los comentarios.
          </p>
        </div>

        <div className="grid max-h-52 grid-cols-8 gap-1 overflow-y-auto rounded-lg border p-2 sm:grid-cols-10">
          {USER_EMOJIS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSelected(option)}
              className={clsx(
                "flex h-9 items-center justify-center rounded-lg border text-lg transition",
                selected === option
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-transparent hover:bg-[var(--surface-2)]",
              )}
              aria-label={`Elegir ${option}`}
              aria-pressed={selected === option}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <SubmitButton className="btn-primary">Guardar</SubmitButton>
    </form>
  );
}
