"use client";

import { Plus } from "lucide-react";
import VoiceInput from "@/components/admin/VoiceInput";
import Panel from "@/components/admin/Panel";
import type { Referral } from "@/domain/referral/types";

interface IndicacoesViewProps {
  refForm: Omit<Referral, "id">;
  referrals: Referral[];
  onSetRefForm: (form: Omit<Referral, "id">) => void;
  onAddReferral: () => void;
  onCreditReferral: (item: Referral) => void;
  onDeleteReferral: (id: string) => void;
}

export default function IndicacoesView({
  refForm, referrals, onSetRefForm, onAddReferral, onCreditReferral, onDeleteReferral,
}: IndicacoesViewProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6">
        <h3 className="text-xl font-black">Nova indicação</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <VoiceInput value={refForm.referrer} onValue={(value) => onSetRefForm({ ...refForm, referrer: value })} placeholder="Quem indicou" />
          <VoiceInput value={refForm.referred} onValue={(value) => onSetRefForm({ ...refForm, referred: value })} placeholder="Indicado" />
          <select value={refForm.status} onChange={(e) => onSetRefForm({ ...refForm, status: e.target.value as Referral["status"] })} className="input-admin"><option>Indicado</option><option>Transfer realizado</option><option>Transfer creditado</option></select>
          <button onClick={onAddReferral} className="rounded-xl bg-[var(--secondary)] px-5 py-4 font-bold text-white transition hover:opacity-90"><Plus className="inline" size={18} /> Adicionar</button>
        </div>
      </div>
      <Panel title="Programa de Indicação"><div className="grid gap-4">{referrals.map((item) => <div key={item.id} className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-5"><p><strong>{item.referrer}</strong> indicou <strong>{item.referred}</strong></p><p className="mt-2 text-sm text-zinc-400">Status: {item.status}</p><p className="mt-2 text-[var(--accent)]">Créditos acumulados: {item.credits}</p><div className="mt-4 flex gap-2"><button onClick={() => onCreditReferral(item)} className="rounded-xl bg-[var(--secondary)] px-4 py-2 text-xs font-bold text-white transition hover:opacity-90">Creditar transfer</button><button onClick={() => onDeleteReferral(item.id)} className="rounded-xl border border-red-500/30 px-4 py-2 text-xs font-bold text-red-300">Remover</button></div></div>)}</div></Panel>
    </div>
  );
}
