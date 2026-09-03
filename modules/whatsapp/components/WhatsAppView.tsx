"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import InfoCard from "@/components/admin/InfoCard";
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

export default function WhatsAppView({ messages, selectedMessage, leads, onSetSelectedMessage, onSendLeadMessage, onRefreshLeads }: WhatsAppViewProps) {
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{ deleted: number } | null>(null);

  async function handleClear() {
    if (!confirm("Tem certeza? Isso vai deletar TODOS os contatos importados do WhatsApp.")) return;
    setClearing(true);
    setClearResult(null);
    try {
      const res = await fetch("/api/whatsapp/leads", { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setClearResult({ deleted: data.deleted });
      if (onRefreshLeads) {
        window.setTimeout(() => onRefreshLeads(), 1500);
      }
    } catch (err: any) {
      alert("Erro ao limpar: " + (err.message || "desconhecido"));
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel title="Mensagens prontas">
        <div className="grid gap-5 md:grid-cols-2">
          {Object.entries(messages).map(([key, text]) => (
            <InfoCard key={key} title={key} text={text} onCopy={() => navigator.clipboard.writeText(text)} />
          ))}
        </div>
      </Panel>
      <Panel title="Enviar mensagem para um cliente">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <select value={selectedMessage} onChange={(e) => onSetSelectedMessage(e.target.value as MessageKey)} className="input-admin">
            {Object.keys(messages).map((key) => <option key={key}>{key}</option>)}
          </select>
          <select onChange={(e) => { const lead = leads.find((item) => item.id === e.target.value); if (lead) onSendLeadMessage(lead, selectedMessage); }} className="input-admin">
            <option>Escolha o cliente para abrir WhatsApp</option>
            {leads.map((lead) => <option value={lead.id} key={lead.id}>{lead.name} - {lead.phone}</option>)}
          </select>
        </div>
      </Panel>

      <Panel title="Dados do WhatsApp">
        <p className="mb-4 text-sm text-zinc-400">
          Foram importados <strong className="text-white">{leads.filter(l => l.origin === "WhatsApp").length}</strong> contatos do WhatsApp sem nome.
        </p>
        {clearResult ? (
          <p className="text-sm font-bold text-emerald-400">{clearResult.deleted} contatos removidos.</p>
        ) : (
          <button
            type="button"
            onClick={handleClear}
            disabled={clearing}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 size={16} /> {clearing ? "Limpando..." : "Limpar contatos do WhatsApp"}
          </button>
        )}
      </Panel>
    </div>
  );
}
