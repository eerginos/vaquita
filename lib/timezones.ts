/** Las zonas que se ofrecen en el selector. Cubren de dónde puede ser la gente. */
export const TIMEZONE_OPTIONS: { group: string; zones: { id: string; label: string }[] }[] = [
  {
    group: "Argentina",
    zones: [
      { id: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
      { id: "America/Argentina/Cordoba", label: "Córdoba" },
      { id: "America/Argentina/Mendoza", label: "Mendoza" },
      { id: "America/Argentina/Salta", label: "Salta" },
      { id: "America/Argentina/Ushuaia", label: "Ushuaia" },
    ],
  },
  {
    group: "Sudamérica",
    zones: [
      { id: "America/Montevideo", label: "Montevideo" },
      { id: "America/Santiago", label: "Santiago de Chile" },
      { id: "America/Sao_Paulo", label: "San Pablo" },
      { id: "America/Asuncion", label: "Asunción" },
      { id: "America/La_Paz", label: "La Paz" },
      { id: "America/Lima", label: "Lima" },
      { id: "America/Bogota", label: "Bogotá" },
      { id: "America/Caracas", label: "Caracas" },
      { id: "America/Guayaquil", label: "Quito" },
    ],
  },
  {
    group: "Norte y Centroamérica",
    zones: [
      { id: "America/Mexico_City", label: "Ciudad de México" },
      { id: "America/Panama", label: "Panamá" },
      { id: "America/Costa_Rica", label: "San José" },
      { id: "America/New_York", label: "Nueva York" },
      { id: "America/Chicago", label: "Chicago" },
      { id: "America/Denver", label: "Denver" },
      { id: "America/Los_Angeles", label: "Los Ángeles" },
    ],
  },
  {
    group: "Europa",
    zones: [
      { id: "Europe/Madrid", label: "Madrid" },
      { id: "Europe/London", label: "Londres" },
      { id: "Europe/Berlin", label: "Berlín" },
      { id: "Europe/Rome", label: "Roma" },
      { id: "UTC", label: "UTC" },
    ],
  },
];

export const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

/**
 * Valida contra la lista de zonas del sistema, no contra la del selector:
 * así una zona escrita a mano que sea válida también entra.
 */
export function isValidTimezone(value: string): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("es-AR", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** "Buenos Aires" si está en la lista; si no, la zona cruda. */
export function timezoneLabel(id: string): string {
  for (const group of TIMEZONE_OPTIONS) {
    const found = group.zones.find((z) => z.id === id);
    if (found) return found.label;
  }
  return id;
}

/** El desfasaje actual, para mostrarlo al lado del selector: "GMT-3". */
export function timezoneOffsetLabel(id: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: id,
      timeZoneName: "shortOffset",
    }).formatToParts(now);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}
