import type { Proposal } from "./types";

export interface ProposalDatabase {
  id: string;
  client: string;
  phone: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  km: number;
  passengers: number;
  bags: number;
  value: number;
  status: string;
  created_at: string;
  valid_until: string;
  message: string;
}

export function proposalToDatabase(proposal: Proposal): ProposalDatabase {
  return {
    id: proposal.id,
    client: proposal.client,
    phone: proposal.phone,
    origin: proposal.origin,
    destination: proposal.destination,
    date: proposal.date,
    time: proposal.time,
    km: proposal.km,
    passengers: proposal.passengers,
    bags: proposal.bags,
    value: proposal.value,
    status: proposal.status,
    created_at: proposal.createdAt,
    valid_until: proposal.validUntil,
    message: proposal.message,
  };
}

export function proposalFromDatabase(db: ProposalDatabase): Proposal {
  return {
    id: db.id,
    client: db.client,
    phone: db.phone,
    origin: db.origin,
    destination: db.destination,
    date: db.date,
    time: db.time,
    km: db.km,
    passengers: db.passengers,
    bags: db.bags,
    value: db.value,
    status: db.status as Proposal["status"],
    createdAt: db.created_at,
    validUntil: db.valid_until,
    message: db.message,
  };
}
