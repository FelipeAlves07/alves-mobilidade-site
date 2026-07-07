import type { Lead, LeadType, Status } from "./client";
import type { FinanceEntry } from "./finance";
import type { QuoteForm, QuoteResult } from "./quote";
import type { Trip } from "./trip";

export type { Lead, LeadType, Status, FinanceEntry, QuoteForm, QuoteResult, Trip };

export type Referral = {
  id: string;
  referrer: string;
  referred: string;
  status: "Indicado" | "Transfer realizado" | "Transfer creditado";
  credits: number;
};

export type MenuItem = {
  id: string;
  group: "Operação" | "Comercial" | "Gestão";
  label: string;
  icon?: unknown;
};

export type MessageKey =
  | "apresentacao"
  | "indicacao"
  | "followup"
  | "agradecimento"
  | "orcamento"
  | "confirmacao";