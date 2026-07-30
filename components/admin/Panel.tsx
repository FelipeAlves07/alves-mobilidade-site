import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
  extra?: ReactNode;
};

export default function Panel({ title, children, className = "", extra }: Props) {
  return (
    <div className={`rounded-2xl border border-[var(--accent-8)] bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-card)/60] p-5 md:p-6 ${className}`}
      style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.15)" }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[var(--accent)] to-[var(--secondary)]" />
          <h2 className="text-lg font-black tracking-tight">{title}</h2>
        </div>
        {extra}
      </div>
      {children}
    </div>
  );
}
