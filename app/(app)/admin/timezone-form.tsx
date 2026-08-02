"use client";

import { useActionState, useState } from "react";

import { updateTimezoneAction, type AdminState } from "@/app/actions/admin";
import { TIMEZONE_OPTIONS, timezoneOffsetLabel } from "@/lib/timezones";
import { FormError, FormSuccess } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

const initial: AdminState = {};

export function TimezoneForm({ current, sample }: { current: string; sample: string }) {
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
          {TIMEZONE_OPTIONS.map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.label} ({timezoneOffsetLabel(zone.id)})
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
        Ahora mismo son las <strong>{sample}</strong> según la zona guardada.
      </p>
    </form>
  );
}
