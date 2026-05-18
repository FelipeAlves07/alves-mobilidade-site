import Image from "next/image";

const whatsappLink = "https://wa.me/5531998458084";

export default function ContatoPage() {
  return (
    <main className="bg-slate-50 text-slate-900">
      <section className="relative h-[520px] md:h-[700px] overflow-hidden">
        <Image
          src="/images/contato-bh.jpg"
          alt="Contato Alves"
          fill
          priority
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-slate-950/60" />

        <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-5 lg:px-8">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur md:text-sm">
              Contato
            </div>

            <h1 className="text-4xl font-bold leading-tight text-white md:text-7xl">
              Fale com a Alves Mobilidade Executiva.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 md:mt-8 md:text-xl md:leading-9">
              Atendimento para empresas e clientes particulares.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl bg-white p-7 shadow-xl">
              <h3 className="text-2xl font-bold">WhatsApp</h3>
              <p className="mt-4 text-slate-600">(31) 99845-8084</p>
            </div>

            <div className="rounded-3xl bg-white p-7 shadow-xl">
              <h3 className="text-2xl font-bold">E-mail</h3>
              <p className="mt-4 text-slate-600">
                contato@alvesmobilidade.com.br
              </p>
            </div>

            <div className="rounded-3xl bg-white p-7 shadow-xl">
              <h3 className="text-2xl font-bold">Região</h3>
              <p className="mt-4 text-slate-600">
                Belo Horizonte e Região Metropolitana
              </p>
            </div>

            <div className="rounded-3xl bg-white p-7 shadow-xl">
              <h3 className="text-2xl font-bold">Atendimento</h3>
              <p className="mt-4 text-slate-600">Empresas e particulares</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <a
              href={whatsappLink}
              target="_blank"
              className="inline-flex rounded-xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:scale-105 md:rounded-2xl md:px-8 md:py-4 md:text-base"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}