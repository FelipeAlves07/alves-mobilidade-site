export type TripStatus = "Agendada" | "Concluída" | "Cancelada";

export type QuoteType = "Transfer Confins" | "Corrida agendada" | "Viagem rodoviária" | "Manual";

export interface Trip {
  id: string;
  client: string;
  phone: string;
  date: string;
  time: string;
  route: string;
  value: number;
  status: TripStatus;
}

export interface TripForm extends Omit<Trip, "id"> {}

export interface QuoteResult {
  value: number;
  rule: string;
  km: number;
  type: QuoteType;
  region?: string;
  manual?: boolean;
  notes?: string[];
}

export interface QuoteForm {
  client?: string;
  phone?: string;
  origin: string;
  destination: string;
  km: number;
  passengers: number;
  bags: number;
  specialLuggage: boolean;
}
