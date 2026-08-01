/**
 * Todo el dinero se maneja como enteros en centavos (bigint).
 * Nunca usar float para importes: 0.1 + 0.2 !== 0.3.
 */

export const CURRENCIES = [
  { code: "ARS", label: "Peso argentino", symbol: "$" },
  { code: "USD", label: "Dólar", symbol: "US$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "BRL", label: "Real", symbol: "R$" },
  { code: "UYU", label: "Peso uruguayo", symbol: "$U" },
  { code: "CLP", label: "Peso chileno", symbol: "$" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

/**
 * Convierte texto escrito por una persona a centavos.
 * Acepta "1.234,56", "1234,56", "1234.56", "1.500", "$ 1.500", "1 500".
 * Devuelve null si no se puede interpretar.
 */
export function parseAmountToCents(raw: string): bigint | null {
  if (typeof raw !== "string") return null;

  // Saca símbolos de moneda, espacios (incluido el fino) y todo lo que no sea número/separador.
  const cleaned = raw.trim().replace(/[^\d.,-]/g, "");
  if (!cleaned || cleaned === "-") return null;

  const negative = cleaned.startsWith("-");
  const digitsPart = cleaned.replace(/-/g, "");
  if (!/\d/.test(digitsPart)) return null;

  const lastComma = digitsPart.lastIndexOf(",");
  const lastDot = digitsPart.lastIndexOf(".");

  let integerText: string;
  let decimalText: string;

  if (lastComma === -1 && lastDot === -1) {
    integerText = digitsPart;
    decimalText = "";
  } else {
    // El separador decimal es el último que aparece, salvo que se vea
    // claramente como separador de miles (exactamente 3 dígitos detrás).
    const sepIndex = Math.max(lastComma, lastDot);
    const tail = digitsPart.slice(sepIndex + 1);
    const isThousands =
      tail.length === 3 && !/[.,]/.test(tail) && sepIndex > 0 && digitsPart.slice(0, sepIndex).length > 0;

    // "1.234,56" -> hay dos separadores distintos: el último manda siempre.
    const bothPresent = lastComma !== -1 && lastDot !== -1;

    if (!bothPresent && isThousands) {
      integerText = digitsPart.replace(/[.,]/g, "");
      decimalText = "";
    } else {
      integerText = digitsPart.slice(0, sepIndex).replace(/[.,]/g, "");
      decimalText = tail.replace(/[.,]/g, "");
    }
  }

  if (decimalText.length > 2) return null;
  if (integerText.length > 15) return null;
  if (integerText === "" && decimalText === "") return null;

  const cents =
    BigInt(integerText || "0") * 100n + BigInt((decimalText + "00").slice(0, 2) || "0");

  return negative ? -cents : cents;
}

/** Mete el punto de miles: "1234567" -> "1.234.567". */
export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Centavos -> "1.234,56" (sin símbolo). */
export function centsToInput(cents: bigint | number): string {
  const value = typeof cents === "bigint" ? cents : BigInt(Math.round(cents));
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / 100n;
  const frac = abs % 100n;
  return `${negative ? "-" : ""}${groupThousands(whole.toString())},${frac.toString().padStart(2, "0")}`;
}

/**
 * Normaliza lo que se va tecleando en un campo de importe:
 * agrega los puntos de miles y deja como mucho dos decimales
 * después de la coma. No completa los decimales faltantes,
 * así se puede seguir escribiendo.
 */
export function formatAmountInput(raw: string): string {
  let cleaned = raw.replace(/[^\d,]/g, "");

  // Sólo la primera coma cuenta como separador decimal.
  const firstComma = cleaned.indexOf(",");
  if (firstComma !== -1) {
    cleaned =
      cleaned.slice(0, firstComma + 1) + cleaned.slice(firstComma + 1).replace(/,/g, "");
  }

  const [rawInt, rawDec] = cleaned.split(",");
  const integer = rawInt.replace(/^0+(?=\d)/, "");
  const decimals = rawDec === undefined ? undefined : rawDec.slice(0, 2);

  if (decimals === undefined) return groupThousands(integer);
  return `${groupThousands(integer) || "0"},${decimals}`;
}

/**
 * Posición del cursor después de reformatear: se cuenta cuántos caracteres
 * "de verdad" (dígitos y coma) había antes del cursor y se busca esa misma
 * cantidad en el texto ya formateado, así los puntos que se agregan solos
 * no descolocan el cursor.
 */
export function caretAfterFormatting(formatted: string, significantBefore: number): number {
  if (significantBefore <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/[\d,]/.test(formatted[i])) {
      seen++;
      if (seen === significantBefore) return i + 1;
    }
  }
  return formatted.length;
}

export function countSignificant(text: string): number {
  return (text.match(/[\d,]/g) ?? []).length;
}

export function formatMoney(cents: bigint | number, currency = "ARS"): string {
  const value = typeof cents === "bigint" ? Number(cents) : cents;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

/** Igual que formatMoney pero sin el signo (para textos tipo "te debe X"). */
export function formatMoneyAbs(cents: bigint | number, currency = "ARS"): string {
  const value = typeof cents === "bigint" ? (cents < 0n ? -cents : cents) : Math.abs(cents);
  return formatMoney(value, currency);
}

export function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

export function sum(values: Iterable<bigint>): bigint {
  let total = 0n;
  for (const v of values) total += v;
  return total;
}

/**
 * Reparte `total` centavos en `count` partes lo más parejas posible.
 * Los centavos sobrantes van a las primeras partes, así la suma
 * de las partes siempre es exactamente `total`.
 */
export function splitEvenly(total: bigint, count: number): bigint[] {
  if (count <= 0) return [];
  const negative = total < 0n;
  const magnitude = negative ? -total : total;
  const base = magnitude / BigInt(count);
  const remainder = Number(magnitude % BigInt(count));

  return Array.from({ length: count }, (_, i) => {
    const part = base + (i < remainder ? 1n : 0n);
    return negative ? -part : part;
  });
}

/**
 * Reparte `total` proporcionalmente a `weights` (enteros >= 0).
 * Usa el método del resto mayor para que la suma cierre exacto.
 */
export function allocateByWeights(total: bigint, weights: number[]): bigint[] {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) return weights.map(() => 0n);

  const negative = total < 0n;
  const magnitude = negative ? -total : total;
  const bigTotalWeight = BigInt(totalWeight);

  const floors: bigint[] = [];
  const remainders: { index: number; rest: bigint }[] = [];
  let allocated = 0n;

  weights.forEach((weight, index) => {
    const exact = magnitude * BigInt(weight);
    const floor = exact / bigTotalWeight;
    floors.push(floor);
    allocated += floor;
    remainders.push({ index, rest: exact % bigTotalWeight });
  });

  let leftover = magnitude - allocated;
  // Mayor resto primero; ante empate, el de menor índice (determinista).
  remainders.sort((a, b) => (b.rest === a.rest ? a.index - b.index : b.rest > a.rest ? 1 : -1));
  for (const { index } of remainders) {
    if (leftover <= 0n) break;
    floors[index] += 1n;
    leftover -= 1n;
  }

  return negative ? floors.map((v) => -v) : floors;
}
