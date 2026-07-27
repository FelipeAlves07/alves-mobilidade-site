"use client";

import { DollarSign, Mic } from "lucide-react";
import VoiceInput from "@/components/admin/VoiceInput";
import Panel from "@/components/admin/Panel";
import { cleanPhone } from "@/lib/whatsapp";
import { money } from "@/lib/quotes";
import type { Proposal } from "@/domain/proposal/types";
import type { QuoteResult } from "@/domain/trip/types";

interface PropostasViewProps {
  quoteResult: QuoteResult | null;
  quoteClient: string;
  quotePhone: string;
  quoteDate: string;
  quoteTime: string;
  quoteOrigin: string;
  quoteDestination: string;
  quoteKm: number;
  quotePassengers: number;
  quoteBags: number;
  quoteSpecialLuggage: boolean;
  proposals: Proposal[];
  voiceStatus: string;
  getCurrentProposal: (status?: Proposal["status"]) => Proposal | null;
  saveCurrentProposal: (status?: Proposal["status"]) => Proposal | null;
  calculateQuote: () => QuoteResult;
  downloadPremiumProposalImage: (proposal: Proposal) => Promise<void>;
  printProposal: (proposal: Proposal) => void;
  convertCurrentProposalToTrip: () => void;
  convertProposalToTrip: (proposal: Proposal) => void;
  onCaptureRouteByVoice: () => void;
  onDeleteProposal: (id: string) => void;
  onSetQuoteClient: (v: string) => void;
  onSetQuotePhone: (v: string) => void;
  onSetQuoteDate: (v: string) => void;
  onSetQuoteTime: (v: string) => void;
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

export default function PropostasView({
  quoteResult, quoteClient, quotePhone, quoteDate, quoteTime,
  quoteOrigin, quoteDestination, quoteKm, quotePassengers, quoteBags, quoteSpecialLuggage,
  proposals, voiceStatus,
  getCurrentProposal, saveCurrentProposal, calculateQuote,
  downloadPremiumProposalImage, printProposal, convertCurrentProposalToTrip, convertProposalToTrip,
  onCaptureRouteByVoice, onDeleteProposal,
  onSetQuoteClient, onSetQuotePhone, onSetQuoteDate, onSetQuoteTime,
  onSetQuoteOrigin, onSetQuoteDestination, onSetQuoteKm, onSetQuotePassengers, onSetQuoteBags, onSetQuoteSpecialLuggage, onSetQuoteResult,
  onOpenGoogleMapsRoute, onOpenWazeRoute,
}: PropostasViewProps) {
  const activeQuote = quoteResult;
  const currentProposal = activeQuote && activeQuote.value && !activeQuote.manual
    ? getCurrentProposal("Rascunho")
    : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--accent-15)] bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-primary)] p-5 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Módulo Comercial</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Proposta Premium</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400 md:text-base">
              Gere uma proposta comercial premium com PDF escuro preservado, pronta para WhatsApp, histórico e conversão em viagem.
            </p>
          </div>
          <button onClick={onCaptureRouteByVoice} className="cursor-pointer rounded-xl border border-[var(--accent-25)] px-5 py-4 font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">
            <Mic className="inline" size={18} /> Falar rota
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <VoiceInput value={quoteClient} onValue={onSetQuoteClient} placeholder="Cliente" />
          <VoiceInput value={quotePhone} onValue={onSetQuotePhone} placeholder="WhatsApp do cliente" />
          <input type="date" value={quoteDate} onChange={(e) => onSetQuoteDate(e.target.value)} className="input-admin" />
          <input type="time" value={quoteTime} onChange={(e) => onSetQuoteTime(e.target.value)} className="input-admin" />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_.35fr_.35fr_.35fr]">
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
          <button onClick={() => onOpenGoogleMapsRoute(quoteOrigin, quoteDestination)} className="cursor-pointer rounded-xl border border-[var(--accent-25)] px-5 py-3 text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">Abrir Maps</button>
          <button onClick={() => onOpenWazeRoute(quoteDestination)} className="cursor-pointer rounded-xl border border-[var(--accent-25)] px-5 py-3 text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">Abrir Waze</button>
          <button onClick={() => calculateQuote()} className="cursor-pointer rounded-xl bg-[var(--secondary)] px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"><DollarSign className="inline" size={18} /> Calcular</button>
        </div>

        {activeQuote ? (
          <div className="mt-6 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
            <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-surface)] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Valor sugerido</p>
              <h3 className="mt-2 text-4xl font-black text-[var(--accent)]">{activeQuote.value ? money(activeQuote.value) : "Manual"}</h3>
              <div className="mt-4 space-y-2 text-sm text-zinc-300">
                <p><strong>Tipo:</strong> {activeQuote.type}</p>
                <p><strong>Distância:</strong> {activeQuote.km || "a confirmar"} km</p>
                <p><strong>Validade:</strong> 10 dias</p>
                <p className="text-xs text-zinc-500">{activeQuote.rule}</p>
              </div>
              {activeQuote.notes?.map((note) => <p key={note} className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">{note}</p>)}
            </div>

            {currentProposal && (
              <div className="overflow-hidden rounded-xl border border-[var(--accent-20)] bg-black" style={{ boxShadow: "0 25px 90px rgba(0,0,0,.35)" }}>
                <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] p-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.28em]">AME • Alves Mobilidade Executiva</p>
                  <h3 className="mt-1 text-2xl font-black">Proposta Comercial</h3>
                </div>
                <div className="p-5">
                  <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-primary)] p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Cliente</p>
                    <h4 className="mt-1 text-xl font-black">{currentProposal.client}</h4>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-[var(--accent)]">Embarque</p><strong>{currentProposal.origin}</strong></div>
                    <div className="text-center text-2xl text-[var(--accent)]">→</div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-[var(--accent)]">Destino</p><strong>{currentProposal.destination}</strong></div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-zinc-500">Data/Hora</p><strong>{currentProposal.date || "A combinar"} {currentProposal.time}</strong></div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-zinc-500">Distância</p><strong>{currentProposal.km} km</strong></div>
                  </div>
                  <div className="mt-4 rounded-xl border border-[var(--accent-20)] bg-[var(--accent-10)] p-5">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Valor</p>
                    <strong className="text-4xl text-[var(--accent)]">{money(currentProposal.value)}</strong>
                    <p className="mt-2 text-sm text-zinc-400">Validade de 10 dias • Atendimento executivo premium</p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button onClick={() => saveCurrentProposal("Rascunho")} className="cursor-pointer rounded-xl bg-[var(--secondary)] px-5 py-3 text-xs font-bold text-white transition hover:opacity-90">Salvar proposta</button>
                    <button onClick={() => downloadPremiumProposalImage(currentProposal)} className="cursor-pointer rounded-xl border border-[var(--accent-25)] px-5 py-3 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">Baixar PNG</button>
                    <button onClick={() => printProposal(currentProposal)} className="cursor-pointer rounded-xl border border-[var(--accent-25)] px-5 py-3 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">Baixar PDF</button>
                    <button onClick={() => { navigator.clipboard.writeText(currentProposal.message); }} className="cursor-pointer rounded-xl border border-[var(--accent-25)] px-5 py-3 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">Copiar</button>
                    <a href={`https://wa.me/${quotePhone ? (cleanPhone(quotePhone).startsWith("55") ? cleanPhone(quotePhone) : `55${cleanPhone(quotePhone)}`) : ""}?text=${encodeURIComponent(currentProposal.message)}`} target="_blank" className="cursor-pointer rounded-xl border border-[#25D366]/40 px-5 py-3 text-xs font-bold text-[#25D366]">WhatsApp</a>
                    <button onClick={convertCurrentProposalToTrip} className="cursor-pointer rounded-xl border border-[var(--accent-25)] px-5 py-3 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">Converter em viagem</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-5 text-sm leading-7 text-zinc-400">
            Preencha os dados, informe o KM e clique em <strong>Calcular</strong> para gerar a proposta premium.
          </div>
        )}

        {voiceStatus && <p className="mt-4 rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--accent)]">{voiceStatus}</p>}
      </div>

      <Panel title="Histórico de propostas">
        {!proposals.length ? (
          <p className="text-zinc-400">Nenhuma proposta salva ainda.</p>
        ) : (
          <div className="grid gap-4">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_.7fr_.55fr_auto] lg:items-center">
                  <div>
                    <h3 className="text-xl font-black">{proposal.client}</h3>
                    <p className="text-sm text-zinc-400">{proposal.origin} → {proposal.destination}</p>
                    <p className="mt-1 text-xs text-zinc-500">Criada em {new Date(proposal.createdAt).toLocaleDateString("pt-BR")} • Validade até {new Date(proposal.validUntil + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                  </div>
                  <strong className="text-2xl text-[var(--accent)]">{money(proposal.value)}</strong>
                  <span className="rounded-full border border-[var(--accent-20)] px-3 py-2 text-center text-xs font-bold text-[var(--accent)]">{proposal.status}</span>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => downloadPremiumProposalImage(proposal)} className="rounded-xl border border-[var(--accent-25)] px-4 py-2 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">PNG</button>
                    <button onClick={() => printProposal(proposal)} className="rounded-xl border border-[var(--accent-25)] px-4 py-2 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">PDF</button>
                    <a href={`https://wa.me/${proposal.phone ? (cleanPhone(proposal.phone).startsWith("55") ? cleanPhone(proposal.phone) : `55${cleanPhone(proposal.phone)}`) : ""}?text=${encodeURIComponent(proposal.message)}`} target="_blank" className="rounded-xl border border-[#25D366]/40 px-4 py-2 text-xs font-bold text-[#25D366]">WhatsApp</a>
                    <button onClick={() => convertProposalToTrip(proposal)} className="rounded-xl bg-[var(--secondary)] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90">Virar viagem</button>
                    <button onClick={() => onDeleteProposal(proposal.id)} className="rounded-xl border border-red-500/30 px-4 py-2 text-xs font-bold text-red-300">Excluir</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
