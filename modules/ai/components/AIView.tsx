"use client";

import { Download } from "lucide-react";
import Panel from "@/components/admin/Panel";
import AISuggestions from "@/components/admin/AISuggestions";
import type { DashboardStats } from "@/domain/shared/types";

interface AIViewProps {
  stats: DashboardStats;
  onExportBackup: () => void;
}

export default function AIView({ stats, onExportBackup }: AIViewProps) {
  return (
    <Panel title="IA da Alves">
      <AISuggestions pending={stats.pending.length} trips={stats.todayTrips.length} credits={stats.credits} />
      <button onClick={onExportBackup} className="mt-6 rounded-xl border border-[var(--accent-20)] px-5 py-3 text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">
        <Download className="inline" size={18} /> Baixar backup dos dados
      </button>
    </Panel>
  );
}
