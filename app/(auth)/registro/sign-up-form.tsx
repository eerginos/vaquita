"use client";

import { useActionState } from "react";

import { signUpAction, type ActionState } from "@/app/actions/auth";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = {};

export function SignUpForm({ code }: { code: string }) {
  const [state, action] = useActionState(signUpAction, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      <FormError message={state.error} />

      <div>
        <label className="label" htmlFor="name">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          required
          autoFocus
          autoComplete="name"
          className="input"
          placeholder="Emiliano"
        />
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

      <SubmitButton className="btn-primary w-full" pendingLabel="Creando…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}
