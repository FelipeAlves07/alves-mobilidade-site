"use client";

import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import type { Motorista, MotoristaForm, MotoristaStatus } from "@/domain/motorista/types";

const statuses: MotoristaStatus[] = ["Ativo", "Inativo", "Ferias"];

interface Props {
  motoristas: Motorista[];
  onAdd: (form: MotoristaForm) => void;
  onUpdate: (id: string, patch: Partial<MotoristaForm>) => void;
  onDelete: (id: string) => void;
}

export default function MotoristasView({ motoristas, onAdd, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<MotoristaForm>({ name: "", phone: "", cnh: "", cpf: "", status: "Ativo" });

  const filtered = motoristas.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase()) ||
    m.phone.includes(query)
  );

  function handleAdd() {
    if (!form.name.trim() || !form.phone.trim()) return;
    onAdd(form);
    setForm({ name: "", phone: "", cnh: "", cpf: "", status: "Ativo" });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6">
        <h3 className="text-xl font-black">Novo motorista</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" className="input-admin" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telefone / WhatsApp" className="input-admin" />
          <input value={form.cnh} onChange={(e) => setForm({ ...form, cnh: e.target.value })} placeholder="CNH" className="input-admin" />
          <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="CPF" className="input-admin" />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MotoristaStatus })} className="input-admin">
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button onClick={handleAdd} className="rounded-xl bg-[var(--secondary)] px-5 py-4 font-bold text-white transition hover:opacity-90"><Plus size={18} className="inline" /> Adicionar</button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 text-xl font-black">Motoristas cadastrados</h3>
        <div className="relative mb-4">
          <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar motorista..." className="input-admin w-full pl-10" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                <th className="pb-3 pr-4">Nome</th>
                <th className="pb-3 pr-4">Telefone</th>
                <th className="pb-3 pr-4">CNH</th>
                <th className="pb-3 pr-4">CPF</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-white/5">
                  <td className="py-3 pr-4">{m.name}</td>
                  <td className="py-3 pr-4">{m.phone}</td>
                  <td className="py-3 pr-4">{m.cnh || "—"}</td>
                  <td className="py-3 pr-4">{m.cpf || "—"}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={m.status}
                      onChange={(e) => onUpdate(m.id, { status: e.target.value as MotoristaStatus })}
                      className="rounded-lg border border-white/10 bg-transparent px-2 py-1 text-xs"
                    >
                      {statuses.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="py-3">
                    <button onClick={() => onDelete(m.id)} className="text-red-400 transition hover:text-red-300"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-zinc-500">Nenhum motorista encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
