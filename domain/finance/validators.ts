import type { FinanceEntry, FinanceEntryForm } from "./types";

export function validateFinanceForm(form: FinanceEntryForm): string | null {
  if (!form.description.trim()) return "Descrição é obrigatória";
  if (!form.value || form.value <= 0) return "Valor deve ser maior que zero";
  return null;
}

export function validateFinance(entry: FinanceEntry): string | null {
  return validateFinanceForm(entry);
}
