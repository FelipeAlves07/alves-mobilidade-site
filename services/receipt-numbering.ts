import { supabase } from "@/lib/supabase";

/**
 * Atomic receipt number allocation using PostgreSQL sequence per year.
 * Returns formatted number: "NNNN/AAAA" (minimum 4 digits, no upper limit)
 */
export async function allocateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const { data, error } = await supabase.rpc("next_receipt_number", {
    p_year: year,
  });

  if (error) {
    throw new Error(`Erro ao alocar número de recibo: ${error.message}`);
  }

  // Format: minimum 4 digits, no upper limit (1 -> 0001, 10000 -> 10000)
  const padded = String(data).padStart(4, "0");
  return `${padded}/${year}`;
}

/**
 * Get the next receipt number without allocating (for preview).
 * This queries the current counter state.
 * Does NOT increment the counter.
 */
export async function peekNextReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();

  const { data, error } = await supabase
    .from("receipt_counters")
    .select("last_number")
    .eq("year", year)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Erro ao consultar contador: ${error.message}`);
  }

  const next = (data?.last_number ?? 0) + 1;
  return `${String(next).padStart(4, "0")}/${year}`;
}

/**
 * Reset counter for a specific year (admin operation).
 */
export async function resetReceiptCounter(year: number): Promise<void> {
  const { error } = await supabase
    .from("receipt_counters")
    .upsert({ year, last_number: 0 });

  if (error) {
    throw new Error(`Erro ao resetar contador: ${error.message}`);
  }
}

/**
 * Set counter to a specific value (for migration/initial setup).
 */
export async function setReceiptCounter(year: number, lastNumber: number): Promise<void> {
  const { error } = await supabase
    .from("receipt_counters")
    .upsert({ year, last_number: lastNumber });

  if (error) {
    throw new Error(`Erro ao definir contador: ${error.message}`);
  }
}