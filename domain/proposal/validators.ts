import type { Proposal } from "./types";

export function validateProposal(proposal: Proposal): string | null {
  if (!proposal.client.trim()) return "Cliente é obrigatório";
  if (!proposal.origin.trim()) return "Origem é obrigatória";
  if (!proposal.destination.trim()) return "Destino é obrigatório";
  if (proposal.value <= 0) return "Valor deve ser maior que zero";
  return null;
}
