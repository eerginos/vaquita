import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { NewGroupForm } from "./new-group-form";

export const metadata: Metadata = { title: "Nuevo grupo" };

export default async function NewGroupPage() {
  const user = await requireUser();

  const people = await prisma.user.findMany({
    where: { id: { not: user.id } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, color: true, emoji: true },
  });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/grupos" className="text-sm text-[var(--text-muted)] hover:underline">
        ← Grupos
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Nuevo grupo</h1>
      <div className="card p-5">
        <NewGroupForm people={people} />
      </div>
    </div>
  );
}
