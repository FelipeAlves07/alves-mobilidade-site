import type { Lead, LeadForm } from "./types";

export function validateLeadForm(form: LeadForm): string | null {
  if (!form.name.trim()) return "Nome é obrigatório";
  if (!form.phone.trim()) return "WhatsApp é obrigatório";
  return null;
}

export function validateLead(lead: Lead): string | null {
  return validateLeadForm(lead);
}
