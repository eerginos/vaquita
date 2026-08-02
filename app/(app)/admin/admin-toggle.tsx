"use client";

import { useState } from "react";

import { toggleAdminAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/submit-button";

/**
 * Dar admin no se explica solo, y es difícil de deshacer si te lo quitan a vos.
 * Por eso el primer click no ejecuta: abre el detalle de lo que implica.
 */
export function AdminToggle({
  userId,
  name,
  isAdmin,
}: {
  userId: string;
  name: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (isAdmin) {
    return (
      <form action={toggleAdminAction}>
        <input type="hidden" name="userId" value={userId} />
        <SubmitButton
          className="btn-ghost px-2 py-1 text-xs"
          pendingLabel="…"
          confirm={`¿Quitarle admin a ${name}?`}
        >
          Quitar admin
        </SubmitButton>
      </form>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost px-2 py-1 text-xs"
      >
        Hacer admin
      </button>
    );
  }

  return (
    <div className="basis-full rounded-lg border border-brand-500/30 bg-brand-500/5 p-3">
      <p className="text-sm font-medium">Si hacés admin a {name}, va a poder:</p>

      <ul className="mt-2 space-y-1 text-sm text-[var(--text-muted)]">
        <li>· Generar invitaciones para que entre gente nueva a la app.</li>
        <li>· Generar links para restablecer la contraseña de cualquiera.</li>
        <li>· Cambiar la zona horaria con la que se muestran las fechas.</li>
        <li>· Ver la lista completa de personas, con sus emails.</li>
        <li className="text-[var(--text)]">
          · <strong>Hacer y quitar admin a otros, incluido a vos.</strong>
        </li>
      </ul>

      <p className="hint mt-2">
        No le da acceso a los grupos donde no esté: para ver los gastos de un grupo hay que ser
        integrante, y sumarse queda registrado en la actividad.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={toggleAdminAction}>
          <input type="hidden" name="userId" value={userId} />
          <SubmitButton className="btn-primary px-3 py-1.5 text-xs" pendingLabel="Dando permisos…">
            Entiendo, hacerlo admin
          </SubmitButton>
        </form>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost px-3 py-1.5 text-xs"
        >
          Mejor no
        </button>
      </div>
    </div>
  );
}
