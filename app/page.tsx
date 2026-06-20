"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, Building2, Car, CheckCircle2, Plane, ShieldCheck, Clock, Armchair, Headset } from "lucide-react";
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

function track(location: string) {
  sendGAEvent("event", "solicitar_atendimento_click", { location });
}

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[#121212] text-[#f8ead2]">
      <section className="relative min-h-screen overflow-hidden pt-32 md:pt-36">
        <Image src="/images/hero-byd.jpg" alt="Alves Mobilidade Executiva" fill priority className="object-cover object-center opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212]/50 via-transparent to-[#d6a85f]/08" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(214,168,95,0.10),transparent_50%)]" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl items-center px-5 lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d6a85f]/35 bg-black/35 px-4 py-2 text-xs font-black uppercase tracking-[0.26em] text-[#f1d28b] backdrop-blur">
              <CheckCircle2 size={14} /> Mobilidade Executiva Premium
            </div>
           <h1 className="text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
              <span className="text-white">
                ALVES
              </span>

              <span className="block text-[#d6a85f]">
                MOBILIDADE
              </span>

              <span className="block text-white">
                EXECUTIVA
              </span>
            </h1>
            <div className="mt-7 h-px w-28 bg-gradient-to-r from-[#f1d28b] to-transparent" />
            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-200 md:text-xl md:leading-10">Transporte executivo com conforto, segurança e sofisticação para aeroportos, empresas, eventos, viagens e deslocamentos agendados em Belo Horizonte.</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/solicitar-atendimento" onClick={() => track("hero")} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f1d28b] to-[#b8863b] px-8 py-4 text-sm font-black uppercase tracking-wide text-black shadow-[0_18px_55px_rgba(214,168,95,0.28)] transition hover:-translate-y-1">Solicitar orçamento <ArrowRight size={18} /></Link>
              <a href={whatsappLink} target="_blank" className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 py-4 text-sm font-black uppercase tracking-wide text-white backdrop-blur transition hover:border-[#d6a85f] hover:text-[#f1d28b]">Falar no WhatsApp</a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#181818] px-5 py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-4">
          {features.map((item) => { const Icon = item.icon; return (
            <div key={item.title} className="premium-card rounded-[2rem] p-7 transition hover:-translate-y-2 hover:border-[#d6a85f]/50">
              <div className="mb-6 inline-flex rounded-2xl bg-[#d6a85f]/10 p-4 text-[#f1d28b]"><Icon size={28} /></div>
              <h3 className="text-2xl font-black">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-zinc-400">{item.text}</p>
            </div>
          );})}
        </div>
      </section>

      <section id="servicos" className="bg-[#1f1f1f] px-5 py-20 md:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[.9fr_1.2fr] lg:items-end">
            <div><span className="text-xs font-black uppercase tracking-[0.28em] text-[#d6a85f]">Nossos serviços</span><h2 className="mt-5 text-4xl font-black tracking-tight md:text-6xl">Soluções premium para cada necessidade.</h2><p className="mt-6 max-w-xl text-base leading-8 text-zinc-400 md:text-lg">Atendimento executivo planejado para entregar pontualidade, conforto e percepção de valor.</p></div>
            <div className="grid gap-5 sm:grid-cols-2">
              {services.map((service) => { const Icon = service.icon; return (
                <div key={service.title} className="group rounded-[2rem] border border-[#d6a85f]/15 bg-white/[0.035] p-7 backdrop-blur transition hover:-translate-y-2 hover:border-[#d6a85f]/60">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d6a85f]/10 text-[#f1d28b] transition group-hover:bg-[#d6a85f] group-hover:text-black"><Icon size={27} /></div>
                  <h3 className="text-xl font-black uppercase tracking-wide">{service.title}</h3><p className="mt-4 text-sm leading-7 text-zinc-400">{service.description}</p>
                </div>
              );})}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#181818] px-5 py-20 md:py-28 lg:px-8">
        <div className="absolute right-[-18rem] top-10 h-[35rem] w-[35rem] rounded-full bg-[#d6a85f]/10 blur-[150px]" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div><span className="text-xs font-black uppercase tracking-[0.28em] text-[#d6a85f]">Nossa frota</span><h2 className="mt-5 text-4xl font-black md:text-6xl">Veículos selecionados para um padrão superior.</h2><p className="mt-6 max-w-xl text-lg leading-9 text-zinc-400">Frota executiva para diferentes perfis de atendimento, do transfer aeroportuário à mobilidade corporativa.</p><div className="mt-8 flex flex-wrap gap-3">{fleet.map((car) => <span key={car} className="rounded-full border border-[#d6a85f]/20 bg-[#d6a85f]/10 px-4 py-2 text-sm text-[#f1d28b]">{car}</span>)}</div><Link href="/frota" className="mt-9 inline-flex items-center gap-2 rounded-full border border-[#d6a85f]/40 px-7 py-4 text-sm font-black uppercase tracking-wide text-[#f1d28b] transition hover:bg-[#d6a85f] hover:text-black">Conhecer frota <ArrowRight size={17} /></Link></div>
          <div className="relative"><div className="absolute inset-x-8 bottom-2 h-24 rounded-full bg-[#d6a85f]/25 blur-3xl" /><Image src="/fleet/corolla.jpg" alt="Toyota Corolla Alves Mobilidade" width={1200} height={750} className="relative z-10 w-full rounded-[2.25rem] object-cover shadow-[0_35px_120px_rgba(0,0,0,.45)]" /></div>
        </div>
      </section>

      <section className="bg-[#1a1a1a] px-5 py-20 text-center md:py-28 lg:px-8">
        <div className="mx-auto max-w-4xl"><span className="text-xs font-black uppercase tracking-[0.28em] text-[#d6a85f]">Pronto para começar?</span><h2 className="mt-5 text-4xl font-black md:text-6xl">Solicite seu atendimento executivo.</h2><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">Fale conosco pelo WhatsApp e receba uma experiência de atendimento compatível com o padrão premium da Alves.</p><Link href="/solicitar-atendimento" className="mt-10 inline-flex rounded-full bg-gradient-to-r from-[#f1d28b] to-[#b8863b] px-8 py-4 text-sm font-black uppercase tracking-wide text-black">Solicitar orçamento</Link></div>
      </section>
    </main>
  );
}
