import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Briefcase,
  Users,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

const solutions = [
  {
    icon: Briefcase,
    title: "Executivos & Diretoria",
    description:
      "Atendimento premium para deslocamentos executivos e compromissos estratégicos.",
  },
  {
    icon: Users,
    title: "Visitas Corporativas",
    description:
      "Recepção e transporte profissional para clientes e parceiros.",
  },
  {
    icon: Building2,
    title: "Demandas Empresariais",
    description:
      "Mobilidade estruturada para empresas com padrão premium.",
  },
];

const benefits = [
  "Pontualidade",
  "Discrição",
  "Segurança",
  "Atendimento premium",
];

export default function CorporativoPage() {
  return (
    <main className="bg-slate-50 text-slate-900">
      <section className="relative h-[520px] md:h-[700px] overflow-hidden">
        <Image
          src="/images/corporativo.jpg"
          alt="Corporativo"
          fill
          priority
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-slate-950/60" />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur md:text-sm">
              Atendimento Corporativo
            </div>

            <h1 className="text-4xl font-bold leading-tight text-white md:text-7xl">
              Mobilidade corporativa premium.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 md:mt-8 md:text-xl md:leading-9">
              Soluções executivas para empresas exigentes.
            </p>

            <Link
              href="/solicitar-atendimento"
              className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:scale-105 md:rounded-2xl md:px-8 md:py-4 md:text-lg"
            >
              Solicitar Atendimento
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {solutions.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-3xl bg-white p-7 shadow-xl"
                >
                  <div className="mb-5 inline-flex rounded-2xl bg-slate-950 p-4 text-white">
                    <Icon size={22} />
                  </div>

                  <h3 className="text-2xl font-bold">{item.title}</h3>

                  <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            {benefits.map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <CheckCircle2 className="text-[#d6a85f]" size={20} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}