"use client";

import { Mic } from "lucide-react";

interface VozViewProps {
  ameOpen: boolean;
  ameStep: string;
  ameText: string;
  voiceStatus: string;
  quoteOrigin: string;
  quoteDestination: string;
  onSetAmeText: (text: string) => void;
  onCloseAmeAssistant: () => void;
  onProcessAmeAnswer: (text: string) => void;
  onAmeSpeak: () => void;
  onOpenGoogleMapsRoute: (origin: string, destination: string) => void;
}

export default function VozView({
  ameOpen, ameStep, ameText, voiceStatus, quoteOrigin, quoteDestination,
  onSetAmeText, onCloseAmeAssistant, onProcessAmeAnswer, onAmeSpeak, onOpenGoogleMapsRoute,
}: VozViewProps) {
  if (!ameOpen) return null;

  return (
    <div className="fixed inset-x-3 bottom-4 z-[90] max-h-[82vh] overflow-y-auto rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[92vw] sm:max-w-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--accent)]">Assistente AME</p>
          <h3 className="mt-1.5 text-xl font-black tracking-tight">
            {ameStep === "inicio" && "O que vamos fazer?"}
            {ameStep === "origem" && "Local de embarque"}
            {ameStep === "destino" && "Destino"}
            {ameStep === "passageiros" && "Passageiros"}
            {ameStep === "malas" && "Bagagens"}
            {ameStep === "km" && "KM da rota"}
            {ameStep === "resultado" && "Orçamento calculado"}
          </h3>
        </div>
        <button type="button" onClick={onCloseAmeAssistant} className="cursor-pointer rounded-xl border border-[var(--accent-15)] px-3 py-2 text-xs text-[var(--accent)] transition hover:border-[var(--accent-30)]">Fechar</button>
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-400">
        {ameStep === "inicio" && "Digite ou fale: novo orçamento."}
        {ameStep === "origem" && "Exemplo: Rua Tamoios, Centro, Belo Horizonte."}
        {ameStep === "destino" && "Exemplo: Aeroporto Internacional de Confins."}
        {ameStep === "passageiros" && "Exemplo: 2 passageiros."}
        {ameStep === "malas" && "Exemplo: 3 malas."}
        {ameStep === "km" && "Digite o KM da rota. Exemplo: 38."}
        {ameStep === "resultado" && "Agora você pode copiar o orçamento, enviar pelo WhatsApp ou usar na viagem."}
      </p>

      <div className="mt-5 flex gap-2">
        <input value={ameText} onChange={(e) => onSetAmeText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onProcessAmeAnswer(ameText); }} placeholder="Digite aqui..." className="input-admin" />
        <button type="button" onClick={onAmeSpeak} className="flex cursor-pointer items-center justify-center rounded-xl bg-[var(--secondary)] px-4 text-white transition hover:bg-[var(--accent)]" title="Falar resposta"><Mic size={18} /></button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => onProcessAmeAnswer(ameText)} className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5">Continuar</button>
        <button type="button" onClick={() => onOpenGoogleMapsRoute(quoteOrigin, quoteDestination)} className="w-full cursor-pointer rounded-xl border border-[var(--accent-20)] px-5 py-3 text-sm font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)]">Abrir Maps</button>
      </div>

      {voiceStatus && <p className="mt-4 rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--accent)]">{voiceStatus}</p>}
    </div>
  );
}
