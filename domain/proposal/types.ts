export type ProposalStatus = "Rascunho" | "Enviada" | "Aceita" | "Convertida" | "Recusada";

export interface Proposal {
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
  status: ProposalStatus;
  createdAt: string;
  validUntil: string;
  message: string;
}

export interface ProposalForm extends Omit<Proposal, "id" | "createdAt"> {}
