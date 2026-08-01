import clsx from "clsx";
import { emojiForSeed } from "@/lib/emojis";

const SIZES = {
  xs: "h-6 w-6 text-[13px]",
  sm: "h-8 w-8 text-base",
  md: "h-10 w-10 text-xl",
  lg: "h-14 w-14 text-3xl",
};

export type Person = {
  name: string;
  color?: string | null;
  emoji?: string | null;
};

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  color,
  emoji,
  size = "md",
  className,
}: Person & {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  // Quien no eligió emoji igual tiene uno, derivado del nombre.
  const glyph = emoji || emojiForSeed(name);
  const tint = color || "#6366f1";

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full leading-none",
        SIZES[size],
        className,
      )}
      // El color pasa a ser un fondo suave: el que identifica es el emoji.
      style={{ backgroundColor: `${tint}26`, boxShadow: `inset 0 0 0 1.5px ${tint}59` }}
      title={name}
      role="img"
      aria-label={name}
    >
      {glyph}
    </span>
  );
}

export function AvatarStack({ people, max = 4 }: { people: Person[]; max?: number }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;

  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((p, i) => (
        <Avatar
          key={`${p.name}-${i}`}
          name={p.name}
          color={p.color}
          emoji={p.emoji}
          size="xs"
          className="ring-2 ring-[var(--surface)]"
        />
      ))}
      {rest > 0 && (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-2)] text-[10px] font-semibold text-[var(--text-muted)] ring-2 ring-[var(--surface)]">
          +{rest}
        </span>
      )}
    </span>
  );
}
