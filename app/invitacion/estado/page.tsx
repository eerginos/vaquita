import type { Metadata } from "next";
import Link from "next/link";

import { VaquitaEntera, VaquitaTexto } from "@/components/logo";

export const metadata: Metadata = { title: "Invitación" };

const MENSAJES: Record<string, { icon: string; title: string; body: string }> = {
  vencida: {
    icon: "🙈",
    title: "Ese link ya no sirve",
    body: "Se usó todas las veces que podía, venció, o lo revocaron. Pedile uno nuevo a quien te invitó.",
  },
  "sin-grupo": {
    icon: "✅",
    title: "Ya tenés cuenta",
    body: "Ese link servía para crear una cuenta nueva, y vos ya entraste con la tuya.",
  },
  falta: {
    icon: "🔗",
    title: "Al link le falta el código",
    body: "Abrí el link completo tal como te lo pasaron, sin recortarlo.",
  },
};

export default async function InviteStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const { e } = await searchParams;
  const message = MENSAJES[e ?? ""] ?? MENSAJES.vencida;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <VaquitaEntera size={130} />
          <VaquitaTexto height={34} className="-mt-2" />
        </div>

        <div className="card space-y-4 p-6 text-center">
          <p className="text-4xl">{message.icon}</p>
          <p className="font-medium">{message.title}</p>
          <p className="text-sm text-[var(--text-muted)]">{message.body}</p>
          <Link href="/" className="btn-primary w-full">
            Ir a Vaquita
          </Link>
        </div>
      </div>
    </main>
  );
}
