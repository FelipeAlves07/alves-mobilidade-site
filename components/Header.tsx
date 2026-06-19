"use client";

import Image from "next/image";
import Link from "next/link";
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed left-0 top-0 z-50 w-full">
        <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-8">
          <div className="flex min-h-20 items-center justify-between rounded-[2rem] border border-[#d6a85f]/20 bg-black/70 px-5 shadow-[0_0_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:px-8">
            <Link href="/" aria-label="Alves Mobilidade Executiva" className="flex items-center">
              <Image
                src="/branding/logo-oficial-alves.jpg"
                alt="Alves Mobilidade Executiva"
                width={760}
                height={260}
                priority
                className="h-14 w-auto object-contain md:h-16"
              />
            </Link>

            <nav className="hidden items-center gap-8 lg:flex">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group text-xs font-bold uppercase tracking-[0.22em] text-zinc-200 transition hover:text-[#f1d28b]"
                >
                  {link.label}
                  <span className="mt-1 block h-px w-0 bg-[#d6a85f] transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
            </nav>

            <Link
              href="/solicitar-atendimento"
              className="hidden rounded-full bg-gradient-to-r from-[#d6a85f] to-[#b8863b] px-6 py-3 text-xs font-black uppercase tracking-[0.18em] text-black shadow-[0_0_40px_rgba(214,168,95,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(214,168,95,0.32)] lg:inline-flex"
            >
              Orçamento
            </Link>

            <button
              onClick={() => setOpen(true)}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 text-white lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md lg:hidden">
          <div className="absolute right-0 top-0 h-full w-[82%] max-w-sm border-l border-[#d6a85f]/25 bg-[#050505] p-6 text-white shadow-2xl">
            <div className="mb-10 flex items-center justify-between">
              <Image
                src="/branding/logo-oficial-alves.jpg"
                alt="Alves Mobilidade Executiva"
                width={760}
                height={260}
                className="h-14 w-auto object-contain"
              />
              <button onClick={() => setOpen(false)} className="rounded-2xl border border-white/10 p-3">
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col gap-3">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-4 text-sm font-bold uppercase tracking-[0.18em] text-zinc-200 transition hover:bg-white/5 hover:text-[#f1d28b]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <Link
              href="/solicitar-atendimento"
              onClick={() => setOpen(false)}
              className="mt-8 flex justify-center rounded-full bg-gradient-to-r from-[#d6a85f] to-[#b8863b] px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-black"
            >
              Solicitar orçamento
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
