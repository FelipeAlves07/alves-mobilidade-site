"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, DollarSign, Download, Mic, Plus } from "lucide-react";
import VoiceInput from "@/components/admin/VoiceInput";
import Panel from "@/components/admin/Panel";
import TripList from "@/components/admin/TripList";
import { money, quoteValidityDate } from "@/lib/quotes";
import type { Trip, QuoteResult } from "@/domain/trip/types";
import { downloadCSV } from "@/lib/csv";

interface ViagensViewProps {
  quoteResult: QuoteResult | null;
  quoteOrigin: string;
  quoteDestination: string;
  quoteKm: number;
  quotePassengers: number;
  quoteBags: number;
  quoteSpecialLuggage: boolean;
  tripForm: Omit<Trip, "id">;
  trips: Trip[];
  voiceStatus: string;
  buildQuoteMessage: (origin: string, destination: string, result: QuoteResult, passengers: number, bags: number) => string;
  calculateQuote: () => QuoteResult;
  onCaptureRouteByVoice: () => void;
  onAddTrip: () => void;
  onFinishTrip: (trip: Trip) => void;
  onDeleteTrip: (id: string) => void;
  onSetTripForm: (form: Omit<Trip, "id">) => void;
  onSetQuoteOrigin: (v: string) => void;
  onSetQuoteDestination: (v: string) => void;
  onSetQuoteKm: (v: number) => void;
  onSetQuotePassengers: (v: number) => void;
  onSetQuoteBags: (v: number) => void;
  onSetQuoteSpecialLuggage: (v: boolean) => void;
  onSetQuoteResult: (v: QuoteResult | null) => void;
  onOpenGoogleMapsRoute: (origin: string, destination: string) => void;
  onOpenWazeRoute: (destination: string) => void;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function TripCalendar({ trips }: { trips: Trip[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const tripMap = new Map<string, Trip[]>();
  for (const t of trips) {
    if (!t.date || t.status === "Cancelada") continue;
    const prev = tripMap.get(t.date) || [];
    prev.push(t);
    tripMap.set(t.date, prev);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayTrips = tripMap.get(dateStr) || [];
    cells.push(
      <div key={dateStr} className="flex min-h-[56px] flex-col rounded-lg border border-white/5 bg-[var(--bg-surface)] p-1 text-xs">
        <span className="text-[10px] font-bold text-zinc-500">{d}</span>
        {dayTrips.slice(0, 2).map((t) => (
          <span key={t.id} className="mt-0.5 truncate rounded bg-[var(--secondary)]/20 px-1 py-0.5 text-[9px] leading-tight text-[var(--secondary)]">{t.client}</span>
        ))}
        {dayTrips.length > 2 && <span className="mt-0.5 text-[8px] text-zinc-600">+{dayTrips.length - 2}</span>}
      </div>,
    );
  }

  return (
    <div className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-card)] p-6" style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:text-white"><ChevronLeft size={16} /></button>
        <h3 className="text-lg font-black tracking-tight">{MONTHS[month]} {year}</h3>
        <button onClick={nextMonth} className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:text-white"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => <div key={w} className="text-center text-[9px] font-bold uppercase tracking-wider text-zinc-600">{w}</div>)}
        {cells}
      </div>
    </div>
  );
}

export default function ViagensView({
  quoteResult, quoteOrigin, quoteDestination, quoteKm, quotePassengers, quoteBags, quoteSpecialLuggage,
  tripForm, trips, voiceStatus,
  buildQuoteMessage, calculateQuote,
  onCaptureRouteByVoice, onAddTrip, onFinishTrip, onDeleteTrip, onSetTripForm,
  onSetQuoteOrigin, onSetQuoteDestination, onSetQuoteKm, onSetQuotePassengers, onSetQuoteBags, onSetQuoteSpecialLuggage, onSetQuoteResult,
  onOpenGoogleMapsRoute, onOpenWazeRoute,
}: ViagensViewProps) {
  const activeQuote = quoteResult;
  const quoteMessage = activeQuote ? buildQuoteMessage(quoteOrigin, quoteDestination, activeQuote, quotePassengers, quoteBags) : "";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-card)] p-6" style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Central de Orçamentos</p>
            <h3 className="mt-1.5 text-xl font-black tracking-tight">Novo orçamento inteligente</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Preencha a rota, confira o KM no Maps ou digite manualmente, e clique em <strong>Calcular Orçamento</strong>. O sistema cobra R$ 3,00/km e arredonda sempre para cima de 10 em 10.
            </p>
          </div>
          <button onClick={onCaptureRouteByVoice} className="cursor-pointer rounded-xl border border-[var(--accent-20)] px-4 py-3.5 font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)]">
            <Mic className="inline" size={18} /> Falar rota
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_.35fr_.35fr_.35fr]">
          <VoiceInput value={quoteOrigin} onValue={(value) => { onSetQuoteOrigin(value); onSetQuoteResult(null); }} placeholder="Local de embarque" />
          <VoiceInput value={quoteDestination} onValue={(value) => { onSetQuoteDestination(value); onSetQuoteResult(null); }} placeholder="Destino" />
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">KM</span>
            <input type="number" value={quoteKm} onChange={(e) => { onSetQuoteKm(Number(e.target.value)); onSetQuoteResult(null); }} placeholder="Ex.: 38" className="input-admin" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Pessoas</span>
            <input type="number" value={quotePassengers} min={1} onChange={(e) => { onSetQuotePassengers(Number(e.target.value)); onSetQuoteResult(null); }} placeholder="Ex.: 2" className="input-admin" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Malas</span>
            <input type="number" value={quoteBags} min={0} onChange={(e) => { onSetQuoteBags(Number(e.target.value)); onSetQuoteResult(null); }} placeholder="Ex.: 1" className="input-admin" />
          </label>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-zinc-300 transition hover:border-[var(--accent-20)]">
          <input type="checkbox" checked={quoteSpecialLuggage} onChange={(e) => { onSetQuoteSpecialLuggage(e.target.checked); onSetQuoteResult(null); }} />
          Excesso de bagagens, bagagem especial ou necessidade de veículo maior
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={() => onOpenGoogleMapsRoute(quoteOrigin, quoteDestination)} className="cursor-pointer rounded-xl border border-[var(--accent-20)] px-4 py-2.5 text-xs font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)]">Abrir rota no Maps</button>
          <button onClick={() => onOpenWazeRoute(quoteDestination)} className="cursor-pointer rounded-xl border border-[var(--accent-20)] px-4 py-2.5 text-xs font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)]">Abrir destino no Waze</button>
          <button onClick={() => calculateQuote()} className="cursor-pointer rounded-xl bg-[var(--secondary)] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[var(--accent)] active:scale-[0.98]"><DollarSign className="inline" size={16} /> Calcular Orçamento</button>
        </div>

        {!activeQuote ? (
          <div className="mt-5 rounded-xl border border-[var(--accent-8)] bg-[var(--bg-surface)] p-4 text-sm leading-6 text-zinc-400">
            Nenhum orçamento calculado ainda. Informe o KM da rota e clique em <strong>Calcular Orçamento</strong> para gerar o valor sugerido.
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-5 text-sm text-zinc-300">
            <div className="grid gap-5 lg:grid-cols-[1fr_.75fr] lg:items-start">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--accent)]">{activeQuote.type}</p>
                <h4 className="mt-1.5 text-3xl font-black tracking-tight text-[var(--accent)]">{activeQuote.value ? money(activeQuote.value) : "Orçamento manual"}</h4>
                <div className="mt-4 grid gap-3 text-sm text-zinc-400 md:grid-cols-2">
                  <p><strong>Embarque:</strong><br />{quoteOrigin}</p>
                  <p><strong>Destino:</strong><br />{quoteDestination}</p>
                  <p><strong>Distância:</strong><br />{activeQuote.km ? `${activeQuote.km} km` : "a confirmar"}</p>
                  <p><strong>Validade:</strong><br />10 dias, até {quoteValidityDate(10)}</p>
                </div>
                <p className="mt-4 text-xs text-zinc-600">Regra usada: {activeQuote.rule}</p>
                {activeQuote.notes?.map((note) => <p key={note} className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{note}</p>)}
              </div>

              <div className="rounded-xl border border-[var(--accent-8)] bg-[var(--bg-primary)] p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[var(--accent)]">Orçamento digital</p>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-6 text-zinc-300">{quoteMessage}</pre>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => onSetTripForm({ ...tripForm, route: `${quoteOrigin} → ${quoteDestination}`, value: activeQuote.value || tripForm.value })} className="cursor-pointer rounded-xl bg-[var(--secondary)] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[var(--accent)]">Usar na viagem</button>
              <button onClick={async () => { await navigator.clipboard.writeText(quoteMessage); }} className="cursor-pointer rounded-xl border border-[var(--accent-20)] px-4 py-2.5 text-xs font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)]">Copiar orçamento digital</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(quoteMessage)}`} target="_blank" className="cursor-pointer rounded-xl border border-[var(--accent-20)] px-4 py-2.5 text-xs font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)]">Enviar WhatsApp</a>
            </div>
          </div>
        )}

        {voiceStatus && <p className="mt-3 rounded-xl border border-[var(--accent-8)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--accent)]">{voiceStatus}</p>}
      </div>

      <div className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-card)] p-6" style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
        <h3 className="text-lg font-black tracking-tight">Nova viagem</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <VoiceInput value={tripForm.client} onValue={(value) => onSetTripForm({ ...tripForm, client: value })} placeholder="Cliente" />
          <VoiceInput value={tripForm.phone} onValue={(value) => onSetTripForm({ ...tripForm, phone: value })} placeholder="WhatsApp" />
          <input type="date" value={tripForm.date} onChange={(e) => onSetTripForm({ ...tripForm, date: e.target.value })} className="input-admin" />
          <input type="time" value={tripForm.time} onChange={(e) => onSetTripForm({ ...tripForm, time: e.target.value })} className="input-admin" />
          <VoiceInput value={tripForm.route} onValue={(value) => onSetTripForm({ ...tripForm, route: value })} placeholder="Origem → Destino" />
          <input type="number" value={tripForm.value} onChange={(e) => onSetTripForm({ ...tripForm, value: Number(e.target.value) })} placeholder="Valor" className="input-admin" />
          <button onClick={onAddTrip} className="cursor-pointer rounded-xl bg-[var(--secondary)] px-5 py-3.5 font-bold text-white transition hover:bg-[var(--accent)] xl:col-span-6"><Plus className="inline" size={18} /> Adicionar viagem</button>
        </div>
      </div>
      <TripCalendar trips={trips} />
      <Panel title="Viagens e agenda" extra={<button onClick={() => downloadCSV(trips, "viagens-export.csv")} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-400 transition hover:text-white"><Download size={13} className="inline" /> CSV</button>}><TripList trips={trips} onFinish={onFinishTrip} onDelete={onDeleteTrip} /></Panel>
    </div>
  );
}
