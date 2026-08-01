import clsx from "clsx";
import { formatMoney, formatMoneyAbs } from "@/lib/money";

/** Importe neutro (sin semántica de deuda). */
export function Money({
  cents,
  currency,
  className,
}: {
  cents: bigint | number;
  currency: string;
  className?: string;
}) {
  return <span className={clsx("tabular-nums", className)}>{formatMoney(cents, currency)}</span>;
}

/**
 * Saldo con color: verde si te deben, rojo si debés, gris si está saldado.
 * Siempre muestra el valor absoluto — el signo lo comunica el texto.
 */
export function Balance({
  cents,
  currency,
  className,
  withLabel = false,
}: {
  cents: bigint;
  currency: string;
  className?: string;
  withLabel?: boolean;
}) {
  const settled = cents === 0n;
  const positive = cents > 0n;

  if (settled) {
    return <span className={clsx("text-[var(--text-muted)]", className)}>saldado</span>;
  }

  return (
    <span
      className={clsx(
        "tabular-nums font-semibold",
        positive ? "text-owed-500 dark:text-owed-400" : "text-debt-500 dark:text-debt-400",
        className,
      )}
    >
      {withLabel && (
        <span className="mr-1 text-xs font-normal text-[var(--text-muted)]">
          {positive ? "te deben" : "debés"}
        </span>
      )}
      {formatMoneyAbs(cents, currency)}
    </span>
  );
}

export function BalanceSentence({
  cents,
  currency,
  otherName,
}: {
  cents: bigint;
  currency: string;
  otherName: string;
}) {
  if (cents === 0n) {
    return <span className="text-sm text-[var(--text-muted)]">Están a mano</span>;
  }

  const positive = cents > 0n;
  return (
    <span className="text-sm">
      <span className="text-[var(--text-muted)]">
        {positive ? `${otherName} te debe ` : `Le debés a ${otherName} `}
      </span>
      <span
        className={clsx(
          "font-semibold tabular-nums",
          positive ? "text-owed-500 dark:text-owed-400" : "text-debt-500 dark:text-debt-400",
        )}
      >
        {formatMoneyAbs(cents, currency)}
      </span>
    </span>
  );
}
