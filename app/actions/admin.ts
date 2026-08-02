"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { hashPassword, hashResetToken, newToken, requireAdmin, requireUser } from "@/lib/auth";
import { inviteLifetimeDays, inviteUrl } from "@/lib/invites";
import { setTimezone } from "@/lib/settings";
import { isValidTimezone, timezoneLabel } from "@/lib/timezones";

export type AdminState = { error?: string; success?: string; link?: string };

function appUrl(): string {
  return (process.env.APP_URL ?? "").replace(/\/$/, "");
}

export async function createGlobalInviteAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const user = await requireAdmin();
  const label = String(formData.get("label") ?? "").trim() || null;

  const multiUse = formData.get("multiUse") === "on";
  const days = inviteLifetimeDays(multiUse);

  const invite = await prisma.invitation.create({
    data: {
      code: newToken(),
      label,
      createdById: user.id,
      maxUses: multiUse ? null : 1,
      expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath("/admin");
  return {
    success: multiUse
      ? `Link para varios, vence en ${days} días.`
      : `Link de un solo uso, vence en ${days} días.`,
    link: inviteUrl(appUrl(), invite.code),
  };
}

export async function updateTimezoneAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (!isValidTimezone(timezone)) return { error: "Esa zona horaria no existe." };

  await setTimezone(timezone);
  // Toca todo: las fechas se muestran en cada pantalla.
  revalidatePath("/", "layout");

  return { success: `Listo, las fechas ahora se muestran en hora de ${timezoneLabel(timezone)}.` };
}

export async function createPasswordResetAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "No encontré a esa persona." };

  const token = newToken();
  await prisma.passwordReset.create({
    data: {
      tokenHash: hashResetToken(token),
      userId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return {
    success: `Link para ${target.name}. Vence en 24 horas y se usa una sola vez.`,
    link: `${appUrl()}/restablecer?token=${token}`,
  };
}

export async function toggleAdminAction(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (userId === me.id) throw new Error("No podés sacarte a vos mismo el rol de admin.");

  const target = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  await prisma.user.update({ where: { id: userId }, data: { isAdmin: !target.isAdmin } });

  revalidatePath("/admin");
}

/** Restablecer contraseña con un token. Público: lo usa quien recibió el link. */
export async function resetPasswordAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");

  if (password.length < 8) return { error: "La contraseña necesita al menos 8 caracteres." };
  if (password !== password2) return { error: "Las contraseñas no coinciden." };

  const record = await prisma.passwordReset.findUnique({
    where: { tokenHash: hashResetToken(token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "Ese link ya se usó o venció. Pedí uno nuevo." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.session.deleteMany({ where: { userId: record.userId } }),
  ]);

  return { success: "Listo, ya podés entrar con tu contraseña nueva." };
}

/** Cierra todas las sesiones del usuario actual excepto ninguna: obliga a volver a entrar. */
export async function revokeAllSessionsAction(): Promise<void> {
  const user = await requireUser();
  await prisma.session.deleteMany({ where: { userId: user.id } });
  revalidatePath("/", "layout");
}
