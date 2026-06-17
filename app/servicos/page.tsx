import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Plane,
  Briefcase,
  Car,
} from "lucide-react";

const services = [
  {
    icon: Building2,
    title: "Mobilidade Corporativa",
    description:
      "Atendimento executivo para empresas, diretoria e compromissos estratégicos.",
  },
  {
    icon: Plane,
    title: "Transfer Aeroportuário",
    description:
      "Confins, Pampulha, hotéis e deslocamentos premium.",
  },
  {
    icon: Briefcase,
    title: "Eventos",
    description:
      "Congressos, convenções, recepções VIP e eventos empresariais.",
  },
  {
    icon: Car,
    title: "Atendimento Particular",
    description:
      "Clientes particulares com padrão premium e conforto executivo.",
  },
];

export default function ServicosPage() {
  return (
    <main className="bg-[#f7f4ef] text-zinc-950">
      <section className="relative h-[520px] md:h-[700px] overflow-hidden">
        <Image
          src="/images/servicos-premium.jpg"
          alt="Serviços Alves"
          fill
          priority
          className="object-cover object-center sepia-[10%] saturate-[.85]"
        />

        <div className="absolute inset-0 bg-[#050505]/68" />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex rounded-full border border-[#d6a85f]/35 bg-black/25 px-4 py-2 text-xs font-medium text-white backdrop-blur md:text-sm">
              Serviços Premium
            </div>

            <h1 className="text-4xl font-bold leading-tight text-white md:text-7xl">
              Soluções premium para empresas e clientes particulares.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-200 md:mt-8 md:text-xl md:leading-9">
              Atendimento executivo completo com conforto, segurança e excelência.
            </p>

            <Link
              href="/solicitar-atendimento"
              className="mt-8 inline-flex rounded-xl bg-gradient-to-r from-[#d6a85f] to-[#b8863b] px-6 py-3 text-sm font-bold text-white transition hover:scale-105 md:rounded-2xl md:px-8 md:py-4 md:text-lg"
            >
              Solicitar Atendimento
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold md:text-5xl">
              Nossos Serviços
            </h2>

            <p className="mt-4 text-base text-zinc-600 md:text-lg">
              Soluções executivas para diferentes necessidades.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <div
                  key={service.title}
                  className="rounded-3xl bg-white p-7 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl md:p-10"
                >
                  <div className="mb-5 inline-flex rounded-2xl bg-[#050505] p-4 text-[#d6a85f]">
                    <Icon size={22} />
                  </div>

                  <h2 className="text-2xl font-bold md:text-3xl">
                    {service.title}
                  </h2>

                  <p className="mt-5 text-sm leading-7 text-zinc-600 md:text-lg md:leading-8">
                    {service.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-[#050505] to-[#2a1b08] px-6 py-10 text-center text-white shadow-2xl md:px-10 md:py-16">
          <h2 className="text-3xl font-bold md:text-5xl">
            Solicite seu atendimento.
          </h2>

          <p className="mt-4 text-base text-zinc-200 md:mt-6 md:text-xl">
            Empresas e clientes particulares.
          </p>

          <Link
            href="/solicitar-atendimento"
            className="mt-8 inline-flex rounded-xl bg-gradient-to-r from-[#d6a85f] to-[#b8863b] px-6 py-3 text-sm font-bold text-white transition hover:scale-105 md:rounded-2xl md:px-8 md:py-4 md:text-lg"
          >
            Solicitar Atendimento
          </Link>
        </div>
      </section>
    </main>
  );
}