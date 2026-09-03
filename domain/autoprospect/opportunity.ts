import type { CompanyIntelligenceRow } from "@/lib/repository-mappers";

// ─── Status da oportunidade (abordagem manual) ───────────────────

export const OPPORTUNITY_STATUSES = [
  "Nova",
  "Para abordar",
  "Em contato",
  "Respondeu",
  "Interessado",
  "Sem interesse",
  "Convertido",
] as const;

export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

/** Status que representam oportunidade ainda "em andamento" (1 ativa por empresa). */
export const ACTIVE_OPPORTUNITY_STATUSES: readonly OpportunityStatus[] = [
  "Nova",
  "Para abordar",
  "Em contato",
  "Respondeu",
  "Interessado",
];

export function isOpportunityStatus(value: unknown): value is OpportunityStatus {
  return (
    typeof value === "string" &&
    (OPPORTUNITY_STATUSES as readonly string[]).includes(value)
  );
}

export function isActiveOpportunityStatus(value: unknown): boolean {
  return isOpportunityStatus(value) && ACTIVE_OPPORTUNITY_STATUSES.includes(value);
}

// ─── Canais de interação ──────────────────────────────────────────

export const INTERACTION_CHANNELS = [
  "WhatsApp",
  "Telefone",
  "E-mail",
  "Instagram",
  "LinkedIn",
  "Outro",
] as const;

export type InteractionChannel = (typeof INTERACTION_CHANNELS)[number];

export function isInteractionChannel(value: unknown): value is InteractionChannel {
  return (
    typeof value === "string" &&
    (INTERACTION_CHANNELS as readonly string[]).includes(value)
  );
}

// ─── Snapshot da inteligência para a oportunidade ─────────────────
// Regra da Etapa 6: a oportunidade NÃO recalcula nada — preserva os
// dados já produzidos pela inteligência no momento da criação.

export interface OpportunitySnapshot {
  priority: number;
  score: number;
  potential: string;
  confidence: string;
  priorityReason: string;
  nextAction: string;
  recommendedServices: unknown[];
}

export function buildOpportunitySnapshot(
  intel: Pick<
    CompanyIntelligenceRow,
    | "priority"
    | "scoreSnapshot"
    | "potentialSnapshot"
    | "confidenceSnapshot"
    | "priorityReason"
    | "nextAction"
    | "recommendedServices"
  >,
): OpportunitySnapshot {
  return {
    priority: intel.priority,
    score: intel.scoreSnapshot,
    potential: intel.potentialSnapshot,
    confidence: intel.confidenceSnapshot,
    priorityReason: intel.priorityReason,
    nextAction: intel.nextAction,
    recommendedServices: Array.isArray(intel.recommendedServices)
      ? intel.recommendedServices
      : [],
  };
}

// ─── Validação de criação (usada pela rota e testável) ────────────

export type OpportunityCreationValidation =
  | { ok: true }
  | { ok: false; code: "sem_inteligencia" | "ja_existe_ativa"; detail: string };

export function validateOpportunityCreation(input: {
  hasIntelligence: boolean;
  hasActiveOpportunity: boolean;
}): OpportunityCreationValidation {
  if (!input.hasIntelligence) {
    return {
      ok: false,
      code: "sem_inteligencia",
      detail:
        "Esta empresa ainda não possui análise comercial. Execute a análise completa antes de criar a oportunidade.",
    };
  }
  if (input.hasActiveOpportunity) {
    return {
      ok: false,
      code: "ja_existe_ativa",
      detail: "Esta empresa já possui uma oportunidade em andamento.",
    };
  }
  return { ok: true };
}

// ─── Interações ───────────────────────────────────────────────────

export const INTERACTION_RESULT_SUGGESTIONS = [
  "Respondeu",
  "Sem interesse",
  "Solicitou orçamento",
  "Pediu mais informações",
  "Não atendeu",
  "Agendou contato",
  "Outro",
] as const;

export interface OpportunityInteractionForm {
  channel: InteractionChannel;
  result: string;
  note: string;
  occurredAt: string;
}

export function normalizeInteractionForm(form: {
  channel: string;
  result?: string;
  note?: string;
  occurredAt?: string;
}): OpportunityInteractionForm | { error: string } {
  if (!isInteractionChannel(form.channel)) {
    return { error: "Canal de contato inválido." };
  }
  const result = (form.result ?? "").trim().slice(0, 500);
  const note = (form.note ?? "").trim().slice(0, 2000);
  const rawOccurredAt = form.occurredAt
    ? new Date(form.occurredAt).toISOString()
    : new Date().toISOString();
  const occurredAt = isNaN(new Date(rawOccurredAt).getTime())
    ? new Date().toISOString()
    : rawOccurredAt;
  return { channel: form.channel as InteractionChannel, result, note, occurredAt };
}