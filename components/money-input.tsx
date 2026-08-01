"use client";

import { useRef } from "react";
import clsx from "clsx";

import { caretAfterFormatting, countSignificant, formatAmountInput } from "@/lib/money";

/**
 * Campo de importe que va poniendo los puntos de miles mientras se escribe.
 * La coma separa los centavos: 1000 se muestra 1.000, y 1000,5 -> 1.000,5.
 */
export function MoneyInput({
  name,
  value,
  onChange,
  className,
  ...rest
}: {
  name?: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "name">) {
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const caret = input.selectionStart ?? input.value.length;
    const significantBefore = countSignificant(input.value.slice(0, caret));

    const formatted = formatAmountInput(input.value);
    onChange(formatted);

    // React vuelve a renderizar con el valor formateado y el cursor se iría
    // al final; hay que reponerlo donde estaba en el próximo frame.
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const position = caretAfterFormatting(formatted, significantBefore);
      el.setSelectionRange(position, position);
    });
  };

  return (
    <input
      {...rest}
      ref={ref}
      name={name}
      value={value}
      onChange={handleChange}
      inputMode="decimal"
      autoComplete="off"
      className={clsx("input tabular-nums", className)}
    />
  );
}
