import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail, MapPin, Phone, Clock } from "lucide-react";

const cards = [
  { icon: Phone, title: "WhatsApp", text: "(31) 99845-8084" },
  { icon: Mail, title: "E-mail", text: "contato@alvesmobilidade.com.br" },
  { icon: MapPin, title: "Região", text: "Belo Horizonte e Região Metropolitana" },
  { icon: Clock, title: "Atendimento", text: "Empresas e particulares" },
];

export default function ContatoPage() {
  return (
    <main className="bg-[var(--bg-primary)] text-[var(--foreground)]">
      <section className="relative h-[60vh] min-h-[500px] overflow-hidden md:h-[70vh]">
        <Image src="/images/contato-bh.jpg" alt="Contato Alves" fill priority className="object-cover object-center opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)]/80 via-[var(--bg-primary)]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(var(--accent-rgb),0.12),transparent_50%)]" />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 pt-28 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Contato</span>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">Fale com a Alves Mobilidade Executiva.</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-400 md:text-lg">Nossa equipe está preparada para oferecer um atendimento rápido, personalizado e com o padrão de excelência que você merece.</p>
          </div>
        </div>
      </section>
      <section className="px-5 py-20 md:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className={`group rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent-25)] hover:shadow-lg animate-enter-up animate-delay-${i + 1}`}>
                <div className="mb-5 inline-flex rounded-xl bg-[var(--accent-8)] p-3.5 text-[var(--accent)] transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white">
                  <Icon size={24} />
                </div>
                <h2 className="text-lg font-bold">{card.title}</h2>
                <p className="mt-2 text-sm text-zinc-400">{card.text}</p>
              </div>
            );
          })}
        </div>
        <div className="mx-auto mt-16 max-w-3xl text-center">
          <h2 className="text-4xl font-black md:text-5xl">Pronto para uma experiência premium em <span className="text-gradient-accent">mobilidade</span>?</h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-zinc-400">Solicite seu orçamento agora mesmo e descubra um novo padrão em transporte executivo.</p>
          <Link href="https://wa.me/5531998458084" target="_blank" className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-9 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95">
            Solicitar Orçamento <ArrowRight size={16} className="transition group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </main>
  );
}
