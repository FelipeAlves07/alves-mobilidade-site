"use client";

import { Download, FileText, Import, Plus, Search, X } from "lucide-react";
import { useRef, useState } from "react";
import VoiceInput from "@/components/admin/VoiceInput";
import VoiceTextarea from "@/components/admin/VoiceTextarea";
import Panel from "@/components/admin/Panel";
import LeadCard from "@/components/admin/LeadCard";
import type { Lead, LeadType } from "@/domain/lead/types";
import { downloadCSV } from "@/lib/csv";
import { nextActionOptions } from "@/app/admin/constants";

interface ClientesViewProps {
  leads: Lead[];
  query: string;
  leadForm: Omit<Lead, "id" | "createdAt">;
  importText: string;
  showImport: boolean;
  title: string;
  leadTypes: LeadType[];
  onSetQuery: (q: string) => void;
  onSetLeadForm: (form: Omit<Lead, "id" | "createdAt">) => void;
  onSetImportText: (t: string) => void;
  onAddLead: () => void;
  onUpdateLead: (id: string, patch: Partial<Lead>) => void;
  onDeleteLead: (id: string) => void;
  onCompleteAction: (lead: Lead) => void;
  onSendLeadMessage: (lead: Lead, key: string) => void;
  onImportLeads: () => void;
}

export default function ClientesView({
  leads, query, leadForm, importText, showImport, title, leadTypes,
  onSetQuery, onSetLeadForm, onSetImportText,
  onAddLead, onUpdateLead, onDeleteLead, onCompleteAction, onSendLeadMessage, onImportLeads,
}: ClientesViewProps) {
  const [showNewLead, setShowNewLead] = useState(false);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const filteredLeads = leads.filter((lead) =>
    `${lead.name} ${lead.phone} ${lead.type} ${lead.status} ${lead.origin}`.toLowerCase().includes(query.toLowerCase()),
  );

  function closeNewLead() {
    setShowNewLead(false);
  }

  function submitNewLead() {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) return;
    onAddLead();
    setShowNewLead(false);
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onSetImportText(reader.result);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Base de relacionamento</p>
          <h2 className="text-xl font-black">{title}</h2>
        </div>
        <button onClick={() => setShowNewLead(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--secondary)] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90"><Plus size={17} /> Novo cliente</button>
      </div>

      {showImport && (
        <Panel title="Importar contatos em massa">
          <p className="mb-3 text-sm text-zinc-400">Cole um por linha: Nome, telefone ou Nome: Nome, Contato: Telefone.</p>
          <VoiceTextarea value={importText} onValue={onSetImportText} placeholder={"Nome: João, Contato: 31999999999\nNome: Maria, Contato: 31988888888"} className="min-h-28" />
          <div className="mt-3 flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept=".txt" onChange={handleFile} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-bold transition hover:bg-white/5"><FileText size={16} /> Arquivo .txt</button>
            <button onClick={onImportLeads} className="inline-flex items-center gap-2 rounded-xl bg-[var(--secondary)] px-4 py-2.5 text-sm font-bold text-white"><Import size={16} /> Importar</button>
          </div>
        </Panel>
      )}

      <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] px-4 py-3">
        <Search size={18} className="shrink-0 text-[var(--accent)]" />
        <input value={query} onChange={(event) => onSetQuery(event.target.value)} placeholder="Buscar nome, telefone, tipo ou status" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        <button onClick={() => downloadCSV(filteredLeads, "clientes-export.csv")} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-400 transition hover:text-white"><Download size={13} className="inline" /> CSV</button>
      </div>

      <Panel title={`${title} (${filteredLeads.length})`}>
        <div className="space-y-2">
          {filteredLeads.map((lead) => <LeadCard key={lead.id} lead={lead} expanded={expandedLeadId === lead.id} onToggle={() => setExpandedLeadId((current) => current === lead.id ? null : lead.id)} updateLead={onUpdateLead} deleteLead={onDeleteLead} completeAction={onCompleteAction} sendLeadMessage={onSendLeadMessage} />)}
          {filteredLeads.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">Nenhum cliente encontrado.</p>}
        </div>
      </Panel>

      {showNewLead && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/60 p-0 sm:items-center sm:justify-center sm:p-4" onClick={closeNewLead}>
          <div className="w-full max-w-2xl rounded-t-2xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 shadow-2xl sm:rounded-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between"><h3 className="text-lg font-black">Novo cliente</h3><button onClick={closeNewLead} className="rounded-lg p-1 text-zinc-400 hover:text-white" aria-label="Fechar"><X size={20} /></button></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <VoiceInput value={leadForm.name} onValue={(value) => onSetLeadForm({ ...leadForm, name: value })} placeholder="Nome" />
              <VoiceInput value={leadForm.phone} onValue={(value) => onSetLeadForm({ ...leadForm, phone: value })} placeholder="WhatsApp" />
              <select value={leadForm.type} onChange={(event) => onSetLeadForm({ ...leadForm, type: event.target.value as LeadType })} className="input-admin">{leadTypes.map((type) => <option key={type}>{type}</option>)}</select>
              <VoiceInput value={leadForm.origin} onValue={(value) => onSetLeadForm({ ...leadForm, origin: value })} placeholder="Origem do contato" />
              <select value={leadForm.nextAction} onChange={(event) => onSetLeadForm({ ...leadForm, nextAction: event.target.value })} className="input-admin sm:col-span-2">{nextActionOptions.map((option) => <option key={option}>{option}</option>)}</select>
              <input type="date" value={leadForm.nextDate} onChange={(event) => onSetLeadForm({ ...leadForm, nextDate: event.target.value })} className="input-admin" />
              <VoiceInput value={leadForm.address || ""} onValue={(value) => onSetLeadForm({ ...leadForm, address: value })} placeholder="Endereço (opcional)" />
            </div>
            <div className="mt-5 flex gap-2"><button onClick={closeNewLead} className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-zinc-400">Cancelar</button><button onClick={submitNewLead} className="flex-1 rounded-xl bg-[var(--secondary)] px-4 py-3 text-sm font-bold text-white">Adicionar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
