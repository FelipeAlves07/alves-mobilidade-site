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
      <section className="relative flex min-h-[500px] items-center overflow-hidden pt-28 md:min-h-[600px]">
        <Image src="/images/contato-bh.jpg" alt="Contato Alves" fill priority className="object-cover object-center opacity-100 dark:opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-transparent dark:from-[var(--bg-primary)]/85 dark:via-[var(--bg-primary)]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-transparent dark:from-[var(--bg-primary)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(var(--accent-rgb),0.12),transparent_50%)] dark:block hidden" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Contato</span>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl lg:text-6xl">Fale com a Alves Mobilidade Executiva.</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400 md:text-base md:leading-8">Nossa equipe está preparada para oferecer um atendimento rápido, personalizado e com o padrão de excelência que você merece.</p>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:py-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="group text-center rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent-25)] hover:shadow-lg">
                  <div className="mb-4 inline-flex rounded-xl bg-[var(--accent-8)] p-3.5 text-[var(--accent)] transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white">
                    <Icon size={22} />
                  </div>
                  <h2 className="text-base font-bold">{card.title}</h2>
                  <p className="mt-1.5 text-sm text-zinc-400">{card.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mx-auto mt-20 max-w-2xl text-center">
            <h2 className="text-3xl font-black md:text-4xl">Pronto para uma experiência <span className="text-gradient-accent">premium</span>?</h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-zinc-500">Solicite seu orçamento agora mesmo e descubra um novo padrão em transporte executivo.</p>
            <Link href="https://wa.me/5531998458084" target="_blank" className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-8 py-4 text-sm font-bold uppercase tracking-wide text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-95">
              Solicitar Orçamento <ArrowRight size={16} className="transition group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
