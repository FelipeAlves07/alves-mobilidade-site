export type FinanceType = "Entrada" | "Saída";

export interface FinanceEntry {
  id: string;
  description: string;
  value: number;
  type: FinanceType;
  date: string;
}

export interface FinanceEntryForm extends Omit<FinanceEntry, "id"> {}
