export type MessageKey =
  | "apresentacao"
  | "indicacao"
  | "followup"
  | "agradecimento"
  | "orcamento"
  | "confirmacao";

export interface MarketingSuggestion {
  id: string;
  title: string;
  text: string;
  url: string;
}
