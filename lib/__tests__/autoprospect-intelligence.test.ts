import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCommercialSummary,
  buildIntelligenceContext,
  computePriority,
  createCommercialIntelligenceProvider,
  estimateCost,
  latestIntelligencePerCompany,
  NEXT_ACTION_BY_PRIORITY,
  PRIORITY_LABEL,
  runCommercialIntelligence,
  validateIntelligenceResponse,
  type IntelligenceAiResponse,
  type PriorityInput,
} from "@/domain/autoprospect/intelligence";
import { buildQualification } from "@/domain/autoprospect/qualification";
import type { EnrichmentOutcome } from "@/domain/autoprospect/enrichment";
import type { ProspectCompany } from "@/domain/autoprospect/types";

const COMPANY: ProspectCompany = {
  id: "c1",
  name: "Empresa Alta",
  segment: "Agências de eventos",
  city: "Belo Horizonte",
  state: "MG",
  address: "",
  website: "https://empresaalta.com.br",
  phone: "",
  whatsapp: "",
  email: "",
  instagram: "",
  linkedin: "",
  notes: "",
  source: "Test",
  collectedAt: "",
  createdAt: "",
};

const COMPANY_LOW: ProspectCompany = {
  ...COMPANY,
  name: "Empresa Baixa",
  segment: "Padaria artesanal",
  city: "Manaus",
  state: "AM",
  website: "",
};

function enrichmentWith(signals: EnrichmentOutcome["signals"], overrides: Partial<EnrichmentOutcome> = {}): EnrichmentOutcome {
  return {
    status: "ok",
    sourceUrl: "https://empresaalta.com.br/",
    fetchedPages: 2,
    title: "Empresa Alta — Eventos Corporativos",
    description: "Organização de congressos e eventos empresariais em BH.",
    signals,
    reason: "",
    collectedAt: "2026-08-07T00:00:00.000Z",
    ...overrides,
  };
}

const RICH_SIGNALS: EnrichmentOutcome["signals"] = [
  {
    category: "eventos_corporativos",
    label: "Eventos corporativos",
    snippet: "congressos, convenções e eventos empresariais",
    sourceUrl: "https://empresaalta.com.br/",
  },
  {
    category: "atendimento_empresarial",
    label: "Atendimento a empresas (B2B)",
    snippet: "Atendemos empresas",
    sourceUrl: "https://empresaalta.com.br/",
  },
  {
    category: "viagens",
    label: "Viagens e deslocamentos",
    snippet: "transfers para aeroporto de Confins",
    sourceUrl: "https://empresaalta.com.br/servicos",
  },
];

function priorityInput(overrides: Partial<PriorityInput> = {}): PriorityInput {
  return {
    score: 83,
    confidence: "Alta",
    signalsCount: 4,
    servicesCount: 3,
    siteActive: true,
    breakdown: [
      { label: "Segmento compatível", points: 20, reason: "x" },
      { label: "Localização atendida", points: 20, reason: "x" },
      { label: "Possível demanda de transfer", points: 15, reason: "x" },
    ],
    ...overrides,
  };
}

const VALID_AI_RESPONSE: IntelligenceAiResponse = {
  summary: "Hospedagem em BH com sinais de atendimento a executivos.",
  potential: "Alto",
  priority: 1,
  reasons: ["Segmento compatível", "Site ativo"],
  recommendedServices: [{ service: "Transfer aeroporto", reason: "Recebe hóspedes de outras cidades." }],
  nextAction: "approach_now",
  confidence: "Alta",
};

describe("Prioridade comercial (determinística, 1-4)", () => {
  it("dados fortes → prioridade 1 (abordar agora)", () => {
    const result = computePriority(priorityInput());
    expect(result.priority).toBe(1);
    expect(NEXT_ACTION_BY_PRIORITY[result.priority]).toBe("Abordar agora");
    expect(result.reasons).toContain("Alta confiança nos dados");
    expect(result.reasons).toContain("4 sinais comerciais encontrados");
    expect(result.reasons).toContain("Segmento altamente compatível com o perfil da AME");
    expect(result.reasons).toContain("Localização atendida pela AME");
    expect(result.reasons).toContain("Possível demanda por transfer");
    expect(result.reasons).toContain("Site comercial ativo");
  });

  it("score 85+ com confiança alta e sinais → prioridade 1", () => {
    expect(computePriority(priorityInput({ score: 91 })).priority).toBe(1);
  });

  it("dados médios → prioridade 2 ou 3", () => {
    const medium = computePriority(priorityInput({ score: 58, confidence: "Média", signalsCount: 2, servicesCount: 1 }));
    expect([2, 3]).toContain(medium.priority);
  });

  it("dados fracos → prioridade 4 (baixa prioridade)", () => {
    const result = computePriority(priorityInput({ score: 28, confidence: "Baixa", signalsCount: 0, servicesCount: 0, siteActive: false }));
    expect(result.priority).toBe(4);
    expect(NEXT_ACTION_BY_PRIORITY[result.priority]).toBe("Baixa prioridade");
    expect(result.reasons).toContain("Confiança baixa nos dados coletados");
    expect(result.reasons).toContain("Nenhum sinal comercial encontrado");
  });

  it("confiança baixa rebaixa a prioridade (nunca abaixo de 4)", () => {
    const weak = computePriority(priorityInput({ score: 30, confidence: "Baixa", signalsCount: 0, servicesCount: 0, siteActive: false }));
    expect(weak.priority).toBeGreaterThanOrEqual(3);
  });

  it("mesma entrada → mesma prioridade (consistência)", () => {
    const a = computePriority(priorityInput());
    const b = computePriority(priorityInput());
    expect(a).toEqual(b);
  });

  it("toda prioridade tem explicação e próxima ação", () => {
    for (const priority of [1, 2, 3, 4] as const) {
      expect(PRIORITY_LABEL[priority].length).toBeGreaterThan(0);
      expect(NEXT_ACTION_BY_PRIORITY[priority].length).toBeGreaterThan(0);
    }
    const result = computePriority(priorityInput({ score: 0, confidence: "Baixa", signalsCount: 0, servicesCount: 0, siteActive: false }));
    expect(result.priorityReason).toContain("Prioridade 4");
  });
});

describe("Schema da resposta da IA (validação estrita)", () => {
  it("aceita resposta completa válida", () => {
    const result = validateIntelligenceResponse(VALID_AI_RESPONSE);
    expect(result).toEqual(VALID_AI_RESPONSE);
  });

  it("aceita prioridade em string numérica", () => {
    const result = validateIntelligenceResponse({ ...VALID_AI_RESPONSE, priority: "2" });
    expect(result.priority).toBe(2);
  });

  it("rejeita resposta sem resumo", () => {
    expect(() => validateIntelligenceResponse({ ...VALID_AI_RESPONSE, summary: "" })).toThrow(/resumo/);
  });

  it("rejeita enum de potencial inválido", () => {
    expect(() => validateIntelligenceResponse({ ...VALID_AI_RESPONSE, potential: "Gigantesco" })).toThrow(/potencial/);
  });

  it("rejeita prioridade fora de 1-4", () => {
    expect(() => validateIntelligenceResponse({ ...VALID_AI_RESPONSE, priority: 7 })).toThrow(/prioridade/);
    expect(() => validateIntelligenceResponse({ ...VALID_AI_RESPONSE, priority: 0 })).toThrow(/prioridade/);
  });

  it("rejeita próxima ação inválida", () => {
    expect(() => validateIntelligenceResponse({ ...VALID_AI_RESPONSE, nextAction: "spam" })).toThrow(/próxima ação/);
  });

  it("rejeita confiança inválida", () => {
    expect(() => validateIntelligenceResponse({ ...VALID_AI_RESPONSE, confidence: "Altíssima" })).toThrow(/confiança/);
  });

  it("rejeita serviço fora da lista documentada da AME (não inventar serviços)", () => {
    const result = validateIntelligenceResponse({
      ...VALID_AI_RESPONSE,
      recommendedServices: [
        { service: "Jatinho particular", reason: "x" },
        { service: "Transfer aeroporto", reason: "Recebe hóspedes." },
      ],
    });
    expect(result.recommendedServices).toEqual([{ service: "Transfer aeroporto", reason: "Recebe hóspedes." }]);
    expect(result.recommendedServices.every((item) => !item.service.includes("Jatinho"))).toBe(true);
  });

  it("rejeita resposta sem justificativas", () => {
    expect(() => validateIntelligenceResponse({ ...VALID_AI_RESPONSE, reasons: [] })).toThrow(/justificativas/);
  });

  it("limita tamanho de textos longos", () => {
    const result = validateIntelligenceResponse({
      ...VALID_AI_RESPONSE,
      reasons: ["x".repeat(500)],
      summary: "y".repeat(5000),
    });
    expect(result.reasons[0].length).toBeLessThanOrEqual(140);
    expect(result.summary.length).toBeLessThanOrEqual(700);
  });
});

describe("Provider de IA (substituível e que nunca bloqueia)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const context = {
    company: COMPANY,
    enrichment: enrichmentWith(RICH_SIGNALS),
    signals: RICH_SIGNALS,
    facts: buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS)).facts,
    qualification: buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS)),
  };

  function stubAiFetch(
    content: string | null,
    options: { ok?: boolean; status?: number } = {},
  ) {
    const { ok = true, status = 200 } = options;
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        ok
          ? Promise.resolve({
              ok: true,
              status,
              json: async () => ({
                choices: [{ message: { content } }],
                usage: { prompt_tokens: 4200, completion_tokens: 480 },
              }),
            })
          : Promise.resolve({ ok: false, status, json: async () => ({}) }),
      ),
    );
  }

  it("sem chave → provider desabilitado; análise determinística não usa IA", async () => {
    const provider = createCommercialIntelligenceProvider({});
    expect(provider.enabled).toBe(false);
    const qualification = buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS));
    const result = await runCommercialIntelligence({ company: COMPANY, enrichment: enrichmentWith(RICH_SIGNALS), qualification }, { provider });
    expect(result.aiStatus).toBe("deterministico");
    expect(result.aiProvider).toBe("nenhum");
    expect(result.summary).toContain("score determinístico");
    expect(result.tokensIn).toBe(0);
    expect(result.costEstimate).toBe(0);
  });

  it("resposta válida → interpretação usada sem alterar score/potencial determinísticos", async () => {
    stubAiFetch(JSON.stringify(VALID_AI_RESPONSE));
    const provider = createCommercialIntelligenceProvider({ AI_API_KEY: "test-key", AI_MODEL: "gpt-4o-mini" });
    const qualification = buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS));
    const result = await runCommercialIntelligence({ company: COMPANY, enrichment: enrichmentWith(RICH_SIGNALS), qualification }, { provider });
    expect(result.aiStatus).toBe("ia");
    expect(result.summary).toBe(VALID_AI_RESPONSE.summary);
    expect(result.recommendedServices[0]).toEqual(VALID_AI_RESPONSE.recommendedServices[0]);
    expect(result.aiResponse?.priority).toBe(1);
    expect(result.priority).toBe(computePriority({
      score: qualification.score,
      confidence: qualification.confidence,
      signalsCount: RICH_SIGNALS.length,
      servicesCount: qualification.possibleServices.length,
      siteActive: true,
      breakdown: qualification.breakdown,
    }).priority);
    expect(result.tokensIn).toBe(4200);
    expect(result.tokensOut).toBe(480);
    expect(result.costEstimate).toBeGreaterThan(0);
  });

  it("resposta inválida → ia_falha, determinístico mantido, nada de lixo gravado", async () => {
    stubAiFetch(JSON.stringify({ summary: "incompleto" }));
    const provider = createCommercialIntelligenceProvider({ AI_API_KEY: "test-key" });
    const qualification = buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS));
    const result = await runCommercialIntelligence({ company: COMPANY, enrichment: enrichmentWith(RICH_SIGNALS), qualification }, { provider });
    expect(result.aiStatus).toBe("ia_falha");
    expect(result.aiResponse).toBeNull();
    expect(result.error.length).toBeGreaterThan(0);
    expect(result.summary).toContain("score determinístico");
    expect(result.recommendedServices.length).toBeGreaterThan(0);
  });

  it("timeout / erro de rede → ia_falha, determinístico mantido", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network down"))));
    const provider = createCommercialIntelligenceProvider({ AI_API_KEY: "test-key" });
    const qualification = buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS));
    const result = await runCommercialIntelligence({ company: COMPANY, enrichment: enrichmentWith(RICH_SIGNALS), qualification }, { provider });
    expect(result.aiStatus).toBe("ia_falha");
    expect(result.priority).toBeGreaterThanOrEqual(1);
  });

  it("rate limit (HTTP 429) → ia_falha, determinístico mantido", async () => {
    stubAiFetch(null, { ok: false, status: 429 });
    const provider = createCommercialIntelligenceProvider({ AI_API_KEY: "test-key" });
    const qualification = buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS));
    const result = await runCommercialIntelligence({ company: COMPANY, enrichment: enrichmentWith(RICH_SIGNALS), qualification }, { provider });
    expect(result.aiStatus).toBe("ia_falha");
    expect(result.error).toContain("429");
  });

  it("IA indisponível (HTTP 500) → ia_falha, determinístico mantido", async () => {
    stubAiFetch(null, { ok: false, status: 500 });
    const provider = createCommercialIntelligenceProvider({ AI_API_KEY: "test-key" });
    const qualification = buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS));
    const result = await runCommercialIntelligence({ company: COMPANY, enrichment: enrichmentWith(RICH_SIGNALS), qualification }, { provider });
    expect(result.aiStatus).toBe("ia_falha");
  });
});

describe("Inteligência — dados fortes, fracos e ausência de evidências", () => {
  it("dados fortes → prioridade alta, resumo com necessidades", async () => {
    const enrichment = enrichmentWith(RICH_SIGNALS);
    const qualification = buildQualification(COMPANY, enrichment);
    const result = await runCommercialIntelligence({ company: COMPANY, enrichment, qualification }, { provider: createCommercialIntelligenceProvider({}) });
    expect(result.priority).toBeLessThanOrEqual(2);
    expect(result.summary).toContain(COMPANY.name);
    expect(result.summary).toContain("score determinístico");
    expect(result.recommendedServices.length).toBeGreaterThanOrEqual(2);
  });

  it("dados fracos → prioridade baixa, sem serviços inventados", async () => {
    const unavailable: EnrichmentOutcome = {
      status: "unavailable",
      sourceUrl: "",
      fetchedPages: 0,
      title: "",
      description: "",
      signals: [],
      reason: "Site inacessível no momento da coleta.",
      collectedAt: "2026-08-07T00:00:00.000Z",
    };
    const qualification = buildQualification(COMPANY_LOW, unavailable);
    const result = await runCommercialIntelligence({ company: COMPANY_LOW, enrichment: unavailable, qualification }, { provider: createCommercialIntelligenceProvider({}) });
    expect(result.priority).toBe(4);
    expect(result.recommendedServices).toEqual([]);
    expect(result.reasons).toContain("Nenhum sinal comercial encontrado");
  });

  it("ausência total de evidências → honesto, sem inventar demanda", async () => {
    const minimal: ProspectCompany = { ...COMPANY, name: "Empresa Sem Dados", segment: "", city: "", state: "", website: "" };
    const qualification = buildQualification(minimal, null);
    const result = await runCommercialIntelligence({ company: minimal, enrichment: null, qualification }, { provider: createCommercialIntelligenceProvider({}) });
    expect(result.recommendedServices).toEqual([]);
    expect(result.summary).toContain("não identificada");
    expect(result.priorityReason.length).toBeGreaterThan(0);
  });
});

describe("Segurança — secrets nunca saem", () => {
  it("contexto da IA não contém chave", () => {
    const qualification = buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS));
    const context = buildIntelligenceContext({
      company: COMPANY,
      enrichment: enrichmentWith(RICH_SIGNALS),
      signals: RICH_SIGNALS,
      facts: qualification.facts,
      qualification,
    });
    expect(context).not.toContain("sk-");
    expect(context).not.toContain("api_key");
    expect(context).not.toContain("AI_API_KEY");
  });

  it("resultado da análise não expõe chave ou credenciais", async () => {
    const qualification = buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS));
    const result = await runCommercialIntelligence({ company: COMPANY, enrichment: enrichmentWith(RICH_SIGNALS), qualification }, { provider: createCommercialIntelligenceProvider({ AI_API_KEY: "sk-secreto" }) });
    expect(JSON.stringify(result)).not.toContain("sk-secreto");
  });
});

describe("Histórico e cache", () => {
  it("primeira e segunda análise → registros separados preservados", () => {
    const rows = [
      { id: "i1", companyId: "c1", score: 72, priority: 3, createdAt: "2026-08-01T10:00:00Z" },
      { id: "i2", companyId: "c1", score: 83, priority: 1, createdAt: "2026-08-02T10:00:00Z" },
    ];
    const latest = latestIntelligencePerCompany(rows);
    expect(latest.size).toBe(1);
    expect(latest.get("c1")?.id).toBe("i2");
    expect(rows.length).toBe(2);
  });

  it("empresas diferentes mantêm suas análises independentes", () => {
    const rows = [
      { id: "i1", companyId: "c1", priority: 2, createdAt: "2026-08-01T10:00:00Z" },
      { id: "i2", companyId: "c2", priority: 4, createdAt: "2026-08-01T11:00:00Z" },
      { id: "i3", companyId: "c1", priority: 1, createdAt: "2026-08-03T10:00:00Z" },
    ];
    const latest = latestIntelligencePerCompany(rows);
    expect(latest.get("c1")?.id).toBe("i3");
    expect(latest.get("c2")?.id).toBe("i2");
  });
});

describe("Perfil comercial e custo", () => {
  it("perfil comercial é curto e completo", () => {
    const qualification = buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS));
    const profile = buildCommercialSummary(COMPANY, qualification);
    expect(profile.length).toBeLessThan(320);
    expect(profile).toContain(qualification.potential);
    expect(profile).toContain("score determinístico");
  });

  it("custo estimado usa preço do provider inicial", () => {
    const cost = estimateCost(1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.75, 6);
    expect(estimateCost(0, 0)).toBe(0);
  });
});
