import type { ElementType } from "react";

type MetricProps = {
  title: string;
  value: string;
  icon: ElementType;
};

export default function Metric({ title, value, icon: Icon }: MetricProps) {
  return (
    <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-[#171717] p-6">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d6a85f]/10 text-[#f1d28b]">
        <Icon size={24} />
      </div>

      <p className="text-sm text-zinc-400">{title}</p>

      <h3 className="mt-3 text-3xl font-black text-white">{value}</h3>
    </div>
  );
}