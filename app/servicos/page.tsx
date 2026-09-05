import Image from "next/image";
import Link from "next/link";
import { Plane, Briefcase, Heart, PartyPopper, MapPinned, CalendarClock, ArrowRight, CheckCircle2 } from "lucide-react";

const services = [
  {
    icon: Plane,
    title: "Transfer Aeroporto",
    text: "Traslados para Confins e Pampulha com pontualidade, conforto e acompanhamento profissional.",
    image: "/cards/transfer_aeroporto.png",
    perks: ["Monitoramento de voo", "Veículo executivo", "Motorista profissional"],
  },
  {
    icon: Briefcase,
    title: "Transporte Corporativo",
    text: "Mobilidade para executivos, diretoria, clientes, equipes e demandas empresariais.",
    image: "/cards/transporte_corporativo.png",
    perks: ["Atendimento corporativo", "Discrição profissional", "Faturamento mensal"],
  },
  {
    icon: Heart,
    title: "Casamentos",
    text: "Transporte elegante para noivos, familiares e convidados em ocasiões especiais.",
    image: "/cards/casamentos.png",
    perks: ["Veículos premium", "Pontualidade absoluta", "Atendimento personalizado"],
  },
  {
    icon: PartyPopper,
    title: "Eventos",
    text: "Soluções de mobilidade para eventos sociais, corporativos e recepções premium.",
    image: "/cards/eventos.png",
    perks: ["Frota dedicada", "Coordenação de horários", "Atendimento VIP"],
  },
  {
    icon: MapPinned,
    title: "Viagens",
    text: "Viagens intermunicipais com segurança, conforto e planejamento.",
    image: "/cards/viagens.png",
    perks: ["Conforto em longos trajetos", "Planejamento de rota", "Paradas programadas"],
  },
  {
    icon: CalendarClock,
    title: "Corridas Agendadas",
    text: "Deslocamentos programados com flexibilidade e atendimento personalizado.",
    image: "/cards/corridas_agendadas.png",
    perks: ["Agendamento flexível", "Preço fixo", "Atendimento exclusivo"],
  },
];

export default function ServicosPage() {
  return (
    <main className="bg-[var(--bg-primary)] text-[var(--foreground)]">
      <section className="relative flex min-h-[500px] items-center overflow-hidden pt-40 md:min-h-[600px]">
        <Image src="/images/servicos-premium.jpg" alt="Serviços Alves Mobilidade" fill priority className="object-cover object-center opacity-100 dark:opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(var(--accent-rgb),0.12),transparent_50%)] dark:block hidden" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Serviços Premium</span>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl lg:text-6xl">
              <span className="text-white">Mobilidade executiva para todos os momentos.</span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400 md:text-base md:leading-8">Soluções planejadas para empresas, aeroportos, eventos, casamentos, viagens e corridas agendadas.</p>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <article key={service.title} className="group overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--accent-25)] hover:shadow-xl">
                  <div className="relative h-48 overflow-hidden">
                    <Image src={service.image} alt={service.title} fill className="object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-transparent dark:from-[var(--bg-primary)]" />
                  </div>
                  <div className="p-6">
                    <div className="mb-4 inline-flex rounded-xl bg-[var(--accent-8)] p-3 text-[var(--accent)] transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white">
                      <Icon size={20} />
                    </div>
                    <h2 className="text-lg font-bold">{service.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{service.text}</p>
                    <div className="mt-4 space-y-1.5">
                      {service.perks.map((p) => (
                        <p key={p} className="flex items-center gap-2 text-xs text-zinc-500">
                          <CheckCircle2 className="shrink-0 text-[var(--accent)]" size={12} />
                          {p}
                        </p>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/solicitar-atendimento" className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95">
              Solicitar atendimento <ArrowRight size={14} className="transition group-hover:translate-x-1" />
            </Link>
            <Link href="/frota" className="group inline-flex items-center gap-2 rounded-full border border-[var(--accent-25)] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--accent)] transition-all duration-300 hover:bg-[var(--accent)] hover:text-white hover:shadow-lg">
              Conhecer frota <ArrowRight size={14} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
