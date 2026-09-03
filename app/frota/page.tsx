import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const fleet = [
  { name: "Toyota Corolla", category: "Sedan Executivo Premium", image: "/fleet/corolla.jpg" },
  { name: "BYD King", category: "Sedan Executivo Premium", image: "/fleet/byd-king.jpg" },
  { name: "Volkswagen Nivus", category: "SUV Coupé Executivo", image: "/fleet/nivus.jpg" },
  { name: "Volkswagen T-Cross", category: "SUV Executivo", image: "/fleet/tcross.jpg" },
  { name: "Chevrolet Tracker", category: "SUV Executivo", image: "/fleet/tracker.jpg" },
  { name: "Chevrolet Onix Plus", category: "Sedan Executivo", image: "/fleet/onix-plus.jpg" },
];

const perks = ["Conforto premium", "Ar-condicionado", "Atendimento executivo"];

export default function FrotaPage() {
  return (
    <main className="bg-[var(--bg-primary)] text-[var(--foreground)]">
      <section className="relative flex min-h-[500px] items-center overflow-hidden pt-28 md:min-h-[600px]">
        <Image src="/images/fleet-hero.jpg" alt="Frota Alves" fill priority className="object-cover object-center opacity-100 dark:opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-transparent dark:from-[var(--bg-primary)]/85 dark:via-[var(--bg-primary)]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(var(--accent-rgb),0.12),transparent_50%)]" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Frota executiva</span>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl lg:text-6xl">Veículos selecionados para conforto, elegância e segurança.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400 md:text-base md:leading-8">Modelos preparados para diferentes perfis de atendimento executivo.</p>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {fleet.map((car) => (
              <article key={car.name} className="group overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] transition-all duration-500 hover:-translate-y-1 hover:border-[var(--accent-25)] hover:shadow-xl">
                <div className="relative h-56 overflow-hidden">
                  <Image src={car.image} alt={car.name} fill className="object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)]/90 via-transparent to-transparent" />
                </div>
                <div className="p-6">
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gradient-accent">{car.category}</span>
                  <h2 className="mt-2 text-xl font-black">{car.name}</h2>
                  <div className="mt-4 space-y-2 text-sm text-zinc-400">
                    {perks.map((p) => (
                      <p key={p} className="flex items-center gap-2.5">
                        <CheckCircle2 className="shrink-0 text-[var(--accent)]" size={14} />
                        {p}
                      </p>
                    ))}
                  </div>
                  <Link href="/solicitar-atendimento" className="group/link mt-5 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent)] transition-all duration-300 hover:text-white">
                    Solicitar veículo <ArrowRight size={13} className="transition group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
