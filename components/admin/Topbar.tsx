"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import BackupButton from "./BackupButton";

type Props = {
  title: string;
  onBackup: () => void;
};

export default function Topbar({ title, onBackup }: Props) {
  return (
    <div className="mb-7 flex flex-col gap-4 rounded-[2rem] border border-[#d6a85f]/10 bg-[#151515] p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.25em] text-[#d6a85f]">
          Sistema Operacional da Alves
        </p>

        <h2 className="mt-2 text-3xl font-black">{title}</h2>
      </div>

      <div className="flex gap-2">
        <BackupButton onBackup={onBackup} />

        <Link
          href="/"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d6a85f]/20 px-5 py-3 text-sm font-black text-[#f1d28b]"
        >
          Ver site
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}