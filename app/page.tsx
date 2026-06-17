"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Car,
  CheckCircle2,
  Plane,
} from "lucide-react";
import { sendGAEvent } from "@next/third-parties/google";

const whatsappLink =
  "https://wa.me/5531998458084?text=Ol%C3%A1!%20Tenho%20interesse%20nos%20servi%C3%A7os%20da%20Alves%20Mobilidade%20Executiva%20e%20gostaria%20de%20receber%20um%20atendimento%20personalizado.";

const services = [
  {
    icon: Plane,
    title: "Aeroportos",
    description: "Traslados executivos com pontualidade, conforto e segurança.",
  },
  {
    icon: Briefcase,
    title: "Empresas",
    description: "Atendimento corporativo para executivos, clientes e equipes.",
  },
  {
    icon: Building2,
    title: "Casamentos e eventos",
    description: "Elegância e discrição para ocasiões especiais.",
  },
  {
    icon: Car,
    title: "Corridas agendadas",
    description: "Planeje seus deslocamentos com tranquilidade.",
  },
];

const highlights = [
  "Pontualidade",
  "Discrição",
  "Conforto premium",
  "Atendimento personalizado",
];

const fleetItems = [
  "Ar condicionado digital",
  "Bancos em couro",
  "Água mineral",
  "Espaço para bagagens",
  "Wi-Fi sob disponibilidade",
  "Vidros elétricos",
];

function trackSolicitarClick(location: string) {
  sendGAEvent("event", "solicitar_atendimento_click", { location });
}

function trackWhatsAppClick(location: string) {
  sendGAEvent("event", "whatsapp_click", { location });
}

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-white text-zinc-950">
      <section className="relative min-h-[760px] bg-[#050505] text-white md:min-h-[820px]">
        <Image
          src="/images/hero-byd.jpg"
          alt="Alves Mobilidade Executiva em Belo Horizonte"
          fill
          priority
          className="object-cover object-center opacity-80"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_38%,rgba(214,168,95,0.18),transparent_34%),linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.88)_38%,rgba(5,5,5,0.28)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#050505] to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[760px] max-w-7xl items-center px-5 pb-16 pt-28 md:min-h-[820px] lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d6a85f]/35 bg-black/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#d6a85f] backdrop-blur">
              <CheckCircle2 size={14} />
              Mobilidade Executiva Premium
            </div>

            <h1 className="text-5xl font-semibold uppercase leading-[0.96] tracking-tight text-white md:text-7xl lg:text-8xl">
              Alves
              <span className="block bg-gradient-to-r from-[#f1d28b] via-[#d6a85f] to-[#a8782e] bg-clip-text text-transparent">
                Mobilidade Executiva
              </span>
            </h1>

            <div className="mt-6 h-px w-24 bg-gradient-to-r from-[#d6a85f] to-transparent" />

            <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-200 md:text-xl">
              Transporte executivo com conforto, segurança e sofisticação para
              aeroportos, empresas, eventos, viagens e deslocamentos agendados.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/solicitar-atendimento"
                onClick={() => trackSolicitarClick("hero")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d6a85f] to-[#b8863b] px-7 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-[0_18px_50px_rgba(214,168,95,0.28)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(214,168,95,0.38)]"
              >
                Solicitar orçamento
                <ArrowRight size={18} />
              </Link>

              <a
                href={whatsappLink}
                target="_blank"
                onClick={() => trackWhatsAppClick("hero")}
                className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-black/25 px-7 py-4 text-sm font-bold uppercase tracking-wide text-white backdrop-blur transition hover:border-[#d6a85f] hover:text-[#f1d28b]"
              >
                Falar no WhatsApp
              </a>
            </div>

            <div className="mt-12 grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-4">
              {highlights.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 text-sm text-zinc-100 backdrop-blur"
                >
                  <CheckCircle2 className="mb-2 text-[#d6a85f]" size={18} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="servicos" className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.4fr] lg:items-end">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#b8863b]">
                Nossos serviços
              </span>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                Soluções completas para suas necessidades.
              </h2>
              <p className="mt-5 text-base leading-8 text-zinc-600">
                Uma experiência premium, objetiva e personalizada para cada tipo
                de deslocamento.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <div
                    key={service.title}
                    className="group rounded-3xl border border-[#d6a85f]/25 bg-white p-6 text-center shadow-[0_18px_55px_rgba(0,0,0,0.06)] transition hover:-translate-y-2 hover:border-[#d6a85f] hover:shadow-[0_24px_70px_rgba(0,0,0,0.12)]"
                  >
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff8ea] text-[#b8863b] transition group-hover:bg-[#d6a85f] group-hover:text-white">
                      <Icon size={27} />
                    </div>
                    <h3 className="text-base font-bold uppercase tracking-wide">
                      {service.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-zinc-600">
                      {service.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="frota" className="bg-[#f7f4ef] py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#b8863b]">
              Nossa frota
            </span>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Toyota Corolla
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-zinc-600 md:text-lg">
              Elegância, conforto e tecnologia para uma experiência executiva de
              alto padrão.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {fleetItems.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-zinc-700">
                  <CheckCircle2 className="shrink-0 text-[#b8863b]" size={18} />
                  {item}
                </div>
              ))}
            </div>

            <Link
              href="/frota"
              className="mt-9 inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-bold uppercase tracking-wide text-zinc-950 transition hover:border-[#d6a85f] hover:text-[#b8863b]"
            >
              Conhecer frota
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="relative">
            <div className="absolute inset-x-8 bottom-4 h-20 rounded-full bg-[#d6a85f]/25 blur-3xl" />
            <Image
              src="/fleet/corolla.jpg"
              alt="Toyota Corolla da Alves Mobilidade Executiva"
              width={1200}
              height={750}
              className="relative z-10 w-full rounded-[2rem] object-cover shadow-[0_30px_90px_rgba(0,0,0,0.18)]"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#050505] py-16 text-white md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Segurança",
                text: "Serviço planejado para oferecer tranquilidade do início ao fim.",
              },
              {
                title: "Atendimento premium",
                text: "Contato direto, cuidado nos detalhes e experiência personalizada.",
              },
              {
                title: "Belo Horizonte e região",
                text: "Traslados, eventos, empresas e viagens com padrão executivo.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-8"
              >
                <CheckCircle2 className="text-[#d6a85f]" size={30} />
                <h3 className="mt-6 text-2xl font-semibold">{item.title}</h3>
                <p className="mt-4 leading-7 text-zinc-400">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#d6a85f]/35 bg-[#050505] p-7 text-white shadow-[0_24px_90px_rgba(0,0,0,0.18)] md:p-12">
          <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-[#d6a85f]">
                Solicite seu orçamento
              </span>
              <h2 className="mt-4 text-3xl font-semibold md:text-5xl">
                Atendimento rápido e personalizado para você.
              </h2>
              <p className="mt-5 max-w-2xl leading-8 text-zinc-300">
                Fale com a Alves Mobilidade Executiva e receba uma proposta de
                acordo com o seu trajeto, data e necessidade.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={whatsappLink}
                target="_blank"
                onClick={() => trackWhatsAppClick("cta_final")}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#d6a85f] to-[#b8863b] px-7 py-4 text-sm font-bold uppercase tracking-wide text-white transition hover:-translate-y-1"
              >
                Chamar no WhatsApp
              </a>
              <Link
                href="/solicitar-atendimento"
                onClick={() => trackSolicitarClick("cta_final")}
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-7 py-4 text-sm font-bold uppercase tracking-wide text-white transition hover:border-[#d6a85f] hover:text-[#f1d28b]"
              >
                Solicitar atendimento
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
