import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import { getOverallBalances } from "@/lib/queries";
import { Avatar } from "@/components/avatar";
import { BalanceSentence } from "@/components/money";
import { EmptyState } from "@/components/form-error";

export const metadata: Metadata = { title: "Personas" };

export default async function PeoplePage() {
  const user = await requireUser();
  const { people } = await getOverallBalances(user.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Personas</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Tu saldo con cada persona, sumando todos los grupos que comparten.
        </p>
      </div>

      {people.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="🤝"
            title="No tenés deudas con nadie"
            description="Cuando cargues gastos compartidos van a aparecer acá."
          />
        </div>
      ) : (
        <ul className="card divide-y">
          {people.map((person) => (
            <li key={person.user.id} className="flex items-center gap-3 px-4 py-3.5">
              <Avatar name={person.user.name} color={person.user.color} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{person.user.name}</p>
                <div className="mt-0.5 space-y-0.5">
                  {[...person.byCurrency.entries()]
                    .filter(([, cents]) => cents !== 0n)
                    .map(([currency, cents]) => (
                      <div key={currency} className="flex items-center gap-1.5">
                        <BalanceSentence
                          cents={cents}
                          currency={currency}
                          otherName={person.user.name}
                        />
                        <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                          {currency}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
