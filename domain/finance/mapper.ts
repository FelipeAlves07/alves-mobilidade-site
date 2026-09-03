import type { FinanceEntry, FinanceEntryForm } from "./types";

export interface FinanceDatabase {
  id: string;
  description: string;
  value: number;
  type: string;
  date: string;
  category?: string;
  trip_id?: string;
}

export function financeToDatabase(entry: FinanceEntry): FinanceDatabase {
  return {
    ...entry,
    trip_id: entry.tripId,
  };
}

export function financeFromDatabase(db: FinanceDatabase): FinanceEntry {
  return {
    id: db.id,
    description: db.description,
    value: db.value,
    type: db.type as FinanceEntry["type"],
    date: db.date,
    category: (db.category || "") as FinanceEntry["category"],
    tripId: db.trip_id,
  };
}

export function financeFormToDatabase(form: FinanceEntryForm): Omit<FinanceDatabase, "id"> {
  return {
    ...form,
    type: form.type,
    trip_id: form.tripId,
  };
}
