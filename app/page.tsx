"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, Building2, Car, CheckCircle2, Plane, ShieldCheck, Clock, Armchair, Headset, Sparkles, Star } from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";

const whatsappLink = "https://wa.me/5531998458084?text=Ol%C3%A1!%20Tenho%20interesse%20nos%20servi%C3%A7os%20da%20Alves%20Mobilidade%20Executiva%20e%20gostaria%20de%20receber%20um%20atendimento%20personalizado.";

const services = [
  { icon: Plane, title: "Aeroportos", description: "Confins e Pampulha com pontualidade, conforto e discrição." },
  { icon: Briefcase, title: "Empresas", description: "Atendimento corporativo para executivos, clientes e equipes." },
  { icon: Building2, title: "Eventos", description: "Mobilidade elegante para eventos sociais e empresariais." },
  { icon: Car, title: "Viagens", description: "Deslocamentos agendados com segurança e padrão premium." },
];

const features = [
  { icon: ShieldCheck, title: "Segurança", text: "Planejamento, atenção e tranquilidade em cada deslocamento." },
  { icon: Clock, title: "Pontualidade", text: "Horários tratados com seriedade e organização." },
  { icon: Armchair, title: "Conforto", text: "Veículos selecionados para uma experiência superior." },
  { icon: Headset, title: "Atendimento", text: "Contato direto, ágil e personalizado." },
];

const fleet = ["Corolla", "BYD King", "Nivus", "T-Cross", "Tracker", "Onix Plus"];

const stats = [
  { value: "100+", label: "Clientes atendidos" },
  { value: "4.9", label: "Avaliação média" },
  { value: "6", label: "Veículos na frota" },
  { value: "BH", label: "Região de atuação" },
];

const reviews = [
  { text: "Excelente atendimento, motorista muito pontual e veículo impecável.", author: "Carlos M.", stars: 5 },
  { text: "Transporte corporativo de alto nível. Recomendo para empresas.", author: "Ana L.", stars: 5 },
  { text: "Conforto e segurança do início ao fim. Virou padrão na empresa.", author: "Ricardo S.", stars: 5 },
];

function track(location: string) {
  sendGAEvent("event", "solicitar_atendimento_click", { location });
}

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[var(--bg-primary)] text-[var(--foreground)]">

      {/* ── HERO ── */}
      <section className="relative min-h-screen overflow-hidden">
        <Image src="/images/hero-byd.jpg" alt="Alves Mobilidade Executiva" fill priority className="object-cover object-center opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)]/80 via-[var(--bg-primary)]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(var(--accent-rgb),0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_80%,rgba(var(--accent-rgb),0.06),transparent_40%)]" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-5 pt-32 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-[var(--accent-20)] bg-white/[0.04] px-5 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)] backdrop-blur-md animate-fadeIn">
              <Sparkles size={13} /> Mobilidade Executiva Premium
            </div>
            <h1 className="text-5xl font-black uppercase leading-[0.9] tracking-tight md:text-7xl lg:text-8xl animate-enter-up">
              <span className="text-white">ALVES</span>
              <span className="block text-gradient-accent mt-1">MOBILIDADE</span>
              <span className="block text-white mt-1">EXECUTIVA</span>
            </h1>
            <div className="mt-8 h-px w-24 bg-gradient-to-r from-[var(--accent)] to-transparent" />
            <p className="mt-8 max-w-2xl text-base leading-8 text-zinc-400 md:text-lg md:leading-9 animate-enter-up animate-delay-2">Transporte executivo com conforto, segurança e sofisticação para aeroportos, empresas, eventos, viagens e deslocamentos agendados em Belo Horizonte.</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row animate-enter-up animate-delay-3">
              <Link href="/solicitar-atendimento" onClick={() => track("hero")} className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95"
                style={{ boxShadow: "0 18px 50px rgba(var(--accent-rgb),0.2)" }}>
                Solicitar orçamento <ArrowRight size={17} className="transition group-hover:translate-x-1" />
              </Link>
              <a href={whatsappLink} target="_blank" className="inline-flex items-center justify-center rounded-full border border-[var(--border-medium)] bg-white/[0.03] px-8 py-4 text-sm font-bold uppercase tracking-wide text-zinc-300 backdrop-blur transition-all duration-300 hover:border-[var(--accent-35)] hover:bg-white/[0.06] hover:text-white">Falar no WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative z-20 -mt-24 px-5 pb-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-elevated)]/80 backdrop-blur-xl">
            <div className="grid grid-cols-2 md:grid-cols-4">
              {stats.map((item, i) => (
                <div key={item.label} className={`flex flex-col items-center justify-center py-8 text-center animate-enter-up animate-delay-${i + 1} ${i < 2 ? 'border-b md:border-b-0' : ''} ${i % 2 === 0 ? '' : ''} ${i !== stats.length - 1 ? 'md:border-r' : ''} border-[var(--border-subtle)]`}>
                  <span className="text-3xl font-black text-gradient-accent md:text-4xl">{item.value}</span>
                  <span className="mt-1.5 text-[11px] uppercase tracking-[0.15em] text-zinc-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="section-gradient px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Diferenciais</span>
            <h2 className="mt-4 text-4xl font-black md:text-5xl">Por que escolher a Alves.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-4">
            {features.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={`group rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-7 transition-all duration-500 hover:-translate-y-1 hover:border-[var(--accent-25)] hover:shadow-xl animate-enter-up animate-delay-${i + 1}`}>
                  <div className="mb-5 inline-flex rounded-xl bg-[var(--accent-8)] p-3.5 text-[var(--accent)] transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="servicos" className="section-blue px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-14 lg:grid-cols-[0.8fr_1.3fr] lg:items-center">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Serviços</span>
              <h2 className="mt-4 text-4xl font-black md:text-5xl">Soluções premium para cada necessidade.</h2>
              <p className="mt-5 max-w-md text-base leading-8 text-zinc-400">Atendimento executivo planejado para entregar pontualidade, conforto e percepção de valor em cada trajeto.</p>
              <Link href="/servicos" className="group mt-7 inline-flex items-center gap-2 rounded-full border border-[var(--accent-25)] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)] transition-all duration-300 hover:bg-[var(--accent)] hover:text-white hover:shadow-lg">
                Ver todos os serviços <ArrowRight size={15} className="transition group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {services.map((service, i) => {
                const Icon = service.icon;
                return (
                  <div key={service.title} className={`group rounded-2xl border border-[var(--border-light)] bg-white/[0.02] p-7 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent-30)] hover:bg-white/[0.04] hover:shadow-lg animate-enter-up animate-delay-${i + 1}`}>
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-8)] text-[var(--accent)] transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white">
                      <Icon size={24} />
                    </div>
                    <h3 className="text-lg font-bold uppercase tracking-wide">{service.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-zinc-400">{service.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── FLEET ── */}
      <section className="relative overflow-hidden section-gradient px-5 py-24 lg:px-8">
        <div className="absolute -right-40 top-10 h-[30rem] w-[30rem] rounded-full bg-[var(--accent-8)] blur-[150px]" />
        <div className="absolute -left-40 bottom-10 h-[20rem] w-[20rem] rounded-full bg-[var(--secondary-10)] blur-[120px]" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Frota</span>
            <h2 className="mt-4 text-4xl font-black md:text-5xl">Veículos selecionados para um padrão superior.</h2>
            <p className="mt-5 max-w-lg text-base leading-8 text-zinc-400">Frota executiva para diferentes perfis de atendimento, do transfer aeroportuário à mobilidade corporativa.</p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {fleet.map((car) => (
                <span key={car} className="rounded-full border border-[var(--accent-15)] bg-[var(--accent-8)] px-4 py-2 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white">{car}</span>
              ))}
            </div>
            <Link href="/frota" className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95">
              Conhecer frota <ArrowRight size={15} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-x-8 bottom-0 h-28 rounded-full bg-[var(--accent)]/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border-medium)]">
              <Image src="/fleet/corolla.jpg" alt="Toyota Corolla Alves Mobilidade" width={1200} height={750} className="w-full object-cover transition duration-700 hover:scale-105" />
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section className="section-blue px-5 py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Depoimentos</span>
            <h2 className="mt-4 text-4xl font-black md:text-5xl">O que nossos clientes dizem.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {reviews.map((review, i) => (
              <div key={review.author} className={`rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-8 transition-all duration-500 hover:-translate-y-1 hover:border-[var(--accent-20)] hover:shadow-lg animate-enter-up animate-delay-${i + 1}`}>
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: review.stars }).map((_, s) => (
                    <Star key={s} size={16} className="fill-[var(--accent)] text-[var(--accent)]" />
                  ))}
                </div>
                <p className="text-sm leading-7 text-zinc-300 italic">&ldquo;{review.text}&rdquo;</p>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">{review.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden section-gradient px-5 py-24 lg:px-8">
        <div className="absolute left-1/2 top-1/2 h-[35rem] w-[35rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent-6)] blur-[180px]" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Pronto para começar?</span>
          <h2 className="mt-4 text-4xl font-black md:text-5xl">Solicite seu <span className="text-gradient-accent">atendimento executivo</span>.</h2>
          <p className="mx-auto mt-5 max-w-lg text-base leading-8 text-zinc-400">Fale conosco pelo WhatsApp e receba uma experiência de atendimento compatível com o padrão premium da Alves.</p>
          <Link href="/solicitar-atendimento" className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-9 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95"
            style={{ boxShadow: "0 18px 50px rgba(var(--accent-rgb),0.2)" }}>
            Solicitar orçamento <ArrowRight size={17} className="transition group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

    </main>
  );
}
