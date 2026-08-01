"use client";

import { useActionState, useEffect, useRef } from "react";

import { addCommentAction, type ActionState } from "@/app/actions/comments";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = {};

export function CommentForm({ expenseId }: { expenseId: string }) {
  const [state, action] = useActionState(addCommentAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  // Limpia el textarea cuando el comentario se guardó bien.
  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="expenseId" value={expenseId} />
      <FormError message={state.error} />
      <textarea
        name="body"
        rows={2}
        required
        maxLength={1000}
        className="input resize-y"
        placeholder="Escribí un comentario…"
      />
      <div className="flex justify-end">
        <SubmitButton className="btn-secondary text-sm" pendingLabel="Enviando…">
          Comentar
        </SubmitButton>
      </div>
    </form>
  );
}
