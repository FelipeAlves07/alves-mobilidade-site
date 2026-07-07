export type Status =
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

export type Lead = {
  id: string;
  name: string;
  phone: string;
  type: LeadType;
  origin: string;
  status: Status;
  notes: string;
  nextAction: string;
  nextDate: string;
  createdAt: string;
  lastContact?: string;
};