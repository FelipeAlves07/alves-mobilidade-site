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
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-[var(--accent-10)] bg-[var(--bg-primary)] p-4 lg:flex lg:flex-col">
      <div className="mb-4 rounded-xl border border-[var(--accent-12)] bg-gradient-to-b from-white/[0.03] to-transparent p-4 transition duration-300">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] text-[11px] font-black text-white shadow-sm">
            A
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">AME Control</p>
            <h1 className="text-sm font-black tracking-tight">Central Alves</h1>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setActive("trabalhar")}
        className="group mb-4 w-full cursor-pointer rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-4 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
        style={{ boxShadow: "0 4px 16px rgba(var(--secondary-rgb), 0.30)" }}
      >
        <span className="inline-block transition-transform duration-300 group-hover:scale-110">🚀</span> Trabalhar Agora
      </button>

      <nav className="flex-1 space-y-4 overflow-y-auto">
        {groups.map((group) => (
          <div key={group} className="animate-enter-up animate-delay-1">
            <p className="mb-1.5 px-3 text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600">{group}</p>
            <div className="space-y-0.5">
              {menu
                .filter((item) => item.group === group)
                .map((item, index) => {
                  const Icon = item.icon;
                  const isActive = active === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActive(item.id)}
                      className={`group relative flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-[var(--secondary)] text-white shadow-sm"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                      }`}
                      style={{ animationDelay: `${100 + index * 60}ms`, animationFillMode: "both" }}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />
                      )}
                      <Icon size={17} className={`transition-colors duration-200 ${isActive ? "text-[var(--accent)]" : "text-zinc-500 group-hover:text-zinc-300"}`} />
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
        className="mt-4 flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-white/5 px-3 py-2.5 text-sm font-medium text-zinc-500 transition-all duration-200 hover:border-red-500/20 hover:bg-red-500/5 hover:text-red-400"
      >
        <LogOut size={17} />
        Sair
      </button>
    </aside>
  );
}