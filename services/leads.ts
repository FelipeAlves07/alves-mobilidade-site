import { supabase } from "@/lib/supabase";
import type { Lead, LeadForm, LeadStatus, LeadType } from "@/domain/lead/types";

function toCamelCase(row: any): Lead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    type: row.type as LeadType,
    origin: row.origin,
    status: row.status as LeadStatus,
    notes: row.notes,
    nextAction: row.next_action,
    nextDate: row.next_date,
    createdAt: row.created_at,
    lastContact: row.last_contact,
  };
}

function toSnakeCase(lead: LeadForm) {
  return {
    name: lead.name,
    phone: lead.phone,
    type: lead.type,
    origin: lead.origin,
    status: lead.status,
    notes: lead.notes,
    next_action: lead.nextAction,
    next_date: lead.nextDate || null,
  };
}

export async function listarLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toCamelCase);
}

export async function criarLead(lead: LeadForm): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .insert(toSnakeCase(lead))
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function editarLead(id: string, patch: Partial<LeadForm>): Promise<Lead> {
  const { data, error } = await supabase
    .from("leads")
    .update(toSnakeCase(patch as LeadForm))
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function excluirLead(id: string): Promise<void> {
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw error;
}
