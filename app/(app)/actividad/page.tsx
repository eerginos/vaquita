import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { getActivity } from "@/lib/queries";
import { getTimezone } from "@/lib/settings";
import { formatRelative } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/form-error";

export const metadata: Metadata = { title: "Actividad" };

const ICONS: Record<string, string> = {
  GROUP_CREATED: "✨",
  MEMBER_JOINED: "➕",
  MEMBER_LEFT: "➖",
  EXPENSE_CREATED: "🧾",
  EXPENSE_UPDATED: "✏️",
  EXPENSE_DELETED: "🗑️",
  EXPENSES_RESPLIT: "🔄",
  SETTLEMENT_CREATED: "💸",
  SETTLEMENT_DELETED: "↩️",
  COMMENT_ADDED: "💬",
};

type Meta = {
  name?: string;
  description?: string;
  amountCents?: string;
  currency?: string;
  fromName?: string;
  toName?: string;
  preview?: string;
  names?: string[];
  count?: number;
};

function describe(type: string, actorName: string, isMe: boolean, meta: Meta): React.ReactNode {
  const amount =
    meta.amountCents !== undefined
      ? formatMoney(BigInt(meta.amountCents), meta.currency ?? "ARS")
      : null;

  // "Vos agregó" suena horrible: cuando el actor es quien mira, va en segunda persona.
  const verb = (segunda: string, tercera: string) =>
    isMe ? segunda : `${actorName} ${tercera}`;

  const listar = (names: string[]) =>
    names.length > 1 ? `${names.slice(0, -1).join(", ")} y ${names.at(-1)}` : (names[0] ?? "alguien");

  switch (type) {
    case "GROUP_CREATED":
      return verb("Creaste el grupo", "creó el grupo");
    case "MEMBER_JOINED":
      return `${meta.name ?? "Alguien"} se sumó al grupo`;
    case "MEMBER_LEFT":
      return `${meta.name ?? "Alguien"} salió del grupo`;
    case "EXPENSE_CREATED":
      return `${verb("Agregaste", "agregó")} "${meta.description}" por ${amount}`;
    case "EXPENSE_UPDATED":
      return `${verb("Editaste", "editó")} "${meta.description}" — ahora ${amount}`;
    case "EXPENSE_DELETED":
      return `${verb("Borraste", "borró")} "${meta.description}" de ${amount}`;
    case "EXPENSES_RESPLIT":
      return `${verb("Sumaste", "sumó")} a ${listar(meta.names ?? [])} a ${meta.count} ${
        meta.count === 1 ? "gasto anterior" : "gastos anteriores"
      } y se recalcularon los saldos`;
    case "SETTLEMENT_CREATED":
      return `${meta.fromName} le pagó ${amount} a ${meta.toName}`;
    case "SETTLEMENT_DELETED":
      return `${verb("Anulaste", "anuló")} el pago de ${meta.fromName} a ${meta.toName} (${amount})`;
    case "COMMENT_ADDED":
      return `${verb("Comentaste", "comentó")}: "${meta.preview}"`;
    default:
      return verb("Hiciste algo", "hizo algo");
  }
}

export default async function ActivityPage() {
  const user = await requireUser();
  const [activities, tz] = await Promise.all([getActivity(user.id), getTimezone()]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Actividad</h1>

      {activities.length === 0 ? (
        <div className="card">
          <EmptyState icon="🔔" title="Todavía no pasó nada" description="Acá vas a ver todo lo que se mueve en tus grupos." />
        </div>
      ) : (
        <ul className="card divide-y">
          {activities.map((activity) => {
            const meta = (activity.meta ?? {}) as Meta;
            const isMe = activity.actor.id === user.id;
            const body = describe(activity.type, activity.actor.name, isMe, meta);

            const row = (
              <div className="flex items-start gap-3 px-4 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-base">
                  {ICONS[activity.type] ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{body}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <Avatar name={activity.actor.name} color={activity.actor.color} emoji={activity.actor.emoji} size="xs" />
                    {activity.group && (
                      <span>
                        {activity.group.emoji} {activity.group.name} ·
                      </span>
                    )}
                    {formatRelative(activity.createdAt, tz)}
                  </p>
                </div>
              </div>
            );

            const href = activity.expenseId
              ? `/grupos/${activity.groupId}/gastos/${activity.expenseId}`
              : activity.groupId
                ? `/grupos/${activity.groupId}`
                : null;

            return (
              <li key={activity.id}>
                {href ? (
                  <Link href={href} className="block transition-colors hover:bg-[var(--surface-2)]">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
