import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const isFirstUser = (await prisma.user.count()) === 0;

  const invitation = code
    ? await prisma.invitation.findUnique({
        where: { code },
        include: { group: { select: { name: true, emoji: true } }, createdBy: { select: { name: true } } },
      })
    : null;

  const invalidInvite =
    !!code && (!invitation || !!invitation.usedAt || invitation.expiresAt < new Date());

  return (
    <div className="card p-6">
      {isFirstUser && !code && (
        <p className="mb-4 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-sm">
          Sos la primera cuenta. Usá el email configurado en{" "}
          <code className="font-mono text-xs">BOOTSTRAP_ADMIN_EMAIL</code> y vas a quedar como
          administrador.
        </p>
      )}

      {invitation && !invalidInvite && (
        <p className="mb-4 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-sm">
          {invitation.createdBy.name} te invitó
          {invitation.group ? (
            <>
              {" "}
              a <strong>{invitation.group.emoji} {invitation.group.name}</strong>
            </>
          ) : null}
          .
        </p>
      )}

      {invalidInvite && (
        <p className="mb-4 rounded-lg border border-debt-500/30 bg-debt-500/10 px-3 py-2 text-sm text-debt-500">
          Ese link de invitación no sirve: ya se usó o venció. Pedile uno nuevo a quien te invitó.
        </p>
      )}

      <SignUpForm code={code ?? ""} />

      <p className="mt-5 border-t pt-4 text-center text-sm text-[var(--text-muted)]">
        ¿Ya tenés cuenta?{" "}
        <Link href="/ingresar" className="font-medium text-brand-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
