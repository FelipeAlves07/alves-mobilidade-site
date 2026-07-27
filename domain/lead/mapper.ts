import type { Lead, LeadForm } from "./types";

export interface LeadDatabase {
  id: string;
  name: string;
  phone: string;
  type: string;
  origin: string;
  status: string;
  notes: string;
  next_action: string;
  next_date: string;
  created_at: string;
  last_contact?: string;
}

export function leadToDatabase(lead: Lead): LeadDatabase {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    type: lead.type,
    origin: lead.origin,
    status: lead.status,
    notes: lead.notes,
    next_action: lead.nextAction,
    next_date: lead.nextDate,
    created_at: lead.createdAt,
    last_contact: lead.lastContact,
  };
}

export function leadFromDatabase(db: LeadDatabase): Lead {
  return {
    id: db.id,
    name: db.name,
    phone: db.phone,
    type: db.type as Lead["type"],
    origin: db.origin,
    status: db.status as Lead["status"],
    notes: db.notes,
    nextAction: db.next_action,
    nextDate: db.next_date,
    createdAt: db.created_at,
    lastContact: db.last_contact,
  };
}

export function leadFormToDatabase(form: LeadForm): Omit<LeadDatabase, "id" | "created_at"> {
  return {
    name: form.name,
    phone: form.phone,
    type: form.type,
    origin: form.origin,
    status: form.status,
    notes: form.notes,
    next_action: form.nextAction,
    next_date: form.nextDate,
  };
}
