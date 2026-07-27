import { supabase } from "@/lib/supabase";
import type { CompanySettings } from "./types";

export async function fetchCompanySettings(): Promise<CompanySettings | null> {
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (error || !data) return null;
  return data as CompanySettings;
}
