import { allocateByWeights, parseAmountToCents, splitEvenly, sum } from "@/lib/money";

export type SplitType = "EQUAL" | "EXACT" | "PERCENT" | "SHARES";

export const SPLIT_TYPES: { id: SplitType; label: string; hint: string }[] = [
  { id: "EQUAL", label: "Partes iguales", hint: "Se divide en partes iguales entre los seleccionados." },
  { id: "EXACT", label: "Montos exactos", hint: "Indicá cuánto le toca a cada uno. La suma tiene que dar el total." },
  { id: "PERCENT", label: "Porcentajes", hint: "Indicá el porcentaje de cada uno. Tiene que sumar 100%." },
  { id: "SHARES", label: "Partes", hint: "Por ejemplo 2 partes para una pareja y 1 para cada soltero." },
];

export type Share = { userId: string; amountCents: bigint; weight: number | null };

export type SplitOutcome =
  | { ok: true; shares: Share[] }
  | { ok: false; error: string };

/**
 * Calcula cuánto le toca a cada participante.
 * `values` trae el input crudo del formulario indexado por userId
 * (montos para EXACT, porcentajes para PERCENT, partes para SHARES).
 */
export function computeShares(
  totalCents: bigint,
  splitType: SplitType,
  participants: string[],
  values: Record<string, string>,
): SplitOutcome {
  if (participants.length === 0) {
    return { ok: false, error: "Elegí al menos una persona entre quienes se divide." };
  }
  if (totalCents <= 0n) {
    return { ok: false, error: "El importe tiene que ser mayor a cero." };
  }

  switch (splitType) {
    case "EQUAL": {
      const parts = splitEvenly(totalCents, participants.length);
      return {
        ok: true,
        shares: participants.map((userId, i) => ({ userId, amountCents: parts[i], weight: null })),
      };
    }

    case "EXACT": {
      const shares: Share[] = [];
      for (const userId of participants) {
        const cents = parseAmountToCents(values[userId] ?? "");
        if (cents === null || cents < 0n) {
          return { ok: false, error: "Hay montos vacíos o inválidos en el reparto." };
        }
        shares.push({ userId, amountCents: cents, weight: null });
      }

      const total = sum(shares.map((s) => s.amountCents));
      if (total !== totalCents) {
        const diff = totalCents - total;
        return {
          ok: false,
          error:
            diff > 0n
              ? `Faltan asignar ${fmt(diff)} para llegar al total.`
              : `Te pasaste por ${fmt(-diff)} del total.`,
        };
      }
      return { ok: true, shares };
    }

    case "PERCENT": {
      // Los porcentajes se guardan en centésimas: 33,33% -> 3333
      const weights: number[] = [];
      for (const userId of participants) {
        const parsed = parseAmountToCents(values[userId] ?? "");
        if (parsed === null || parsed < 0n) {
          return { ok: false, error: "Hay porcentajes vacíos o inválidos." };
        }
        weights.push(Number(parsed));
      }

      const totalPercent = weights.reduce((a, b) => a + b, 0);
      if (totalPercent !== 10_000) {
        return {
          ok: false,
          error: `Los porcentajes suman ${(totalPercent / 100).toLocaleString("es-AR")}%, tienen que sumar 100%.`,
        };
      }

      const amounts = allocateByWeights(totalCents, weights);
      return {
        ok: true,
        shares: participants.map((userId, i) => ({
          userId,
          amountCents: amounts[i],
          weight: weights[i],
        })),
      };
    }

    case "SHARES": {
      const weights: number[] = [];
      for (const userId of participants) {
        const raw = (values[userId] ?? "").trim();
        const parsed = Number(raw);
        if (!Number.isInteger(parsed) || parsed < 0 || parsed > 10_000) {
          return { ok: false, error: "Las partes tienen que ser números enteros (0 o más)." };
        }
        weights.push(parsed);
      }

      if (weights.reduce((a, b) => a + b, 0) === 0) {
        return { ok: false, error: "Asigná al menos una parte a alguien." };
      }

      const amounts = allocateByWeights(totalCents, weights);
      return {
        ok: true,
        shares: participants.map((userId, i) => ({
          userId,
          amountCents: amounts[i],
          weight: weights[i],
        })),
      };
    }
  }
}

/**
 * Recalcula el reparto de un gasto ya cargado sumando participantes nuevos.
 *
 * Devuelve null si el gasto no se puede recalcular solo: con montos exactos o
 * porcentajes no hay forma de adivinar cuánto le corresponde a quien entra,
 * esos hay que editarlos a mano.
 */
export function resplitWith(
  amountCents: bigint,
  splitType: SplitType,
  currentShares: { userId: string; weight: number | null }[],
  addedUserIds: string[],
): Share[] | null {
  const already = new Set(currentShares.map((s) => s.userId));
  const incoming = addedUserIds.filter((id) => !already.has(id));
  if (incoming.length === 0) return null;

  if (splitType === "EQUAL") {
    const userIds = [...currentShares.map((s) => s.userId), ...incoming];
    const parts = splitEvenly(amountCents, userIds.length);
    return userIds.map((userId, i) => ({ userId, amountCents: parts[i], weight: null }));
  }

  if (splitType === "SHARES") {
    // Los que ya estaban conservan sus partes; el que entra arranca con una.
    const entries = [
      ...currentShares.map((s) => ({ userId: s.userId, weight: s.weight ?? 1 })),
      ...incoming.map((userId) => ({ userId, weight: 1 })),
    ];
    const amounts = allocateByWeights(amountCents, entries.map((e) => e.weight));
    return entries.map((e, i) => ({
      userId: e.userId,
      amountCents: amounts[i],
      weight: e.weight,
    }));
  }

  return null;
}

/** Si un gasto se puede recalcular automáticamente al sumar gente. */
export function canResplit(splitType: SplitType): boolean {
  return splitType === "EQUAL" || splitType === "SHARES";
}

/** Quién puso la plata. Devuelve error si la suma no coincide con el total. */
export function computePayers(
  totalCents: bigint,
  entries: { userId: string; raw: string }[],
): { ok: true; payers: { userId: string; amountCents: bigint }[] } | { ok: false; error: string } {
  const payers: { userId: string; amountCents: bigint }[] = [];

  for (const entry of entries) {
    const cents = parseAmountToCents(entry.raw);
    if (cents === null || cents < 0n) {
      return { ok: false, error: "Hay importes inválidos en quién pagó." };
    }
    if (cents > 0n) payers.push({ userId: entry.userId, amountCents: cents });
  }

  if (payers.length === 0) return { ok: false, error: "Indicá quién pagó." };

  const total = sum(payers.map((p) => p.amountCents));
  if (total !== totalCents) {
    const diff = totalCents - total;
    return {
      ok: false,
      error:
        diff > 0n
          ? `Lo que pagaron suma ${fmt(diff)} menos que el total del gasto.`
          : `Lo que pagaron suma ${fmt(-diff)} más que el total del gasto.`,
    };
  }

  return { ok: true, payers };
}

function fmt(cents: bigint): string {
  const whole = cents / 100n;
  const frac = (cents % 100n).toString().padStart(2, "0");
  return `${whole.toLocaleString("es-AR")},${frac}`;
}
