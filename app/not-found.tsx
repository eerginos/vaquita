import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl">🤷</p>
      <h1 className="text-xl font-semibold">No encontramos esta página</h1>
      <p className="max-w-sm text-sm text-[var(--text-muted)]">
        Puede que el gasto o el grupo se haya borrado, o que no tengas acceso.
      </p>
      <Link href="/" className="btn-primary">
        Volver al inicio
      </Link>
    </main>
  );
}
