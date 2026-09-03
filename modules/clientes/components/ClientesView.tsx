"use client";

import { Plus, Import, Search, FileText, Download } from "lucide-react";
import { useRef } from "react";
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

type Messages = Record<string, string>;

export default function ClientesView({
  leads, query, leadForm, importText, showImport, title, leadTypes,
  onSetQuery, onSetLeadForm, onSetImportText,
  onAddLead, onUpdateLead, onDeleteLead, onCompleteAction, onSendLeadMessage, onImportLeads,
}: ClientesViewProps) {
  const fileRef = useRef<HTMLInputElement>(null);

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

  const filteredLeads = leads.filter((lead) =>
    `${lead.name} ${lead.phone} ${lead.type} ${lead.status} ${lead.origin}`.toLowerCase().includes(query.toLowerCase())
  );

  function renderLeadForm() {
    return (
      <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6">
        <h3 className="text-xl font-black">Novo contato</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <VoiceInput value={leadForm.name} onValue={(value) => onSetLeadForm({ ...leadForm, name: value })} placeholder="Nome" />
          <VoiceInput value={leadForm.phone} onValue={(value) => onSetLeadForm({ ...leadForm, phone: value })} placeholder="WhatsApp" />
          <select value={leadForm.type} onChange={(e) => onSetLeadForm({ ...leadForm, type: e.target.value as LeadType })} className="input-admin">{leadTypes.map((type) => <option key={type}>{type}</option>)}</select>
          <VoiceInput value={leadForm.origin} onValue={(value) => onSetLeadForm({ ...leadForm, origin: value })} placeholder="Origem do contato" />
          <select value={leadForm.nextAction} onChange={(e) => onSetLeadForm({ ...leadForm, nextAction: e.target.value })} className="input-admin md:col-span-2">
            {nextActionOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <input type="date" value={leadForm.nextDate} onChange={(e) => onSetLeadForm({ ...leadForm, nextDate: e.target.value })} className="input-admin" />
          <VoiceInput value={leadForm.address || ""} onValue={(value) => onSetLeadForm({ ...leadForm, address: value })} placeholder="Endereço (opcional)" className="md:col-span-2" />
          <button onClick={onAddLead} className="rounded-xl bg-[var(--secondary)] px-5 py-4 font-bold text-white transition hover:opacity-90"><Plus className="inline" size={18} /> Adicionar</button>
        </div>
      </div>
    );
  }

  function renderImport() {
    return (
      <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6">
        <h3 className="text-xl font-black">Importar contatos em massa</h3>
        <p className="mt-2 text-sm text-zinc-400">Cole um por linha no formato: Nome, telefone ou Nome: Nome , Contato: Telefone</p>
        <VoiceTextarea value={importText} onValue={onSetImportText} placeholder={"Nome: João , Contato: 31999999999\nNome: Maria , Contato: 31988888888"} className="mt-4 min-h-32" />
        <div className="mt-4 flex flex-wrap gap-3">
          <input ref={fileRef} type="file" accept=".txt" onChange={handleFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/5"><FileText size={16} /> Importar .txt</button>
          <button onClick={onImportLeads} className="inline-flex items-center gap-2 rounded-xl bg-[var(--secondary)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"><Import size={16} /> Importar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {renderLeadForm()}
      {showImport && renderImport()}
      <div className="flex items-center gap-3 rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] px-4 py-3">
        <Search size={18} className="text-[var(--accent)]" />
        <input value={query} onChange={(e) => onSetQuery(e.target.value)} placeholder="Buscar por nome, telefone, tipo ou status" className="w-full bg-transparent outline-none" />
        <button onClick={() => downloadCSV(leads, "clientes-export.csv")} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-400 transition hover:text-white"><Download size={13} className="inline" /> CSV</button>
      </div>
      <Panel title={title}>
        <div className="grid gap-4">
          {filteredLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} updateLead={onUpdateLead} deleteLead={onDeleteLead} completeAction={onCompleteAction} sendLeadMessage={onSendLeadMessage} />
          ))}
        </div>
      </Panel>
    </div>
  );
}
