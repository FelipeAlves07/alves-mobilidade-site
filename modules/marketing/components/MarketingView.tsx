"use client";

import Panel from "@/components/admin/Panel";
import {
  MARKETING_SUGGESTIONS,
  buildVisibleSuggestions,
} from "@/modules/marketing/services/marketing.service";

export interface CompletedMarketingTask {
  id: string;
  completedAt: string;
}

interface MarketingViewProps {
  completedMarketing: CompletedMarketingTask[];
  onCompleteTask: (id: string) => void;
  onResetTasks: () => void;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}` : iso;
}

export default function MarketingView({ completedMarketing, onCompleteTask, onResetTasks }: MarketingViewProps) {
  const day = new Date().getDay();
  const doneTodayIds = completedMarketing.filter((c) => c.completedAt === todayISO()).map((c) => c.id);
  const visible = buildVisibleSuggestions(MARKETING_SUGGESTIONS, day, doneTodayIds);

  return (
    <div className="space-y-6">
      <Panel title="Sugestões inteligentes de marketing">
        <p className="mb-5 text-sm text-zinc-400">As sugestões mudam conforme o dia. Clique em abrir, execute a ação e marque como concluída: ela desaparece hoje e volta em outro dia.</p>
        {visible.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-5 py-6 text-center">
            <p className="text-sm font-medium text-emerald-400">Tudo feito hoje! Volte amanhã para novas sugestões.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => {
              const done = completedMarketing.find((c) => c.id === item.id);
              return <div key={item.id} className={`rounded-xl border p-5 ${done ? "border-emerald-400/25 bg-emerald-400/5" : "border-[var(--accent-10)] bg-[var(--bg-card)]"}`}>
                <h3 className="text-lg font-black">{item.title}</h3>
                <p className="mt-3 leading-6 text-zinc-400">{item.text}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => window.open(item.url, "_blank")} className="rounded-xl bg-[var(--secondary)] px-4 py-2.5 text-xs font-bold text-white">Abrir caminho</button>
                  <button onClick={() => onCompleteTask(item.id)} className="rounded-xl border border-[var(--accent-20)] px-4 py-2.5 text-xs font-bold text-[var(--accent)]">{done ? `Concluída em ${fmtDate(done.completedAt)}` : "Marcar feito"}</button>
                </div>
              </div>;
            })}
          </div>
        )}
        <button onClick={onResetTasks} className="mt-5 rounded-xl border border-[var(--accent-20)] px-4 py-2.5 text-xs font-bold text-[var(--accent)]">Limpar concluídos</button>
      </Panel>
    </div>
  );
}
