"use client";

import { useActionState, useState } from "react";

import { updateTimezoneAction, type AdminState } from "@/app/actions/admin";
import { FormError, FormSuccess } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

export type ZoneGroup = {
  group: string;
  zones: { id: string; label: string }[];
};

const initial: AdminState = {};

export function TimezoneForm({
  current,
  sampleTime,
  sampleDate,
  groups,
}: {
  current: string;
  sampleTime: string;
  sampleDate: string;
  /**
   * Vienen ya armadas desde el servidor, con el desfasaje incluido en la
   * etiqueta. Calcularlo acá daría distinto en Node y en el navegador
   * ("GMT" contra "GMT+0" para UTC) y rompería la hidratación.
   */
  groups: ZoneGroup[];
}) {
  const [state, action] = useActionState(updateTimezoneAction, initial);
  const [selected, setSelected] = useState(current);

  return (
    <form action={action} className="space-y-3">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div className="flex flex-wrap gap-2">
        <select
          name="timezone"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="input"
        >
          {groups.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <SubmitButton className="btn-primary shrink-0 text-sm" pendingLabel="Guardando…">
          Guardar
        </SubmitButton>
      </div>

      <p className="hint">
        Con la zona guardada, ahí son las <strong>{sampleTime}</strong> del {sampleDate}.
      </p>
    </form>
  );
}
