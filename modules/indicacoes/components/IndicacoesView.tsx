"use client";

import { Plus, Trash2, Ticket } from "lucide-react";
import VoiceInput from "@/components/admin/VoiceInput";
import Panel from "@/components/admin/Panel";
import ClientSelect from "@/components/admin/ClientSelect";
import type { Referral } from "@/domain/referral/types";
import type { Lead } from "@/domain/lead/types";

interface IndicacoesViewProps {
  leads: Lead[];
  refForm: Omit<Referral, "id">;
  referrals: Referral[];
  onSetRefForm: (form: Omit<Referral, "id">) => void;
  onAddReferral: () => void;
  onCreditReferral: (item: Referral) => void;
  onDeleteReferral: (id: string) => void;
}

const STATUS_COLORS: Record<Referral["status"], string> = {
  "Pendente": "bg-amber-500/15 text-amber-300",
  "Convertida": "bg-emerald-500/15 text-emerald-300",
  "Cancelada": "bg-red-500/15 text-red-300",
};

export default function IndicacoesView({
  leads, refForm, referrals, onSetRefForm, onAddReferral, onCreditReferral, onDeleteReferral,
}: IndicacoesViewProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6">
        <h3 className="text-xl font-black">Nova indicação</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <ClientSelect
            leads={leads}
            value={refForm.referrer}
            placeholder="Quem indicou"
            onSelect={(lead) => onSetRefForm({ ...refForm, referrer: lead.name, referrerPhone: lead.phone })}
          />
          <ClientSelect
            leads={leads}
            value={refForm.referred}
            placeholder="Indicado"
            onSelect={(lead) => onSetRefForm({ ...refForm, referred: lead.name, referredPhone: lead.phone })}
          />
          <select value={refForm.status} onChange={(e) => onSetRefForm({ ...refForm, status: e.target.value as Referral["status"] })} className="input-admin">
            <option>Pendente</option><option>Convertida</option><option>Cancelada</option>
          </select>
          <button onClick={onAddReferral} className="rounded-xl bg-[var(--secondary)] px-5 py-4 font-bold text-white transition hover:opacity-90"><Plus className="inline" size={18} /> Adicionar</button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">Dica: ao digitar o nome, o cliente é buscado automaticamente na lista de contatos e os telefones são preenchidos.</p>
      </div>
      <Panel title="Programa de Indicação">
        <div className="grid gap-4">
          {referrals.length === 0 && <p className="px-4 py-4 text-sm text-zinc-400">Nenhuma indicação cadastrada ainda.</p>}
          {referrals.map((item) => (
            <div key={item.id} className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p><strong>{item.referrer}</strong> indicou <strong>{item.referred}</strong></p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.referrerPhone && <span>Indicou: {item.referrerPhone} • </span>}
                    {item.referredPhone && <span>Indicado: {item.referredPhone}</span>}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${STATUS_COLORS[item.status]}`}>{item.status}</span>
              </div>
              <p className="mt-2 text-[var(--accent)]"><Ticket className="inline" size={14} /> Créditos acumulados: {item.credits} de 3</p>
              <div className="mt-4 flex gap-2">
                {item.status === "Pendente" && (
                  <button onClick={() => onCreditReferral(item)} className="rounded-xl bg-[var(--secondary)] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90">Creditar transfer</button>
                )}
                <button onClick={() => onDeleteReferral(item.id)} className="rounded-xl border border-red-500/30 px-4 py-2 text-xs font-bold text-red-300"><Trash2 size={12} className="inline" /> Remover</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
