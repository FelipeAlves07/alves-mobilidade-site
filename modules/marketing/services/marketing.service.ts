export interface MarketingSuggestionItem {
  id: string;
  title: string;
  text: string;
  url: string;
}

export const MARKETING_SUGGESTIONS: MarketingSuggestionItem[] = [
  { id: "story-aeroporto", title: "Story sobre aeroporto", text: "Poste uma imagem limpa do veículo e fale: vai para Confins? Agende seu transfer executivo.", url: "https://www.instagram.com/" },
  { id: "feed-bh", title: "Post no feed com imagem de BH", text: "Use uma imagem com Belo Horizonte ao fundo e destaque conforto, segurança e pontualidade.", url: "https://www.instagram.com/" },
  { id: "indicacao", title: "Programa de Indicação", text: "Envie a arte do Programa de Indicação para clientes que já viajaram com você.", url: "https://web.whatsapp.com/" },
  { id: "empresas", title: "Prospecção de empresas", text: "Faça contato com empresas de BH oferecendo transporte para diretoria, clientes e eventos.", url: "https://www.google.com/maps/search/empresas+em+Belo+Horizonte" },
  { id: "hoteis-prospeccao", title: "Buscar hotéis para prospecção", text: "Abra uma lista de hotéis de BH no Google Maps e cadastre os contatos bons na aba Prospecção.", url: "https://www.google.com/maps/search/hot%C3%A9is+em+Belo+Horizonte" },
  { id: "conteudo-educativo", title: "Conteúdo educativo", text: "Explique quanto tempo antes sair de BH para pegar voo em Confins.", url: "https://www.instagram.com/" },
];

// Rotação diária: a ordem muda conforme o dia da semana, então as
// sugestões aparecem em posições diferentes ao longo da semana.
export function getMarketingRotation(suggestions: MarketingSuggestionItem[], day: number): MarketingSuggestionItem[] {
  const total = suggestions.length;
  if (total === 0) return [];
  const offset = ((day % total) + total) % total;
  return [...suggestions.slice(offset), ...suggestions.slice(0, offset)];
}

// Sugestões visíveis no dia: as concluídas HOJE somem (não voltam com
// recarregar) e retornam em outro dia, quando a rotação as reposiciona.
export function buildVisibleSuggestions(
  suggestions: MarketingSuggestionItem[],
  day: number,
  doneTodayIds: string[],
): MarketingSuggestionItem[] {
  return getMarketingRotation(suggestions, day).filter((s) => !doneTodayIds.includes(s.id));
}
