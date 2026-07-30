"use client";

import { useState } from "react";
import { BarChart3, DollarSign, Download, Plane, Trash2 } from "lucide-react";
import VoiceInput from "@/components/admin/VoiceInput";
import Panel from "@/components/admin/Panel";
import Metric from "@/components/admin/Metric";
import type { FinanceEntry } from "@/domain/finance/types";
import type { DashboardStats } from "@/domain/shared/types";
import type { Trip } from "@/domain/trip/types";
import { downloadCSV } from "@/lib/csv";

interface FinanceiroViewProps {
  stats: DashboardStats;
  trips: Trip[];
  financeForm: Omit<FinanceEntry, "id">;
  finance: FinanceEntry[];
  today: string;
  onSetFinanceForm: (form: Omit<FinanceEntry, "id">) => void;
  onAddFinance: () => void;
  onDeleteFinance: (id: string) => void;
}

export default function FinanceiroView({ stats, trips, financeForm, finance, today, onSetFinanceForm, onAddFinance, onDeleteFinance }: FinanceiroViewProps) {
  const [monthFilter, setMonthFilter] = useState(today.slice(0, 7));

  const filtered = finance.filter((f) => f.date.startsWith(monthFilter));
  const entradas = filtered.filter((f) => f.type === "Entrada").reduce((s, f) => s + Number(f.value), 0);
  const saidas = filtered.filter((f) => f.type === "Saída").reduce((s, f) => s + Number(f.value), 0);
  const saldo = entradas - saidas;

  const months = [...new Set(finance.map((f) => f.date.slice(0, 7)))].sort().reverse();

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-4">
        <Metric title="Saldo previsto" value={`R$ ${stats.revenueFinance.toLocaleString("pt-BR")}`} icon={DollarSign} />
        <Metric title="Viagens" value={String(trips.length)} icon={Plane} />
        <Metric title="Conversão" value={`${stats.conversion}%`} icon={BarChart3} />
        <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Mês atual</p>
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-transparent px-2 py-1.5 text-sm">
            {months.length ? months.map((m) => <option key={m}>{m}</option>) : <option>{today.slice(0, 7)}</option>}
          </select>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Entradas</p>
            <p className="mt-1 text-lg font-black text-emerald-300">R$ {entradas.toLocaleString("pt-BR")}</p>
          </div>
          <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">Saídas</p>
            <p className="mt-1 text-lg font-black text-red-300">R$ {saidas.toLocaleString("pt-BR")}</p>
          </div>
          <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Saldo</p>
            <p className={`mt-1 text-lg font-black ${saldo >= 0 ? "text-emerald-300" : "text-red-300"}`}>R$ {saldo.toLocaleString("pt-BR")}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6">
        <h3 className="text-xl font-black">Lançamento financeiro</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-6">
          <VoiceInput value={financeForm.description} onValue={(value) => onSetFinanceForm({ ...financeForm, description: value })} placeholder="Descrição" className="md:col-span-2" />
          <input type="number" value={financeForm.value} onChange={(e) => onSetFinanceForm({ ...financeForm, value: Number(e.target.value) })} placeholder="Valor" className="input-admin" />
          <select value={financeForm.type} onChange={(e) => onSetFinanceForm({ ...financeForm, type: e.target.value as FinanceEntry["type"] })} className="input-admin"><option>Entrada</option><option>Saída</option></select>
          <input type="date" value={financeForm.date} onChange={(e) => onSetFinanceForm({ ...financeForm, date: e.target.value })} className="input-admin" />
          <button onClick={onAddFinance} className="rounded-xl bg-[var(--secondary)] px-5 py-4 font-bold text-white transition hover:opacity-90">Adicionar</button>
        </div>
      </div>
      <Panel title="Histórico financeiro" extra={<button onClick={() => downloadCSV(filtered, "financeiro-export.csv")} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-400 transition hover:text-white"><Download size={13} className="inline" /> CSV</button>}>
        <div className="grid gap-3">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-4">
              <div className="min-w-0 flex-1">
                <strong>{item.description}</strong>
                <p className="text-sm text-zinc-400">{item.date} • {item.type}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <strong className={item.type === "Entrada" ? "text-emerald-300" : "text-red-300"}>{item.type === "Entrada" ? "+" : "-"} R$ {Number(item.value).toLocaleString("pt-BR")}</strong>
                <button onClick={() => onDeleteFinance(item.id)} className="text-red-400 transition hover:text-red-300"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
          {!filtered.length && <p className="py-6 text-center text-sm text-zinc-500">Nenhum lançamento neste mês</p>}
        </div>
      </Panel>
    </div>
  );
}
