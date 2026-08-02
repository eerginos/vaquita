import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import { getTimezone } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { formatRelative } from "@/lib/dates";
import { revokeAllSessionsAction } from "@/app/actions/admin";
import { Avatar } from "@/components/avatar";
import { SubmitButton } from "@/components/submit-button";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const tz = await getTimezone();
  const sessions = await prisma.session.count({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
  });
  const account = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { createdAt: true },
  });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} color={user.color} emoji={user.emoji} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">{user.name}</h1>
          <p className="truncate text-sm text-[var(--text-muted)]">{user.email}</p>
          <p className="text-xs text-[var(--text-soft)]">
            Cuenta creada {formatRelative(account.createdAt, tz)}
          </p>
        </div>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Datos</h2>
        <ProfileForm
          name={user.name}
          color={user.color}
          emoji={user.emoji}
          payAlias={user.payAlias}
        />
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-sm font-semibold">Cambiar contraseña</h2>
        <PasswordForm />
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold">Sesiones</h2>
        <p className="hint mt-1 mb-3">
          Tenés {sessions} {sessions === 1 ? "sesión activa" : "sesiones activas"}. Cerralas todas si
          entraste desde una computadora que no es tuya.
        </p>
        <form action={revokeAllSessionsAction}>
          <SubmitButton
            className="btn-secondary text-sm"
            pendingLabel="Cerrando…"
            confirm="¿Cerrar todas? Vas a tener que volver a entrar."
          >
            Cerrar todas las sesiones
          </SubmitButton>
        </form>
      </section>
    </div>
  );
}
