import type { ElementType } from "react";

type Props = {
  title: string;
  value: string;
  icon: ElementType;
  className?: string;
  compactOnMobile?: boolean;
};

export default function Metric({ title, value, icon: Icon, className = "", compactOnMobile = false }: Props) {
  return (
    <div className={`rounded-xl border border-[var(--accent-10)] bg-gradient-to-b from-[var(--bg-surface)] to-[var(--bg-card)] ${compactOnMobile ? "p-3 sm:p-5" : "p-5"} transition-all duration-300 hover:border-[var(--accent-25)] hover:-translate-y-0.5 ${className}`}
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
    >
      <div className={`${compactOnMobile ? "mb-2 h-8 w-8 rounded-lg sm:mb-4 sm:h-11 sm:w-11 sm:rounded-xl" : "mb-4 h-11 w-11 rounded-xl"} flex items-center justify-center bg-[var(--accent-12)] text-[var(--accent)] shadow-sm`}>
        <Icon size={compactOnMobile ? 18 : 22} className={compactOnMobile ? "sm:hidden" : undefined} />
        {compactOnMobile && <Icon size={22} className="hidden sm:block" />}
      </div>
      <p className={`${compactOnMobile ? "text-[10px] sm:text-xs" : "text-xs"} font-medium text-zinc-500`}>{title}</p>
      <h3 className={`${compactOnMobile ? "mt-1 whitespace-nowrap text-[clamp(1.15rem,5.8vw,1.5rem)] sm:mt-1.5 sm:text-2xl" : "mt-1.5 text-2xl"} font-black tracking-tight`}>{value}</h3>
    </div>
  );
}
