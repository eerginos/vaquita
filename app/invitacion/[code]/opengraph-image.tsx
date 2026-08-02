import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { prisma } from "@/lib/db";
import { isInviteUsable } from "@/lib/invites";
import { inviteHeadline } from "@/lib/invite-copy";

export const alt = "Invitación a un grupo de Vaquita";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * La imagen que muestra WhatsApp al pegar el link.
 *
 * La vaca va embebida como data URI: el renderer corre aislado y no resuelve
 * rutas del sitio. Sin emojis, que se dibujarían como cuadraditos.
 */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { code },
    include: { createdBy: { select: { name: true } }, group: { select: { name: true } } },
  });

  const valid = invitation && isInviteUsable(invitation);

  const headline = valid
    ? inviteHeadline(
        invitation.createdBy.name,
        invitation.group?.name ?? null,
        invitation.maxUses === null,
      )
    : "Vaquita";

  const subline = valid
    ? "Dividan los gastos sin que nadie lleve la cuenta."
    : "Gastos compartidos, sin vueltas.";

  // El renderer no puede pedirle archivos al servidor: la imagen se lee del
  // disco y se le pasa embebida.
  const leer = (archivo: string) =>
    readFile(join(process.cwd(), "public", "marca", archivo))
      .then((b) => `data:image/png;base64,${b.toString("base64")}`)
      .catch(() => null);

  const [vaca, texto] = await Promise.all([leer("cabeza-og.png"), leer("texto-og.png")]);

  // El dominio sale de la configuración: cada instalación muestra el suyo.
  const host = (() => {
    try {
      return new URL(process.env.APP_URL ?? "").host;
    } catch {
      return "";
    }
  })();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#128268",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {vaca ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vaca} width={130} height={129} alt="" />
          ) : null}
          {texto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={texto} width={240} height={78} alt="" />
          ) : (
            <div style={{ display: "flex", fontSize: "48px", color: "#ffffff", fontWeight: 700 }}>
              Vaquita
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              fontSize: headline.length > 46 ? "62px" : "76px",
              lineHeight: 1.1,
              color: "#ffffff",
              fontWeight: 700,
            }}
          >
            {headline}
          </div>
          <div style={{ display: "flex", fontSize: "34px", color: "rgba(255,255,255,0.85)" }}>
            {subline}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: "26px", color: "rgba(255,255,255,0.7)" }}>
          {host}
        </div>
      </div>
    ),
    size,
  );
}
