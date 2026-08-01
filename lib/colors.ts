export const USER_COLORS = [
  "#6366f1", "#0ea5e9", "#14b8a6", "#22c55e", "#eab308", "#f97316",
  "#ef4444", "#ec4899", "#a855f7", "#8b5cf6", "#06b6d4", "#84cc16",
];

/** Color estable a partir del id, para que cada persona tenga siempre el mismo. */
export function colorForSeed(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}
