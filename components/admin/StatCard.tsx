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
    <div className={`rounded-xl border border-[var(--accent-10)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--accent-18)] ${className}`}
      style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.20)" }}
    >
      <p className="text-xs text-zinc-500">{title}</p>
      <h2 className="mt-1 text-3xl font-black tracking-tight text-[var(--accent)]">{value}</h2>
    </div>
  );
}