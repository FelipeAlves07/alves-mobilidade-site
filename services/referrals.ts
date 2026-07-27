import { supabase } from "@/lib/supabase";
import type { Referral } from "@/domain/referral/types";

function toCamelCase(row: any): Referral {
  return {
    id: row.id,
    referrer: row.referrer,
    referred: row.referred,
    status: row.status,
    credits: row.credits,
  };
}

export async function listarReferrals(): Promise<Referral[]> {
  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toCamelCase);
}

export async function criarReferral(ref: Omit<Referral, "id">): Promise<Referral> {
  const { data, error } = await supabase
    .from("referrals")
    .insert({
      referrer: ref.referrer,
      referred: ref.referred,
      status: ref.status,
      credits: ref.credits,
    })
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function editarReferral(id: string, patch: Partial<Referral>): Promise<Referral> {
  const { data, error } = await supabase
    .from("referrals")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function excluirReferral(id: string): Promise<void> {
  const { error } = await supabase.from("referrals").delete().eq("id", id);
  if (error) throw error;
}
