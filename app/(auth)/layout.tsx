import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { VaquitaEntera, VaquitaTexto } from "@/components/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getCurrentUser()) redirect("/");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
<VaquitaEntera size={172} />
          <div className="text-center">
            <VaquitaTexto height={36} className="mx-auto -mt-1 mb-1" />
            <p className="text-sm text-[var(--text-muted)]">Gastos compartidos, sin vueltas.</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
