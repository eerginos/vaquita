import "server-only";

import { headers } from "next/headers";

import { prisma } from "@/lib/db";

/**
 * Freno a la fuerza bruta contra el login.
 *
 * Se cuenta con dos claves distintas a propósito:
 *
 *   ip|email   bloqueo fino, pocos intentos. Que sea por IP *y* email evita
 *              que alguien pueda dejarte afuera de tu propia cuenta a
 *              propósito: desde otra IP no toca tu contador.
 *   ip         tope general, más alto. Frena a quien prueba una contraseña
 *              contra muchas cuentas distintas desde el mismo lugar.
 *
 * El estado vive en la base y no en memoria: así sobrevive a un reinicio del
 * contenedor y sigue funcionando si algún día corren más de una réplica.
 */

const VENTANA_MINUTOS = 15;
const MAX_POR_CUENTA = 5;
const MAX_POR_IP = 20;

/** Cuánto dura el bloqueo según cuántas veces se falló. Crece de a poco. */
function minutosDeEspera(fails: number, maximoLibre: number): number {
  const exceso = fails - maximoLibre;
  if (exceso <= 0) return 0;
  return Math.min(30, [1, 2, 5, 15][exceso - 1] ?? 30);
}

/** La IP del visitante, mirando las cabeceras que pone el reverse proxy. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "desconocida";
}

function claves(ip: string, email: string): { fina: string; amplia: string } {
  return { fina: `${ip}|${email.toLowerCase()}`, amplia: ip };
}

export type EstadoLimite = { bloqueado: false } | { bloqueado: true; segundos: number };

/** Se llama ANTES de verificar la contraseña, para no gastar CPU en bcrypt. */
export async function chequearLimiteLogin(ip: string, email: string): Promise<EstadoLimite> {
  const { fina, amplia } = claves(ip, email);
  const filas = await prisma.loginThrottle.findMany({
    where: { key: { in: [fina, amplia] }, lockedUntil: { gt: new Date() } },
    select: { lockedUntil: true },
  });

  if (filas.length === 0) return { bloqueado: false };

  const hasta = filas.reduce(
    (max, f) => (f.lockedUntil! > max ? f.lockedUntil! : max),
    new Date(0),
  );
  return { bloqueado: true, segundos: Math.ceil((hasta.getTime() - Date.now()) / 1000) };
}

export async function registrarFalloLogin(ip: string, email: string): Promise<void> {
  const { fina, amplia } = claves(ip, email);
  const ahora = new Date();
  const inicioVentana = new Date(ahora.getTime() - VENTANA_MINUTOS * 60_000);

  for (const [key, maximo] of [
    [fina, MAX_POR_CUENTA],
    [amplia, MAX_POR_IP],
  ] as const) {
    const actual = await prisma.loginThrottle.findUnique({ where: { key } });

    // Si el último fallo quedó fuera de la ventana, se arranca de nuevo.
    const vigente = actual && actual.firstFailAt > inicioVentana;
    const fails = vigente ? actual.fails + 1 : 1;
    const espera = minutosDeEspera(fails, maximo);

    await prisma.loginThrottle.upsert({
      where: { key },
      create: {
        key,
        fails,
        firstFailAt: ahora,
        lockedUntil: espera > 0 ? new Date(ahora.getTime() + espera * 60_000) : null,
      },
      update: {
        fails,
        ...(vigente ? {} : { firstFailAt: ahora }),
        lockedUntil: espera > 0 ? new Date(ahora.getTime() + espera * 60_000) : null,
      },
    });
  }
}

/** Al entrar bien se limpia el contador de esa combinación. */
export async function limpiarLimiteLogin(ip: string, email: string): Promise<void> {
  const { fina } = claves(ip, email);
  await prisma.loginThrottle.deleteMany({ where: { key: fina } });
}

/** Texto para mostrarle a la persona, sin decirle si el email existe o no. */
export function mensajeDeBloqueo(segundos: number): string {
  if (segundos > 90) {
    const minutos = Math.ceil(segundos / 60);
    return `Demasiados intentos fallidos. Probá de nuevo en ${minutos} minutos.`;
  }
  return "Demasiados intentos fallidos. Esperá un minuto y volvé a probar.";
}
