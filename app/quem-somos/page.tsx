import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Clock3, Star, Building2 } from "lucide-react";

const values = [
  { icon: Clock3, title: "Pontualidade", description: "Compromisso absoluto com sua agenda." },
  { icon: ShieldCheck, title: "Segurança", description: "Discrição, profissionalismo e confiança." },
  { icon: Star, title: "Excelência", description: "Experiência premium em cada atendimento." },
  { icon: Building2, title: "Flexibilidade", description: "Empresas e clientes particulares." },
];

export default function QuemSomosPage() {
  return (
    <main className="bg-[var(--bg-primary)] text-[var(--foreground)]">
      <section className="relative flex min-h-[500px] items-center overflow-hidden pt-28 md:min-h-[600px]">
        <Image src="/images/frota-premium.jpg" alt="Quem Somos" fill priority className="object-cover object-center opacity-65 dark:opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)]/60 via-[var(--bg-primary)]/15 to-transparent dark:from-[var(--bg-primary)]/85 dark:via-[var(--bg-primary)]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(var(--accent-rgb),0.12),transparent_50%)]" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Quem somos</span>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl lg:text-6xl">Excelência em mobilidade executiva.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400 md:text-base md:leading-8">Atendimento premium para empresas e clientes particulares em Belo Horizonte e região metropolitana.</p>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="text-3xl font-black leading-tight md:text-4xl lg:text-5xl">Atendimento executivo com padrão <span className="text-gradient-accent">premium</span>.</h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-400 md:text-base md:leading-8">Desde 2022 oferecendo mobilidade executiva com conforto, segurança e excelência para empresas, executivos e clientes particulares.</p>
            <div className="mt-7 space-y-3">
              {values.slice(0, 2).map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-center gap-4 rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-8)] text-[var(--accent)]">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{item.title}</p>
                      <p className="text-xs text-zinc-500">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/solicitar-atendimento" className="group mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95">
              Solicitar atendimento <ArrowRight size={14} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[var(--border-light)]">
            <Image src="/images/cliente-vip.jpg" alt="Cliente Premium" width={1200} height={800} className="w-full object-cover transition duration-700 hover:scale-105" />
          </div>
        </div>
      </section>

      <section className="section-blue px-5 py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <h2 className="text-3xl font-black md:text-4xl">Nossos valores</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-500">Princípios que guiam cada atendimento.</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
            {values.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="group flex items-start gap-4 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-6 transition-all duration-500 hover:border-[var(--accent-20)] hover:shadow-lg">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-8)] text-[var(--accent)] transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
