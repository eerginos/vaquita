import "server-only";

import { prisma } from "@/lib/db";
import { settlementPlan, type Transfer } from "@/lib/balances";

export type MemberLite = {
  id: string;
  name: string;
  email: string;
  color: string;
  emoji: string | null;
  role: "OWNER" | "MEMBER";
};

export type GroupLedger = {
  expenses: {
    payers: { userId: string; amountCents: bigint }[];
    shares: { userId: string; amountCents: bigint }[];
  }[];
  settlements: { fromUserId: string; toUserId: string; amountCents: bigint }[];
};

/** Movimientos crudos de un conjunto de grupos, agrupados por grupo. */
export async function loadLedgers(groupIds: string[]): Promise<Map<string, GroupLedger>> {
  const ledgers = new Map<string, GroupLedger>();
  for (const id of groupIds) ledgers.set(id, { expenses: [], settlements: [] });
  if (groupIds.length === 0) return ledgers;

  const [expenses, settlements] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId: { in: groupIds }, deletedAt: null },
      select: {
        groupId: true,
        payers: { select: { userId: true, amountCents: true } },
        shares: { select: { userId: true, amountCents: true } },
      },
    }),
    prisma.settlement.findMany({
      where: { groupId: { in: groupIds }, deletedAt: null },
      select: { groupId: true, fromUserId: true, toUserId: true, amountCents: true },
    }),
  ]);

  for (const e of expenses) {
    ledgers.get(e.groupId)?.expenses.push({ payers: e.payers, shares: e.shares });
  }
  for (const s of settlements) {
    ledgers.get(s.groupId)?.settlements.push({
      fromUserId: s.fromUserId,
      toUserId: s.toUserId,
      amountCents: s.amountCents,
    });
  }

  return ledgers;
}

export type GroupSummary = {
  id: string;
  name: string;
  emoji: string;
  currency: string;
  archivedAt: Date | null;
  members: { id: string; name: string; color: string; emoji: string | null }[];
  myBalanceCents: bigint;
  expenseCount: number;
};

export async function getUserGroups(userId: string): Promise<GroupSummary[]> {
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    orderBy: [{ archivedAt: "asc" }, { updatedAt: "desc" }],
    include: {
      members: {
        orderBy: { joinedAt: "asc" },
        select: { user: { select: { id: true, name: true, color: true, emoji: true } } },
      },
      _count: { select: { expenses: { where: { deletedAt: null } } } },
    },
  });

  const ledgers = await loadLedgers(groups.map((g) => g.id));

  return groups.map((group) => {
    const ledger = ledgers.get(group.id)!;
    const memberIds = group.members.map((m) => m.user.id);
    const { net } = settlementPlan(ledger.expenses, ledger.settlements, {
      simplify: group.simplifyDebts,
      memberIds,
    });

    return {
      id: group.id,
      name: group.name,
      emoji: group.emoji,
      currency: group.currency,
      archivedAt: group.archivedAt,
      members: group.members.map((m) => m.user),
      myBalanceCents: net.get(userId) ?? 0n,
      expenseCount: group._count.expenses,
    };
  });
}

export type GroupDetail = {
  id: string;
  name: string;
  emoji: string;
  currency: string;
  simplifyDebts: boolean;
  archivedAt: Date | null;
  createdById: string;
  members: MemberLite[];
  net: Map<string, bigint>;
  transfers: Transfer[];
};

export async function getGroupDetail(groupId: string): Promise<GroupDetail | null> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        orderBy: { joinedAt: "asc" },
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true, color: true, emoji: true } },
        },
      },
    },
  });
  if (!group) return null;

  const ledger = (await loadLedgers([groupId])).get(groupId)!;
  const members: MemberLite[] = group.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    color: m.user.color,
    emoji: m.user.emoji,
    role: m.role,
  }));

  const { net, transfers } = settlementPlan(ledger.expenses, ledger.settlements, {
    simplify: group.simplifyDebts,
    memberIds: members.map((m) => m.id),
  });

  return {
    id: group.id,
    name: group.name,
    emoji: group.emoji,
    currency: group.currency,
    simplifyDebts: group.simplifyDebts,
    archivedAt: group.archivedAt,
    createdById: group.createdById,
    members,
    net,
    transfers,
  };
}

/** Gastos y pagos de un grupo, mezclados y ordenados por fecha (más nuevo primero). */
export async function getGroupTimeline(groupId: string) {
  const [expenses, settlements] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId, deletedAt: null },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        payers: { include: { user: { select: { id: true, name: true, color: true, emoji: true } } } },
        shares: { include: { user: { select: { id: true, name: true, color: true, emoji: true } } } },
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
    }),
    prisma.settlement.findMany({
      where: { groupId, deletedAt: null },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        from: { select: { id: true, name: true, color: true, emoji: true } },
        to: { select: { id: true, name: true, color: true, emoji: true } },
      },
    }),
  ]);

  type Item =
    | { kind: "expense"; date: Date; data: (typeof expenses)[number] }
    | { kind: "settlement"; date: Date; data: (typeof settlements)[number] };

  const items: Item[] = [
    ...expenses.map((e) => ({ kind: "expense" as const, date: e.date, data: e })),
    ...settlements.map((s) => ({ kind: "settlement" as const, date: s.date, data: s })),
  ];

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  return items;
}

export type PersonBalance = {
  user: { id: string; name: string; color: string; emoji: string | null };
  byCurrency: Map<string, bigint>;
};

/**
 * Saldo consolidado del usuario contra cada persona, sumando todos los grupos.
 * Se agrupa por moneda porque no convertimos entre monedas.
 */
export async function getOverallBalances(userId: string) {
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    select: {
      id: true,
      currency: true,
      simplifyDebts: true,
      members: { select: { user: { select: { id: true, name: true, color: true, emoji: true } } } },
    },
  });

  const ledgers = await loadLedgers(groups.map((g) => g.id));
  const totals = new Map<string, bigint>();
  const perPerson = new Map<string, PersonBalance>();

  for (const group of groups) {
    const ledger = ledgers.get(group.id)!;
    const memberIds = group.members.map((m) => m.user.id);
    const { net, transfers } = settlementPlan(ledger.expenses, ledger.settlements, {
      simplify: group.simplifyDebts,
      memberIds,
    });

    const mine = net.get(userId) ?? 0n;
    totals.set(group.currency, (totals.get(group.currency) ?? 0n) + mine);

    for (const t of transfers) {
      if (t.fromUserId !== userId && t.toUserId !== userId) continue;
      const otherId = t.fromUserId === userId ? t.toUserId : t.fromUserId;
      const other = group.members.find((m) => m.user.id === otherId)?.user;
      if (!other) continue;

      // Positivo = me deben; negativo = debo.
      const delta = t.toUserId === userId ? t.amountCents : -t.amountCents;
      const entry =
        perPerson.get(otherId) ?? { user: other, byCurrency: new Map<string, bigint>() };
      entry.byCurrency.set(
        group.currency,
        (entry.byCurrency.get(group.currency) ?? 0n) + delta,
      );
      perPerson.set(otherId, entry);
    }
  }

  const people = [...perPerson.values()].filter((p) =>
    [...p.byCurrency.values()].some((v) => v !== 0n),
  );

  return { totals, people };
}

export async function getActivity(userId: string, limit = 60) {
  return prisma.activity.findMany({
    where: { group: { members: { some: { userId } } } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { id: true, name: true, color: true, emoji: true } },
      group: { select: { id: true, name: true, emoji: true, currency: true } },
    },
  });
}
