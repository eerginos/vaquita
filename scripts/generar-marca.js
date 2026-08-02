/**
 * Regenera los archivos de marca que se sirven, a partir de los originales
 * de brand/. Correr después de cambiar cualquiera de esos originales:
 *   npm run marca
 */
const sharp = require("sharp");
const fs = require("fs");

const VERDE = { r: 18, g: 130, b: 104, alpha: 1 };
const trim = (f) => sharp(`brand/${f}`).trim({ threshold: 1 });

(async () => {
  fs.mkdirSync("public/marca", { recursive: true });

  // Para pantalla: al doble del tamaño de uso, en WebP.
  await trim("vaca.png").resize({ width: 560 }).webp({ quality: 86 }).toFile("public/marca/vaca.webp");
  await trim("cabeza.png").resize({ width: 280 }).webp({ quality: 88 }).toFile("public/marca/cabeza.webp");
  await trim("texto.png").resize({ width: 440 }).webp({ quality: 88 }).toFile("public/marca/texto.webp");

  // La vista previa de los links se genera con un renderer que no lee WebP.
  await trim("cabeza.png").resize({ width: 300 }).png({ compressionLevel: 9, palette: true, quality: 88 })
    .toFile("public/marca/cabeza-og.png");
  await trim("texto.png").resize({ width: 480 }).png({ compressionLevel: 9, palette: true, quality: 88 })
    .toFile("public/marca/texto-og.png");

  // Iconos: sobre el verde de la marca, porque iOS rellena de negro lo transparente.
  const cara = await trim("cabeza.png").resize({ width: 800 }).png().toBuffer();
  const icono = async (size, pad) => {
    const inner = await sharp(cara)
      .resize({ width: size - pad * 2, height: size - pad * 2, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toBuffer();
    return sharp({ create: { width: size, height: size, channels: 4, background: VERDE } })
      .composite([{ input: inner, gravity: "center" }])
      .png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer();
  };
  await sharp(await icono(64, 2)).toFile("app/icon.png");
  await sharp(await icono(180, 10)).toFile("app/apple-icon.png");
  await sharp(await icono(192, 10)).toFile("public/icon-192.png");
  await sharp(await icono(512, 28)).toFile("public/icon-512.png");

  console.log("marca regenerada");
})();
