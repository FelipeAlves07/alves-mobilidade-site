import { supabase } from "@/lib/supabase";
import type { Proposal, ProposalStatus } from "@/domain/proposal/types";

function toCamelCase(row: any): Proposal {
  return {
    id: row.id,
    client: row.client,
    phone: row.phone,
    origin: row.origin,
    destination: row.destination,
    date: row.date,
    time: row.time,
    km: Number(row.km),
    passengers: row.passengers,
    bags: row.bags,
    value: Number(row.value),
    status: row.status as ProposalStatus,
    createdAt: row.created_at,
    validUntil: row.valid_until,
    message: row.message,
  };
}

export async function listarProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toCamelCase);
}

export async function criarProposal(proposal: Omit<Proposal, "id" | "createdAt">): Promise<Proposal> {
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      client: proposal.client,
      phone: proposal.phone,
      origin: proposal.origin,
      destination: proposal.destination,
      date: proposal.date || null,
      time: proposal.time || null,
      km: proposal.km,
      passengers: proposal.passengers,
      bags: proposal.bags,
      value: proposal.value,
      status: proposal.status,
      valid_until: proposal.validUntil || null,
      message: proposal.message,
    })
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function editarProposal(id: string, patch: Partial<Proposal>): Promise<Proposal> {
  const { data, error } = await supabase
    .from("proposals")
    .update({
      status: patch.status,
      message: patch.message,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function excluirProposal(id: string): Promise<void> {
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw error;
}
