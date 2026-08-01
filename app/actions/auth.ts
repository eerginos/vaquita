"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  pruneExpired,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { colorForSeed, USER_COLORS } from "@/lib/colors";

export type ActionState = { error?: string; success?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Completá email y contraseña." };

  const user = await prisma.user.findUnique({ where: { email } });
  // Mismo mensaje para usuario inexistente y contraseña mala: no filtramos qué emails existen.
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) return { error: "Email o contraseña incorrectos." };

  const ua = (await headers()).get("user-agent") ?? undefined;
  await createSession(user.id, ua);
  void pruneExpired().catch(() => {});

  redirect("/");
}

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = text(formData, "name");
  const email = text(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  const code = text(formData, "code");

  if (name.length < 2) return { error: "Poné tu nombre (mínimo 2 caracteres)." };
  if (!EMAIL_RE.test(email)) return { error: "Ese email no parece válido." };
  if (password.length < 8) return { error: "La contraseña necesita al menos 8 caracteres." };
  if (password !== password2) return { error: "Las contraseñas no coinciden." };

  const userCount = await prisma.user.count();
  const bootstrapEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL ?? "").toLowerCase();
  const isBootstrap = userCount === 0 && bootstrapEmail !== "" && email === bootstrapEmail;

  let invitation = null;
  if (!isBootstrap) {
    if (!code) return { error: "Necesitás un link de invitación para crear una cuenta." };
    invitation = await prisma.invitation.findUnique({ where: { code } });
    if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
      return { error: "Esa invitación no existe, ya se usó o venció." };
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Ya hay una cuenta con ese email." };

  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        color: colorForSeed(email),
        isAdmin: isBootstrap,
      },
    });

    if (invitation) {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date(), usedById: created.id },
      });

      if (invitation.groupId) {
        await tx.groupMember.create({
          data: { groupId: invitation.groupId, userId: created.id },
        });
        await tx.activity.create({
          data: {
            type: "MEMBER_JOINED",
            groupId: invitation.groupId,
            actorId: created.id,
            meta: { name: created.name },
          },
        });
      }
    }

    return created;
  });

  const ua = (await headers()).get("user-agent") ?? undefined;
  await createSession(user.id, ua);

  redirect("/");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/ingresar");
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const name = text(formData, "name");
  const color = text(formData, "color");

  if (name.length < 2) return { error: "El nombre necesita al menos 2 caracteres." };
  if (!USER_COLORS.includes(color)) return { error: "Ese color no está disponible." };

  await prisma.user.update({ where: { id: user.id }, data: { name, color } });
  revalidatePath("/", "layout");

  return { success: "Perfil actualizado." };
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const next2 = String(formData.get("next2") ?? "");

  if (next.length < 8) return { error: "La contraseña nueva necesita al menos 8 caracteres." };
  if (next !== next2) return { error: "Las contraseñas nuevas no coinciden." };

  const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(current, record.passwordHash))) {
    return { error: "La contraseña actual no es correcta." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next) },
  });

  // Cierra el resto de las sesiones abiertas.
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await createSession(user.id, (await headers()).get("user-agent") ?? undefined);

  return { success: "Contraseña actualizada. Se cerraron las demás sesiones." };
}

/** Usado por la pantalla de registro para saber si hay que pedir invitación. */
export async function isBootstrapAvailable(): Promise<boolean> {
  const [count, current] = await Promise.all([prisma.user.count(), getCurrentUser()]);
  return count === 0 && !current;
}
