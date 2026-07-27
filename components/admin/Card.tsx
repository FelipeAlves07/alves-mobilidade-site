import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function Card({
  children,
  className = "",
}: Props) {
  return (
    <div className={`rounded-xl border border-[var(--accent-10)] bg-[var(--bg-card)] p-5 transition hover:border-[var(--accent-18)] ${className}`}
      style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.20)" }}
    >
      {children}
    </div>
  );
}