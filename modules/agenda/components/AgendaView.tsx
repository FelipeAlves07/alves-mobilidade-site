"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Download, MessageCircle, Navigation, Phone, Plus, Trash2, X } from "lucide-react";
import Panel from "@/components/admin/Panel";
import TripList from "@/components/admin/TripList";
import { money } from "@/lib/quotes";
import { downloadCSV } from "@/lib/csv";
import { openWhatsApp } from "@/lib/whatsapp";
import type { Trip } from "@/domain/trip/types";
import type { Lead } from "@/domain/lead/types";
import type { MessageKey } from "@/domain/marketing/types";

interface AgendaViewProps {
  trips: Trip[];
  leads: Lead[];
  onFinishTrip: (trip: Trip) => void;
  onDeleteTrip: (id: string) => void;
  onAddTrip: (trip: Omit<Trip, "id">) => Promise<void>;
  onSendLeadMessage: (lead: Lead, key: MessageKey) => void;
  onOpenGoogleMapsRoute: (origin: string, destination: string) => void;
  onOpenWazeRoute: (destination: string) => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function fmtDateBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}` : iso;
}

function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getNowTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function TripCard({ trip, onFinish, onDelete, onRoute, onWaze }: {
  trip: Trip;
  onFinish: (trip: Trip) => void;
  onDelete: (id: string) => void;
  onRoute: (origin: string, destination: string) => void;
  onWaze: (destination: string) => void;
}) {
  const [origin, destination] = trip.route.includes(" → ")
    ? trip.route.split(" → ")
    : [trip.route, trip.route];

  return (
    <div className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-4 transition-all hover:border-[var(--accent-20)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{trip.client}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-400">{trip.route}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
            {trip.time && <span>{trip.time}</span>}
            {trip.time && <span>•</span>}
            <span className="font-semibold text-[var(--accent)]">{money(trip.value)}</span>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
          trip.status === "Concluída" ? "bg-emerald-500/15 text-emerald-300"
          : trip.status === "Cancelada" ? "bg-red-500/15 text-red-300"
          : "bg-[var(--secondary)]/20 text-[var(--secondary)]"
        }`}>{trip.status}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {trip.status === "Agendada" && (
          <button onClick={() => onFinish(trip)} className="cursor-pointer rounded-lg bg-[var(--secondary)] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[var(--accent)]">
            <CheckCircle2 size={13} className="inline" /> Concluir
          </button>
        )}
        <button onClick={() => onRoute(origin, destination)} className="cursor-pointer rounded-lg border border-[var(--accent-20)] px-3 py-2 text-[11px] font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)]">
          <Navigation size={13} className="inline" /> Maps
        </button>
        <button onClick={() => onWaze(destination)} className="cursor-pointer rounded-lg border border-[var(--accent-20)] px-3 py-2 text-[11px] font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)]">
          Waze
        </button>
        {trip.phone && (
          <button onClick={() => openWhatsApp(trip.phone, "")} className="cursor-pointer rounded-lg border border-[var(--accent-20)] px-3 py-2 text-[11px] font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)]">
            <Phone size={13} className="inline" /> WhatsApp
          </button>
        )}
        <button onClick={() => onDelete(trip.id)} className="cursor-pointer rounded-lg border border-red-500/25 px-3 py-2 text-[11px] font-bold text-red-300 transition hover:border-red-500/50">
          <Trash2 size={13} className="inline" />
        </button>
      </div>
    </div>
  );
}

function NewTripForm({ onAdd, onClose }: { onAdd: (trip: Omit<Trip, "id">) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState<Omit<Trip, "id">>({
    client: "",
    phone: "",
    date: getTodayISO(),
    time: getNowTime(),
    route: "",
    value: 0,
    status: "Agendada",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client.trim() || !form.date || !form.route.trim()) return;
    try {
      await onAdd({ ...form, value: Number(form.value || 0) });
      onClose();
    } catch {
      // Erro já tratado no componente pai
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5" style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Nova viagem na agenda</p>
        <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300">
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Cliente *</label>
          <input value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} placeholder="Nome do cliente" className="input-admin mt-1" required />
        </div>
        <div>
          <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">WhatsApp</label>
          <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(31) 99999-0000" className="input-admin mt-1" />
        </div>
        <div>
          <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Data *</label>
          <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input-admin mt-1" required />
        </div>
        <div>
          <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Horário</label>
          <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="input-admin mt-1" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Rota *</label>
          <input value={form.route} onChange={(e) => setForm((f) => ({ ...f, route: e.target.value }))} placeholder="Origem → Destino" className="input-admin mt-1" required />
        </div>
        <div>
          <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-500">Valor (R$)</label>
          <input type="number" min={0} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))} className="input-admin mt-1" />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="cursor-pointer rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-400 transition hover:text-white">
          Cancelar
        </button>
        <button type="submit" className="cursor-pointer rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90">
          <Plus size={14} className="inline" /> Agendar viagem
        </button>
      </div>
    </form>
  );
}

export default function AgendaView({
  trips, leads, onFinishTrip, onDeleteTrip, onAddTrip, onSendLeadMessage,
  onOpenGoogleMapsRoute, onOpenWazeRoute,
}: AgendaViewProps) {
  const todayISO = getTodayISO();
  const [showForm, setShowForm] = useState(false);

  const { todayTrips, upcoming, history } = useMemo(() => {
    const ordered = [...trips].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return {
      todayTrips: ordered.filter((t) => t.date === todayISO && t.status === "Agendada"),
      upcoming: ordered.filter((t) => t.date > todayISO && t.status === "Agendada").slice(0, 12),
      history: ordered.filter((t) => t.status !== "Agendada"),
    };
  }, [trips, todayISO]);

  const upcomingByDay = useMemo(() => {
    const map = new Map<string, Trip[]>();
    for (const t of upcoming) {
      const list = map.get(t.date) || [];
      list.push(t);
      map.set(t.date, list);
    }
    return [...map.entries()];
  }, [upcoming]);

  const followups = useMemo(() =>
    leads.filter((l) => l.status !== "Arquivado" && l.nextDate && l.nextDate.trim() !== "" && l.nextDate <= todayISO)
      .sort((a, b) => (a.nextDate || "").localeCompare(b.nextDate || "")),
  [leads, todayISO]);

  return (
    <div className="space-y-6">
      {showForm && (
        <NewTripForm onAdd={onAddTrip} onClose={() => setShowForm(false)} />
      )}

      <div className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-card)] p-6" style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Hoje</p>
            <h3 className="mt-1.5 text-xl font-black tracking-tight">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="cursor-pointer rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
          >
            <Plus size={14} className="inline" /> Nova viagem
          </button>
        </div>

        {todayTrips.length === 0 ? (
          <p className="mt-4 rounded-xl border border-[var(--accent-8)] bg-[var(--bg-surface)] px-4 py-4 text-sm text-zinc-400">Nenhuma viagem agendada para hoje.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {todayTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onFinish={onFinishTrip}
                onDelete={onDeleteTrip}
                onRoute={onOpenGoogleMapsRoute}
                onWaze={onOpenWazeRoute}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-card)] p-6" style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
          <h3 className="text-lg font-black tracking-tight"><CalendarDays className="inline" size={18} /> Próximos dias</h3>
          {upcomingByDay.length === 0 ? (
            <p className="mt-4 rounded-xl border border-[var(--accent-8)] bg-[var(--bg-surface)] px-4 py-4 text-sm text-zinc-400">Nenhuma viagem futura agendada.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {upcomingByDay.map(([date, dayTrips]) => (
                <div key={date}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
                    {fmtDateBR(date)} • {WEEKDAYS[new Date(`${date}T12:00:00`).getDay()]}
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {dayTrips.map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        onFinish={onFinishTrip}
                        onDelete={onDeleteTrip}
                        onRoute={onOpenGoogleMapsRoute}
                        onWaze={onOpenWazeRoute}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-card)] p-6" style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
          <h3 className="text-lg font-black tracking-tight"><MessageCircle className="inline" size={18} /> Follow-ups de hoje</h3>
          {followups.length === 0 ? (
            <p className="mt-4 rounded-xl border border-[var(--accent-8)] bg-[var(--bg-surface)] px-4 py-4 text-sm text-zinc-400">Nenhum follow-up pendente. Ótimo trabalho!</p>
          ) : (
            <div className="mt-4 space-y-3">
              {followups.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{lead.name}</p>
                    <p className="truncate text-xs text-zinc-400">{lead.nextAction || "Sem próximo passo definido"}</p>
                  </div>
                  <button onClick={() => onSendLeadMessage(lead, "apresentacao")} className="shrink-0 cursor-pointer rounded-lg bg-[var(--secondary)] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-[var(--accent)]"><MessageCircle size={13} className="inline" /> Chamar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Panel
        title="Histórico de viagens"
        extra={
          <button onClick={() => downloadCSV(trips, "viagens-export.csv")} className="shrink-0 cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-400 transition hover:text-white">
            <Download size={13} className="inline" /> CSV
          </button>
        }
      >
        {history.length === 0 ? (
          <p className="px-4 py-4 text-sm text-zinc-400">Nenhuma viagem concluída ou cancelada ainda.</p>
        ) : (
          <TripList trips={history} onFinish={onFinishTrip} onDelete={onDeleteTrip} />
        )}
      </Panel>
    </div>
  );
}
