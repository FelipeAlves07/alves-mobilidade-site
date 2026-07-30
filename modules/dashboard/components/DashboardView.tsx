"use client";

import { CheckCircle2, ClipboardList, DollarSign, Gift, Users } from "lucide-react";
import WhatsAppIcon from "@/components/admin/WhatsAppIcon";
import Panel from "@/components/admin/Panel";
import Metric from "@/components/admin/Metric";
import ActionCard from "@/components/admin/ActionCard";
import TripList from "@/components/admin/TripList";
import AISuggestions from "@/components/admin/AISuggestions";
import { addDaysISO } from "@/lib/format";
import type { Lead } from "@/domain/lead/types";
import type { Trip } from "@/domain/trip/types";
import type { FinanceEntry } from "@/domain/finance/types";
import type { DashboardStats } from "@/domain/shared/types";
import type { MessageKey } from "@/domain/marketing/types";

interface DashboardViewProps {
  stats: DashboardStats;
  leads: Lead[];
  finance: FinanceEntry[];
  today: string;
  currentTask: Lead | undefined;
  selectedMessage: MessageKey;
  onCompleteAction: (lead: Lead) => void;
  onSendLeadMessage: (lead: Lead, key: MessageKey) => void;
  onFinishTrip: (trip: Trip) => void;
  onUpdateLead: (id: string, patch: Partial<Lead>) => void;
}

function LeadStatusChart({ leads }: { leads: Lead[] }) {
  const counts: Record<string, number> = {};
  for (const l of leads) { counts[l.status] = (counts[l.status] || 0) + 1; }
  const items = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...items.map(([, c]) => c), 1);
  const colors = ["from-cyan-400 to-blue-500", "from-emerald-400 to-green-500", "from-amber-400 to-orange-500", "from-rose-400 to-pink-500", "from-violet-400 to-purple-500", "from-sky-400 to-indigo-500"];
  return (
    <div className="flex flex-col gap-2">
      {items.map(([status, count], i) => (
        <div key={status} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-xs text-zinc-400">{status}</span>
          <div className="h-5 flex-1 overflow-hidden rounded-full bg-[#222]">
            <div className={`h-full rounded-full bg-gradient-to-r ${colors[i % colors.length]} transition-all`} style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <span className="w-8 text-right text-xs font-bold text-zinc-300">{count}</span>
        </div>
      ))}
    </div>
  );
}

function FinanceChart({ finance }: { finance: FinanceEntry[] }) {
  const months: Record<string, { entradas: number; saidas: number }> = {};
  for (const f of finance) {
    const key = f.date.slice(0, 7);
    if (!months[key]) months[key] = { entradas: 0, saidas: 0 };
    if (f.type === "Entrada") months[key].entradas += Number(f.value);
    else months[key].saidas += Number(f.value);
  }
  const items = Object.entries(months).sort(([a], [b]) => a.localeCompare(b));
  const maxVal = Math.max(...items.flatMap(([, v]) => [v.entradas, v.saidas]), 1);
  return (
    <div className="flex items-end gap-3" style={{ height: 120 }}>
      {items.map(([month, vals]) => (
        <div key={month} className="flex flex-1 flex-col items-center justify-end gap-0.5">
          <div className="w-full flex flex-col items-center justify-end" style={{ height: 100 }}>
            <div className="w-4 rounded-t-sm bg-emerald-400 transition-all" style={{ height: `${(vals.entradas / maxVal) * 100}%` }} />
            <div className="w-4 rounded-b-sm bg-red-400 transition-all" style={{ height: `${(vals.saidas / maxVal) * 100}%` }} />
          </div>
          <span className="text-[9px] text-zinc-500">{month.slice(5)}</span>
        </div>
      ))}
      {!items.length && <p className="w-full text-center text-xs text-zinc-500">Nenhum lançamento</p>}
    </div>
  );
}

export default function DashboardView({
  stats, leads, finance, today, currentTask, selectedMessage,
  onCompleteAction, onSendLeadMessage, onFinishTrip, onUpdateLead,
}: DashboardViewProps) {
  const progress = Math.min(100, Math.round(((leads.length - stats.pending.length) / Math.max(leads.length, 1)) * 100));

  const heroContent = (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--accent)]">Bom dia, Felipe</p>
      <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Hoje faça exatamente isso:</h2>
      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-[#262626] shadow-inner">
        <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-sm text-zinc-500">Seu dia está <span className="font-bold text-zinc-300">{progress}%</span> encaminhado.</p>
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {stats.pending.slice(0, 6).map((lead) => (
          <ActionCard key={lead.id} title={lead.name} text={lead.nextAction} onDone={() => onCompleteAction(lead)} onSend={() => onSendLeadMessage(lead, selectedMessage)} />
        ))}
        {stats.pending.length === 0 && (
          <div className="col-span-full rounded-xl border border-emerald-500/10 bg-emerald-500/5 px-5 py-6 text-center">
            <p className="text-sm font-medium text-emerald-400">Nenhum follow-up pendente. Dia excelente!</p>
          </div>
        )}
      </div>
    </>
  );

  const nextActionBlock = currentTask && (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-[var(--accent-15)] bg-gradient-to-br from-[#1d1d1d] to-[#101010] p-6 text-center md:p-8"
        style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--accent)]">Próxima ação</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{currentTask.name}</h2>
        <p className="mt-3 text-base text-zinc-400 md:text-lg">{currentTask.nextAction}</p>
        <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
          <button onClick={() => onSendLeadMessage(currentTask, selectedMessage)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.97]"><WhatsAppIcon className="h-[18px] w-[18px]" /> Abrir WhatsApp</button>
          <button onClick={() => onCompleteAction(currentTask)} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--secondary)] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[var(--accent)] active:scale-[0.97]"><CheckCircle2 size={18} /> Concluir</button>
          <button onClick={() => onUpdateLead(currentTask.id, { nextDate: addDaysISO(1) })} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--accent-20)] px-6 py-3.5 text-sm font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)] active:scale-[0.97]">Amanhã</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--accent-10)] bg-gradient-to-br from-[#191919] to-[#101010] p-6 md:p-8"
        style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.22)" }}
      >
        {heroContent}
      </div>
      {nextActionBlock}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Clientes" value={String(leads.length)} icon={Users} />
        <Metric title="Follow-ups hoje" value={String(stats.pending.length)} icon={ClipboardList} />
        <Metric title="Transfers acumulados" value={String(stats.credits)} icon={Gift} />
        <Metric title="Faturamento previsto" value={`R$ ${stats.revenueTrips.toLocaleString("pt-BR")}`} icon={DollarSign} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Status dos leads"><LeadStatusChart leads={leads} /></Panel>
        <Panel title="Financeiro mensal"><FinanceChart finance={finance} /></Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Próximas viagens de hoje"><TripList trips={stats.todayTrips} onFinish={onFinishTrip} /></Panel>
        <Panel title="Inteligência rápida"><AISuggestions pending={stats.pending.length} trips={stats.todayTrips.length} credits={stats.credits} /></Panel>
      </div>
    </div>
  );
}
