import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getGroupDetail } from "@/lib/queries";
import { formatDateShort } from "@/lib/dates";
import { getTimezone } from "@/lib/settings";
import { IncludeForm, type ClientExpense } from "./include-form";

export const metadata: Metadata = { title: "Sumar a gastos anteriores" };

export default async function IncludePage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ quien?: string }>;
}) {
  const { groupId } = await params;
  const { quien } = await searchParams;
  const user = await requireUser();
  const tz = await getTimezone();

  const group = await getGroupDetail(groupId);
  if (!group || !group.members.some((m) => m.id === user.id)) notFound();
  if (group.archivedAt) notFound();

  const [expenses, settlements] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId, deletedAt: null },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        payers: { select: { userId: true, amountCents: true } },
        shares: { select: { userId: true, amountCents: true, weight: true } },
      },
    }),
    prisma.settlement.findMany({
      where: { groupId, deletedAt: null },
      select: { fromUserId: true, toUserId: true, amountCents: true },
    }),
  ]);

  // Los bigint no cruzan al cliente: van como string y se reconstruyen allá.
  const clientExpenses: ClientExpense[] = expenses.map((e) => ({
    id: e.id,
    description: e.description,
    dateLabel: formatDateShort(e.date, tz),
    category: e.category,
    amountCents: e.amountCents.toString(),
    splitType: e.splitType,
    payers: e.payers.map((p) => ({ userId: p.userId, amountCents: p.amountCents.toString() })),
    shares: e.shares.map((s) => ({
      userId: s.userId,
      amountCents: s.amountCents.toString(),
      weight: s.weight,
    })),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/grupos/${groupId}/configuracion`} className="text-sm text-[var(--text-muted)] hover:underline">
        ← Configuración de {group.emoji} {group.name}
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sumar a gastos anteriores</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Si alguien se sumó al grupo después de que ya habías cargado gastos, acá lo agregás a los
          que le correspondan y se recalcula todo de una.
        </p>
      </div>

      <IncludeForm
        groupId={groupId}
        currency={group.currency}
        simplifyDebts={group.simplifyDebts}
        members={group.members.map((m) => ({
          id: m.id,
          name: m.name,
          color: m.color,
          emoji: m.emoji,
        }))}
        currentUserId={user.id}
        expenses={clientExpenses}
        settlements={settlements.map((s) => ({
          fromUserId: s.fromUserId,
          toUserId: s.toUserId,
          amountCents: s.amountCents.toString(),
        }))}
        preselected={quien ?? ""}
      />
    </div>
  );
}
