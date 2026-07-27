import type { ElementType } from "react";

type Props = {
  title: string;
  value: string;
  icon: ElementType;
  className?: string;
};

export default function Metric({ title, value, icon: Icon, className = "" }: Props) {
  return (
    <div className={`rounded-xl border border-[var(--accent-10)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--accent-20)] ${className}`}
      style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.20)" }}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-10)] text-[var(--accent)]">
        <Icon size={22} />
      </div>
      <p className="text-xs text-zinc-500">{title}</p>
      <h3 className="mt-1 text-2xl font-black tracking-tight">{value}</h3>
    </div>
  );
}
