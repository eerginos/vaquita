"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";

import { signUpAction, type ActionState } from "@/app/actions/auth";
import { emojiForSeed, USER_EMOJIS } from "@/lib/emojis";
import { Avatar } from "@/components/avatar";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = {};

export function SignUpForm({ code }: { code: string }) {
  const [state, action] = useActionState(signUpAction, initial);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");

  // Hasta que elija uno, se muestra el que le tocaría por defecto.
  const shownEmoji = emoji || emojiForSeed(name || "vaquita");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="emoji" value={shownEmoji} />
      <FormError message={state.error} />

      <div>
        <label className="label" htmlFor="name">
          Nombre
        </label>
        <div className="flex gap-2">
          <Avatar name={name || "?"} emoji={shownEmoji} size="md" className="shrink-0" />
          <input
            id="name"
            name="name"
            required
            autoFocus
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Nombre y apellido"
          />
        </div>
        <p className="hint mt-1">Como te van a ver los demás. Podés poner nombre y apellido.</p>
      </div>

      <div>
        <span className="label">Elegí tu emoji</span>
        <div className="grid max-h-32 grid-cols-8 gap-1 overflow-y-auto rounded-lg border p-1.5">
          {USER_EMOJIS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setEmoji(option)}
              className={clsx(
                "flex h-8 items-center justify-center rounded-md border text-base transition",
                shownEmoji === option
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-transparent hover:bg-[var(--surface-2)]",
              )}
              aria-label={`Elegir ${option}`}
              aria-pressed={shownEmoji === option}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="vos@ejemplo.com"
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          placeholder="mínimo 8 caracteres"
        />
      </div>

      <div>
        <label className="label" htmlFor="password2">
          Repetir contraseña
        </label>
        <input
          id="password2"
          name="password2"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
          maxLength={120}
          className="input"
          placeholder="Alias, CBU, IBAN o link de pago"
        />
        <p className="hint mt-1">
          Se lo mostramos sólo a quien te tenga que pagar. Lo podés cargar después desde tu perfil.
        </p>
      </div>

      <SubmitButton className="btn-primary w-full" pendingLabel="Creando…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}
