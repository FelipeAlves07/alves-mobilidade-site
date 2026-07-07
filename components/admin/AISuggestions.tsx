type AISuggestionsProps = {
  pending: number;
  trips: number;
  credits: number;
};

export default function AISuggestions({
  pending,
  trips,
  credits,
}: AISuggestionsProps) {
  const suggestions = [
    pending > 0
      ? `Você tem ${pending} follow-up(s) pendente(s). Priorize esses contatos hoje.`
      : "Nenhum follow-up pendente. Bom momento para prospectar novos contatos.",
    trips > 0
      ? `Você tem ${trips} viagem(ns) agendada(s) hoje. Confirme os detalhes com antecedência.`
      : "Nenhuma viagem agendada hoje. Aproveite para fortalecer a prospecção.",
    credits > 0
      ? `Existem ${credits} crédito(s) de indicação acumulado(s). Confira se algum cliente precisa ser avisado.`
      : "Nenhum crédito de indicação pendente no momento.",
  ];

  return (
    <div className="space-y-3">
      {suggestions.map((item) => (
        <div
          key={item}
          className="rounded-2xl border border-[#d6a85f]/10 bg-[#202020] p-4 text-sm leading-7 text-zinc-300"
        >
          {item}
        </div>
      ))}
    </div>
  );
}