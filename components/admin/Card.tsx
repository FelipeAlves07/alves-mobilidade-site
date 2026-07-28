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
    <div className={`rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-5 transition-all duration-300 hover:border-[var(--accent-25)] hover:bg-[var(--bg-card)] ${className}`}
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.18)" }}
    >
      {children}
    </div>
  );
}