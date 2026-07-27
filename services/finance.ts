import { supabase } from "@/lib/supabase";
import type { FinanceEntry, FinanceEntryForm, FinanceType } from "@/domain/finance/types";

function toCamelCase(row: any): FinanceEntry {
  return {
    id: row.id,
    description: row.description,
    value: Number(row.value),
    type: row.type as FinanceType,
    date: row.date,
  };
}

function toSnakeCase(entry: FinanceEntryForm) {
  return {
    description: entry.description,
    value: entry.value,
    type: entry.type,
    date: entry.date,
  };
}

export async function listarFinanceEntries(): Promise<FinanceEntry[]> {
  const { data, error } = await supabase
    .from("finance_entries")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toCamelCase);
}

export async function criarFinanceEntry(entry: FinanceEntryForm): Promise<FinanceEntry> {
  const { data, error } = await supabase
    .from("finance_entries")
    .insert(toSnakeCase(entry))
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function excluirFinanceEntry(id: string): Promise<void> {
  const { error } = await supabase.from("finance_entries").delete().eq("id", id);
  if (error) throw error;
}
