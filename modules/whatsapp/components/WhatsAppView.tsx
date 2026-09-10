"use client";

import { Check, ChevronRight, Copy, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import Panel from "@/components/admin/Panel";
import type { Lead } from "@/domain/lead/types";
import type { MessageKey } from "@/domain/marketing/types";

interface WhatsAppViewProps {
  messages: Record<string, string>;
  selectedMessage: MessageKey;
  leads: Lead[];
  onSetSelectedMessage: (key: MessageKey) => void;
  onSendLeadMessage: (lead: Lead, key: MessageKey) => void;
  onRefreshLeads?: () => void;
}

const categories: Record<string, string> = {
  apresentacao: "Comercial",
  indicacao: "Relacionamento",
  followup: "Relacionamento",
  agradecimento: "Pós-atendimento",
  orcamento: "Comercial",
  confirmacao: "Reserva",
};

function labelFor(key: string): string {
  return key === "apresentacao" ? "Apresentação" : key === "indicacao" ? "Indicação" : key === "followup" ? "Follow-up" : key === "agradecimento" ? "Agradecimento" : key === "orcamento" ? "Orçamento" : key === "confirmacao" ? "Confirmação de corrida" : key;
}

export default function WhatsAppView({ messages, selectedMessage, leads, onSetSelectedMessage, onSendLeadMessage, onRefreshLeads }: WhatsAppViewProps) {
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{ deleted: number } | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copyTemplate(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((current) => current === key ? null : current), 1800);
  }

  async function handleClear() {
    if (!confirm("Tem certeza? Isso vai deletar TODOS os contatos importados do WhatsApp.")) return;
    setClearing(true);
    setClearResult(null);
    try {
      const response = await fetch("/api/whatsapp/leads", { method: "DELETE" });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setClearResult({ deleted: data.deleted });
      if (onRefreshLeads) window.setTimeout(onRefreshLeads, 1500);
    } catch (error: unknown) {
      alert(`Erro ao limpar: ${error instanceof Error ? error.message : "desconhecido"}`);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-5">
      <Panel title="Mensagens prontas">
        <div className="space-y-2">
          {Object.entries(messages).map(([key, text]) => {
            const expanded = expandedKey === key;
            const copied = copiedKey === key;
            return <article key={key} className="overflow-hidden rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2 p-3 sm:p-4">
                <button onClick={() => setExpandedKey((current) => current === key ? null : key)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={expanded}>
                  <span className={`text-zinc-500 transition-transform ${expanded ? "rotate-90" : ""}`}><ChevronRight size={18} /></span>
                  <div className="min-w-0"><h3 className="truncate text-sm font-black sm:text-base">{labelFor(key)}</h3><p className="text-xs text-zinc-500">{categories[key] || "Mensagem"}</p></div>
                </button>
                <button onClick={() => copyTemplate(key, text)} className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition ${copied ? "border-emerald-500/30 text-emerald-300" : "border-white/10 text-zinc-300 hover:text-white"}`}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              {expanded && <div className="border-t border-[var(--accent-8)] p-3 sm:p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{text}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => copyTemplate(key, text)} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-zinc-300"><Copy size={14} /> {copied ? "Copiado" : "Copiar"}</button><button onClick={() => onSetSelectedMessage(key as MessageKey)} className="inline-flex items-center gap-2 rounded-xl bg-[var(--secondary)] px-3 py-2 text-xs font-bold text-white"><Send size={14} /> Usar no envio</button></div></div>}
            </article>;
          })}
        </div>
      </Panel>

      <Panel title="Enviar mensagem para um cliente">
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={selectedMessage} onChange={(event) => onSetSelectedMessage(event.target.value as MessageKey)} className="input-admin">{Object.keys(messages).map((key) => <option key={key} value={key}>{labelFor(key)}</option>)}</select>
          <select onChange={(event) => { const lead = leads.find((item) => item.id === event.target.value); if (lead) onSendLeadMessage(lead, selectedMessage); }} className="input-admin"><option>Escolha o cliente para abrir WhatsApp</option>{leads.map((lead) => <option value={lead.id} key={lead.id}>{lead.name} - {lead.phone}</option>)}</select>
        </div>
      </Panel>

      <Panel title="Dados do WhatsApp">
        <p className="mb-4 text-sm text-zinc-400">Foram importados <strong className="text-white">{leads.filter((lead) => lead.origin === "WhatsApp").length}</strong> contatos do WhatsApp.</p>
        {clearResult ? <p className="text-sm font-bold text-emerald-400">{clearResult.deleted} contatos removidos.</p> : <button type="button" onClick={handleClear} disabled={clearing} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"><Trash2 size={16} /> {clearing ? "Limpando..." : "Limpar contatos do WhatsApp"}</button>}
      </Panel>
    </div>
  );
}
