"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, Building2, Car, Plane, ShieldCheck, Clock, Armchair, Headset, Sparkles, Star, ChevronRight } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";

const whatsappLink = "https://wa.me/5531998458084?text=Ol%C3%A1!%20Tenho%20interesse%20nos%20servi%C3%A7os%20da%20Alves%20Mobilidade%20Executiva%20e%20gostaria%20de%20receber%20um%20atendimento%20personalizado.";

const services = [
  { icon: Plane, title: "Aeroportos", description: "Confins e Pampulha com pontualidade, conforto e discrição." },
  { icon: Briefcase, title: "Empresas", description: "Atendimento corporativo para executivos, clientes e equipes." },
  { icon: Building2, title: "Eventos", description: "Mobilidade elegante para eventos sociais e empresariais." },
  { icon: Car, title: "Viagens", description: "Deslocamentos agendados com segurança e padrão premium." },
];

const features = [
  { icon: ShieldCheck, title: "Segurança", text: "Planejamento e tranquilidade em cada deslocamento." },
  { icon: Clock, title: "Pontualidade", text: "Compromisso absoluto com sua agenda." },
  { icon: Armchair, title: "Conforto", text: "Veículos selecionados para uma experiência superior." },
  { icon: Headset, title: "Atendimento", text: "Contato direto, ágil e personalizado." },
];

const fleet = ["Corolla", "BYD King", "Nivus", "T-Cross", "Tracker", "Onix Plus"];

const stats = [
  { value: "100+", label: "Clientes atendidos" },
  { value: "4.9", label: "Avaliação média" },
  { value: "6", label: "Veículos na frota" },
  { value: "BH + RM", label: "Região de atuação" },
];

const reviews = [
  { text: "Excelente atendimento, motorista muito pontual e veículo impecável.", author: "Carlos M." },
  { text: "Transporte corporativo de alto nível. Recomendo para empresas.", author: "Ana L." },
  { text: "Conforto e segurança do início ao fim. Virou padrão na empresa.", author: "Ricardo S." },
];

function track(location: string) {
  sendGAEvent("event", "solicitar_atendimento_click", { location });
}

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[var(--bg-primary)] text-[var(--foreground)]">

      {/* ── HERO ── */}
      <section className="relative flex min-h-screen items-center overflow-hidden">
        <Image src="/images/hero-byd.jpg" alt="Alves Mobilidade Executiva" fill priority className="object-cover object-center opacity-70 dark:opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)]/70 via-[var(--bg-primary)]/10 to-transparent dark:from-[var(--bg-primary)]/85 dark:via-[var(--bg-primary)]/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(var(--accent-rgb),0.15),transparent_50%)]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pt-28 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--accent-20)] bg-white/[0.04] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)] backdrop-blur-md">
              <Sparkles size={11} /> Mobilidade Executiva Premium
            </div>
            <h1 className="text-[clamp(2.5rem,8vw,6rem)] font-black leading-[0.92] tracking-tight">
              <span className="text-white">ALVES</span>
              <span className="mt-2 block text-gradient-accent">MOBILIDADE</span>
              <span className="mt-2 block text-white">EXECUTIVA</span>
            </h1>
            <div className="mt-6 h-px w-20 bg-gradient-to-r from-[var(--accent)] to-transparent" />
            <p className="mt-6 max-w-xl text-sm leading-7 text-zinc-400 md:text-base md:leading-8">Transporte executivo premium para aeroportos, empresas, eventos e viagens em Belo Horizonte.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/solicitar-atendimento" onClick={() => track("hero")} className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95"
                style={{ boxShadow: "0 18px 50px rgba(var(--accent-rgb),0.2)" }}>
                Solicitar orçamento <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </Link>
              <a href={whatsappLink} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-medium)] bg-white/[0.03] px-7 py-3.5 text-sm font-bold uppercase tracking-wide text-zinc-300 backdrop-blur transition-all duration-300 hover:border-[var(--accent-35)] hover:bg-white/[0.06] hover:text-white">Falar no WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative z-20 -mt-16 px-5 pb-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-elevated)]/80 backdrop-blur-xl">
            <div className="grid grid-cols-2 md:grid-cols-4">
              {stats.map((item, i) => (
                <div key={item.label} className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <span className="text-2xl font-black text-gradient-accent md:text-3xl">{item.value}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section-gradient px-5 py-20 md:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-xl text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Diferenciais</span>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">Por que escolher a Alves.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-500">Atendimento executivo construído para entregar confiança, pontualidade e uma experiência superior em cada trajeto.</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="group flex items-start gap-5 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-6 transition-all duration-500 hover:border-[var(--accent-20)] hover:shadow-lg">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-8)] text-[var(--accent)] transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="servicos" className="section-blue px-5 py-20 md:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-xl text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Serviços</span>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">Soluções premium para cada necessidade.</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-500">Atendimento executivo planejado para entregar pontualidade, conforto e percepção de valor em cada trajeto.</p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.title} className="group flex items-start gap-5 rounded-2xl border border-[var(--border-light)] bg-white/[0.02] p-6 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent-30)] hover:bg-white/[0.04] hover:shadow-lg">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-8)] text-[var(--accent)] transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wide">{service.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{service.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-10 text-center">
            <Link href="/servicos" className="group inline-flex items-center gap-2 rounded-full border border-[var(--accent-25)] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)] transition-all duration-300 hover:bg-[var(--accent)] hover:text-white hover:shadow-lg">
              Ver todos os serviços <ArrowRight size={14} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FLEET ── */}
      <section className="relative overflow-hidden section-gradient px-5 py-20 md:py-28 lg:px-8">
        <div className="absolute -right-40 top-10 h-[30rem] w-[30rem] rounded-full bg-[var(--accent-6)] blur-[150px]" />
        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Frota</span>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">Veículos selecionados para um padrão superior.</h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">Frota executiva para diferentes perfis de atendimento, do transfer aeroportuário à mobilidade corporativa.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {fleet.map((car) => (
                <span key={car} className="rounded-full border border-[var(--accent-15)] bg-[var(--accent-8)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent)]">{car}</span>
              ))}
            </div>
            <Link href="/frota" className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95">
              Conhecer frota <ArrowRight size={14} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-x-8 bottom-0 h-24 rounded-full bg-[var(--accent)]/15 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border-medium)]">
              <Image src="/fleet/corolla.jpg" alt="Toyota Corolla Alves Mobilidade" width={1200} height={750} className="w-full object-cover transition duration-700 hover:scale-105" />
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section className="section-blue px-5 py-20 md:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-16 max-w-xl text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Depoimentos</span>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">O que nossos clientes dizem.</h2>
          </div>
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
            {reviews.map((review) => (
              <div key={review.author} className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-7 transition-all duration-500 hover:border-[var(--accent-20)] hover:shadow-lg">
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={14} className="fill-[var(--accent)] text-[var(--accent)]" />
                  ))}
                </div>
                <p className="text-sm leading-7 text-zinc-300">&ldquo;{review.text}&rdquo;</p>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">{review.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden section-gradient px-5 py-20 md:py-28 lg:px-8">
        <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-6)] blur-[180px]" />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Pronto para começar?</span>
          <h2 className="mt-4 text-3xl font-black md:text-4xl">Solicite seu <span className="text-gradient-accent">atendimento executivo</span>.</h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-zinc-500">Fale conosco pelo WhatsApp e receba uma experiência de atendimento compatível com o padrão premium da Alves.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/solicitar-atendimento" className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95"
              style={{ boxShadow: "0 18px 50px rgba(var(--accent-rgb),0.2)" }}>
              Solicitar orçamento <ArrowRight size={16} className="transition group-hover:translate-x-1" />
            </Link>
            <Link href="/servicos" className="group inline-flex items-center gap-2 rounded-full border border-[var(--accent-25)] px-7 py-4 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)] transition-all duration-300 hover:bg-[var(--accent)] hover:text-white hover:shadow-lg">
              Conhecer serviços <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
