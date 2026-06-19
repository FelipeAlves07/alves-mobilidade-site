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

export default function FrotaPage() {
  return (
    <main className="bg-[#050505] text-white">
      <section className="relative h-[560px] overflow-hidden pt-28 md:h-[720px]">
        <Image src="/images/fleet-hero.jpg" alt="Frota Alves" fill priority className="object-cover object-center opacity-65" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/82 to-black/25" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(214,168,95,.28),transparent_35%)]" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 lg:px-8">
          <div className="max-w-4xl"><span className="text-xs font-black uppercase tracking-[0.28em] text-[#d6a85f]">Frota executiva</span><h1 className="mt-6 text-5xl font-black leading-tight md:text-7xl">Veículos selecionados para conforto, elegância e segurança.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 md:text-xl">Modelos preparados para diferentes perfis de atendimento executivo.</p></div>
        </div>
      </section>
      <section className="px-5 py-20 md:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-2 xl:grid-cols-3">
          {fleet.map((car) => <article key={car.name} className="group overflow-hidden rounded-[2rem] border border-[#d6a85f]/15 bg-white/[0.035] transition hover:-translate-y-2 hover:border-[#d6a85f]/60"><div className="relative h-64 overflow-hidden"><Image src={car.image} alt={car.name} fill className="object-cover transition duration-700 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"/></div><div className="p-7"><span className="text-xs font-black uppercase tracking-[0.22em] text-[#d6a85f]">{car.category}</span><h2 className="mt-3 text-3xl font-black">{car.name}</h2><div className="mt-6 space-y-3 text-sm text-zinc-300"><p className="flex gap-3"><CheckCircle2 className="text-[#d6a85f]" size={18}/>Conforto premium</p><p className="flex gap-3"><CheckCircle2 className="text-[#d6a85f]" size={18}/>Ar-condicionado</p><p className="flex gap-3"><CheckCircle2 className="text-[#d6a85f]" size={18}/>Atendimento executivo</p></div><Link href="/solicitar-atendimento" className="mt-7 inline-flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#f1d28b]">Solicitar veículo <ArrowRight size={16}/></Link></div></article>)}
        </div>
      </section>
    </main>
  );
}
