import Image from "next/image";
import Link from "next/link";
import {
  Plane,
  Briefcase,
  Heart,
  PartyPopper,
  MapPinned,
  CalendarClock,
  ArrowRight,
} from "lucide-react";

const services = [
  {
    icon: Plane,
    title: "Transfer Aeroporto",
    text: "Traslados para Confins e Pampulha com pontualidade, conforto e acompanhamento profissional.",
  },
  {
    icon: Briefcase,
    title: "Transporte Corporativo",
    text: "Mobilidade para executivos, diretoria, clientes, equipes e demandas empresariais.",
  },
  {
    icon: Heart,
    title: "Casamentos",
    text: "Transporte elegante para noivos, familiares e convidados em ocasiões especiais.",
  },
  {
    icon: PartyPopper,
    title: "Eventos",
    text: "Soluções de mobilidade para eventos sociais, corporativos e recepções premium.",
  },
  {
    icon: MapPinned,
    title: "Viagens",
    text: "Viagens intermunicipais com segurança, conforto e planejamento.",
  },
  {
    icon: CalendarClock,
    title: "Corridas Agendadas",
    text: "Deslocamentos programados com flexibilidade e atendimento personalizado.",
  },
];

export default function ServicosPage() {
  return (
    <main className="bg-[#050505] text-white">
      <section className="relative h-[560px] overflow-hidden pt-28 md:h-[720px]">
        <Image
          src="/images/servicos-premium.jpg"
          alt="Serviços Alves Mobilidade"
          fill
          priority
          className="object-cover object-center opacity-65"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(214,168,95,.28),transparent_35%)]" />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 lg:px-8">
          <div className="max-w-4xl">
            <span className="text-xs font-black uppercase tracking-[0.28em] text-[#d6a85f]">
              Serviços Premium
            </span>

            <h1 className="mt-6 text-5xl font-black leading-tight md:text-7xl">
              Mobilidade executiva para todos os momentos.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 md:text-xl">
              Soluções planejadas para empresas, aeroportos, eventos,
              casamentos, viagens e corridas agendadas.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;

            return (
              <div
                key={service.title}
                className="
                premium-card
                rounded-[2rem]
                p-8
                transition
                hover:-translate-y-2
                hover:border-[#d6a85f]/60
                "
              >
                <div
                  className="
                  mb-7
                  inline-flex
                  rounded-2xl
                  bg-[#d6a85f]/10
                  p-4
                  text-[#f1d28b]
                  "
                >
                  <Icon size={30} />
                </div>

                <h2 className="text-2xl font-black">
                  {service.title}
                </h2>

                <p className="mt-5 leading-8 text-zinc-400">
                  {service.text}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-16 max-w-7xl">
          <Link
            href="/solicitar-atendimento"
            className="
            inline-flex
            items-center
            gap-2
            rounded-full
            bg-gradient-to-r
            from-[#f1d28b]
            to-[#b8863b]
            px-8
            py-4
            text-sm
            font-black
            uppercase
            tracking-wide
            text-black
            "
          >
            Solicitar atendimento

            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}