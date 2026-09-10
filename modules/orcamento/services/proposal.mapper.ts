import type { Proposal, ProposalStatus } from "@/domain/proposal/types";
import type { QuoteResult2 } from "@/domain/quote/types";

export interface ProposalDraft extends Omit<Proposal, "id" | "createdAt" | "message"> {
  message: string;
}

export interface ProposalDetails {
  client: string;
  phone: string;
  date: string;
  time: string;
  bags?: number;
  status?: ProposalStatus;
  validUntil: string;
  message: string;
}

export function quoteResultToProposalDraft(result: QuoteResult2, details: ProposalDetails): ProposalDraft {
  const form = result.form;

  return {
    client: details.client.trim() || "Cliente",
    phone: details.phone.trim(),
    origin: form.origin.trim(),
    destination: form.destination.trim(),
    date: details.date,
    time: details.time,
    km: Number(form.distanceKm || 0),
    passengers: Number(form.passengers || 0),
    bags: Number(details.bags || 0),
    value: Number(result.price || 0),
    status: details.status || "Rascunho",
    validUntil: details.validUntil,
    message: details.message,
  };
}
