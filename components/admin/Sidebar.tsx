"use client";

import { LogOut } from "lucide-react";
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
  onLogout: () => void;
};

export default function Sidebar({ active, menu, setActive, onLogout }: Props) {
  const groups = [...new Set(menu.map((item) => item.group))];

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-[#d6a85f]/10 bg-[#111111] p-5 xl:block">
      <div className="mb-5 rounded-[1.6rem] border border-[#d6a85f]/15 bg-[#191919] p-5">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d6a85f]">
          AME Control
        </p>

        <h1 className="mt-2 text-xl font-black">Central Alves</h1>
      </div>

      <button
        type="button"
        onClick={() => setActive("trabalhar")}
        className="mb-5 w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#f1d28b] to-[#b8863b] px-4 py-4 text-sm font-black text-black"
      >
        🚀 Trabalhar Agora
      </button>

      <nav className="space-y-5">
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
              {group}
            </p>

            <div className="space-y-2">
              {menu
                .filter((item) => item.group === group)
                .map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActive(item.id)}
                      className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                        active === item.id
                          ? "bg-[#d6a85f] text-black"
                          : "text-zinc-300 hover:bg-[#1d1d1d] hover:text-[#f1d28b]"
                      }`}
                    >
                      <Icon size={18} />
                      {item.label}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        className="mt-8 flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-[#d6a85f]/15 px-4 py-3 text-sm font-bold text-zinc-300"
      >
        <LogOut size={18} />
        Sair
      </button>
    </aside>
  );
}