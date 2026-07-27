import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
};

export default function Panel({ title, children, className = "" }: Props) {
  return (
    <div className={`rounded-2xl border border-[var(--accent-8)] bg-[var(--bg-elevated)] p-5 ${className}`}
      style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}
    >
      <h2 className="mb-4 text-lg font-black tracking-tight">{title}</h2>
      {children}
    </div>
  );
}
