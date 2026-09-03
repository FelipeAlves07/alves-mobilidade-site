export type FinanceType = "Entrada" | "Saída";

export type FinanceCategory =
  | "ganhos_app"
  | "ganhos_ame"
  | "gastos_alimentacao"
  | "gastos_combustivel"
  | "outros";

export interface FinanceEntry {
  id: string;
  description: string;
  value: number;
  type: FinanceType;
  date: string;
  category?: FinanceCategory;
  tripId?: string;
}

export interface FinanceEntryForm extends Omit<FinanceEntry, "id"> {}
