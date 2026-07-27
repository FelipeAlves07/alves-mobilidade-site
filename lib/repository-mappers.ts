import type { Lead, LeadForm } from "@/domain/lead/types";
import type { Trip, TripForm } from "@/domain/trip/types";
import type { FinanceEntry, FinanceEntryForm } from "@/domain/finance/types";
import type { Referral, ReferralForm } from "@/domain/referral/types";
import type { Proposal } from "@/domain/proposal/types";
import {
  leadFromDatabase,
  leadFormToDatabase,
} from "@/domain/lead/mapper";
import {
  tripFromDatabase,
} from "@/domain/trip/mapper";
import {
  financeFromDatabase,
} from "@/domain/finance/mapper";
import {
  referralFromDatabase,
} from "@/domain/referral/mapper";
import {
  proposalFromDatabase,
} from "@/domain/proposal/mapper";
import { splitRoute } from "@/lib/maps";
import { mapKeysToSnake } from "./utils/string";

// ─── Lead ↔ contacts ───────────────────────────────────────────
// DB: lead_status | domain: status

export function leadFromSupabase(row: Record<string, unknown>): Lead {
  return leadFromDatabase({
    id: row.id as string,
    name: row.name as string,
    phone: row.phone as string,
    type: row.type as string,
    origin: row.origin as string,
    status: (row.lead_status as string) || "",
    notes: row.notes as string,
    next_action: (row.next_action as string) || "",
    next_date: (row.next_date as string) || "",
    created_at: row.created_at as string,
    last_contact: row.last_contact as string,
  });
}

export function leadFormToSupabase(form: LeadForm): Record<string, unknown> {
  const db = leadFormToDatabase(form);
  const { status, ...rest } = db;
  return { ...rest, lead_status: status };
}

export function leadPatchToSupabase(patch: Partial<LeadForm>): Record<string, unknown> {
  const result = mapKeysToSnake(patch as Record<string, unknown>);
  if ("status" in result) {
    result.lead_status = result.status;
    delete result.status;
  }
  return result;
}

// ─── Trip ↔ trips ──────────────────────────────────────────────
// DB: client_name, client_phone, origin, destination | domain: client, phone, route

export function tripFromSupabase(row: Record<string, unknown>): Trip {
  return tripFromDatabase({
    id: row.id as string,
    client: (row.client_name as string) || "",
    phone: (row.client_phone as string) || "",
    date: row.date as string,
    time: row.time as string,
    route: `${row.origin || ""} → ${row.destination || ""}`,
    value: Number(row.value || 0),
    status: row.status as string,
    created_at: row.created_at as string,
  });
}

export function tripFormToSupabase(form: TripForm): Record<string, unknown> {
  const { origin, destination } = splitRoute(form.route);
  return {
    client_name: form.client,
    client_phone: form.phone,
    origin,
    destination,
    date: form.date,
    time: form.time,
    value: Number(form.value || 0),
    status: form.status,
  };
}

export function tripPatchToSupabase(patch: Partial<TripForm>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (patch.client !== undefined) result.client_name = patch.client;
  if (patch.phone !== undefined) result.client_phone = patch.phone;
  if (patch.route !== undefined) {
    const { origin, destination } = splitRoute(patch.route);
    result.origin = origin;
    result.destination = destination;
  }
  if (patch.date !== undefined) result.date = patch.date;
  if (patch.time !== undefined) result.time = patch.time;
  if (patch.value !== undefined) result.value = Number(patch.value);
  if (patch.status !== undefined) result.status = patch.status;
  return result;
}

// ─── Finance ↔ finance_entries ──────────────────────────────────
// Same column names, auto snake_case works

export function financeFromSupabase(row: Record<string, unknown>): FinanceEntry {
  return financeFromDatabase({
    id: row.id as string,
    description: row.description as string,
    value: Number(row.value || 0),
    type: row.type as string,
    date: row.date as string,
  });
}

export function financeFormToSupabase(form: FinanceEntryForm): Record<string, unknown> {
  return {
    description: form.description,
    value: Number(form.value),
    type: form.type,
    date: form.date,
  };
}

// ─── Referral ↔ referrals ──────────────────────────────────────
// DB: referrer_name, referred_name | domain: referrer, referred

export function referralFromSupabase(row: Record<string, unknown>): Referral {
  return referralFromDatabase({
    id: row.id as string,
    referrer: (row.referrer_name as string) || "",
    referred: (row.referred_name as string) || "",
    status: row.status as string,
    credits: Number(row.credits || 0),
  });
}

export function referralFormToSupabase(form: ReferralForm): Record<string, unknown> {
  return {
    referrer_name: form.referrer,
    referred_name: form.referred,
    status: form.status,
    credits: Number(form.credits || 0),
  };
}

export function referralPatchToSupabase(patch: Partial<ReferralForm>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (patch.referrer !== undefined) result.referrer_name = patch.referrer;
  if (patch.referred !== undefined) result.referred_name = patch.referred;
  if (patch.status !== undefined) result.status = patch.status;
  if (patch.credits !== undefined) result.credits = Number(patch.credits);
  return result;
}

// ─── Proposal ↔ proposals ──────────────────────────────────────
// DB: client_name, client_phone | domain: client, phone

export function proposalFromSupabase(row: Record<string, unknown>): Proposal {
  return proposalFromDatabase({
    id: row.id as string,
    client: (row.client_name as string) || "",
    phone: (row.client_phone as string) || "",
    origin: row.origin as string,
    destination: row.destination as string,
    date: row.date as string,
    time: row.time as string,
    km: Number(row.km || 0),
    passengers: Number(row.passengers || 0),
    bags: Number(row.bags || 0),
    value: Number(row.value || 0),
    status: row.status as string,
    created_at: row.created_at as string,
    valid_until: row.valid_until as string,
    message: row.message as string,
  });
}

export function proposalFormToSupabase(
  form: Omit<Proposal, "id" | "createdAt">,
): Record<string, unknown> {
  return {
    client_name: form.client,
    client_phone: form.phone,
    origin: form.origin,
    destination: form.destination,
    date: form.date,
    time: form.time,
    km: Number(form.km || 0),
    passengers: Number(form.passengers || 0),
    bags: Number(form.bags || 0),
    value: Number(form.value || 0),
    status: form.status,
    valid_until: form.validUntil,
    message: form.message || "",
  };
}
