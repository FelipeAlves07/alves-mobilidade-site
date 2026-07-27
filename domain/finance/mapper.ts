import type { FinanceEntry, FinanceEntryForm } from "./types";

export interface FinanceDatabase {
  id: string;
  description: string;
  value: number;
  type: string;
  date: string;
}

export function financeToDatabase(entry: FinanceEntry): FinanceDatabase {
  return { ...entry };
}

export function financeFromDatabase(db: FinanceDatabase): FinanceEntry {
  return {
    ...db,
    type: db.type as FinanceEntry["type"],
  };
}

export function financeFormToDatabase(form: FinanceEntryForm): Omit<FinanceDatabase, "id"> {
  return { ...form, type: form.type };
}
