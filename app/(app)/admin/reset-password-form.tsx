"use client";

import { useActionState } from "react";

import { createPasswordResetAction, type AdminState } from "@/app/actions/admin";
import { CopyField } from "@/components/copy-field";
import { FormError, FormSuccess } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

const initial: AdminState = {};

export function ResetPasswordForm({
  users,
}: {
  users: { id: string; name: string; email: string }[];
}) {
  const [state, action] = useActionState(createPasswordResetAction, initial);

  return (
    <div className="space-y-3">
      <form action={action} className="flex gap-2">
        <select name="userId" className="input" defaultValue="">
          <option value="" disabled>
            Elegí a la persona…
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        <SubmitButton className="btn-secondary shrink-0 text-sm" pendingLabel="Generando…">
          Generar link
        </SubmitButton>
      </form>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      {state.link && <CopyField value={state.link} />}
    </div>
  );
}
