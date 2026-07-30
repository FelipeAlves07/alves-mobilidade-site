"use client";

import { useState } from "react";
import { Download, Plus, Search, Trash2 } from "lucide-react";
import type { Veiculo, VeiculoForm, VeiculoStatus } from "@/domain/veiculo/types";
import { downloadCSV } from "@/lib/csv";

const statuses: VeiculoStatus[] = ["Ativo", "Inativo", "Manutencao"];

interface Props {
  veiculos: Veiculo[];
  onAdd: (form: VeiculoForm) => void;
  onUpdate: (id: string, patch: Partial<VeiculoForm>) => void;
  onDelete: (id: string) => void;
}

export default function VeiculosView({ veiculos, onAdd, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<VeiculoForm>({ model: "", plate: "", year: "", color: "", status: "Ativo" });

  const filtered = veiculos.filter((v) =>
    v.model.toLowerCase().includes(query.toLowerCase()) ||
    v.plate.toLowerCase().includes(query.toLowerCase())
  );

  function handleAdd() {
    if (!form.model.trim() || !form.plate.trim()) return;
    onAdd(form);
    setForm({ model: "", plate: "", year: "", color: "", status: "Ativo" });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6">
        <h3 className="text-xl font-black">Novo veículo</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Modelo (ex: Toyota Corolla)" className="input-admin" />
          <input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} placeholder="Placa" className="input-admin" />
          <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="Ano" className="input-admin" />
          <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Cor" className="input-admin" />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as VeiculoStatus })} className="input-admin">
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={handleAdd} className="rounded-xl bg-[var(--secondary)] px-5 py-4 font-bold text-white transition hover:opacity-90"><Plus size={18} className="inline" /> Adicionar</button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-xl font-black">Veículos cadastrados</h3>
          <button onClick={() => downloadCSV(veiculos, "veiculos-export.csv")} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-400 transition hover:text-white"><Download size={13} className="inline" /> CSV</button>
        </div>
        <div className="relative mb-4">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar veículo..." className="input-admin w-full pl-10" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                <th className="pb-3 pr-4">Modelo</th>
                <th className="pb-3 pr-4">Placa</th>
                <th className="pb-3 pr-4">Ano</th>
                <th className="pb-3 pr-4">Cor</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="border-b border-white/5">
                  <td className="py-3 pr-4">{v.model}</td>
                  <td className="py-3 pr-4">{v.plate}</td>
                  <td className="py-3 pr-4">{v.year || "—"}</td>
                  <td className="py-3 pr-4">{v.color || "—"}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={v.status}
                      onChange={(e) => onUpdate(v.id, { status: e.target.value as VeiculoStatus })}
                      className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-xs"
                    >
                      {statuses.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="py-3">
                    <button onClick={() => onDelete(v.id)} className="text-red-400 transition hover:text-red-300"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-zinc-500">Nenhum veículo encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
