"use client";

import { useActionState } from "react";

import { addMembersAction, type ActionState } from "@/app/actions/groups";
import { Avatar } from "@/components/avatar";
import { FormError, FormSuccess } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";

type Person = { id: string; name: string; email: string; color: string; emoji: string | null };

const initial: ActionState = {};

export function AddMembersForm({
  groupId,
  candidates,
}: {
  groupId: string;
  candidates: Person[];
}) {
  const [state, action] = useActionState(addMembersAction, initial);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="groupId" value={groupId} />
      <p className="text-sm font-medium">Sumar gente que ya tiene cuenta</p>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-1">
        {candidates.map((person) => (
          <li key={person.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-[var(--surface-2)]">
              <input
                type="checkbox"
                name="userIds"
                value={person.id}
                className="h-4 w-4 accent-[var(--color-brand-600)]"
              />
              <Avatar name={person.name} color={person.color} emoji={person.emoji} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{person.name}</span>
                <span className="block truncate text-xs text-[var(--text-muted)]">
                  {person.email}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <SubmitButton className="btn-secondary text-sm">Agregar al grupo</SubmitButton>
    </form>
  );
}
