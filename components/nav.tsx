"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Resumen", icon: "🏠" },
  { href: "/grupos", label: "Grupos", icon: "👥" },
  { href: "/amigos", label: "Personas", icon: "🤝" },
  { href: "/actividad", label: "Actividad", icon: "🔔" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SidebarNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", label: "Administración", icon: "⚙️" }]
    : NAV_ITEMS;

  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive(pathname, item.href)
              ? "bg-brand-600/10 text-brand-700 dark:text-brand-300"
              : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
          )}
        >
          <span aria-hidden>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", label: "Admin", icon: "⚙️" }]
    : NAV_ITEMS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-[var(--surface)]/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
              isActive(pathname, item.href)
                ? "text-brand-600 dark:text-brand-400"
                : "text-[var(--text-muted)]",
            )}
          >
            <span className="text-lg" aria-hidden>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
