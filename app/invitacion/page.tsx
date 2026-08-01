import { redirect } from "next/navigation";

/**
 * Compatibilidad con los links viejos con el código en la query.
 * Los nuevos son /invitacion/<código>, que es lo que necesita la vista
 * previa de WhatsApp para poder armar la imagen.
 */
export default async function LegacyInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  redirect(code ? `/invitacion/${encodeURIComponent(code)}` : "/invitacion/estado?e=falta");
}
