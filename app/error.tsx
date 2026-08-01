"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl">💥</p>
      <h1 className="text-xl font-semibold">Algo se rompió</h1>
      <p className="max-w-md text-sm text-[var(--text-muted)]">
        {error.message || "Error inesperado."}
      </p>
      <button type="button" onClick={reset} className="btn-primary">
        Reintentar
      </button>
    </main>
  );
}
