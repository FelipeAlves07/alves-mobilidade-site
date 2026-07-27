import type { ElementType, ReactNode } from "react";

type Props = {
  icon: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export default function EmptyState({ icon: Icon, title, description, action, className = "" }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-[var(--accent-8)] bg-[var(--bg-card)] px-6 py-12 text-center ${className}`}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--accent-10)] text-[var(--accent)]">
        <Icon size={28} />
      </div>
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
