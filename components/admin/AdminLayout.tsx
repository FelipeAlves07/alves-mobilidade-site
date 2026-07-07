"use client";

import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Topbar from "./Topbar";

type MenuItem = {
  id: string;
  group: string;
  label: string;
  icon: any;
};

type Props = {
  active: string;
  title: string;
  menu: MenuItem[];
  setActive: (id: string) => void;
  onLogout: () => void;
  onBackup: () => void;
  children: ReactNode;
};

export default function AdminLayout({
  active,
  title,
  menu,
  setActive,
  onLogout,
  onBackup,
  children,
}: Props) {
  return (
    <main className="min-h-screen bg-[#0f0f0f] text-[#f5f0e8]">
      <div className="flex min-h-screen">
        <Sidebar
          active={active}
          menu={menu}
          setActive={setActive}
          onLogout={onLogout}
        />

        <section className="flex-1 p-5 md:p-8">
          <MobileNav active={active} menu={menu} setActive={setActive} />

          <Topbar title={title} onBackup={onBackup} />

          {children}
        </section>
      </div>
    </main>
  );
}