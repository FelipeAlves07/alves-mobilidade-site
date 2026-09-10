"use client";

import { useMemo } from "react";
import { CalendarDays, ChevronDown, ChevronUp, CheckCircle2, ClipboardList, DollarSign, Gift, MapPin, Plus, Users, Clock } from "lucide-react";
import WhatsAppIcon from "@/components/admin/WhatsAppIcon";
import Panel from "@/components/admin/Panel";
import Metric from "@/components/admin/Metric";
import ActionCard from "@/components/admin/ActionCard";
import TripList from "@/components/admin/TripList";
import { addDaysISO, formatDateBR } from "@/lib/format";
import type { Lead } from "@/domain/lead/types";
import type { Trip } from "@/domain/trip/types";
import type { FinanceEntry } from "@/domain/finance/types";
import type { DashboardStats } from "@/domain/shared/types";
import type { MessageKey } from "@/domain/marketing/types";

interface DashboardViewProps {
  stats: DashboardStats;
  leads: Lead[];
  finance: FinanceEntry[];
  trips: Trip[]; // Added for future trips calculation
  today: string;
  currentTask: Lead | undefined;
  selectedMessage: MessageKey;
  onCompleteAction: (lead: Lead) => void;
  onSendLeadMessage: (lead: Lead, key: MessageKey) => void;
  onFinishTrip: (trip: Trip) => void;
  onUpdateLead: (id: string, patch: Partial<Lead>) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDateFull(dateISO: string): string {
  const date = new Date(`${dateISO}T12:00:00`);
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

export default function DashboardView({
  stats, leads, finance, trips, today, currentTask, selectedMessage,
  onCompleteAction, onSendLeadMessage, onFinishTrip, onUpdateLead,
}: DashboardViewProps) {
  // ── COMPUTED METRICS ──
  const tripsToday = stats.todayTrips;
  const tripsTodayCount = tripsToday.length;

  // RECEITA HOJE: apenas finance entries de hoje (Entrada).
  // Viagens concluídas hoje JÁ geraram FinanceEntry via finishTrip → buildFinishTripEffects.
  // Fonte canônica: finance entries de hoje (Entrada).
  const financeToday = finance.filter((f) => f.date === today && f.type === "Entrada");
  const revenueToday = financeToday.reduce((s, f) => s + Number(f.value), 0);

  // A RECEBER: finance futuras (Entrada, date > today) + trips agendadas futuras (não canceladas, não concluídas).
  // stats.credits são créditos de indicação (fidelidade), NÃO contas a receber.
  const financeFuture = finance.filter((f) => f.date > today && f.type === "Entrada");
  const receivableFinance = financeFuture.reduce((s, f) => s + Number(f.value), 0);

  const futureTrips = trips
    .filter((t) => t.date > today && t.status === "Agendada")
    .reduce((s, t) => s + Number(t.value || 0), 0);

  const receivable = receivableFinance + futureTrips;

  // Pendências = follow-ups
  const pendencias = stats.pending.length;

  // ── ATENÇÃO: situações reais ──
  const attentionItems = useMemo(() => {
    const items: Array<{ type: string; title: string; subtitle: string; action?: () => void; variant?: "warning" | "info" | "danger" }> = [];

    // 1. Viagem próxima (próxima hora)
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const upcomingTrip = tripsToday
      .filter((t) => t.status === "Agendada" && t.time && t.time >= currentTime)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""))[0];

    if (upcomingTrip) {
      items.push({
        type: "viagem",
        title: `Viagem às ${upcomingTrip.time} — ${upcomingTrip.client}`,
        subtitle: `${upcomingTrip.route} • R$ ${Number(upcomingTrip.value || 0).toLocaleString("pt-BR")}`,
        variant: "info",
      });
    }

    // 2. Follow-ups atrasados
    const overdueFollowups = stats.pending.filter((l) => l.nextDate < today);
    if (overdueFollowups.length > 0) {
      items.push({
        type: "followup",
        title: `${overdueFollowups.length} follow-up${overdueFollowups.length > 1 ? "s" : ""} atrasado${overdueFollowups.length > 1 ? "s" : ""}`,
        subtitle: overdueFollowups.slice(0, 3).map((l) => l.name).join(", ") + (overdueFollowups.length > 3 ? "..." : ""),
        variant: "danger",
      });
    }

    // 3. Follow-ups de hoje
    const todayFollowups = stats.pending.filter((l) => l.nextDate === today);
    if (todayFollowups.length > 0 && overdueFollowups.length === 0) {
      items.push({
        type: "followup",
        title: `${todayFollowups.length} follow-up${todayFollowups.length > 1 ? "s" : ""} para hoje`,
        subtitle: todayFollowups.slice(0, 3).map((l) => l.name).join(", ") + (todayFollowups.length > 3 ? "..." : ""),
        variant: "warning",
      });
    }

    // 5. Pendência operacional: viagens concluídas sem recibo
    const tripsWithoutReceipt = tripsToday.filter((t) => t.status === "Concluída");
    if (tripsWithoutReceipt.length > 0) {
      items.push({
        type: "recibo",
        title: `${tripsWithoutReceipt.length} viagem${tripsWithoutReceipt.length > 1 ? "s" : ""} concluída${tripsWithoutReceipt.length > 1 ? "s" : ""} sem recibo`,
        subtitle: "Clique em 'Gerar recibo' na Agenda",
        variant: "info",
      });
    }

    return items;
  }, [stats.pending, stats.todayTrips, today]);

  // ── FOLLOW-UPS PRIORIZADOS ──
  const prioritizedFollowups = useMemo(() => {
    const all = [...stats.pending].sort((a, b) => {
      const aOverdue = a.nextDate < today;
      const bOverdue = b.nextDate < today;
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      const aToday = a.nextDate === today;
      const bToday = b.nextDate === today;
      if (aToday !== bToday) return aToday ? -1 : 1;
      return a.nextDate.localeCompare(b.nextDate);
    });
    return all.slice(0, 5);
  }, [stats.pending, today]);

  // ── PRÓXIMAS VIAGENS (de hoje, agendadas ≥ hora atual) ──
  const currentTime = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const upcomingTrips = useMemo(() => {
    return tripsToday
      .filter((t) => t.status === "Agendada" && t.time && t.time >= currentTime)
      .slice(0, 3);
  }, [tripsToday]);

  // ── RESUMO FINANCEIRO DO MÊS (baseado apenas em finance entries para evitar dupla contagem) ──
  const currentMonth = today.slice(0, 7);
  const monthFinance = finance.filter((f) => f.date.startsWith(currentMonth));
  const monthEntradas = monthFinance.filter((f) => f.type === "Entrada").reduce((s, f) => s + Number(f.value), 0);
  const monthSaidas = monthFinance.filter((f) => f.type === "Saída").reduce((s, f) => s + Number(f.value), 0);
  const monthResultado = monthEntradas - monthSaidas;

  // Viagens do mês que NÃO têm finance entry (ainda não concluídas ou sem lançamento)
  const monthTrips = trips.filter((t) => t.date.startsWith(currentMonth) && t.status !== "Cancelada");
  const monthTripsWithoutFinance = monthTrips.filter((t) => !finance.some((f) => f.tripId === t.id));
  const monthTripsPendingValue = monthTripsWithoutFinance.reduce((s, t) => s + Number(t.value || 0), 0);

  // ── PROGRESSO DO DIA ──
  const progress = Math.min(100, Math.round(((leads.length - stats.pending.length) / Math.max(leads.length, 1)) * 100));

  const heroContent = (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[var(--accent)]">
            {getGreeting()}, Felipe
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Resumo de hoje — {formatDateFull(today)}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500">
          <span className="px-2 py-1 rounded bg-[var(--accent-10)] text-[var(--accent)] font-mono">
            {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* 4 MÉTRICAS: desktop = 4 cols, mobile = 2x2 grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric title="VIAGENS HOJE" value={String(tripsTodayCount)} icon={CalendarDays} />
        <Metric title="RECEITA HOJE" value={`R$ ${revenueToday.toLocaleString("pt-BR")}`} icon={DollarSign} />
        <Metric title="A RECEBER" value={`R$ ${receivable.toLocaleString("pt-BR")}`} icon={Gift} />
        <Metric title="PENDÊNCIAS" value={String(pendencias)} icon={ClipboardList} />
      </div>
    </>
  );

  return (
    <div className="space-y-5">
      {/* ── CABEÇALHO + 4 CARDS ── */}
      <div className="rounded-2xl border border-[var(--accent-10)] bg-[var(--bg-card)] p-5 md:p-7"
        style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.22)" }}
      >
        {heroContent}
      </div>

      {/* ── O QUE PRECISA DA SUA ATENÇÃO ── */}
      {attentionItems.length > 0 ? (
        <Panel title="O que precisa da sua atenção">
          <div className="space-y-3">
            {attentionItems.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-4 rounded-xl border p-4 transition ${
                  item.variant === "danger"
                    ? "border-red-500/20 bg-red-500/5"
                    : item.variant === "warning"
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-[var(--accent-15)] bg-[var(--bg-surface)]"
                }`}
              >
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                  item.variant === "danger"
                    ? "bg-red-500/15 text-red-400"
                    : item.variant === "warning"
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-[var(--accent-15)] text-[var(--accent)]"
                }`}>
                  {item.type === "viagem" && <CalendarDays size={20} />}
                  {item.type === "followup" && <ClipboardList size={20} />}
                  {item.type === "recibo" && <DollarSign size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{item.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500 truncate">{item.subtitle}</p>
                </div>
                {item.action && (
                  <button onClick={item.action} className="shrink-0 text-xs font-bold text-[var(--accent)] hover:underline">
                    Ação
                  </button>
                )}
              </div>
            ))}
          </div>
        </Panel>
      ) : (
        <Panel title="O que precisa da sua atenção">
          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 px-5 py-6 text-center">
            <p className="text-sm font-medium text-emerald-400">Tudo certo por enquanto.</p>
          </div>
        </Panel>
      )}

      {/* ── FOLLOW-UPS COMPACTOS ── */}
      <Panel title="Follow-ups do dia">
        {prioritizedFollowups.length === 0 ? (
          <p className="py-3 text-center text-sm text-zinc-500">Nenhum follow-up pendente.</p>
        ) : (
          <div className="space-y-2">
            {prioritizedFollowups.map((lead) => (
              <div
                key={lead.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                  lead.nextDate < today
                    ? "border-red-500/20 bg-red-500/5"
                    : lead.nextDate === today
                    ? "border-amber-500/20 bg-amber-500/5"
                    : "border-[var(--accent-8)] bg-[var(--bg-surface)]"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{lead.name}</p>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-1.5 py-0.5 rounded ${
                      lead.nextDate < today
                        ? "bg-red-500/15 text-red-400"
                        : lead.nextDate === today
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-[var(--accent-15)] text-[var(--accent)]"
                    }`}>
                      {lead.nextDate < today ? "Atrasado" : lead.nextDate === today ? "Hoje" : formatDateBR(lead.nextDate)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500 truncate">{lead.nextAction || "Sem próximo passo"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onSendLeadMessage(lead, selectedMessage)}
                    className="cursor-pointer rounded-full bg-[#25D366] p-2 text-white transition hover:brightness-110"
                    title="WhatsApp"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onCompleteAction(lead)}
                    className="cursor-pointer rounded-full bg-[var(--secondary)] p-2 text-white transition hover:bg-[var(--accent)]"
                    title="Concluir"
                  >
                    <CheckCircle2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* ── PRÓXIMAS VIAGENS + RESUMO FINANCEIRO ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Próximas viagens">
          {upcomingTrips.length === 0 && tripsToday.length === 0 ? (
            <p className="py-3 text-center text-sm text-zinc-500">Nenhuma viagem agendada.</p>
          ) : (
            <div className="space-y-3">
              {tripsToday.filter((t) => t.status === "Agendada").map((trip) => (
                <div key={trip.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--accent-8)] bg-[var(--bg-surface)] p-3">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 w-10 h-10 rounded-xl bg-[var(--accent-15)] text-[var(--accent)] flex items-center justify-center">
                      <MapPin size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-bold">{trip.client}</p>
                      <p className="text-xs text-zinc-500">{trip.time || "—"} • {trip.route}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-[var(--accent)]">{trip.value ? `R$ ${Number(trip.value).toLocaleString("pt-BR")}` : "—"}</span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                      trip.status === "Concluída" ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-[var(--secondary)]/20 text-[var(--secondary)]"
                    }`}>{trip.status}</span>
                  </div>
                </div>
              ))}
              {tripsToday.length === 0 && (
                <p className="text-center text-sm text-zinc-500 py-3">Nenhuma viagem para hoje.</p>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Resumo financeiro do mês">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-400">Entradas</p>
                <p className="mt-0.5 text-base font-black text-emerald-300">R$ {monthEntradas.toLocaleString("pt-BR")}</p>
              </div>
              <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">Saídas</p>
                <p className="mt-0.5 text-base font-black text-red-300">R$ {monthSaidas.toLocaleString("pt-BR")}</p>
              </div>
              <div className={`rounded-xl border p-3 text-center ${monthResultado >= 0 ? "border-emerald-500/15 bg-emerald-500/5" : "border-red-500/15 bg-red-500/5"}`}>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400">Resultado</p>
                <p className={`mt-0.5 text-base font-black ${monthResultado >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {monthResultado >= 0 ? "+" : ""}R$ {monthResultado.toLocaleString("pt-BR")}
                </p>
              </div>
            </div>

            {monthTripsPendingValue > 0 && (
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-amber-400">Previsto (viagens agendadas sem lançamento)</p>
                <p className="mt-0.5 text-sm font-bold text-amber-300">R$ {monthTripsPendingValue.toLocaleString("pt-BR")}</p>
              </div>
            )}

            <div className="rounded-xl border border-[var(--accent-8)] bg-[var(--bg-surface)] p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">Composição realizada</p>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Financeiro (entradas - saídas)</span>
                  <span className="font-bold">R$ {stats.revenueFinance.toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Créditos de indicação</span>
                  <span className="font-bold">R$ {(stats.credits * 100).toLocaleString("pt-BR")}</span>
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
