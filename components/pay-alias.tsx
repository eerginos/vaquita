"use client";

import { useState } from "react";

/** Alias / CBU / link donde transferirle a alguien, con copiado de un click. */
export function PayAlias({ name, alias }: { name: string; alias: string }) {
  const [copied, setCopied] = useState(false);
  const isLink = /^https?:\/\//i.test(alias);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(alias);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sin permiso de portapapeles: el texto igual se puede seleccionar.
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-xs">
      <span className="text-[var(--text-muted)]">Transferile a {name}:</span>
      {isLink ? (
        <a
          href={alias}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 flex-1 truncate font-mono text-brand-600 hover:underline"
        >
          {alias}
        </a>
      ) : (
        <code className="min-w-0 flex-1 truncate font-mono">{alias}</code>
      )}
      <button
        type="button"
        onClick={copy}
        className="shrink-0 font-medium text-brand-600 hover:underline"
      >
        {copied ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
