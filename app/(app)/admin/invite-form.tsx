"use client";

import { useActionState } from "react";

import { createGlobalInviteAction, type AdminState } from "@/app/actions/admin";
import { CopyField } from "@/components/copy-field";
import { FormError, FormSuccess } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

const initial: AdminState = {};

export function InviteForm() {
  const [state, action] = useActionState(createGlobalInviteAction, initial);

  return (
    <div className="space-y-3">
      <form action={action} className="flex gap-2">
        <input name="label" className="input" placeholder="Para quién es (opcional)" maxLength={60} />
        <SubmitButton className="btn-primary shrink-0 text-sm" pendingLabel="Generando…">
          Generar link
        </SubmitButton>
      </form>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      {state.link && <CopyField value={state.link} />}
    </div>
  );
}
