"use client";

import { useEffect, useState } from "react";
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
  /**
   * Si viene, el primer click no envía: muestra la pregunta al lado del botón.
   * A propósito NO usamos window.confirm: los navegadores embebidos lo
   * descartan solo (y eso cuenta como cancelar), y Chrome lo suprime si ya
   * descartaste uno en la misma página. El resultado es un botón que no hace
   * nada sin explicación.
   */
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  const [armed, setArmed] = useState(false);

  // Si el formulario se envió, la pregunta ya no va.
  useEffect(() => {
    if (pending) setArmed(false);
  }, [pending]);

  if (pending) {
    return (
      <button type="submit" disabled className={clsx(className, "opacity-70")}>
        <Spinner />
        {pendingLabel ?? "Guardando…"}
      </button>
    );
  }

  if (confirm && armed) {
    return (
      <span className="inline-flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs text-[var(--text-muted)]">{confirm}</span>
        <button
          type="submit"
          formAction={formAction}
          className="btn-danger px-2.5 py-1 text-xs"
          autoFocus
        >
          Sí, dale
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="btn-ghost px-2.5 py-1 text-xs"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type={confirm ? "button" : "submit"}
      formAction={confirm ? undefined : formAction}
      onClick={confirm ? () => setArmed(true) : undefined}
      className={className}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
