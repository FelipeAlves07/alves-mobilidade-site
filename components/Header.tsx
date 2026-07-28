"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/servicos", label: "Serviços" },
  { href: "/frota", label: "Frota" },
  { href: "/corporativo", label: "Corporativo" },
  { href: "/contato", label: "Contato" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      <header className="fixed left-0 top-0 z-50 w-full transition-all duration-500">
        <div className="mx-auto max-w-7xl px-4 pt-3 lg:px-8 lg:pt-4">
          <div className={`flex min-h-16 items-center justify-between rounded-2xl border px-5 md:px-8 transition-all duration-500 ${
            scrolled
              ? "border-[var(--accent-15)] bg-[var(--bg-elevated)]/90 shadow-lg backdrop-blur-2xl"
              : "border-[var(--border-subtle)] bg-[var(--bg-elevated)]/70 backdrop-blur-xl"
          }`}>
            <Link href="/" aria-label="Alves Mobilidade Executiva" className="flex items-center shrink-0">
              <Image src="/branding/logo_mestra_sem_fundo.png" alt="Alves Mobilidade Executiva" width={760} height={260} priority className="-my-10 h-40 w-auto object-contain md:-my-14 md:h-56" />
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              {links.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link key={link.href} href={link.href}
                    className={`relative px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-colors duration-300 ${
                      isActive ? "text-[var(--accent)]" : "text-zinc-300 hover:text-white"
                    }`}>
                    {link.label}
                    {isActive && <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-transparent" />}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/solicitar-atendimento"
                className="hidden lg:inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 shrink-0">
                Orçamento <ArrowRight size={14} />
              </Link>

              <button onClick={() => setOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-[var(--border-medium)] bg-white/[0.04] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-zinc-300 transition hover:bg-white/[0.08] lg:hidden">
                <Menu size={18} /> Menu
              </button>
            </div>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-primary)] animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
            <Image src="/branding/logo_mestra_sem_fundo.png" alt="Alves Mobilidade Executiva" width={760} height={260} className="h-20 w-auto object-contain" />
            <button onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl border border-[var(--border-light)] bg-white/[0.04] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-zinc-300 transition hover:bg-white/[0.08]">
              <X size={16} /> Fechar
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-8">
            {links.map((link, i) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href}
                  className={`animate-enter-up rounded-xl px-5 py-4 text-base font-bold tracking-[0.08em] transition-all duration-300 ${
                    isActive
                      ? "bg-[var(--accent-12)] text-[var(--accent)]"
                      : "text-zinc-300 hover:bg-white/[0.04] hover:text-white"
                  }`}
                  style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
                  {link.label}
                </Link>
              );
            })}
            <Link href="/solicitar-atendimento"
              className="animate-enter-up mt-4 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-6 py-4 text-sm font-bold uppercase tracking-[0.12em] text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-95"
              style={{ animationDelay: `${links.length * 60}ms`, animationFillMode: "both" }}>
              Solicitar orçamento <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
