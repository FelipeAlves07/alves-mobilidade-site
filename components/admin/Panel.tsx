import type { ReactNode } from "react";

type PanelProps = {
  title: string;
  children: ReactNode;
};

export default function Panel({ title, children }: PanelProps) {
  return (
    <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-[#171717] p-6">
      <h3 className="mb-5 text-xl font-black text-[#f5f0e8]">
        {title}
      </h3>

      {children}
    </div>
  );
}