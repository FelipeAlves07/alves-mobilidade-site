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
      <section className="relative h-[60vh] min-h-[500px] overflow-hidden md:h-[70vh]">
        <Image src="/images/frota-premium.jpg" alt="Quem Somos" fill priority className="object-cover object-center opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)]/80 via-[var(--bg-primary)]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(var(--accent-rgb),0.12),transparent_50%)]" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 pt-28 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Quem somos</span>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">Excelência em mobilidade executiva.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400 md:text-lg">Atendimento premium para empresas e clientes particulares.</p>
          </div>
        </div>
      </section>
      <section className="px-5 py-20 md:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-4xl font-black leading-tight md:text-5xl">Atendimento executivo com padrão <span className="text-gradient-accent">premium</span>.</h2>
            <p className="mt-5 text-base leading-8 text-zinc-400">Desde 2022 oferecendo mobilidade executiva com conforto, segurança e excelência para empresas, executivos e clientes particulares em Belo Horizonte e região metropolitana.</p>
            <Link href="/solicitar-atendimento" className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95">
              Solicitar atendimento <ArrowRight size={15} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[var(--border-light)]">
            <Image src="/images/cliente-vip.jpg" alt="Cliente Premium" width={1200} height={800} className="w-full object-cover transition duration-700 hover:scale-105" />
          </div>
        </div>
      </section>
      <section className="section-blue px-5 py-20 md:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-4">
          {values.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className={`group rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-8 transition-all duration-500 hover:-translate-y-1 hover:border-[var(--accent-25)] hover:shadow-xl animate-enter-up animate-delay-${i + 1}`}>
                <div className="mb-5 inline-flex rounded-xl bg-[var(--accent-8)] p-3.5 text-[var(--accent)] transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white">
                  <Icon size={22} />
                </div>
                <h3 className="text-xl font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{item.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
