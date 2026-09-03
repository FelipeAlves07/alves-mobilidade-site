"use client";

import { Download } from "lucide-react";
import Panel from "@/components/admin/Panel";
import AISuggestions from "@/components/admin/AISuggestions";
import type { DashboardStats } from "@/domain/shared/types";
import type { Lead } from "@/domain/lead/types";
import type { MessageKey } from "@/domain/marketing/types";

interface AIViewProps {
  stats: DashboardStats;
  leads: Lead[];
  today: string;
  onExportBackup: () => void;
  onSendLeadMessage: (lead: Lead, key: MessageKey) => void;
  onCompleteAction: (lead: Lead) => void;
}

export default function AIView({ stats, leads, today, onExportBackup, onSendLeadMessage, onCompleteAction }: AIViewProps) {
  return (
    <Panel title="IA da Alves">
      <AISuggestions
        leads={leads}
        pending={stats.pending.length}
        trips={stats.todayTrips.length}
        credits={stats.credits}
        today={today}
        onSendLeadMessage={onSendLeadMessage}
        onCompleteAction={onCompleteAction}
      />
      <button onClick={onExportBackup} className="mt-6 rounded-xl border border-[var(--accent-20)] px-5 py-3 text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">
        <Download className="inline" size={18} /> Baixar backup dos dados
      </button>
    </Panel>
  );
}
