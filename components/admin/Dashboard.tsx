"use client";

export default function Dashboard() {
  return (
    <div className="space-y-6">

      <div className="grid gap-5 lg:grid-cols-4">

        <div className="premium-card rounded-3xl p-6">
          <p className="text-zinc-400">Viagens Hoje</p>
          <h2 className="mt-3 text-4xl font-black text-[#f1d28b]">
            0
          </h2>
        </div>

        <div className="premium-card rounded-3xl p-6">
          <p className="text-zinc-400">Orçamentos</p>
          <h2 className="mt-3 text-4xl font-black text-[#f1d28b]">
            0
          </h2>
        </div>

        <div className="premium-card rounded-3xl p-6">
          <p className="text-zinc-400">Clientes</p>
          <h2 className="mt-3 text-4xl font-black text-[#f1d28b]">
            0
          </h2>
        </div>

        <div className="premium-card rounded-3xl p-6">
          <p className="text-zinc-400">Faturamento</p>
          <h2 className="mt-3 text-4xl font-black text-[#f1d28b]">
            R$ 0
          </h2>
        </div>

      </div>

    </div>
  );
}