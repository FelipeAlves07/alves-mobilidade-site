"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/servicos", label: "Serviços" },
  { href: "/frota", label: "Frota" },
  { href: "/corporativo", label: "Corporativo" },
  { href: "/contato", label: "Contato" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050505]/78 text-white backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
          <Link href="/" aria-label="Alves Mobilidade Executiva">
            <Image
              src="/branding/logo-dark.png"
              alt="Alves Mobilidade Executiva"
              width={320}
              height={110}
              priority
              className="h-auto w-[155px] object-contain md:w-[190px]"
            />
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-200 transition hover:text-[#d6a85f]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/solicitar-atendimento"
            className="hidden rounded-xl border border-[#d6a85f]/70 bg-[#d6a85f]/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#d6a85f] lg:inline-flex"
          >
            Solicitar orçamento
          </Link>

          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-white/15 bg-white/5 p-2.5 text-white lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm">
          <div className="absolute right-0 top-0 h-full w-[78%] max-w-[320px] border-l border-[#d6a85f]/25 bg-[#050505] p-5 text-white shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <Image
                src="/branding/logo-dark.png"
                alt="Alves Mobilidade Executiva"
                width={220}
                height={80}
                className="h-auto w-[140px]"
              />

              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-white/15 p-2"
                aria-label="Fechar menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm font-bold uppercase tracking-[0.14em] text-zinc-200 transition hover:bg-white/5 hover:text-[#d6a85f]"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <Link
              href="/solicitar-atendimento"
              onClick={() => setMobileOpen(false)}
              className="mt-8 inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-[#d6a85f] to-[#b8863b] px-4 py-4 text-sm font-bold uppercase tracking-wide text-white"
            >
              Solicitar orçamento
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
