"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Header from "@/components/Header";

const whatsappLink = "https://wa.me/5531998458084";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="currentColor" aria-hidden="true">
      <path d="M16.04 3C8.88 3 3.06 8.8 3.06 15.92c0 2.28.6 4.5 1.74 6.45L3 29l6.82-1.78a13 13 0 0 0 6.22 1.58h.01C23.2 28.8 29 23 29 15.88 29 8.8 23.18 3 16.04 3Zm0 23.6h-.01a10.8 10.8 0 0 1-5.5-1.5l-.4-.24-4.04 1.06 1.08-3.94-.26-.4a10.7 10.7 0 0 1-1.65-5.66c0-5.9 4.84-10.72 10.78-10.72 2.88 0 5.58 1.12 7.62 3.15a10.62 10.62 0 0 1 3.16 7.53c0 5.9-4.84 10.72-10.78 10.72Zm5.9-8.03c-.32-.16-1.9-.94-2.2-1.05-.3-.1-.52-.16-.74.16-.22.32-.85 1.05-1.04 1.26-.2.22-.38.24-.7.08-.32-.16-1.36-.5-2.6-1.6-.96-.85-1.6-1.9-1.8-2.22-.18-.32-.02-.5.14-.66.14-.14.32-.38.48-.56.16-.2.22-.32.32-.54.1-.22.05-.4-.03-.56-.08-.16-.74-1.78-1.02-2.44-.27-.64-.54-.56-.74-.57h-.64c-.22 0-.56.08-.86.4-.3.32-1.14 1.12-1.14 2.72 0 1.6 1.18 3.16 1.34 3.38.16.22 2.32 3.54 5.62 4.96.78.34 1.4.54 1.88.7.8.25 1.52.22 2.1.13.64-.1 1.9-.78 2.17-1.52.27-.75.27-1.38.19-1.52-.08-.14-.3-.22-.62-.38Z" />
    </svg>
  );
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Header />
      <main key={pathname} className="animate-enter">{children}</main>
      <footer className="relative overflow-hidden border-t border-[var(--border-light)] bg-[var(--bg-elevated)]">
        <div className="absolute -left-40 top-20 h-80 w-80 rounded-full bg-[var(--accent-6)] blur-[120px]" />
        <div className="relative z-10 mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr]">
            <div>
              <Image src="/branding/logo_mestra_sem_fundo.png" alt="Alves Mobilidade Executiva" width={760} height={260} className="h-auto w-[180px]" />
              <p className="mt-4 max-w-xs text-sm leading-7 text-zinc-500">Mobilidade executiva premium em Belo Horizonte e Região Metropolitana.</p>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Serviços</h4>
              <div className="mt-5 space-y-2.5">
                {["Aeroportos", "Empresas", "Eventos", "Viagens"].map((s) => (
                  <p key={s} className="text-sm text-zinc-500 transition hover:text-[var(--foreground)] cursor-default">{s}</p>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Páginas</h4>
              <div className="mt-5 space-y-2.5">
                {[
                  { href: "/", label: "Home" },
                  { href: "/servicos", label: "Serviços" },
                  { href: "/frota", label: "Frota" },
                  { href: "/corporativo", label: "Corporativo" },
                  { href: "/contato", label: "Contato" },
                ].map((p) => (
                  <Link key={p.href} href={p.href} className="block text-sm text-zinc-500 transition hover:text-[var(--foreground)]">{p.label}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Contato</h4>
              <div className="mt-5 space-y-2.5 text-sm text-zinc-500">
                <p className="transition hover:text-[var(--foreground)] cursor-default">(31) 99845-8084</p>
                <p className="transition hover:text-[var(--foreground)] cursor-default">contato@alvesmobilidade.com.br</p>
                <p className="transition hover:text-[var(--foreground)] cursor-default">Belo Horizonte • MG</p>
              </div>
              <Link href="/solicitar-atendimento" className="group mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg active:scale-95">
                Solicitar <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
          <div className="mt-12 flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-8 text-xs text-zinc-600 md:flex-row md:items-center md:justify-between">
            <p>© 2022 - {new Date().getFullYear()} Alves Mobilidade Executiva. Todos os direitos reservados.</p>
            <p>Experiência premium em cada trajeto.</p>
          </div>
        </div>
      </footer>
      <Link href={whatsappLink} target="_blank" className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_0_40px_rgba(37,211,102,.35)] transition-all duration-300 hover:scale-110 hover:shadow-[0_0_50px_rgba(37,211,102,.5)] active:scale-95" aria-label="Falar no WhatsApp">
        <WhatsAppIcon />
      </Link>
    </>
  );
}
