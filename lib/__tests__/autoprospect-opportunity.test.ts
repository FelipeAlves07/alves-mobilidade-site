import { describe, it, expect } from "vitest";
import {
  ACTIVE_OPPORTUNITY_STATUSES,
  INTERACTION_CHANNELS,
  INTERACTION_RESULT_SUGGESTIONS,
  OPPORTUNITY_STATUSES,
  buildOpportunitySnapshot,
  isActiveOpportunityStatus,
  isInteractionChannel,
  isOpportunityStatus,
  normalizeInteractionForm,
  validateOpportunityCreation,
} from "@/domain/autoprospect/opportunity";
import {
  apInteractionFromSupabase,
  apInteractionToSupabase,
  apOpportunityFromSupabase,
  apOpportunityListItemFromSupabase,
  apOpportunityPatchToSupabase,
  apOpportunityToSupabase,
  type CompanyIntelligenceRow,
  type OpportunityRow,
} from "@/lib/repository-mappers";

const intel: CompanyIntelligenceRow = {
  id: "intel-1",
  companyId: "company-1",
  enrichmentId: "enrich-1",
  qualificationId: "qual-1",
  provider: "deterministico",
  model: "",
  status: "Concluido",
  error: "",
  priority: 1,
  priorityReason: "Segmento compatível e localização atendida pela AME.",
  reasons: ["Segmento compatível", "Localização atendida"],
  nextAction: "Abordar agora",
  summary: "Hotel com potencial para transfers.",
  recommendedServices: [
    { service: "Transfer aeroporto", reason: "Recebe hóspedes em área atendida pela AME." },
  ],
  aiConfidence: "Alta",
  scoreSnapshot: 88,
  potentialSnapshot: "Muito alto",
  confidenceSnapshot: "Alta",
  aiResponse: null,
  aiStatus: "deterministico",
  tokensIn: 0,
  tokensOut: 0,
  costEstimate: 0,
  analysisVersion: "intelligence-v1",
  createdAt: "2026-08-09T12:00:00.000Z",
};

const opportunityRow: OpportunityRow = {
  id: "opp-1",
  companyId: "company-1",
  intelligenceId: "intel-1",
  qualificationId: "qual-1",
  status: "Nova",
  priority: 1,
  score: 88,
  potential: "Muito alto",
  confidence: "Alta",
  priorityReason: "Segmento compatível e localização atendida pela AME.",
  nextAction: "Abordar agora",
  recommendedServices: [{ service: "Transfer aeroporto", reason: "Recebe hóspedes." }],
  createdAt: "2026-08-10T12:00:00.000Z",
  updatedAt: "2026-08-10T12:00:00.000Z",
};

describe("Oportunidade — criação e vínculos", () => {
  it("preserva o snapshot da inteligência sem recalcular nada", () => {
    const snapshot = buildOpportunitySnapshot(intel);
    expect(snapshot).toEqual({
      priority: 1,
      score: 88,
      potential: "Muito alto",
      confidence: "Alta",
      priorityReason: intel.priorityReason,
      nextAction: "Abordar agora",
      recommendedServices: intel.recommendedServices,
    });
  });

  it("vincula a empresa e as referências de análise na persistência", () => {
    const db = apOpportunityToSupabase({
      companyId: "company-1",
      intelligenceId: "intel-1",
      qualificationId: "qual-1",
      status: "Nova",
      ...buildOpportunitySnapshot(intel),
    });
    expect(db.company_id).toBe("company-1");
    expect(db.intelligence_id).toBe("intel-1");
    expect(db.qualification_id).toBe("qual-1");
  });

  it("roundtrip: toSupabase → fromSupabase preserva os dados", () => {
    const db = apOpportunityToSupabase({
      companyId: opportunityRow.companyId,
      intelligenceId: opportunityRow.intelligenceId,
      qualificationId: opportunityRow.qualificationId,
      status: opportunityRow.status,
      priority: opportunityRow.priority,
      score: opportunityRow.score,
      potential: opportunityRow.potential,
      confidence: opportunityRow.confidence,
      priorityReason: opportunityRow.priorityReason,
      nextAction: opportunityRow.nextAction,
      recommendedServices: opportunityRow.recommendedServices,
    });
    const back = apOpportunityFromSupabase({ id: "opp-1", created_at: opportunityRow.createdAt, updated_at: opportunityRow.updatedAt, ...db });
    expect(back).toEqual(opportunityRow);
  });

  it("lista com join traz os dados de contato da empresa", () => {
    const row = apOpportunityListItemFromSupabase({
      ...apOpportunityToSupabase({
        companyId: "company-1",
        intelligenceId: null,
        qualificationId: null,
        status: "Para abordar",
        priority: 4,
        score: 28,
        potential: "Muito baixo",
        confidence: "Alta",
        priorityReason: "",
        nextAction: "Baixa prioridade",
        recommendedServices: [],
      }),
      id: "opp-2",
      created_at: "2026-08-10T12:00:00.000Z",
      updated_at: "2026-08-10T12:00:00.000Z",
      ap_companies: {
        name: "Hotel Boulevard",
        segment: "Hotéis",
        city: "Belo Horizonte",
        state: "MG",
        phone: "(31) 3000-0000",
        whatsapp: "(31) 99999-0000",
        email: "contato@boulevard.com.br",
        website: "https://boulevard.com.br",
        instagram: "@boulevard",
        linkedin: "",
      },
    });
    expect(row.companyName).toBe("Hotel Boulevard");
    expect(row.companyWhatsapp).toBe("(31) 99999-0000");
    expect(row.companyEmail).toBe("contato@boulevard.com.br");
    expect(row.companyId).toBe("company-1");
    expect(row.status).toBe("Para abordar");
  });
});

describe("Oportunidade — idempotência (1 ativa por empresa)", () => {
  it("criação válida quando há inteligência e nenhuma ativa", () => {
    expect(validateOpportunityCreation({ hasIntelligence: true, hasActiveOpportunity: false })).toEqual({ ok: true });
  });

  it("recusa criação sem inteligência", () => {
    const result = validateOpportunityCreation({ hasIntelligence: false, hasActiveOpportunity: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("sem_inteligencia");
  });

  it("recusa criação quando já existe oportunidade ativa", () => {
    const result = validateOpportunityCreation({ hasIntelligence: true, hasActiveOpportunity: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ja_existe_ativa");
  });

  it("PATCH de status envia apenas status + updated_at", () => {
    const patch = apOpportunityPatchToSupabase({ status: "Em contato" });
    expect(Object.keys(patch).sort()).toEqual(["status", "updated_at"]);
    expect(patch.status).toBe("Em contato");
  });
});

describe("Status — valores e persistência", () => {
  it("aceita exatamente os 7 status oficiais", () => {
    expect(OPPORTUNITY_STATUSES).toEqual([
      "Nova",
      "Para abordar",
      "Em contato",
      "Respondeu",
      "Interessado",
      "Sem interesse",
      "Convertido",
    ]);
    for (const status of OPPORTUNITY_STATUSES) expect(isOpportunityStatus(status)).toBe(true);
  });

  it("rejeita valores inválidos", () => {
    expect(isOpportunityStatus("")).toBe(false);
    expect(isOpportunityStatus("PENDENTE")).toBe(false);
    expect(isOpportunityStatus("em andamento")).toBe(false);
    expect(isOpportunityStatus(1)).toBe(false);
    expect(isOpportunityStatus(null)).toBe(false);
  });

  it("considera ativos apenas os status em andamento", () => {
    for (const status of ACTIVE_OPPORTUNITY_STATUSES) expect(isActiveOpportunityStatus(status)).toBe(true);
    expect(isActiveOpportunityStatus("Sem interesse")).toBe(false);
    expect(isActiveOpportunityStatus("Convertido")).toBe(false);
  });
});

describe("Interações — canais e normalização", () => {
  it("aceita apenas canais oficiais", () => {
    expect(INTERACTION_CHANNELS).toContain("WhatsApp");
    expect(INTERACTION_CHANNELS).toContain("E-mail");
    for (const channel of INTERACTION_CHANNELS) expect(isInteractionChannel(channel)).toBe(true);
    expect(isInteractionChannel("SMS")).toBe(false);
    expect(isInteractionChannel("")).toBe(false);
  });

  it("normaliza canal, resultado e observação", () => {
    const form = normalizeInteractionForm({ channel: "WhatsApp", result: "  Respondeu  ", note: "  Pediu orçamento  " });
    if ("error" in form) throw new Error("não deveria falhar");
    expect(form.channel).toBe("WhatsApp");
    expect(form.result).toBe("Respondeu");
    expect(form.note).toBe("Pediu orçamento");
    expect(Number.isNaN(new Date(form.occurredAt).getTime())).toBe(false);
  });

  it("rejeita canal inválido", () => {
    const result = normalizeInteractionForm({ channel: "Telegram" });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("inválido");
  });

  it("usa data informada e persiste com vínculo", () => {
    const form = normalizeInteractionForm({ channel: "E-mail", result: "Sem interesse", note: "Já possui fornecedor.", occurredAt: "2026-08-10T09:00:00.000Z" });
    if ("error" in form) throw new Error("não deveria falhar");
    expect(form.occurredAt).toBe("2026-08-10T09:00:00.000Z");
    const db = apInteractionToSupabase({ opportunityId: "opp-1", ...form });
    expect(db.opportunity_id).toBe("opp-1");
    expect(db.channel).toBe("E-mail");
    const back = apInteractionFromSupabase({ id: "inter-1", created_at: "2026-08-10T09:00:00.000Z", ...db });
    expect(back.opportunityId).toBe("opp-1");
    expect(back.result).toBe("Sem interesse");
  });

  it("oferece sugestões de resultado conhecidas", () => {
    expect(INTERACTION_RESULT_SUGGESTIONS).toContain("Respondeu");
    expect(INTERACTION_RESULT_SUGGESTIONS).toContain("Solicitou orçamento");
    expect(INTERACTION_RESULT_SUGGESTIONS).toContain("Sem interesse");
  });
});

describe("Segurança — nenhum dado sensível na persistência", () => {
  it("o snapshot e os mappers não carregam secrets/provider/tokens", () => {
    const snapshot = buildOpportunitySnapshot(intel);
    const db = apOpportunityToSupabase({ companyId: "company-1", intelligenceId: null, qualificationId: null, status: "Nova", ...snapshot });
    const forbidden = ["ai_api_key", "api_key", "provider", "model", "tokens_in", "tokens_out", "cost_estimate", "ai_response"];
    for (const key of forbidden) {
      expect(Object.keys(db)).not.toContain(key);
    }
    const dbInteraction = apInteractionToSupabase({
      opportunityId: "opp-1",
      channel: "WhatsApp",
      result: "Respondeu",
      note: "",
      occurredAt: "2026-08-10T09:00:00.000Z",
    });
    expect(Object.keys(dbInteraction).sort()).toEqual(["channel", "note", "occurred_at", "opportunity_id", "result"]);
  });

  it("não envia IDs adicionais fora dos vínculos oficiais", () => {
    const patch = apOpportunityPatchToSupabase({ status: "Convertido" });
    expect(patch).not.toHaveProperty("company_id");
    expect(patch).not.toHaveProperty("intelligence_id");
  });
});
