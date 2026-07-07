import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function Card({
  children,
}: Props) {
  return (
    <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-[#171717] p-6">
      {children}
    </div>
  );
}