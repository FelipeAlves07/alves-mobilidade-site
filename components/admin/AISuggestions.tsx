import { CheckCircle2 } from "lucide-react";

export default function AISuggestions({ pending, trips, credits }: { pending: number; trips: number; credits: number }) {
  const items = [
    pending > 0 ? `Você tem ${pending} follow-up(s) pendente(s). Prioridade: resolver a fila hoje.` : "Sem follow-ups pendentes. Bom momento para prospectar novos contatos.",
    trips > 0 ? `Você tem ${trips} viagem(ns) hoje. Confirme horários e dados dos clientes.` : "Nenhuma viagem hoje. Foque em prospecção e parcerias.",
    credits > 0 ? `Existem ${credits} transfer(s) acumulado(s) no Programa de Indicação.` : "Apresente o Programa de Indicação para clientes satisfeitos.",
    "Meta diária sugerida: 10 novos contatos, 3 follow-ups e 1 contato com hotel ou empresa.",
  ];
  return <div className="grid gap-4">{items.map((item) => <div key={item} className="flex gap-3 rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-5"><CheckCircle2 className="shrink-0 text-[var(--accent)]" /><span>{item}</span></div>)}</div>;
}
