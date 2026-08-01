import { format, formatDistanceToNow, isThisYear, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";

/** "15 de marzo" o "15 de marzo de 2023" si es de otro año. */
export function formatDate(date: Date): string {
  return isThisYear(date)
    ? format(date, "d 'de' MMMM", { locale: es })
    : format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
}

export function formatDateShort(date: Date): string {
  return format(date, "d MMM", { locale: es });
}

export function formatMonthYear(date: Date): string {
  const text = isThisYear(date)
    ? format(date, "MMMM", { locale: es })
    : format(date, "MMMM yyyy", { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatRelative(date: Date): string {
  if (isToday(date)) return `hoy ${format(date, "HH:mm")}`;
  if (isYesterday(date)) return `ayer ${format(date, "HH:mm")}`;
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

/** Para <input type="date">, en hora local. */
export function toDateInput(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/** Interpreta "2024-03-15" como mediodía local, para que no se corra de día por zona horaria. */
export function fromDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
