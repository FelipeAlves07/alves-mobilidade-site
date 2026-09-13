import type { Trip, TripForm, QuoteResult } from "./types";

export interface TripDatabase {
  id: string;
  client: string;
  phone: string;
  date: string;
  time: string;
  route: string;
  value: number;
  status: string;
  proposal_id?: string | null;
  created_at?: string;
}

export function tripToDatabase(trip: Trip): TripDatabase {
  return {
    id: trip.id,
    client: trip.client,
    phone: trip.phone,
    date: trip.date,
    time: trip.time,
    route: trip.route,
    value: trip.value,
    status: trip.status,
    proposal_id: trip.proposalId ?? null,
  };
}

export function tripFromDatabase(db: TripDatabase): Trip {
  return {
    id: db.id,
    client: db.client,
    phone: db.phone,
    date: db.date,
    time: db.time,
    route: db.route,
    value: db.value,
    status: db.status as Trip["status"],
    proposalId: db.proposal_id ?? undefined,
  };
}

export function tripFormToDatabase(form: TripForm): Omit<TripDatabase, "id" | "created_at"> {
  return {
    client: form.client,
    phone: form.phone,
    date: form.date,
    time: form.time,
    route: form.route,
    value: form.value,
    status: form.status,
    proposal_id: form.proposalId ?? null,
  };
}

export interface QuoteResultDatabase {
  value: number;
  rule: string;
  km: number;
  type: string;
  region?: string;
  manual?: boolean;
  notes?: string[];
}

export function quoteResultToDatabase(qr: QuoteResult): QuoteResultDatabase {
  return { ...qr, type: qr.type };
}

export function quoteResultFromDatabase(db: QuoteResultDatabase): QuoteResult {
  return {
    ...db,
    type: db.type as QuoteResult["type"],
  };
}
