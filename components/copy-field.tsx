"use client";

import { useState } from "react";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sin permiso de portapapeles: el input queda seleccionable a mano.
    }
  };

  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="input font-mono text-xs"
      />
      <button type="button" onClick={copy} className="btn-secondary shrink-0 text-xs">
        {copied ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
