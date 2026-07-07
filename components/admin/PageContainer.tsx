import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function PageContainer({
  children,
}: Props) {
  return (
    <div className="mx-auto max-w-7xl p-8">
      {children}
    </div>
  );
}