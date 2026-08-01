import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { Avatar } from "@/components/avatar";
import { BottomNav, SidebarNav } from "@/components/nav";
import { signOutAction } from "@/app/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-[var(--surface)]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-base">
              🧾
            </span>
            Split
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/grupos/nuevo"
              className="btn-primary hidden text-xs sm:inline-flex"
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

      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-6 pb-24 md:pb-8">
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
