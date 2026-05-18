"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Plane,
  Briefcase,
  Car,
  CheckCircle2,
} from "lucide-react";

const services = [
  {
    icon: Building2,
    title: "Corporativo",
    description: "Mobilidade premium para empresas e executivos.",
  },
  {
    icon: Plane,
    title: "Transfer",
    description: "Aeroportos, hotéis e deslocamentos executivos.",
  },
  {
    icon: Briefcase,
    title: "Eventos",
    description: "Atendimento profissional para compromissos especiais.",
  },
  {
    icon: Car,
    title: "Particular",
    description: "Clientes particulares com conforto premium.",
  },
];

const differentials = [
  "Pontualidade",
  "Segurança",
  "Discrição",
  "Atendimento premium",
];

export default function HomePage() {
  return (
    <main className="bg-slate-50 text-slate-900">
      <section className="relative h-[520px] md:h-[760px] overflow-hidden">
        <Image
          src="/images/hero-byd.jpg"
          alt="Alves Mobilidade Executiva"
          fill
          priority
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-slate-950/55" />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur md:text-sm">
              Mobilidade Executiva Premium • Belo Horizonte
            </div>

            <h1 className="text-4xl font-bold leading-tight text-white md:text-7xl">
              Mobilidade executiva para empresas e clientes particulares.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 md:mt-8 md:text-xl md:leading-9">
              Atendimento premium corporativo, transfer aeroportuário, eventos
              e deslocamentos particulares.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row md:mt-10">
              <Link
                href="/solicitar-atendimento"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:scale-105 md:rounded-2xl md:px-8 md:py-4 md:text-lg"
              >
                Solicitar Atendimento
                <ArrowRight size={18} />
              </Link>

              <a
                href="https://wa.me/5531998458084"
                target="_blank"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 md:rounded-2xl md:px-8 md:py-4 md:text-lg"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              {
                title: "Corporativo",
                desc: "Empresas e executivos",
              },
              {
                title: "Transfer",
                desc: "Aeroportos e hotéis",
              },
              {
                title: "Eventos",
                desc: "Compromissos especiais",
              },
              {
                title: "Particular",
                desc: "Clientes premium",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <h3 className="text-sm font-bold text-slate-900 md:text-base">
                  {item.title}
                </h3>

                <p className="mt-2 text-xs text-slate-500 md:text-sm">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 md:text-sm">
              Quem Somos
            </span>

            <h2 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              Atendimento executivo premium.
            </h2>

            <p className="mt-6 text-base leading-8 text-slate-600 md:text-lg">
              Empresas, executivos e clientes particulares com atendimento de
              alto padrão, conforto, segurança e excelência.
            </p>

            <Link
              href="/solicitar-atendimento"
              className="mt-8 inline-flex rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:scale-105 md:rounded-2xl md:px-8 md:py-4 md:text-base"
            >
              Solicitar Atendimento
            </Link>
          </div>

          <div className="overflow-hidden rounded-3xl shadow-2xl">
            <Image
              src="/images/frota-premium.jpg"
              alt="Frota Premium"
              width={1200}
              height={800}
              className="w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-slate-100 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold md:text-5xl">
              Nossos Serviços
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <div
                  key={service.title}
                  className="rounded-3xl bg-white p-7 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="mb-5 inline-flex rounded-2xl bg-slate-950 p-4 text-white">
                    <Icon size={22} />
                  </div>

                  <h3 className="text-2xl font-bold">{service.title}</h3>

                  <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
                    {service.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/solicitar-atendimento"
              className="inline-flex rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:scale-105 md:rounded-2xl md:px-8 md:py-4 md:text-base"
            >
              Solicitar Atendimento
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold md:text-5xl">
              Diferenciais
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {differentials.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <CheckCircle2 className="text-blue-300" size={20} />
                <span className="text-sm md:text-base">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}