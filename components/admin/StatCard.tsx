"use client";

type Props = {
  title: string;
  value: string | number;
  className?: string;
};

export default function StatCard({
  title,
  value,
  className = "",
}: Props) {
  return (
    <div className={`rounded-xl border border-[var(--accent-10)] bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-card)] p-5 transition-all duration-300 hover:border-[var(--accent-25)] hover:-translate-y-0.5 ${className}`}
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
    >
      <p className="text-xs font-medium text-zinc-500">{title}</p>
      <h2 className="mt-1.5 text-3xl font-black tracking-tight text-[var(--accent)]">{value}</h2>
    </div>
  );
}