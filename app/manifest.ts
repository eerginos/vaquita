import type { MetadataRoute } from "next";

/** Para cuando la agregan a la pantalla de inicio del celular. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Split — gastos compartidos",
    short_name: "Split",
    description: "Gastos compartidos entre amigos, sin vueltas.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#128268",
    lang: "es-AR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
