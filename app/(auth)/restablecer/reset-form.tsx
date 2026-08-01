"use client";

import Link from "next/link";
import { useActionState } from "react";

import { resetPasswordAction, type AdminState } from "@/app/actions/admin";
import { FormError, FormSuccess } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

const initial: AdminState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initial);

  if (state.success) {
    return (
      <div className="space-y-4">
        <FormSuccess message={state.success} />
        <Link href="/ingresar" className="btn-primary w-full">
          Ir a ingresar
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />

      {!token && (
        <p className="rounded-lg border border-debt-500/30 bg-debt-500/10 px-3 py-2 text-sm text-debt-500">
          Falta el token en el link. Abrí el link completo que te pasaron.
        </p>
      )}

      <div>
        <label className="label" htmlFor="password">
          Contraseña nueva
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
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

      <SubmitButton className="btn-primary w-full" pendingLabel="Guardando…">
        Guardar contraseña
      </SubmitButton>
    </form>
  );
}
