"use client";

import { CheckCircle2, Trash2 } from "lucide-react";
import type { Lead, Status } from "@/domain/lead/types";
import { statuses, nextActionOptions, nextActionText } from "@/app/admin/constants";
import VoiceTextarea from "./VoiceTextarea";
import WhatsAppIcon from "./WhatsAppIcon";

export default function LeadCard({ lead, updateLead, deleteLead, completeAction, sendLeadMessage }: { lead: Lead; updateLead: (id: string, patch: Partial<Lead>) => void; deleteLead: (id: string) => void; completeAction: (lead: Lead) => void; sendLeadMessage: (lead: Lead, key: keyof typeof import("@/app/admin/constants").messages) => void }) {
  return (
    <div className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_.8fr_.8fr_1fr_auto] xl:items-center">
        <div><h3 className="text-xl font-black">{lead.name}</h3><p className="text-sm text-zinc-400">{lead.phone} • {lead.type} • {lead.origin || "Sem origem"}{lead.address ? ` • ${lead.address}` : ""}</p></div>
        <select value={lead.status} onChange={(e) => updateLead(lead.id, { status: e.target.value as Status, nextAction: nextActionText(e.target.value as Status) })} className="input-admin">{statuses.map((status) => <option key={status}>{status}</option>)}</select>
        <input type="date" value={lead.nextDate} onChange={(e) => updateLead(lead.id, { nextDate: e.target.value })} className="input-admin" />
        <select value={lead.nextAction} onChange={(e) => updateLead(lead.id, { nextAction: e.target.value })} className="input-admin">
          {nextActionOptions.map((option) => <option key={option}>{option}</option>)}
        </select>
        <div className="flex flex-wrap gap-2"><button onClick={() => sendLeadMessage(lead, "apresentacao")} title="Apresentação" className="rounded-full bg-[#25D366] p-3 text-white"><WhatsAppIcon className="h-[18px] w-[18px]" /></button><button onClick={() => completeAction(lead)} title="Concluir etapa" className="rounded-full bg-[var(--secondary)] p-3 text-white transition hover:scale-105"><CheckCircle2 size={18} /></button><button onClick={() => deleteLead(lead.id)} title="Remover" className="rounded-full border border-red-500/30 p-3 text-red-300"><Trash2 size={18} /></button></div>
      </div>
      <VoiceTextarea value={lead.notes} onValue={(value) => updateLead(lead.id, { notes: value })} placeholder="Observações" className="mt-4 min-h-20" />
    </div>
  );
}
