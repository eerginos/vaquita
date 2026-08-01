"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";

import { updateProfileAction, type ActionState } from "@/app/actions/auth";
import { USER_COLORS } from "@/lib/colors";
import { FormError, FormSuccess } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = {};

export function ProfileForm({ name, color }: { name: string; color: string }) {
  const [state, action] = useActionState(updateProfileAction, initial);
  const [selected, setSelected] = useState(color);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <div>
        <label className="label" htmlFor="name">
          Nombre
        </label>
        <input id="name" name="name" required defaultValue={name} className="input" />
      </div>

      <div>
        <span className="label">Color</span>
        <input type="hidden" name="color" value={selected} />
        <div className="flex flex-wrap gap-2">
          {USER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelected(c)}
              style={{ backgroundColor: c }}
              className={clsx(
                "h-8 w-8 rounded-full transition",
                selected === c
                  ? "ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--surface)]"
                  : "hover:scale-110",
              )}
              aria-label={`Color ${c}`}
              aria-pressed={selected === c}
            />
          ))}
        </div>
      </div>

      <SubmitButton className="btn-primary">Guardar</SubmitButton>
    </form>
  );
}
