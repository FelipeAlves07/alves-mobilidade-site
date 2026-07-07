export type FinanceEntry = {
  id: string;
  description: string;
  value: number;
  type: "Entrada" | "Saída";
  date: string;
};