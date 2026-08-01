import clsx from "clsx";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
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
  size = "md",
  className,
}: {
  name: string;
  color?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white",
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color || "#6366f1" }}
      title={name}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 4,
}: {
  people: { name: string; color?: string | null }[];
  max?: number;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;

  return (
    <span className="flex items-center -space-x-2">
      {shown.map((p, i) => (
        <Avatar
          key={`${p.name}-${i}`}
          name={p.name}
          color={p.color}
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
