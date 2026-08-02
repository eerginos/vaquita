import { es } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Todo el formateo de fechas recibe la zona horaria explícita, que sale de
 * la configuración (`getTimezone()` en lib/settings.ts).
 *
 * A propósito NO se depende del reloj del proceso: así cambiar la zona desde
 * /admin tiene efecto inmediato, y el resultado no cambia según dónde corra
 * el contenedor.
 */

/** "15 de marzo", o "15 de marzo de 2023" si es de otro año. */
export function formatDate(date: Date, tz: string): string {
  const sameYear = formatInTimeZone(date, tz, "yyyy") === formatInTimeZone(new Date(), tz, "yyyy");
  return formatInTimeZone(date, tz, sameYear ? "d 'de' MMMM" : "d 'de' MMMM 'de' yyyy", {
    locale: es,
  });
}

export function formatDateShort(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, "d MMM", { locale: es });
}

export function formatMonthYear(date: Date, tz: string): string {
  const sameYear = formatInTimeZone(date, tz, "yyyy") === formatInTimeZone(new Date(), tz, "yyyy");
  const text = formatInTimeZone(date, tz, sameYear ? "MMMM" : "MMMM yyyy", { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "hoy 14:30", "ayer 09:05", "hace 3 días". */
export function formatRelative(date: Date, tz: string): string {
  const day = (d: Date) => formatInTimeZone(d, tz, "yyyy-MM-dd");
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000);

  if (day(date) === day(now)) return `hoy ${formatInTimeZone(date, tz, "HH:mm")}`;
  if (day(date) === day(yesterday)) return `ayer ${formatInTimeZone(date, tz, "HH:mm")}`;

  const days = Math.round((now.getTime() - date.getTime()) / 86_400_000);
  if (days < 0) return formatDate(date, tz);
  if (days < 7) return `hace ${days} días`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? "hace 1 semana" : `hace ${weeks} semanas`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? "hace 1 mes" : `hace ${months} meses`;
  }
  const years = Math.round(days / 365);
  return years === 1 ? "hace 1 año" : `hace ${years} años`;
}

/** Para <input type="date">: el día tal como se ve en esa zona. */
export function toDateInput(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

/**
 * Interpreta "2026-03-15" como el mediodía de ese día en esa zona.
 * El mediodía y no la medianoche para que ningún cambio de horario de verano
 * pueda correr la fecha al día anterior o siguiente.
 */
export function fromDateInput(value: string, tz: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  const parsed = fromZonedTime(`${value}T12:00:00`, tz);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Clave "2026-03" para agrupar por mes. */
export function monthKey(date: Date, tz: string): string {
  return formatInTimeZone(date, tz, "yyyy-MM");
}
