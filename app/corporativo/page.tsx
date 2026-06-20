import Image from "next/image";
import Link from "next/link";
import {
  Briefcase,
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const solutions = [
  {
    icon: Briefcase,
    title: "Executivos & Diretoria",
    description:
      "Atendimento premium para deslocamentos executivos e compromissos estratégicos.",
    image: "/cards/card_executivos_diretoria.png",
  },

  {
    icon: Users,
    title: "Visitas Corporativas",
    description:
      "Recepção e transporte profissional para clientes, parceiros e equipes.",
    image: "/cards/card_visitas_corporativas.png",
  },

  {
    icon: Building2,
    title: "Demandas Empresariais",
    description:
      "Mobilidade estruturada para empresas com padrão sofisticado.",
    image: "/cards/card_demandas_empresariais.png",
  },

  {
    icon: ShieldCheck,
    title: "Confiança",
    description:
      "Discrição, segurança e planejamento em cada trajeto corporativo.",
    image: "/cards/card_confianca_seguranca.png",
  },
];

export default function CorporativoPage() {
  return (
    <main className="bg-[#111111] text-white">

      <section className="relative h-[560px] overflow-hidden pt-28 md:h-[720px]">

        <Image
          src="/images/corporativo.jpg"
          alt="Corporativo Alves"
          fill
          priority
          className="object-cover object-center opacity-65"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#111111]/65 via-[#111111]/30 to-transparent" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(214,168,95,.28),transparent_35%)]" />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 lg:px-8">

          <div className="max-w-4xl">

            <span className="text-xs font-black uppercase tracking-[0.28em] text-[#d6a85f]">
              Corporativo
            </span>

            <h1 className="mt-6 text-5xl font-black leading-tight md:text-7xl">
              Mobilidade corporativa com padrão executivo.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300 md:text-xl">
              Soluções para empresas que precisam transmitir profissionalismo
              em cada deslocamento.
            </p>

            <Link
              href="/solicitar-atendimento"
              className="
              mt-8
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

        </div>

      </section>


      <section className="px-5 py-20 md:py-28 lg:px-8">

        <div className="mx-auto grid max-w-7xl gap-7 md:grid-cols-2 xl:grid-cols-4">

          {solutions.map((item) => {

            const Icon = item.icon;

            return (

              <div
                key={item.title}
                className="
                overflow-hidden
                rounded-[2rem]
                border
                border-[#d6a85f]/15
                bg-[#1e1e1e]
                transition
                duration-300
                hover:-translate-y-2
                hover:border-[#d6a85f]/60
                hover:shadow-[0_0_45px_rgba(214,168,95,0.12)]
                "
              >

                <div className="relative h-56 overflow-hidden">

                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="
                    object-cover
                    transition
                    duration-700
                    hover:scale-110
                    "
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/35 to-transparent" />

                </div>

                <div className="p-8">

                  <div className="mb-6 inline-flex rounded-2xl bg-[#d6a85f]/10 p-4 text-[#f1d28b]">

                    <Icon size={28} />

                  </div>

                  <h2 className="text-2xl font-black">

                    {item.title}

                  </h2>

                  <p className="mt-5 leading-8 text-zinc-400">

                    {item.description}

                  </p>

                </div>

              </div>

            );

          })}

        </div>


        <div className="mx-auto mt-14 grid max-w-7xl gap-4 md:grid-cols-4">

          {[
            "Pontualidade",
            "Discrição",
            "Segurança",
            "Atendimento premium",
          ].map((item) => (

            <div
              key={item}
              className="
              flex
              items-center
              gap-3
              rounded-2xl
              border
              border-[#d6a85f]/15
              bg-white/[0.035]
              p-5
              "
            >

              <CheckCircle2
                className="text-[#d6a85f]"
                size={20}
              />

              <span>{item}</span>

            </div>

          ))}

        </div>

      </section>

    </main>
  );
}