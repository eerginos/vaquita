import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth";
import { getGroupDetail } from "@/lib/queries";
import { centsToInput, formatMoney } from "@/lib/money";
import { toDateInput } from "@/lib/dates";
import { getTimezone } from "@/lib/settings";
import { SettleForm } from "./settle-form";

export const metadata: Metadata = { title: "Saldar cuentas" };

export default async function SettlePage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ de?: string; a?: string; monto?: string }>;
}) {
  const { groupId } = await params;
  const { de, a, monto } = await searchParams;
  const user = await requireUser();
  const tz = await getTimezone();

  const group = await getGroupDetail(groupId);
  if (!group || !group.members.some((m) => m.id === user.id)) notFound();

  // Sugerencias: sólo las transferencias donde participa quien está mirando.
  const suggestions = group.transfers
    .filter((t) => t.fromUserId === user.id || t.toUserId === user.id)
    .map((t) => ({
      fromUserId: t.fromUserId,
      toUserId: t.toUserId,
      amountInput: centsToInput(t.amountCents),
      label:
        t.fromUserId === user.id
          ? `Le pagás a ${group.members.find((m) => m.id === t.toUserId)?.name} ${formatMoney(t.amountCents, group.currency)}`
          : `${group.members.find((m) => m.id === t.fromUserId)?.name} te paga ${formatMoney(t.amountCents, group.currency)}`,
    }));

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href={`/grupos/${groupId}`} className="text-sm text-[var(--text-muted)] hover:underline">
        ← {group.emoji} {group.name}
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Registrar un pago</h1>
      <p className="text-sm text-[var(--text-muted)]">
        Esto no mueve plata de verdad: sólo deja constancia de que alguien le pagó a otro para
        actualizar los saldos.
      </p>

      <div className="card p-5">
        <SettleForm
          groupId={groupId}
          currency={group.currency}
          members={group.members}
          currentUserId={user.id}
          suggestions={suggestions}
          preset={{
            fromUserId: de ?? "",
            toUserId: a ?? "",
            amountInput: monto ?? "",
          }}
          defaultDate={toDateInput(new Date(), tz)}
        />
      </div>
    </div>
  );
}
