/** Paleta de emojis para el avatar de cada persona. */
export const USER_EMOJIS = [
  "😎", "🤓", "🥸", "🤠", "🥳", "😺", "🦊", "🐻",
  "🐼", "🐨", "🐯", "🦁", "🐸", "🐵", "🦉", "🐧",
  "🐢", "🦖", "🦄", "🐝", "🦋", "🐙", "🦈", "🐳",
  "🌵", "🌻", "🍀", "🍄", "⚡", "🔥", "🌈", "⭐",
  "🌙", "☀️", "🍕", "🍔", "🌮", "🍩", "🧉", "☕",
  "🍺", "🍷", "⚽", "🏀", "🎸", "🎧", "🎮", "🚀",
  "🏔️", "🏖️", "🎩", "👑", "💎", "🎲", "🧩", "🛸",
];

const EMOJI_SET = new Set(USER_EMOJIS);

export function isValidUserEmoji(value: string): boolean {
  return EMOJI_SET.has(value);
}

/**
 * Emoji por defecto, estable a partir del nombre o el id.
 * Así nadie queda sin avatar aunque nunca haya elegido uno.
 */
export function emojiForSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return USER_EMOJIS[Math.abs(hash) % USER_EMOJIS.length];
}
