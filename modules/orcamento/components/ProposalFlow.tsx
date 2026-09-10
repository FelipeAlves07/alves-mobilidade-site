"use client";

import { useState } from "react";
import ClientSelect from "@/components/admin/ClientSelect";
import Panel from "@/components/admin/Panel";
import { money } from "@/lib/quotes";
import { cleanPhone } from "@/lib/whatsapp";
import type { Lead } from "@/domain/lead/types";
import type { Proposal } from "@/domain/proposal/types";
import type { QuoteResult2 } from "@/domain/quote/types";
import { buildPremiumProposalMessage, downloadPremiumProposalImage, downloadPremiumProposalPdf, proposalValidityISO } from "@/modules/propostas/services/propostas.service";
import { quoteResultToProposalDraft } from "../services/proposal.mapper";

interface ProposalFlowProps {
  result: QuoteResult2 | null;
  leads: Lead[];
  proposals: Proposal[];
  onAdd: (proposal: Omit<Proposal, "id" | "createdAt">) => Promise<Proposal>;
  onUpdate: (id: string, patch: Partial<Proposal>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onConvert: (proposal: Proposal) => Promise<void>;
  qrDataUrl: string;
}

function whatsappUrl(phone: string, message: string) {
  const number = cleanPhone(phone);
  return `https://wa.me/${number ? (number.startsWith("55") ? number : `55${number}`) : ""}?text=${encodeURIComponent(message)}`;
}

export default function ProposalFlow({ result, leads, proposals, onAdd, onUpdate, onDelete, onConvert, qrDataUrl }: ProposalFlowProps) {
  const [client, setClient] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [bags, setBags] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Proposal | null>(null);

  const preview = result ? (() => {
    const draft = quoteResultToProposalDraft(result, { client, phone, date, time, bags, validUntil: proposalValidityISO(10), message: "" });
    const proposal: Proposal = { ...draft, id: "preview", createdAt: new Date().toISOString() };
    proposal.message = buildPremiumProposalMessage(proposal);
    return proposal;
  })() : null;
  const canSave = !!preview && !!client.trim() && !!phone.trim() && !!date && !!time && !!preview.origin && !!preview.destination;

  async function savePreview() {
    if (!preview || !canSave) return;
    setSaving(true);
    try {
      const { id: _id, createdAt: _createdAt, ...draft } = preview;
      await onAdd(draft);
    } catch (error) {
      console.error("Erro ao salvar proposta:", error);
      alert("Não foi possível salvar a proposta.");
    } finally {
      setSaving(false);
    }
  }

  async function convertPreview() {
    if (!preview || !canSave) return;
    setSaving(true);
    try {
      const { id: _id, createdAt: _createdAt, ...draft } = preview;
      const saved = await onAdd(draft);
      await onConvert(saved);
    } catch (error) {
      console.error("Erro ao converter proposta:", error);
      alert("Não foi possível converter a proposta em viagem.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const updated = { ...editing, message: "" };
    updated.message = buildPremiumProposalMessage(updated);
    try {
      await onUpdate(editing.id, updated);
      setEditing(null);
    } catch (error) {
      console.error("Erro ao editar proposta:", error);
      alert("Não foi possível salvar a edição da proposta.");
    }
  }

  return <div className="space-y-5">
    {preview ? <div className="rounded-xl border border-[var(--accent-20)] bg-black p-5" style={{ boxShadow: "0 25px 90px rgba(0,0,0,.35)" }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Proposta comercial</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <ClientSelect leads={leads} value={client} placeholder="Cliente" onSelect={(lead) => { setClient(lead.name); setPhone(lead.phone); }} />
        <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="WhatsApp" className="input-admin" />
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="input-admin" />
        <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="input-admin" />
        <input type="number" min={0} value={bags} onChange={(event) => setBags(Number(event.target.value))} placeholder="Malas" className="input-admin" />
      </div>
      <div className="mt-5 rounded-xl border border-[var(--accent-15)] bg-[var(--bg-primary)] p-4">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs text-[var(--accent)]">{preview.client}</p><strong>{preview.origin} → {preview.destination}</strong><p className="mt-1 text-xs text-zinc-500">{preview.km} km • {preview.passengers} passageiro(s) • {preview.bags} mala(s)</p></div><strong className="text-3xl text-[var(--accent)]">{money(preview.value)}</strong></div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={saving || !canSave} onClick={savePreview} className="rounded-xl bg-[var(--secondary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Salvar proposta</button>
          <button onClick={() => downloadPremiumProposalImage(preview, qrDataUrl)} className="rounded-xl border border-[var(--accent-25)] px-4 py-2 text-xs font-bold text-[var(--accent)]">PNG</button>
          <button onClick={() => downloadPremiumProposalPdf(preview, qrDataUrl)} className="rounded-xl border border-[var(--accent-25)] px-4 py-2 text-xs font-bold text-[var(--accent)]">PDF</button>
          <a href={whatsappUrl(preview.phone, preview.message)} target="_blank" rel="noreferrer" className="rounded-xl border border-[#25D366]/40 px-4 py-2 text-xs font-bold text-[#25D366]">WhatsApp</a>
          <button disabled={saving || !canSave} onClick={convertPreview} className="rounded-xl border border-[var(--accent-25)] px-4 py-2 text-xs font-bold text-[var(--accent)] disabled:opacity-50">Converter em viagem</button>
        </div>
      </div>{!canSave && <p className="mt-3 text-xs text-yellow-200">Informe cliente, WhatsApp, data e horário para salvar ou converter a proposta.</p>}
    </div> : <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-surface)] p-5 text-sm text-zinc-400">Calcule um orçamento para gerar a prévia da proposta comercial.</div>}
    <Panel title="Histórico de propostas">
      {!proposals.length ? <p className="text-zinc-400">Nenhuma proposta salva ainda.</p> : <div className="grid gap-3">{proposals.map((proposal) => <div key={proposal.id} className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-4">
        {editing?.id === proposal.id ? <div className="grid gap-3 md:grid-cols-2"><input value={editing.client} onChange={(e) => setEditing({ ...editing, client: e.target.value })} className="input-admin" /><input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} className="input-admin" /><input value={editing.origin} onChange={(e) => setEditing({ ...editing, origin: e.target.value })} className="input-admin" /><input value={editing.destination} onChange={(e) => setEditing({ ...editing, destination: e.target.value })} className="input-admin" /><input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} className="input-admin" /><input type="time" value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })} className="input-admin" /><button onClick={saveEdit} className="rounded-xl bg-[var(--secondary)] px-4 py-2 text-xs font-bold text-white">Salvar edição</button><button onClick={() => setEditing(null)} className="text-xs text-zinc-400">Cancelar</button></div> : <div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{proposal.client}</strong><p className="text-sm text-zinc-400">{proposal.origin} → {proposal.destination}</p><p className="text-xs text-zinc-500">{proposal.date || "A combinar"} {proposal.time} • {proposal.status}</p></div><strong className="text-xl text-[var(--accent)]">{money(proposal.value)}</strong><div className="flex flex-wrap gap-2"><button onClick={() => setEditing(proposal)} className="text-xs text-[var(--accent)]">Editar</button><button onClick={() => downloadPremiumProposalImage(proposal, qrDataUrl)} className="text-xs text-[var(--accent)]">PNG</button><button onClick={() => downloadPremiumProposalPdf(proposal, qrDataUrl)} className="text-xs text-[var(--accent)]">PDF</button><a href={whatsappUrl(proposal.phone, proposal.message)} target="_blank" rel="noreferrer" className="text-xs text-[#25D366]">WhatsApp</a><button disabled={proposal.status === "Convertida"} onClick={() => onConvert(proposal)} className="text-xs text-[var(--accent)] disabled:opacity-50">{proposal.status === "Convertida" ? "Convertida" : "Virar viagem"}</button><button onClick={() => onDelete(proposal.id)} className="text-xs text-red-300">Excluir</button></div></div>}
      </div>)}</div>}
    </Panel>
  </div>;
}
