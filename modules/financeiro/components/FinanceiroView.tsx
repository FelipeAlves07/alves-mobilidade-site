"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight,
  DollarSign,
  Trash2,
  CalendarDays,
  X,
} from "lucide-react";
import VoiceInput from "@/components/admin/VoiceInput";
import Panel from "@/components/admin/Panel";
import Metric from "@/components/admin/Metric";
import type { FinanceEntry, FinanceCategory } from "@/domain/finance/types";
import type { Trip } from "@/domain/trip/types";
import {
  buildMonthHierarchy,
  getResumoMes,
  getResumoSemana,
  getResumoHoje,
  getAvailableMonths,
  getPrevistoTrips,
} from "@/modules/financeiro/services/finance-calculations";

const CATEGORY_LABELS: Record<string, string> = {
  ganhos_app: "Ganhos do App",
  ganhos_ame: "Ganhos AME",
  gastos_alimentacao: "Alimentação",
  gastos_combustivel: "Combustível",
  outros: "Outros",
};

const CATEGORY_COLORS: Record<string, string> = {
  ganhos_app: "bg-sky-500/15 text-sky-300",
  ganhos_ame: "bg-emerald-500/15 text-emerald-300",
  gastos_alimentacao: "bg-amber-500/15 text-amber-300",
  gastos_combustivel: "bg-orange-500/15 text-orange-300",
  outros: "bg-zinc-500/15 text-zinc-300",
};

type FinanceFilter = "todos" | "entradas" | "saidas" | "viagens" | "manuais";

interface FinanceiroViewProps {
  trips: Trip[];
  financeForm: Omit<FinanceEntry, "id">;
  finance: FinanceEntry[];
  today: string;
  onSetFinanceForm: (form: Omit<FinanceEntry, "id">) => void;
  onAddFinance: (form: Omit<FinanceEntry, "id">) => void;
  onDeleteFinance: (id: string) => void;
  onUpdateFinance?: (id: string, patch: Partial<FinanceEntry>) => void;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.outros;
}

function DaySection({ day, onDeleteFinance, onEditFinance }: { day: { date: string; label: string; totals: { entradas: number; saidas: number; resultado: number }; items: FinanceEntry[] }; onDeleteFinance: (id: string) => void; onEditFinance?: (item: FinanceEntry) => void }) {
  const [expanded, setExpanded] = useState(true);

  if (day.items.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--accent-8)] bg-[var(--bg-surface)] overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full flex-col gap-2 p-3 text-left sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`cursor-pointer transition-transform ${expanded ? "" : "rotate-270"}`}>
            <ChevronRight size={16} className="text-zinc-400" />
          </span>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[var(--accent-15)] text-[var(--accent)] flex items-center justify-center text-sm font-bold">{day.label.split("/")[0]}</span>
            <div>
              <p className="text-sm font-bold">{day.label}</p>
              <p className="text-xs text-zinc-500">{day.items.length} item{day.items.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right sm:flex sm:items-center sm:gap-4">
          <span className="whitespace-nowrap text-xs font-bold text-emerald-300 sm:text-sm">+ {day.totals.entradas.toLocaleString("pt-BR")}</span>
          <span className="whitespace-nowrap text-xs font-bold text-red-300 sm:text-sm">- {day.totals.saidas.toLocaleString("pt-BR")}</span>
          <span className={`whitespace-nowrap text-xs font-bold sm:text-sm ${day.totals.resultado >= 0 ? "text-emerald-300" : "text-red-300"}`}>{day.totals.resultado >= 0 ? "+" : ""}{day.totals.resultado.toLocaleString("pt-BR")}</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[var(--accent-8)] divide-y divide-[var(--accent-8)]">
          {day.items.map((item) => (
            <DayItem key={item.id} item={item} onDelete={onDeleteFinance} onEdit={onEditFinance} />
          ))}
        </div>
      )}
    </div>
  );
}

function DayItem({ item, onDelete, onEdit }: { item: FinanceEntry; onDelete: (id: string) => void; onEdit?: (item: FinanceEntry) => void }) {
  return (
    <div className="p-3 hover:bg-[var(--bg-card)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <strong className="truncate">{item.description}</strong>
          <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${getCategoryColor(item.category || "outros")}`}>{CATEGORY_LABELS[item.category || "outros"] || item.category || "outros"}</span>
          {item.tripId && <span className="text-xs text-emerald-400 font-medium">Viagem</span>}
        </div>
        <div className="flex items-center justify-end gap-2">
          <strong className={`whitespace-nowrap ${item.type === "Entrada" ? "text-emerald-300" : "text-red-300"}`}>{item.type === "Entrada" ? "+" : "-"} R$ {Number(item.value).toLocaleString("pt-BR")}</strong>
          {onEdit && <button onClick={() => onEdit(item)} className="cursor-pointer rounded-lg border border-white/10 px-2 py-1 text-[10px] font-bold text-zinc-400 transition hover:text-white">Editar</button>}
          <button onClick={() => onDelete(item.id)} className="text-red-400 transition hover:text-red-300" aria-label={`Excluir ${item.description}`}><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

function WeekSection({ week, onDeleteFinance, onEditFinance }: { week: { weekNumber: number; label: string; startDate: string; endDate: string; totals: { entradas: number; saidas: number; resultado: number }; days: { date: string; label: string; totals: { entradas: number; saidas: number; resultado: number }; items: FinanceEntry[] }[] }; onDeleteFinance: (id: string) => void; onEditFinance?: (item: FinanceEntry) => void }) {
  const [expanded, setExpanded] = useState(true);
  const hasItems = week.days.some((d) => d.items.length > 0);

  if (!hasItems) return null;

  return (
    <div className="rounded-xl border border-[var(--accent-8)] bg-[var(--bg-surface)] overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full flex-col gap-2 p-3 text-left sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`cursor-pointer transition-transform ${expanded ? "" : "rotate-270"}`}>
            <ChevronRight size={16} className="text-zinc-400" />
          </span>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-sm font-bold">{week.weekNumber}</span>
            <div>
              <p className="text-sm font-bold">{week.label}</p>
              <p className="text-xs text-zinc-500">{week.startDate} a {week.endDate}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right sm:flex sm:items-center sm:gap-4">
          <span className="whitespace-nowrap text-xs font-bold text-emerald-300 sm:text-sm">+ {week.totals.entradas.toLocaleString("pt-BR")}</span>
          <span className="whitespace-nowrap text-xs font-bold text-red-300 sm:text-sm">- {week.totals.saidas.toLocaleString("pt-BR")}</span>
          <span className={`whitespace-nowrap text-xs font-bold sm:text-sm ${week.totals.resultado >= 0 ? "text-emerald-300" : "text-red-300"}`}>{week.totals.resultado >= 0 ? "+" : ""}{week.totals.resultado.toLocaleString("pt-BR")}</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[var(--accent-8)] divide-y divide-[var(--accent-8)]">
          {week.days.map((day) => (
            <DaySection key={day.date} day={day} onDeleteFinance={onDeleteFinance} onEditFinance={onEditFinance} />
          ))}
        </div>
      )}
    </div>
  );
}

function MonthSection({ month, onDeleteFinance, onEditFinance }: { month: { monthKey: string; label: string; totals: { entradas: number; saidas: number; resultado: number }; weeks: { weekNumber: number; label: string; startDate: string; endDate: string; totals: { entradas: number; saidas: number; resultado: number }; days: { date: string; label: string; totals: { entradas: number; saidas: number; resultado: number }; items: FinanceEntry[] }[] }[] }; onDeleteFinance: (id: string) => void; onEditFinance?: (item: FinanceEntry) => void }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="rounded-xl border border-[var(--accent-8)] bg-[var(--bg-surface)] overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full flex-col gap-2 p-3 text-left sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-3">
          <span className={`cursor-pointer transition-transform ${expanded ? "" : "rotate-270"}`}>
            <ChevronRight size={20} className="text-zinc-400" />
          </span>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[var(--accent-15)] text-[var(--accent)] flex items-center justify-center text-lg font-bold">
              <CalendarDays size={22} />
            </span>
            <div>
              <p className="text-lg font-black">{month.label}</p>
              <p className="text-xs text-zinc-500">{month.weeks.length} semana{month.weeks.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right sm:flex sm:items-center sm:gap-4">
          <span className="whitespace-nowrap text-xs font-bold text-emerald-300 sm:text-base">+ {month.totals.entradas.toLocaleString("pt-BR")}</span>
          <span className="whitespace-nowrap text-xs font-bold text-red-300 sm:text-base">- {month.totals.saidas.toLocaleString("pt-BR")}</span>
          <span className={`whitespace-nowrap text-xs font-bold sm:text-base ${month.totals.resultado >= 0 ? "text-emerald-300" : "text-red-300"}`}>{month.totals.resultado >= 0 ? "+" : ""}{month.totals.resultado.toLocaleString("pt-BR")}</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[var(--accent-8)] divide-y divide-[var(--accent-8)]">
          {month.weeks.map((week) => (
            <WeekSection key={week.startDate} week={week} onDeleteFinance={onDeleteFinance} onEditFinance={onEditFinance} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FinanceiroView({ trips, financeForm, finance, today, onSetFinanceForm, onAddFinance, onDeleteFinance, onUpdateFinance }: FinanceiroViewProps) {
  const [monthFilter, setMonthFilter] = useState(() => today.slice(0, 7));
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);
  const [filterType, setFilterType] = useState<FinanceFilter>("todos");
  const [showPrevisto, setShowPrevisto] = useState(false);

  const availableMonths = useMemo(
    () => [...new Set([today.slice(0, 7), ...getAvailableMonths(finance)])].sort().reverse(),
    [finance, today],
  );

  const resumoMes = useMemo(() => getResumoMes(finance, monthFilter), [finance, monthFilter]);

  const previstoTrips = useMemo(() => getPrevistoTrips(trips, finance), [trips, finance]);

  const filteredFinance = useMemo(() => {
    const base = finance.filter((f) => f.date.startsWith(monthFilter));
    switch (filterType) {
      case "entradas": return base.filter((f) => f.type === "Entrada");
      case "saidas": return base.filter((f) => f.type === "Saída");
      case "viagens": return base.filter((f) => f.tripId);
      case "manuais": return base.filter((f) => !f.tripId);
      default: return base;
    }
  }, [finance, monthFilter, filterType]);

  const monthHierarchy = useMemo(
    () => buildMonthHierarchy(filteredFinance, monthFilter),
    [filteredFinance, monthFilter],
  );

  function handleNewEntry() {
    setEditingEntry(null);
    onSetFinanceForm({ description: "", value: 0, type: "Entrada", date: today, category: "outros" });
    setShowNewEntry(true);
  }

  function handleEdit(entry: FinanceEntry) {
    const { id, ...form } = entry;
    void id;
    setEditingEntry(entry);
    onSetFinanceForm(form);
    setShowNewEntry(true);
  }

  function handleCloseModal() {
    setShowNewEntry(false);
    setEditingEntry(null);
    onSetFinanceForm({ description: "", value: 0, type: "Entrada", date: today, category: "outros" });
  }

  function handleSubmit() {
    if (!financeForm.description.trim() || !Number(financeForm.value)) return;

    if (editingEntry) {
      if (onUpdateFinance) {
        onUpdateFinance(editingEntry.id, financeForm);
      }
    } else {
      onAddFinance(financeForm);
    }
    handleCloseModal();
  }

  function handleDelete(id: string) {
    if (confirm("Excluir este lançamento?")) {
      onDeleteFinance(id);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── RESUMO RÁPIDO ── */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <Metric compactOnMobile title="HOJE" value={formatCurrency(getResumoHoje(finance).entradas)} icon={DollarSign} />
        <Metric compactOnMobile title="SEMANA" value={formatCurrency(getResumoSemana(finance).entradas)} icon={DollarSign} />
        <Metric compactOnMobile title="MÊS" value={formatCurrency(resumoMes.entradas)} icon={DollarSign} />
        <Metric compactOnMobile title="RESULTADO MÊS" value={formatCurrency(resumoMes.resultado)} icon={DollarSign} />
      </div>

      {/* ── SELETOR DE MÊS + FILTROS ── */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Mês</span>
          <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm">
            {availableMonths.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex w-full flex-wrap gap-1.5 sm:w-auto sm:gap-2">
          {["todos", "entradas", "saidas", "viagens", "manuais"].map((type) => (
            <button key={type} onClick={() => setFilterType(type as FinanceFilter)} className={`cursor-pointer rounded-xl px-2 py-1.5 text-[11px] font-bold transition sm:px-3 sm:text-xs ${filterType === type ? "bg-[var(--accent)] text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"}`}>
              {type === "todos" ? "Todos" : type === "entradas" ? "Entradas" : type === "saidas" ? "Saídas" : type === "viagens" ? "Viagens" : "Manuais"}
            </button>
          ))}
          <button onClick={() => setShowPrevisto((visible) => !visible)} className={`cursor-pointer rounded-xl px-2 py-1.5 text-[11px] font-bold transition sm:px-3 sm:text-xs ${showPrevisto ? "bg-amber-500 text-zinc-950" : "bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"}`}>
            Previsto {previstoTrips.length > 0 ? `(${previstoTrips.length})` : ""}
          </button>
          <button onClick={handleNewEntry} className="basis-full cursor-pointer rounded-xl bg-[var(--secondary)] px-3 py-2 text-xs font-bold text-white transition hover:opacity-90 sm:basis-auto sm:py-1.5">
            Novo lançamento
          </button>
        </div>
      </div>

      {/* ── PREVISTO (TOGGLE) ── */}
      {showPrevisto && previstoTrips.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 animate-enter-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>
              </span>
              <div>
                <p className="text-sm font-bold text-amber-300">Previsto (viagens agendadas sem lançamento)</p>
                <p className="text-xs text-amber-500/80">{previstoTrips.length} viagem{previstoTrips.length !== 1 ? "s" : ""} • R$ {previstoTrips.reduce((s, t) => s + Number(t.value || 0), 0).toLocaleString("pt-BR")}</p>
              </div>
            </div>
            <button onClick={() => setShowPrevisto(false)} className="cursor-pointer rounded-lg p-1 text-zinc-500 hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {previstoTrips.slice(0, 6).map((trip) => (
              <div key={trip.id} className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3 text-sm">
                <p className="font-bold">{trip.client}</p>
                <p className="text-xs text-zinc-500">{trip.route} • {trip.date}</p>
                <p className="text-xs font-bold text-amber-300">R$ {Number(trip.value || 0).toLocaleString("pt-BR")}</p>
              </div>
            ))}
            {previstoTrips.length > 6 && <p className="text-xs text-zinc-500 text-center py-2">+ {previstoTrips.length - 6} mais...</p>}
          </div>
        </div>
      )}

      {/* ── HIERARQUIA MÊS > SEMANA > DIA ── */}
      {filteredFinance.length > 0 ? (
        <MonthSection month={monthHierarchy} onDeleteFinance={handleDelete} onEditFinance={handleEdit} />
      ) : (
        <Panel title="Lançamentos" className="py-10 text-center text-sm text-zinc-500">Nenhum lançamento neste filtro.</Panel>
      )}

      {/* ── NOVO LANÇAMENTO MODAL ── */}
      {showNewEntry && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50" onClick={handleCloseModal}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6 animate-enter-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black">{editingEntry ? "Editar lançamento" : "Novo lançamento"}</h3>
              <button onClick={handleCloseModal} className="rounded-lg p-1 text-zinc-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <VoiceInput value={financeForm.description} onValue={(v) => onSetFinanceForm({ ...financeForm, description: v })} placeholder="Descrição" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input type="number" step="0.01" value={financeForm.value} onChange={(e) => onSetFinanceForm({ ...financeForm, value: Number(e.target.value) })} placeholder="Valor" className="input-admin" />
                <select value={financeForm.type} onChange={(e) => onSetFinanceForm({ ...financeForm, type: e.target.value as FinanceEntry["type"] })} className="input-admin"><option>Entrada</option><option>Saída</option></select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={financeForm.category || "outros"} onChange={(e) => onSetFinanceForm({ ...financeForm, category: e.target.value as FinanceCategory })} className="input-admin">
                  <option value="ganhos_app">Ganhos do App</option>
                  <option value="ganhos_ame">Ganhos AME</option>
                  <option value="gastos_alimentacao">Alimentação</option>
                  <option value="gastos_combustivel">Combustível</option>
                  <option value="outros">Outros</option>
                </select>
                <input type="date" value={financeForm.date} onChange={(e) => onSetFinanceForm({ ...financeForm, date: e.target.value })} className="input-admin" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleCloseModal} className="flex-1 rounded-xl border border-white/10 px-4 py-3 font-bold text-zinc-400 transition hover:text-white">Cancelar</button>
                <button onClick={handleSubmit} className="flex-1 rounded-xl bg-[var(--secondary)] px-4 py-3 font-bold text-white transition hover:opacity-90">{editingEntry ? "Salvar" : "Adicionar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
