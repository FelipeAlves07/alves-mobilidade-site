"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/", label: "Home" },
    { href: "/quem-somos", label: "Quem Somos" },
    { href: "/servicos", label: "Serviços" },
    { href: "/frota", label: "Frota" },
    { href: "/corporativo", label: "Corporativo" },
    { href: "/contato", label: "Contato" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 lg:px-8 lg:py-3">
          <Link href="/">
            <Image
              src="/branding/logo-horizontal.png"
              alt="Alves Mobilidade Executiva"
              width={420}
              height={120}
              priority
              className="h-auto w-[210px] lg:w-[260px] object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-700 transition hover:text-black"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/solicitar-atendimento"
            className="hidden rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 hover:bg-slate-800 lg:flex"
          >
            Solicitar Atendimento
          </Link>

          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-slate-200 p-2 lg:hidden"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60">
          <div className="absolute right-0 top-0 h-full w-[72%] max-w-[280px] bg-white p-4 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <Image
                src="/branding/logo-horizontal.png"
                alt="Alves"
                width={200}
                height={60}
                className="h-auto w-[130px]"
              />

              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg border border-slate-200 p-2"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-base font-medium text-slate-800"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <Link
              href="/solicitar-atendimento"
              onClick={() => setMobileOpen(false)}
              className="mt-8 inline-flex w-full justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Solicitar Atendimento
            </Link>
          </div>
        </div>
      )}
    </>
  );
}