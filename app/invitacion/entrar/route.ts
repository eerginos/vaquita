import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isInviteUsable } from "@/lib/invites";

/**
 * Suma al grupo a quien ya tiene cuenta y lo manda adentro, sin pantallas
 * intermedias. Acá llega redirigido desde /invitacion, que es la página con
 * la vista previa para WhatsApp.
 *
 * Es un route handler y no una página porque acá se escribe en la base:
 * corre una sola vez por request, a diferencia del render de un componente.
 */
export async function GET(request: NextRequest) {
  // Location relativo a propósito: detrás del proxy de Coolify, la URL del
  // request es la interna del contenedor (0.0.0.0:3000), así que armar una
  // URL absoluta con ella mandaba al navegador a una dirección que no existe.
  // Un Location relativo lo resuelve el navegador contra el dominio real.
  const to = (path: string) => new NextResponse(null, { status: 303, headers: { Location: path } });

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return to("/invitacion/estado?e=falta");

  const user = await getCurrentUser();
  if (!user) return to(`/registro?code=${encodeURIComponent(code)}`);

  const invitation = await prisma.invitation.findUnique({ where: { code } });
  if (!invitation || !isInviteUsable(invitation)) return to("/invitacion/estado?e=vencida");

  // Invitación sólo para crear cuenta, y quien la abre ya tiene una.
  if (!invitation.groupId) return to("/invitacion/estado?e=sin-grupo");

  const groupId = invitation.groupId;
  const already = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: user.id } },
  });
  if (already) return to(`/grupos/${groupId}`);

  try {
    await prisma.$transaction(async (tx) => {
      // Compare-and-swap sobre useCount: si dos abren el link a la vez,
      // cada uno consume su propio uso y ninguno se pierde ni se duplica.
      const claimed = await tx.invitation.updateMany({
        where: { id: invitation.id, useCount: invitation.useCount },
        data: {
          useCount: invitation.useCount + 1,
          ...(invitation.usedAt ? {} : { usedAt: new Date(), usedById: user.id }),
        },
      });
      if (claimed.count === 0) throw new Error("carrera");

      await tx.groupMember.create({ data: { groupId, userId: user.id } });
      await tx.activity.create({
        data: { type: "MEMBER_JOINED", groupId, actorId: user.id, meta: { name: user.name } },
      });
    });
  } catch {
    // Otro se llevó el último uso entre la lectura y la escritura.
    return to("/invitacion/estado?e=vencida");
  }

  return to(`/grupos/${groupId}`);
}
