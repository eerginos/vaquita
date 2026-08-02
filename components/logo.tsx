/**
 * La marca de Vaquita. Los archivos salen de `brand/` y las versiones que se
 * sirven se regeneran con `npm run marca`.
 *
 * La vaca de la barra arranca pegada al borde de arriba y sobresale sólo hacia
 * abajo: la barra está fija en el tope de la pantalla, así que todo lo que
 * suba por encima se recorta.
 */

/** Cabeza sola. En la barra cuelga por debajo del borde. */
export function VaquitaCabeza({
  size = 84,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/marca/cabeza.webp"
      alt=""
      aria-hidden
      width={size}
      height={Math.round((size * 520) / 536)}
      className={className}
      style={{ height: size, width: "auto" }}
    />
  );
}

/** La vaca entera, para las pantallas de marca. */
export function VaquitaEntera({ size = 160, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/marca/vaca.webp"
      alt="Vaquita"
      width={size}
      height={Math.round((size * 682) / 517)}
      className={className}
      style={{ width: size, height: "auto" }}
    />
  );
}

/** El nombre dibujado. Se usa en vez de texto donde entra cómodo. */
export function VaquitaTexto({ height = 26, className }: { height?: number; className?: string }) {
  return (
    <img
      src="/marca/texto.webp"
      alt="Vaquita"
      height={height}
      width={Math.round((height * 843) / 275)}
      className={className}
      style={{ height, width: "auto" }}
    />
  );
}
