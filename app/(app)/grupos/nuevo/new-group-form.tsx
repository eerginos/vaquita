"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";

import { createGroupAction, type ActionState } from "@/app/actions/groups";
import { GROUP_EMOJIS } from "@/lib/categories";
import { CURRENCIES } from "@/lib/money";
import { Avatar } from "@/components/avatar";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

type Person = { id: string; name: string; email: string; color: string };

const initial: ActionState = {};

export function NewGroupForm({ people }: { people: Person[] }) {
  const [state, action] = useActionState(createGroupAction, initial);
  const [emoji, setEmoji] = useState(GROUP_EMOJIS[0]);

  return (
    <form action={action} className="space-y-5">
      <FormError message={state.error} />

      <div>
        <label className="label" htmlFor="name">
          Nombre del grupo
        </label>
        <div className="flex gap-2">
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border bg-[var(--surface-2)] text-lg">
            {emoji}
          </span>
          <input
            id="name"
            name="name"
            required
            autoFocus
            className="input"
            placeholder="Depto Palermo, Bariloche 2026…"
          />
        </div>
        <input type="hidden" name="emoji" value={emoji} />

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
        <select id="currency" name="currency" className="input" defaultValue="ARS">
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} — {c.label}
            </option>
          ))}
        </select>
        <p className="hint mt-1">
          Todos los gastos del grupo se cargan en esta moneda. Después no se puede cambiar si ya hay
          gastos.
        </p>
      </div>

      <div>
        <span className="label">Integrantes</span>
        {people.length === 0 ? (
          <p className="hint">
            Todavía no hay otras personas registradas. Creá el grupo y después invitalas desde la
            configuración del grupo.
          </p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-1">
            {people.map((person) => (
              <li key={person.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-[var(--surface-2)]">
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={person.id}
                    className="h-4 w-4 accent-[var(--color-brand-600)]"
                  />
                  <Avatar name={person.name} color={person.color} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{person.name}</span>
                    <span className="block truncate text-xs text-[var(--text-muted)]">
                      {person.email}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SubmitButton className="btn-primary w-full" pendingLabel="Creando…">
        Crear grupo
      </SubmitButton>
    </form>
  );
}
