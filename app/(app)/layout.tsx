import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { Avatar } from "@/components/avatar";
import { BottomNav, SidebarNav } from "@/components/nav";
import { VaquitaCabeza, VaquitaTexto } from "@/components/logo";
import { signOutAction } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-[var(--surface)]/90 backdrop-blur">
        <div className="relative mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          {/* La vaca arranca en el borde de arriba y cuelga por debajo de la
              barra. El nombre va corrido a la derecha para dejarle el lugar. */}
          <Link href="/" className="flex items-center" title="Ir al inicio" aria-label="Ir al inicio">
            <VaquitaCabeza
              size={84}
              className="absolute left-2 top-[3px] z-20 drop-shadow-[0_5px_9px_rgba(0,0,0,.35)] sm:left-3"
            />
            <span className="ml-[74px] sm:ml-[86px]">
              <VaquitaTexto height={24} className="sm:hidden" />
              <VaquitaTexto height={28} className="hidden sm:block" />
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/grupos/nuevo"
              className="btn-secondary hidden text-xs sm:inline-flex"
              title="Crear un grupo nuevo"
            >
              + Nuevo grupo
            </Link>

            <Link href="/perfil" className="flex items-center gap-2 rounded-lg p-1 hover:bg-[var(--surface-2)]">
              <Avatar name={user.name} color={user.color} emoji={user.emoji} size="sm" />
              <span className="hidden text-sm font-medium sm:block">{user.name}</span>
            </Link>

            <form action={signOutAction}>
              <button
                type="submit"
                className="btn-ghost px-2 py-1.5 text-xs"
                title="Cerrar sesión"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* El padding de arriba deja pasar la parte de la vaca que cuelga de la
          barra. Si cambia el tamaño de la vaca, hay que revisarlo. */}
      <div className="mx-auto flex max-w-6xl gap-8 px-4 pb-24 pt-16 md:pb-8 md:pt-14">
        <aside className="hidden w-52 shrink-0 md:block">
          <div className="sticky top-20">
            <SidebarNav isAdmin={user.isAdmin} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <BottomNav isAdmin={user.isAdmin} />
    </div>
  );
}
