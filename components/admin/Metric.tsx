import type { ElementType } from "react";

type Props = {
  title: string;
  value: string;
  icon: ElementType;
  className?: string;
};

export default function Metric({ title, value, icon: Icon, className = "" }: Props) {
  return (
    <div className={`rounded-xl border border-[var(--accent-10)] bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-card)] p-5 transition-all duration-300 hover:border-[var(--accent-25)] hover:-translate-y-0.5 ${className}`}
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-12)] text-[var(--accent)] shadow-sm">
        <Icon size={22} />
      </div>
      <p className="text-xs font-medium text-zinc-500">{title}</p>
      <h3 className="mt-1.5 text-2xl font-black tracking-tight">{value}</h3>
    </div>
  );
}
