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
    <div className="mb-7 flex flex-col gap-4 rounded-xl border border-[var(--accent-10)] bg-[var(--bg-card)] p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--accent)]">
          Sistema Operacional da Alves
        </p>

        <h2 className="mt-1.5 text-2xl font-black">{title}</h2>
      </div>

      <div className="flex gap-2">
        <BackupButton onBackup={onBackup} />

        <Link
          href="/"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--accent-20)] px-5 py-3 text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)] hover:-translate-y-0.5 active:translate-y-0"
        >
          Ver site
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}