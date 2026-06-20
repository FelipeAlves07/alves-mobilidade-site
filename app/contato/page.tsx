import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone, Clock } from "lucide-react";

const cards = [
  {
    icon: Phone,
    title: "WhatsApp",
    text: "(31) 99845-8084",
  },
  {
    icon: Mail,
    title: "E-mail",
    text: "contato@alvesmobilidade.com.br",
  },
  {
    icon: MapPin,
    title: "Região",
    text: "Belo Horizonte e Região Metropolitana",
  },
  {
    icon: Clock,
    title: "Atendimento",
    text: "Empresas e particulares",
  },
];

export default function ContatoPage() {
  return (
    <main className="bg-[#151515] text-[#f5e6c8]">
      {/* HERO */}

      <section className="relative h-[560px] overflow-hidden pt-28 md:h-[720px]">
        <Image
          src="/images/contato-bh.jpg"
          alt="Contato Alves"
          fill
          priority
          className="object-cover object-center opacity-65"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#111111]/65 via-[#111111]/30 to-transparent" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(214,168,95,.25),transparent_35%)]" />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 lg:px-8">
          <div className="max-w-4xl">
            <span className="text-xs font-black uppercase tracking-[0.28em] text-[#d6a85f]">
              Contato
            </span>

            <h1 className="mt-6 text-5xl font-black leading-tight md:text-7xl">
              Fale com a Alves Mobilidade Executiva.
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-zinc-300 md:text-xl">
              Nossa equipe está preparada para oferecer um atendimento rápido,
              personalizado e com o padrão de excelência que você merece.
            </p>
          </div>
        </div>
      </section>

      {/* CARDS */}

      <section className="px-5 py-20 md:py-28 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="
                rounded-[2rem]
                border
                border-[#d6a85f]/10
                bg-[#1e1e1e]
                p-8
                transition
                duration-300
                hover:border-[#d6a85f]/40
                hover:shadow-[0_0_40px_rgba(214,168,95,0.12)]
                "
              >
                <div
                  className="
                  mb-6
                  inline-flex
                  rounded-2xl
                  bg-[#d6a85f]/10
                  p-4
                  text-[#f1d28b]
                  "
                >
                  <Icon size={28} />
                </div>

                <h2 className="text-2xl font-black text-[#f5e6c8]">
                  {card.title}
                </h2>

                <p className="mt-4 text-zinc-400">
                  {card.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA */}

        <div className="mx-auto mt-16 max-w-4xl text-center">
          <h2 className="text-4xl font-black md:text-6xl">
            Pronto para uma experiência premium em mobilidade?
          </h2>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-zinc-400">
            Solicite seu orçamento agora mesmo e descubra um novo padrão de
            conforto, segurança e sofisticação em transporte executivo.
          </p>

          <Link
            href="https://wa.me/5531998458084"
            target="_blank"
            className="
            mt-10
            inline-flex
            rounded-full
            bg-gradient-to-r
            from-[#f1d28b]
            to-[#b8863b]
            px-10
            py-5
            text-sm
            font-black
            uppercase
            tracking-widest
            text-black
            transition
            hover:scale-105
            "
          >
            Solicitar Orçamento
          </Link>
        </div>
      </section>
    </main>
  );
}