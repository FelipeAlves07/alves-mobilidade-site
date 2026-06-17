import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Clock3,
  Star,
  Building2,
} from "lucide-react";

const values = [
  {
    icon: Clock3,
    title: "Pontualidade",
    description: "Compromisso absoluto com sua agenda.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança",
    description: "Discrição, profissionalismo e confiança.",
  },
  {
    icon: Star,
    title: "Excelência",
    description: "Experiência premium em cada atendimento.",
  },
  {
    icon: Building2,
    title: "Flexibilidade",
    description: "Empresas e clientes particulares.",
  },
];

export default function QuemSomosPage() {
  return (
    <main className="bg-[#f7f4ef] text-zinc-950">
      <section className="relative h-[240px] md:h-[520px] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/images/frota-premium.jpg"
            alt="Quem Somos"
            fill
            priority
            className="object-contain md:object-cover"
          />
          <div className="absolute inset-0 bg-[#050505]/72" />
        </div>

        <div className="relative mx-auto flex h-full max-w-7xl items-center px-4 lg:px-8">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-bold leading-tight text-white md:text-7xl">
              Excelência em mobilidade executiva.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-200 md:text-xl md:leading-9">
              Atendimento premium para empresas e clientes particulares.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold leading-tight md:text-5xl">
                Atendimento executivo com padrão premium.
              </h2>

              <p className="mt-5 text-sm leading-7 text-zinc-600 md:text-lg md:leading-8">
                Desde 2022 oferecendo mobilidade executiva com conforto,
                segurança e excelência para empresas, executivos e clientes particulares.
              </p>

              <p className="mt-5 text-sm leading-7 text-zinc-600 md:text-lg md:leading-8">
                Atuamos em Belo Horizonte e região metropolitana com foco em
                experiência premium.
              </p>

              <Link
                href="/solicitar-atendimento"
                className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white md:mt-10 md:rounded-2xl md:px-8 md:py-4 md:text-lg"
              >
                Solicitar Atendimento
              </Link>
            </div>

            <div className="overflow-hidden rounded-3xl shadow-2xl">
              <Image
                src="/images/cliente-vip.jpg"
                alt="Cliente Premium"
                width={1200}
                height={800}
                className="w-full object-contain md:object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 md:py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {values.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-3xl bg-[#f7f4ef] p-6 shadow-lg md:p-8"
                >
                  <div className="mb-5 inline-flex rounded-xl bg-[#050505] p-3 text-[#d6a85f] md:rounded-2xl md:p-4">
                    <Icon size={22} />
                  </div>

                  <h3 className="text-xl font-bold md:text-2xl">
                    {item.title}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-zinc-600 md:text-base">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}