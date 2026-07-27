"use client";

import Panel from "@/components/admin/Panel";

interface MarketingViewProps {
  completedMarketing: string[];
  onCompleteTask: (id: string) => void;
  onResetTasks: () => void;
}

export default function MarketingView({ completedMarketing, onCompleteTask, onResetTasks }: MarketingViewProps) {
  const day = new Date().getDay();
  const suggestions = [
    { id: "story-aeroporto", title: "Story sobre aeroporto", text: "Poste uma imagem limpa do veículo e fale: vai para Confins? Agende seu transfer executivo.", url: "https://www.instagram.com/" },
    { id: "feed-bh", title: "Post no feed com imagem de BH", text: "Use uma imagem com Belo Horizonte ao fundo e destaque conforto, segurança e pontualidade.", url: "https://www.instagram.com/" },
    { id: "indicacao", title: "Programa de Indicação", text: "Envie a arte do Programa de Indicação para clientes que já viajaram com você.", url: "https://web.whatsapp.com/" },
    { id: "empresas", title: "Prospecção de empresas", text: "Faça contato com empresas de BH oferecendo transporte para diretoria, clientes e eventos.", url: "https://www.google.com/maps/search/empresas+em+Belo+Horizonte" },
    { id: "hoteis-prospeccao", title: "Buscar hotéis para prospecção", text: "Abra uma lista de hotéis de BH no Google Maps e cadastre os contatos bons na aba Prospecção.", url: "https://www.google.com/maps/search/hot%C3%A9is+em+Belo+Horizonte" },
    { id: "conteudo-educativo", title: "Conteúdo educativo", text: "Explique quanto tempo antes sair de BH para pegar voo em Confins.", url: "https://www.instagram.com/" },
  ];
  const ordered = [...suggestions.slice(day % suggestions.length), ...suggestions.slice(0, day % suggestions.length)];
  return (
    <div className="space-y-6">
      <Panel title="Sugestões inteligentes de marketing">
        <p className="mb-5 text-sm text-zinc-400">As sugestões mudam conforme o dia. Clique em abrir, execute a ação e marque como concluída.</p>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {ordered.map((item) => {
            const done = completedMarketing.includes(item.id);
            return <div key={item.id} className={`rounded-xl border p-5 ${done ? "border-emerald-400/25 bg-emerald-400/5" : "border-[var(--accent-10)] bg-[var(--bg-card)]"}`}>
              <h3 className="text-lg font-black">{item.title}</h3>
              <p className="mt-3 leading-6 text-zinc-400">{item.text}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => window.open(item.url, "_blank")} className="rounded-xl bg-[var(--secondary)] px-4 py-2.5 text-xs font-bold text-white">Abrir caminho</button>
                <button onClick={() => onCompleteTask(item.id)} className="rounded-xl border border-[var(--accent-20)] px-4 py-2.5 text-xs font-bold text-[var(--accent)]">{done ? "Concluído ✓" : "Marcar feito"}</button>
              </div>
            </div>;
          })}
        </div>
        <button onClick={onResetTasks} className="mt-5 rounded-xl border border-[var(--accent-20)] px-4 py-2.5 text-xs font-bold text-[var(--accent)]">Limpar concluídos</button>
      </Panel>
    </div>
  );
}
