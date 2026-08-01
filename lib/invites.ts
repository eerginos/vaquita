export type InviteLike = {
  expiresAt: Date;
  maxUses: number | null;
  useCount: number;
};

/** Una invitación sirve mientras no venza y le queden usos. */
export function isInviteUsable(invite: InviteLike, now = new Date()): boolean {
  if (invite.expiresAt < now) return false;
  if (invite.maxUses !== null && invite.useCount >= invite.maxUses) return false;
  return true;
}

export function remainingUses(invite: InviteLike): number | null {
  return invite.maxUses === null ? null : Math.max(0, invite.maxUses - invite.useCount);
}

/** Texto para mostrar cuántos usos le quedan. */
export function usesLabel(invite: InviteLike): string {
  if (invite.maxUses === null) {
    return invite.useCount === 0
      ? "usos ilimitados"
      : `usos ilimitados · usada ${invite.useCount} ${invite.useCount === 1 ? "vez" : "veces"}`;
  }
  const left = remainingUses(invite)!;
  return left === 1 ? "queda 1 uso" : `quedan ${left} usos`;
}

/** Los links de invitación entran por acá: la página decide según haya sesión o no. */
export function inviteUrl(appUrl: string, code: string): string {
  return `${appUrl.replace(/\/$/, "")}/invitacion/${code}`;
}

/** Días de vigencia. Un link que va a un grupo de WhatsApp dura menos. */
export function inviteLifetimeDays(multiUse: boolean): number {
  return multiUse ? 7 : 14;
}
