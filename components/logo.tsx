/**
 * Marca de Split: un círculo partido en dos mitades que no son iguales.
 * El corte va desplazado del centro a propósito — dividir en partes iguales
 * es sólo una de las formas de dividir.
 *
 * Si cambia acá, hay que cambiar también app/icon.svg, que es el mismo dibujo
 * como archivo estático para el favicon.
 */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Vaquita"
    >
      <rect width="64" height="64" rx="15" fill="#128268" />
      <circle cx="32" cy="32" r="20" fill="#ffffff" />
      <rect x="24" y="-6" width="6" height="76" fill="#128268" transform="rotate(-15 32 32)" />
    </svg>
  );
}
