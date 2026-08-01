import { ImageResponse } from "next/og";

import { prisma } from "@/lib/db";
import { isInviteUsable } from "@/lib/invites";
import { inviteHeadline } from "@/lib/invite-copy";

export const alt = "Invitación a un grupo de Split";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * La imagen que muestra WhatsApp al pegar el link.
 *
 * Se dibuja todo con divs y no con SVG ni emojis: el renderer de Next no
 * trae fuente de emoji y los dibujaría como cuadraditos.
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
    : "Split";

  const subline = valid
    ? "Dividan los gastos sin que nadie lleve la cuenta."
    : "Gastos compartidos, sin vueltas.";

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
        {/* La marca: círculo blanco con el corte corrido del centro. */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ display: "flex", position: "relative", width: "96px", height: "96px" }}>
            <div
              style={{
                display: "flex",
                width: "96px",
                height: "96px",
                borderRadius: "48px",
                background: "#ffffff",
              }}
            />
            <div
              style={{
                display: "flex",
                position: "absolute",
                left: "34px",
                top: "-16px",
                width: "15px",
                height: "128px",
                background: "#128268",
                transform: "rotate(-15deg)",
              }}
            />
          </div>
          <div style={{ display: "flex", fontSize: "44px", color: "#ffffff", fontWeight: 700 }}>
            Split
          </div>
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
          split.erginos.com.ar
        </div>
      </div>
    ),
    size,
  );
}
