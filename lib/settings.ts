import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/db";
import { DEFAULT_TIMEZONE, isValidTimezone } from "@/lib/timezones";

const SETTINGS_ID = "app";

/**
 * Zona horaria con la que se formatean todas las fechas.
 *
 * Se configura desde /admin y vive en la base, no en una variable de entorno:
 * cambiarla no requiere reiniciar el contenedor ni tocar el deploy.
 * Memoizado por request para no consultar la base en cada fecha que se muestra.
 */
export const getTimezone = cache(async (): Promise<string> => {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (settings && isValidTimezone(settings.timezone)) return settings.timezone;
  } catch {
    // Base sin migrar todavía: no vale la pena romper la pantalla por esto.
  }
  // Compatibilidad con las instalaciones que la venían pasando por entorno.
  const fromEnv = process.env.TZ ?? "";
  return isValidTimezone(fromEnv) ? fromEnv : DEFAULT_TIMEZONE;
});

export async function setTimezone(timezone: string): Promise<void> {
  await prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, timezone },
    update: { timezone },
  });
}
