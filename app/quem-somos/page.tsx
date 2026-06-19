import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Clock3, Star, Building2 } from "lucide-react";

const values = [
  { icon: Clock3, title: "Pontualidade", description: "Compromisso absoluto com sua agenda." },
  { icon: ShieldCheck, title: "Segurança", description: "Discrição, profissionalismo e confiança." },
  { icon: Star, title: "Excelência", description: "Experiência premium em cada atendimento." },
  { icon: Building2, title: "Flexibilidade", description: "Empresas e clientes particulares." },
];

export default function QuemSomosPage() {
  return (
    <main className="bg-[#050505] text-white">
      <section className="relative h-[560px] overflow-hidden pt-28 md:h-[720px]"><Image src="/images/frota-premium.jpg" alt="Quem Somos" fill priority className="object-cover object-center opacity-65" /><div className="absolute inset-0 bg-gradient-to-r from-black via-black/82 to-black/25"/><div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(214,168,95,.28),transparent_35%)]"/><div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 lg:px-8"><div className="max-w-4xl"><span className="text-xs font-black uppercase tracking-[0.28em] text-[#d6a85f]">Quem somos</span><h1 className="mt-6 text-5xl font-black leading-tight md:text-7xl">Excelência em mobilidade executiva.</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 md:text-xl">Atendimento premium para empresas e clientes particulares.</p></div></div></section>
      <section className="px-5 py-20 md:py-28 lg:px-8"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center"><div><h2 className="text-4xl font-black leading-tight md:text-6xl">Atendimento executivo com padrão premium.</h2><p className="mt-6 text-lg leading-9 text-zinc-400">Desde 2022 oferecendo mobilidade executiva com conforto, segurança e excelência para empresas, executivos e clientes particulares em Belo Horizonte e região metropolitana.</p><Link href="/solicitar-atendimento" className="mt-9 inline-flex rounded-full bg-gradient-to-r from-[#f1d28b] to-[#b8863b] px-8 py-4 text-sm font-black uppercase tracking-wide text-black">Solicitar atendimento</Link></div><div className="overflow-hidden rounded-[2rem] border border-[#d6a85f]/15"><Image src="/images/cliente-vip.jpg" alt="Cliente Premium" width={1200} height={800} className="w-full object-cover" /></div></div></section>
      <section className="bg-[#0a0a0a] px-5 py-20 md:py-28 lg:px-8"><div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-4">{values.map((item)=>{const Icon=item.icon; return <div key={item.title} className="premium-card rounded-[2rem] p-8"><div className="mb-6 inline-flex rounded-2xl bg-[#d6a85f]/10 p-4 text-[#f1d28b]"><Icon size={26}/></div><h3 className="text-2xl font-black">{item.title}</h3><p className="mt-4 leading-8 text-zinc-400">{item.description}</p></div>})}</div></section>
    </main>
  );
}
