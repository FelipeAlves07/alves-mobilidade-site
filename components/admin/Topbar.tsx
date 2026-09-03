"use client";

import Link from "next/link";
import { ChevronRight, Download } from "lucide-react";
import MobileNav from "./MobileNav";
import type { ElementType } from "react";

type MenuItem = {
  id: string;
  group: string;
  label: string;
  icon: ElementType;
};

type Props = {
  active: string;
  title: string;
  menu: MenuItem[];
  setActive: (id: string) => void;
  onBackup: () => void;
};

export default function Topbar({ active, title, menu, setActive, onBackup }: Props) {
  return (
    <div className="sticky top-0 z-40 border-b border-[var(--accent-8)] bg-[var(--bg-primary)]/85 backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-2 px-3 py-2 md:px-6 md:py-3">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <MobileNav active={active} menu={menu} setActive={setActive} />
          <div className="min-w-0">
            <p className="truncate text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--accent)] md:text-[10px] md:tracking-[0.28em]">
              Sistema Operacional da Alves
            </p>
            <h2 className="truncate text-sm font-black tracking-tight md:text-xl">{title}</h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <button
            type="button"
            onClick={onBackup}
            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/8 px-2 py-1.5 text-[11px] font-bold text-zinc-400 transition hover:border-white/15 hover:text-zinc-200 md:px-3.5 md:py-2"
          >
            <Download size={13} className="md:mr-1.5" />
            <span className="hidden md:inline">Backup</span>
          </button>
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/8 px-2 py-1.5 text-[11px] font-bold text-zinc-400 transition hover:border-white/15 hover:text-zinc-200 md:px-3.5 md:py-2"
          >
            <span className="hidden md:inline">Ver site</span>
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
