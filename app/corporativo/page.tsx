import Image from "next/image";
import Link from "next/link";
import { Briefcase, Building2, Users, ShieldCheck, CheckCircle2, ArrowRight } from "lucide-react";

const solutions = [
  {
    icon: Briefcase,
    title: "Executivos & Diretoria",
    description: "Atendimento premium para deslocamentos executivos e compromissos estratégicos.",
    image: "/cards/card_executivos_diretoria.png",
  },
  {
    icon: Users,
    title: "Visitas Corporativas",
    description: "Recepção e transporte profissional para clientes, parceiros e equipes.",
    image: "/cards/card_visitas_corporativas.png",
  },
  {
    icon: Building2,
    title: "Demandas Empresariais",
    description: "Mobilidade estruturada para empresas com padrão sofisticado.",
    image: "/cards/card_demandas_empresariais.png",
  },
  {
    icon: ShieldCheck,
    title: "Confiança",
    description: "Discrição, segurança e planejamento em cada trajeto corporativo.",
    image: "/cards/card_confianca_seguranca.png",
  },
];

export default function CorporativoPage() {
  return (
    <main className="bg-[var(--bg-primary)] text-[var(--foreground)]">
      <section className="relative flex min-h-[500px] items-center overflow-hidden pt-28 md:min-h-[600px]">
        <Image src="/images/corporativo.jpg" alt="Corporativo Alves" fill priority className="object-cover object-center opacity-30 dark:opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)]/20 via-[var(--bg-primary)]/5 to-transparent dark:from-[var(--bg-primary)]/85 dark:via-[var(--bg-primary)]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(var(--accent-rgb),0.12),transparent_50%)]" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Corporativo</span>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl lg:text-6xl">Mobilidade corporativa com padrão executivo.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400 md:text-base md:leading-8">Soluções para empresas que precisam transmitir profissionalismo em cada deslocamento.</p>
            <Link href="/solicitar-atendimento" className="group mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95">
              Solicitar atendimento <ArrowRight size={14} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {solutions.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="group overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--accent-25)] hover:shadow-xl">
                  <div className="relative h-44 overflow-hidden">
                    <Image src={item.image} alt={item.title} fill className="object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
                  </div>
                  <div className="p-6">
                    <div className="mb-3 inline-flex rounded-xl bg-[var(--accent-8)] p-3 text-[var(--accent)] transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white">
                      <Icon size={20} />
                    </div>
                    <h2 className="text-lg font-bold">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {["Pontualidade", "Discrição", "Segurança", "Atendimento premium"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-4">
                <CheckCircle2 className="shrink-0 text-[var(--accent)]" size={16} />
                <span className="text-sm text-zinc-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
