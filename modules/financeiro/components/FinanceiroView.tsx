"use client";

import { BarChart3, DollarSign, Plane } from "lucide-react";
import VoiceInput from "@/components/admin/VoiceInput";
import Panel from "@/components/admin/Panel";
import Metric from "@/components/admin/Metric";
import type { FinanceEntry } from "@/domain/finance/types";
import type { DashboardStats } from "@/domain/shared/types";
import type { Trip } from "@/domain/trip/types";

interface FinanceiroViewProps {
  stats: DashboardStats;
  trips: Trip[];
  financeForm: Omit<FinanceEntry, "id">;
  finance: FinanceEntry[];
  onSetFinanceForm: (form: Omit<FinanceEntry, "id">) => void;
  onAddFinance: () => void;
}

export default function FinanceiroView({ stats, trips, financeForm, finance, onSetFinanceForm, onAddFinance }: FinanceiroViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-3">
        <Metric title="Saldo previsto" value={`R$ ${stats.revenueFinance.toLocaleString("pt-BR")}`} icon={DollarSign} />
        <Metric title="Viagens" value={String(trips.length)} icon={Plane} />
        <Metric title="Conversão" value={`${stats.conversion}%`} icon={BarChart3} />
      </div>
      <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6">
        <h3 className="text-xl font-black">Lançamento financeiro</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-5">
          <VoiceInput value={financeForm.description} onValue={(value) => onSetFinanceForm({ ...financeForm, description: value })} placeholder="Descrição" className="md:col-span-2" />
          <input type="number" value={financeForm.value} onChange={(e) => onSetFinanceForm({ ...financeForm, value: Number(e.target.value) })} placeholder="Valor" className="input-admin" />
          <select value={financeForm.type} onChange={(e) => onSetFinanceForm({ ...financeForm, type: e.target.value as FinanceEntry["type"] })} className="input-admin"><option>Entrada</option><option>Saída</option></select>
          <button onClick={onAddFinance} className="rounded-xl bg-[var(--secondary)] px-5 py-4 font-bold text-white transition hover:opacity-90">Adicionar</button>
        </div>
      </div>
      <Panel title="Histórico financeiro"><div className="grid gap-3">{finance.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-4"><div><strong>{item.description}</strong><p className="text-sm text-zinc-400">{item.date} • {item.type}</p></div><strong className={item.type === "Entrada" ? "text-emerald-300" : "text-red-300"}>{item.type === "Entrada" ? "+" : "-"} R$ {item.value}</strong></div>)}</div></Panel>
    </div>
  );
}
