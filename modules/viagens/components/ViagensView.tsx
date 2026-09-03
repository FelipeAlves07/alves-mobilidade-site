"use client";

import { Download } from "lucide-react";
import Panel from "@/components/admin/Panel";
import TripList from "@/components/admin/TripList";
import { downloadCSV } from "@/lib/csv";
import type { Trip } from "@/domain/trip/types";

interface ViagensViewProps {
  trips: Trip[];
  onFinishTrip: (trip: Trip) => void;
  onDeleteTrip: (id: string) => void;
}

// Histórico de viagens: lista completa (concluídas, canceladas e
// agendadas) com exportação em CSV. A operação do dia fica na Agenda.
export default function ViagensView({ trips, onFinishTrip, onDeleteTrip }: ViagensViewProps) {
  const history = [...trips].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  return (
    <div className="space-y-6">
      <Panel
        title="Histórico de viagens"
        extra={
          <button onClick={() => downloadCSV(trips, "viagens-export.csv")} className="shrink-0 cursor-pointer rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-zinc-400 transition hover:text-white">
            <Download size={13} className="inline" /> CSV
          </button>
        }
      >
        {history.length === 0 ? (
          <p className="px-4 py-4 text-sm text-zinc-400">Nenhuma viagem registrada ainda.</p>
        ) : (
          <TripList trips={history} onFinish={onFinishTrip} onDelete={onDeleteTrip} />
        )}
      </Panel>
    </div>
  );
}
