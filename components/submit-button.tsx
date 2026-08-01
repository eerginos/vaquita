"use client";

import { useFormStatus } from "react-dom";
import clsx from "clsx";

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn-primary",
  formAction,
  confirm,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  confirm?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending}
      onClick={confirm ? (e) => !window.confirm(confirm) && e.preventDefault() : undefined}
      className={clsx(className, pending && "opacity-70")}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? "Guardando…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
