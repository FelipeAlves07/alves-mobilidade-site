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
    image: "/cards/transfer_aeroporto.png",
  },
  {
    icon: Briefcase,
    title: "Transporte Corporativo",
    text: "Mobilidade para executivos, diretoria, clientes, equipes e demandas empresariais.",
    image: "/cards/transporte_corporativo.png",
  },
  {
    icon: Heart,
    title: "Casamentos",
    text: "Transporte elegante para noivos, familiares e convidados em ocasiões especiais.",
    image: "/cards/casamentos.png",
  },
  {
    icon: PartyPopper,
    title: "Eventos",
    text: "Soluções de mobilidade para eventos sociais, corporativos e recepções premium.",
    image: "/cards/eventos.png",
  },
  {
    icon: MapPinned,
    title: "Viagens",
    text: "Viagens intermunicipais com segurança, conforto e planejamento.",
    image: "/cards/viagens.png",
  },
  {
    icon: CalendarClock,
    title: "Corridas Agendadas",
    text: "Deslocamentos programados com flexibilidade e atendimento personalizado.",
    image: "/cards/corridas_agendadas.png",
  },
];

export default function ServicosPage() {
  return (
    <main className="bg-[var(--bg-primary)] text-[var(--foreground)]">
      <section className="relative h-[60vh] min-h-[500px] overflow-hidden md:h-[70vh]">
        <Image src="/images/servicos-premium.jpg" alt="Serviços Alves Mobilidade" fill priority className="object-cover object-center opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)]/80 via-[var(--bg-primary)]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(var(--accent-rgb),0.12),transparent_50%)]" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 pt-28 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Serviços Premium</span>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">Mobilidade executiva para todos os momentos.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400 md:text-lg">Soluções planejadas para empresas, aeroportos, eventos, casamentos, viagens e corridas agendadas.</p>
          </div>
        </div>
      </section>
      <section className="px-5 py-20 md:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service, i) => {
            const Icon = service.icon;
            return (
              <div key={service.title} className={`group overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--accent-25)] hover:shadow-xl animate-enter-up animate-delay-${i + 1}`}>
                <div className="relative h-52 overflow-hidden">
                  <Image src={service.image} alt={service.title} fill className="object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
                </div>
                <div className="p-7">
                  <div className="mb-5 inline-flex rounded-xl bg-[var(--accent-8)] p-3.5 text-[var(--accent)] transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white">
                    <Icon size={24} />
                  </div>
                  <h2 className="text-xl font-bold">{service.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">{service.text}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mx-auto mt-14 max-w-7xl">
          <Link href="/solicitar-atendimento" className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95">
            Solicitar atendimento <ArrowRight size={15} className="transition group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </main>
  );
}
