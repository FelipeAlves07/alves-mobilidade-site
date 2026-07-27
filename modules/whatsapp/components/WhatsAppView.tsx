"use client";

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
}

export default function WhatsAppView({ messages, selectedMessage, leads, onSetSelectedMessage, onSendLeadMessage }: WhatsAppViewProps) {
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
    </div>
  );
}
