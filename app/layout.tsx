import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // Necesario para que las URLs de las imágenes de vista previa salgan
  // absolutas: WhatsApp no resuelve rutas relativas.
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: "Vaquita",
    template: "%s · Vaquita",
  },
  description: "Gastos compartidos entre amigos, sin vueltas.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
