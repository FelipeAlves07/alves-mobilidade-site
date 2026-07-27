"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ElementType } from "react";

type MenuItem = {
  id: string;
  group: string;
  label: string;
  icon: ElementType;
};

type Props = {
  active: string;
  menu: MenuItem[];
  setActive: (id: string) => void;
};

export default function MobileNav({ active, menu, setActive }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  function select(id: string) {
    setActive(id);
    setOpen(false);
  }

  const groups = [...new Set(menu.map((item) => item.group))];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-[#1a1a1a] p-2.5 text-zinc-300 transition hover:bg-[#222] lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-primary)]">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">
                AME Control
              </p>
              <h2 className="mt-0.5 text-base font-black tracking-tight">Central Alves</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-xl p-2 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
            {groups.map((group) => (
              <div key={group}>
                <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600">
                  {group}
                </p>
                <div className="space-y-1">
                  {menu
                    .filter((item) => item.group === group)
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = active === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => select(item.id)}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium transition-all duration-200 ${
                            isActive
                              ? "bg-[var(--secondary)] text-white shadow-sm"
                              : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                          }`}
                        >
                          <Icon size={20} className={isActive ? "text-[var(--accent)]" : "text-zinc-500"} />
                          {item.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </nav>
        </div>,
        document.body
      )}
    </>
  );
}
