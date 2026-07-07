export type QuoteResult = {
  value: number;
  rule: string;
  km: number;
  type: "Transfer Confins" | "Corrida agendada" | "Viagem rodoviária" | "Manual";
  manual?: boolean;
  notes?: string[];
};

export type QuoteForm = {
  client?: string;
  phone?: string;
  origin: string;
  destination: string;
  km: number;
  passengers: number;
  bags: number;
  specialLuggage: boolean;
};