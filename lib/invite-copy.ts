/**
 * Los textos de la vista previa del link (WhatsApp, Telegram, etc.).
 * Viven acá porque los usan la metadata de la página y la imagen generada,
 * y tienen que decir lo mismo.
 */
export function inviteHeadline(
  inviterName: string,
  groupName: string | null,
  multiUse: boolean,
): string {
  // Un link para varios se manda a un grupo: habla de "ustedes", no de "vos".
  const verbo = multiUse ? "los invitó" : "te invitó";
  return groupName ? `${inviterName} ${verbo} a ${groupName}` : `${inviterName} ${verbo} a Split`;
}

export function inviteSubline(groupName: string | null): string {
  return groupName
    ? "Entrá para dividir los gastos del grupo sin que nadie tenga que llevar la cuenta."
    : "Entrá para dividir gastos con tus amigos sin que nadie tenga que llevar la cuenta.";
}
