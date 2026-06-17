import Image from "next/image";
import Link from "next/link";
import { Car } from "lucide-react";

const fleet = [
  {
    name: "Toyota Corolla",
    category: "Executive Premium",
    image: "/fleet/corolla.jpg",
  },
  {
    name: "BYD King",
    category: "Executive Premium",
    image: "/fleet/byd-king.jpg",
  },
  {
    name: "Volkswagen Nivus",
    category: "Executive",
    image: "/fleet/nivus.jpg",
  },
  {
    name: "Volkswagen T-Cross",
    category: "Executive",
    image: "/fleet/tcross.jpg",
  },
  {
    name: "Chevrolet Tracker",
    category: "Executive",
    image: "/fleet/tracker.jpg",
  },
  {
    name: "Chevrolet Onix Plus",
    category: "Executive",
    image: "/fleet/onix-plus.jpg",
  },
];

export default function FrotaPage() {
  return (
    <main className="bg-[#f7f4ef] text-zinc-950">
      <section className="relative h-[520px] md:h-[700px] overflow-hidden">
        <Image
          src="/images/fleet-hero.jpg"
          alt="Frota Alves"
          fill
          priority
          className="object-cover object-center sepia-[10%] saturate-[.85]"
        />

        <div className="absolute inset-0 bg-[#050505]/68" />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex rounded-full border border-[#d6a85f]/35 bg-black/25 px-4 py-2 text-xs font-medium text-white backdrop-blur md:text-sm">
              Frota Executiva Premium
            </div>

            <h1 className="text-4xl font-bold leading-tight text-white md:text-7xl">
              Veículos selecionados para conforto, elegância e segurança.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-200 md:mt-8 md:text-xl md:leading-9">
              Nossa frota foi escolhida para oferecer padrão executivo premium.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold md:text-5xl">Nossa Frota</h2>

            <p className="mt-4 text-base text-zinc-600 md:text-lg">
              Modelos cuidadosamente escolhidos para diferentes perfis.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {fleet.map((car) => (
              <div
                key={car.name}
                className="overflow-hidden rounded-3xl bg-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="relative h-56">
                  <Image
                    src={car.image}
                    alt={car.name}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="p-6">
                  <div className="mb-4 inline-flex rounded-2xl bg-[#050505] p-3 text-[#d6a85f]">
                    <Car size={20} />
                  </div>

                  <h3 className="text-2xl font-bold">{car.name}</h3>

                  <p className="mt-3 text-sm text-zinc-600 md:text-base">
                    {car.category}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/solicitar-atendimento"
              className="inline-flex rounded-xl bg-[#050505] px-6 py-3 text-sm font-semibold text-white transition hover:scale-105 md:rounded-2xl md:px-8 md:py-4 md:text-base"
            >
              Solicitar Atendimento
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}