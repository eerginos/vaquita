import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/db";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function SignInPage() {
  const noUsersYet = (await prisma.user.count()) === 0;

  return (
    <div className="card p-6">
      <SignInForm />

      {noUsersYet && (
        <p className="mt-5 border-t pt-4 text-center text-sm text-[var(--text-muted)]">
          Todavía no hay ninguna cuenta.{" "}
          <Link href="/registro" className="font-medium text-brand-600 hover:underline">
            Creá la primera
          </Link>
        </p>
      )}
    </div>
  );
}
