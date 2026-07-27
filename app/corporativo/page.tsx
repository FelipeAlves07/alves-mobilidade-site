import Image from "next/image";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

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
      <section className="relative h-[60vh] min-h-[500px] overflow-hidden md:h-[70vh]">
        <Image src="/images/corporativo.jpg" alt="Corporativo Alves" fill priority className="object-cover object-center opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)]/80 via-[var(--bg-primary)]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(var(--accent-rgb),0.12),transparent_50%)]" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 pt-28 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Corporativo</span>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">Mobilidade corporativa com padrão executivo.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400 md:text-lg">Soluções para empresas que precisam transmitir profissionalismo em cada deslocamento.</p>
            <Link href="/solicitar-atendimento" className="group mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95">
              Solicitar atendimento <ArrowRight size={15} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
      <section className="px-5 py-20 md:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-4">
          {solutions.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className={`group overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--accent-25)] hover:shadow-xl animate-enter-up animate-delay-${i + 1}`}>
                <div className="relative h-48 overflow-hidden">
                  <Image src={item.image} alt={item.title} fill className="object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
                </div>
                <div className="p-7">
                  <div className="mb-4 inline-flex rounded-xl bg-[var(--accent-8)] p-3.5 text-[var(--accent)] transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white">
                    <Icon size={22} />
                  </div>
                  <h2 className="text-xl font-bold">{item.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mx-auto mt-12 grid max-w-7xl gap-3 md:grid-cols-4">
          {["Pontualidade", "Discrição", "Segurança", "Atendimento premium"].map((item, i) => (
            <div key={item} className={`flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-white/[0.02] p-4 animate-enter-up animate-delay-${i + 5}`}>
              <CheckCircle2 className="shrink-0 text-[var(--accent)]" size={18} />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
