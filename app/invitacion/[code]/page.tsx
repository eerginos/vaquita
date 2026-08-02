import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isInviteUsable } from "@/lib/invites";
import { inviteHeadline, inviteSubline } from "@/lib/invite-copy";
import { Avatar } from "@/components/avatar";
import { VaquitaEntera, VaquitaTexto } from "@/components/logo";

type Props = { params: Promise<{ code: string }> };

async function loadInvite(code: string) {
  return prisma.invitation.findUnique({
    where: { code },
    include: {
      createdBy: { select: { name: true } },
      group: {
        select: {
          id: true,
          name: true,
          emoji: true,
          members: {
            select: { user: { select: { id: true, name: true, color: true, emoji: true } } },
          },
        },
      },
    },
  });
}

/** Lo que ve WhatsApp cuando alguien pega el link en el chat. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const invitation = await loadInvite(code);

  if (!invitation || !isInviteUsable(invitation)) {
    return { title: "Invitación", description: "Este link de invitación ya no sirve." };
  }

  const title = inviteHeadline(
    invitation.createdBy.name,
    invitation.group?.name ?? null,
    invitation.maxUses === null,
  );

  return {
    title,
    description: inviteSubline(invitation.group?.name ?? null),
    openGraph: {
      title,
      description: inviteSubline(invitation.group?.name ?? null),
      siteName: "Vaquita",
      locale: "es_AR",
      type: "website",
    },
    twitter: { card: "summary_large_image", title },
  };
}

export default async function InvitePage({ params }: Props) {
  const { code } = await params;

  // Quien ya tiene sesión no ve esta pantalla: se suma y entra derecho.
  // Los crawlers de WhatsApp no tienen sesión, así que siempre leen el HTML.
  const user = await getCurrentUser();
  if (user) redirect(`/invitacion/entrar?code=${encodeURIComponent(code)}`);

  const invitation = await loadInvite(code);
  const usable = invitation ? isInviteUsable(invitation) : false;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <VaquitaEntera size={130} />
          <VaquitaTexto height={34} className="-mt-2" />
        </div>

        <div className="card space-y-4 p-6 text-center">
          {!invitation || !usable ? (
            <>
              <p className="text-4xl">🙈</p>
              <p className="font-medium">Ese link ya no sirve</p>
              <p className="text-sm text-[var(--text-muted)]">
                Se usó todas las veces que podía, venció, o lo revocaron. Pedile uno nuevo a quien te
                invitó.
              </p>
            </>
          ) : (
            <>
              <p className="text-4xl">{invitation.group?.emoji ?? "🧾"}</p>
              <div>
                <p className="font-medium">
                  {inviteHeadline(
                    invitation.createdBy.name,
                    invitation.group?.name ?? null,
                    invitation.maxUses === null,
                  )}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Creá tu cuenta y ya quedás adentro.
                </p>
              </div>

              {invitation.group && invitation.group.members.length > 0 && (
                <div>
                  <div className="flex items-center justify-center gap-1.5">
                    {invitation.group.members.slice(0, 6).map((m) => (
                      <Avatar
                        key={m.user.id}
                        name={m.user.name}
                        color={m.user.color}
                        emoji={m.user.emoji}
                        size="sm"
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {invitation.group.members.length}{" "}
                    {invitation.group.members.length === 1 ? "persona" : "personas"} ya adentro
                  </p>
                </div>
              )}

              <Link href={`/registro?code=${encodeURIComponent(code)}`} className="btn-primary w-full">
                Crear mi cuenta
              </Link>

              <p className="text-sm text-[var(--text-muted)]">
                ¿Ya tenés cuenta?{" "}
                <Link href="/ingresar" className="font-medium text-brand-600 hover:underline">
                  Entrá
                </Link>{" "}
                y volvé a abrir este link.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
