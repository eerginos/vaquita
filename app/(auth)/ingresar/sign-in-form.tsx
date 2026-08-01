"use client";

import { useActionState } from "react";

import { signInAction, type ActionState } from "@/app/actions/auth";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = {};

export function SignInForm() {
  const [state, action] = useActionState(signInAction, initial);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
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
          autoComplete="current-password"
          required
          className="input"
          placeholder="••••••••"
        />
      </div>

      <SubmitButton className="btn-primary w-full" pendingLabel="Entrando…">
        Entrar
      </SubmitButton>
    </form>
  );
}
