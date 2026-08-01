import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Necesario para la imagen Docker que despliega Coolify: Next copia
  // sólo las dependencias que realmente usa a .next/standalone.
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/adapter-pg", "pg"],
  experimental: {
    serverActions: {
      // Los formularios de gasto pueden tener muchos participantes.
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
