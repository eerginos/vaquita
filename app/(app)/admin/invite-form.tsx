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
      <form action={action} className="space-y-3">
        <div className="flex gap-2">
          <input
            name="label"
            className="input"
            placeholder="Para quién es (opcional)"
            maxLength={60}
          />
          <SubmitButton className="btn-primary shrink-0 text-sm" pendingLabel="Generando…">
            Generar link
          </SubmitButton>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border p-3">
          <input
            type="checkbox"
            name="multiUse"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand-600)]"
          />
          <span>
            <span className="block text-sm font-medium">Que lo pueda usar más de uno</span>
            <span className="hint">
              Para mandar a un grupo de WhatsApp. Lo usa quien quiera hasta que venza, a los 7 días
              en vez de 14. Podés revocarlo en cualquier momento.
            </span>
          </span>
        </label>
      </form>

      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      {state.link && <CopyField value={state.link} />}
    </div>
  );
}
