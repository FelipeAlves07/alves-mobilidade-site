export type LeadStatus =
  | "Novo contato"
  | "Apresentação enviada"
  | "Respondeu"
  | "Orçamento enviado"
  | "Negociação"
  | "Fechou"
  | "Pós-atendimento"
  | "Arquivado";

export type LeadType =
  | "Aeroporto"
  | "Empresa"
  | "Hotel"
  | "Evento"
  | "Indicação"
  | "Cliente antigo"
  | "Outro";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  type: LeadType;
  origin: string;
  status: LeadStatus;
  notes: string;
  nextAction: string;
  nextDate: string;
  createdAt: string;
  lastContact?: string;
}

export interface LeadForm extends Omit<Lead, "id" | "createdAt"> {}

export type Status = LeadStatus;
