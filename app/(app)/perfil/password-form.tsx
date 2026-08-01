"use client";

import { useActionState } from "react";

import { changePasswordAction, type ActionState } from "@/app/actions/auth";
import { FormError, FormSuccess } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = {};

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, initial);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div>
        <label className="label" htmlFor="current">
          Contraseña actual
        </label>
        <input
          id="current"
          name="current"
          type="password"
          required
          autoComplete="current-password"
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="next">
          Contraseña nueva
        </label>
        <input
          id="next"
          name="next"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="next2">
          Repetir contraseña nueva
        </label>
        <input
          id="next2"
          name="next2"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
        />
      </div>

      <SubmitButton className="btn-primary">Cambiar contraseña</SubmitButton>
    </form>
  );
}
