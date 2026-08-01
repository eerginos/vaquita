export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-debt-500/30 bg-debt-500/10 px-3 py-2 text-sm text-debt-500"
    >
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2 text-sm text-brand-700 dark:text-brand-300">
      {message}
    </p>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-4xl">{icon}</div>}
      <div>
        <p className="font-medium text-[var(--text)]">{title}</p>
        {description && <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}
