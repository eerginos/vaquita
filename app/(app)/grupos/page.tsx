import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { getUserGroups } from "@/lib/queries";
import { AvatarStack } from "@/components/avatar";
import { Balance } from "@/components/money";
import { EmptyState } from "@/components/form-error";

export const metadata: Metadata = { title: "Grupos" };

export default async function GroupsPage() {
  const user = await requireUser();
  const groups = await getUserGroups(user.id);

  const active = groups.filter((g) => !g.archivedAt);
  const archived = groups.filter((g) => g.archivedAt);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Grupos</h1>
        <Link href="/grupos/nuevo" className="btn-primary text-sm">
          + Nuevo grupo
        </Link>
      </div>

      {active.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="👥"
            title="No tenés grupos activos"
            description="Creá uno para empezar a cargar gastos compartidos."
            action={
              <Link href="/grupos/nuevo" className="btn-primary">
                Crear grupo
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="card divide-y">
          {active.map((group) => (
            <li key={group.id}>
              <Link
                href={`/grupos/${group.id}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--surface-2)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-2)] text-xl">
                  {group.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{group.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <AvatarStack people={group.members} />
                    <span className="text-xs text-[var(--text-muted)]">
                      {group.members.length} personas · {group.expenseCount}{" "}
                      {group.expenseCount === 1 ? "gasto" : "gastos"}
                    </span>
                  </div>
                </div>
                <Balance cents={group.myBalanceCents} currency={group.currency} withLabel />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-[var(--text-muted)]">Archivados</h2>
          <ul className="card divide-y">
            {archived.map((group) => (
              <li key={group.id}>
                <Link
                  href={`/grupos/${group.id}`}
                  className="flex items-center gap-3 px-4 py-3 opacity-70 transition hover:opacity-100"
                >
                  <span className="text-lg">{group.emoji}</span>
                  <span className="flex-1 truncate text-sm">{group.name}</span>
                  <Balance cents={group.myBalanceCents} currency={group.currency} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
