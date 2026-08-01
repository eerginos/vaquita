import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Healthcheck para Docker/Coolify: verifica que la base responda. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "base de datos no disponible" }, { status: 503 });
  }
}
