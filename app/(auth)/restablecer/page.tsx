import type { Metadata } from "next";

import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Restablecer contraseña" };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="card p-6">
      <h1 className="mb-1 text-lg font-semibold">Elegí una contraseña nueva</h1>
      <p className="mb-5 text-sm text-[var(--text-muted)]">
        Al guardarla se cierran todas tus sesiones abiertas.
      </p>
      <ResetForm token={token ?? ""} />
    </div>
  );
}
