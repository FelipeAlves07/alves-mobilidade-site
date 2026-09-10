"use client";

import { CheckCircle2, ChevronRight, Phone, Trash2 } from "lucide-react";
import type { Lead, LeadType, Status } from "@/domain/lead/types";
import { nextActionOptions, nextActionText, statuses } from "@/app/admin/constants";
import VoiceTextarea from "./VoiceTextarea";
import WhatsAppIcon from "./WhatsAppIcon";

type Props = {
  lead: Lead;
  expanded: boolean;
  onToggle: () => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  completeAction: (lead: Lead) => void;
  sendLeadMessage: (lead: Lead, key: keyof typeof import("@/app/admin/constants").messages) => void;
};

export default function LeadCard({ lead, expanded, onToggle, updateLead, deleteLead, completeAction, sendLeadMessage }: Props) {
  return (
    <article className="overflow-hidden rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)]">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-white/[0.02] sm:p-4" aria-expanded={expanded}>
        <span className={`text-zinc-500 transition-transform ${expanded ? "rotate-90" : ""}`}><ChevronRight size={18} /></span>
        <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-black sm:text-base">{lead.name}</h3><p className="truncate text-xs text-zinc-400">{lead.phone}</p></div>
        <span className="shrink-0 rounded-full bg-[var(--accent-12)] px-2.5 py-1 text-[10px] font-bold text-[var(--accent)]">{lead.type}</span>
      </button>

      {expanded && (
        <div className="border-t border-[var(--accent-8)] p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input value={lead.name} onChange={(event) => updateLead(lead.id, { name: event.target.value })} aria-label="Nome" className="input-admin" />
            <input value={lead.phone} onChange={(event) => updateLead(lead.id, { phone: event.target.value })} aria-label="WhatsApp" className="input-admin" />
            <select value={lead.type} onChange={(event) => updateLead(lead.id, { type: event.target.value as LeadType })} className="input-admin">{["Aeroporto", "Empresa", "Hotel", "Evento", "Indicação", "Cliente antigo", "Outro"].map((type) => <option key={type}>{type}</option>)}</select>
            <input value={lead.origin} onChange={(event) => updateLead(lead.id, { origin: event.target.value })} placeholder="Origem" className="input-admin" />
            <select value={lead.status} onChange={(event) => updateLead(lead.id, { status: event.target.value as Status, nextAction: nextActionText(event.target.value as Status) })} className="input-admin">{statuses.map((status) => <option key={status}>{status}</option>)}</select>
            <input type="date" value={lead.nextDate} onChange={(event) => updateLead(lead.id, { nextDate: event.target.value })} className="input-admin" />
            <select value={lead.nextAction} onChange={(event) => updateLead(lead.id, { nextAction: event.target.value })} className="input-admin sm:col-span-2">{nextActionOptions.map((option) => <option key={option}>{option}</option>)}</select>
            <input value={lead.address || ""} onChange={(event) => updateLead(lead.id, { address: event.target.value })} placeholder="Endereço" className="input-admin sm:col-span-2" />
          </div>
          <VoiceTextarea value={lead.notes} onValue={(value) => updateLead(lead.id, { notes: value })} placeholder="Observações" className="mt-3 min-h-20" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => sendLeadMessage(lead, "apresentacao")} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#25D366] px-3 text-xs font-bold text-white" title="Abrir WhatsApp"><WhatsAppIcon className="h-4 w-4" /> WhatsApp</button>
            <a href={`tel:${lead.phone.replace(/\D/g, "")}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-bold text-zinc-300"><Phone size={15} /> Ligar</a>
            <button onClick={() => completeAction(lead)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--secondary)] px-3 text-xs font-bold text-white"><CheckCircle2 size={15} /> Concluir etapa</button>
            <button onClick={() => deleteLead(lead.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-500/30 px-3 text-xs font-bold text-red-300"><Trash2 size={15} /> Excluir</button>
          </div>
        </div>
      )}
    </article>
  );
}
