import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildQualification,
  computeScore,
  createAiAnalysisProvider,
  scoreToPotential,
  withAiExplanation,
  type AiAnalysisContext,
} from "@/domain/autoprospect/qualification";
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

const COMPANY_MINIMAL: ProspectCompany = {
  ...COMPANY,
  name: "Empresa Sem Dados",
  segment: "",
  city: "",
  state: "",
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

describe("Lead Score — classificação", () => {
  it("respeita os limites documentados", () => {
    expect(scoreToPotential(0)).toBe("Muito baixo");
    expect(scoreToPotential(29)).toBe("Muito baixo");
    expect(scoreToPotential(30)).toBe("Baixo");
    expect(scoreToPotential(49)).toBe("Baixo");
    expect(scoreToPotential(50)).toBe("Médio");
    expect(scoreToPotential(69)).toBe("Médio");
    expect(scoreToPotential(70)).toBe("Alto");
    expect(scoreToPotential(84)).toBe("Alto");
    expect(scoreToPotential(85)).toBe("Muito alto");
    expect(scoreToPotential(100)).toBe("Muito alto");
  });

  it("empresa altamente compatível atinge 100", () => {
    const enrichment = enrichmentWith(RICH_SIGNALS);
    const { score, breakdown } = computeScore(COMPANY, enrichment, RICH_SIGNALS);
    expect(score).toBe(100);
    const labels = breakdown.map((item) => item.label);
    expect(labels).toContain("Segmento compatível");
    expect(labels).toContain("Localização atendida");
    expect(labels).toContain("Sinais de eventos");
    expect(labels).toContain("Possível demanda de transfer");
    expect(labels).toContain("Site comercial ativo");
    expect(labels).toContain("Informações comerciais encontradas");
    expect(labels).toContain("Atendimento empresarial");
    expect(labels).toContain("Turismo e viagens");
  });

  it("empresa pouco compatível pontua baixo", () => {
    const enrichment = enrichmentWith([]);
    const { score } = computeScore(COMPANY_LOW, enrichment, []);
    expect(score).toBeLessThan(50);
  });

  it("dados insuficientes pontuam zero", () => {
    const { score } = computeScore(COMPANY_MINIMAL, null, []);
    expect(score).toBe(0);
  });

  it("é determinístico: mesma entrada → mesmo resultado", () => {
    const enrichment = enrichmentWith(RICH_SIGNALS);
    const first = computeScore(COMPANY, enrichment, RICH_SIGNALS);
    const second = computeScore(COMPANY, enrichment, RICH_SIGNALS);
    expect(second).toEqual(first);
    const firstAnalysis = buildQualification(COMPANY, enrichment);
    const secondAnalysis = buildQualification(COMPANY, enrichment);
    expect(secondAnalysis.breakdown).toEqual(firstAnalysis.breakdown);
    expect(secondAnalysis.score).toBe(firstAnalysis.score);
  });
});

describe("Qualificação — análise completa", () => {
  it("empresa altamente compatível → recomendação abordar e confiança alta", () => {
    const enrichment = enrichmentWith(RICH_SIGNALS);
    const analysis = buildQualification(COMPANY, enrichment);
    expect(analysis.score).toBe(100);
    expect(analysis.potential).toBe("Muito alto");
    expect(analysis.confidence).toBe("Alta");
    expect(analysis.recommendation).toBe("abordar");
    expect(analysis.recommendationText).toContain("abordagem");
    expect(analysis.summary).toContain("Empresa Alta");
    expect(analysis.opportunityReason).toContain("potencial");
  });

  it("empresa pouco compatível → baixa prioridade", () => {
    const enrichment = enrichmentWith([]);
    const analysis = buildQualification(COMPANY_LOW, enrichment);
    expect(analysis.score).toBeLessThan(50);
    expect(analysis.recommendation).toBe("baixa_prioridade");
    expect(analysis.confidence).toBe("Média");
  });

  it("dados insuficientes → confiança baixa, sem sinais inventados", () => {
    const analysis = buildQualification(COMPANY_MINIMAL, null);
    expect(analysis.score).toBe(0);
    expect(analysis.confidence).toBe("Baixa");
    expect(analysis.facts.filter((fact) => fact.sourceUrl)).toEqual([]);
    expect(analysis.inferences).toEqual([]);
    expect(analysis.possibleServices).toEqual([]);
    expect(analysis.summary).toContain("segmento não informado");
  });

  it("evidências disponíveis: fatos carregam origem (URL)", () => {
    const enrichment = enrichmentWith(RICH_SIGNALS);
    const analysis = buildQualification(COMPANY, enrichment);
    const withSource = analysis.facts.filter((fact) => fact.sourceUrl);
    expect(withSource.length).toBeGreaterThanOrEqual(RICH_SIGNALS.length);
    expect(withSource.every((fact) => fact.sourceUrl.length > 0)).toBe(true);
    expect(analysis.inferences.length).toBeGreaterThan(0);
    expect(analysis.inferences.every((inference) => inference.sourceUrl.length > 0)).toBe(true);
    expect(analysis.possibleServices).toContain("Transporte para eventos");
    expect(analysis.possibleServices).toContain("Transfer aeroporto");
  });

  it("enriquecimento indisponível → análise continua (site não pontua)", () => {
    const unavailable: EnrichmentOutcome = {
      status: "unavailable",
      sourceUrl: "",
      fetchedPages: 0,
      title: "",
      description: "",
      signals: [],
      reason: "A empresa não possui site cadastrado no Discovery.",
      collectedAt: "2026-08-07T00:00:00.000Z",
    };
    const analysis = buildQualification(COMPANY, unavailable);
    expect(analysis.confidence).toBe("Baixa");
    expect(analysis.confidenceReason).toContain("Enriquecimento indisponível");
    expect(analysis.breakdown.find((item) => item.label === "Site comercial ativo")?.points).toBe(0);
    expect(analysis.breakdown.find((item) => item.label === "Informações comerciais encontradas")?.points).toBe(0);
  });

  it("score nunca ultrapassa 100", () => {
    const enrichment = enrichmentWith(RICH_SIGNALS);
    const analysis = buildQualification(COMPANY, enrichment);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(analysis.score).toBeGreaterThanOrEqual(0);
  });
});

describe("IA — componente substituível e que nunca bloqueia", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const context: AiAnalysisContext = {
    company: COMPANY,
    enrichment: enrichmentWith(RICH_SIGNALS),
    signals: RICH_SIGNALS,
    facts: buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS)).facts,
  };

  function stubAiFetch(content: string | (() => Promise<never>), ok = true) {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        ok
          ? Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({ choices: [{ message: { content } }] }),
            })
          : Promise.reject(new Error("provider error")),
      ),
    );
  }

  it("sem chave configurada → provider desabilitado (determinístico)", async () => {
    const provider = createAiAnalysisProvider({});
    expect(provider.enabled).toBe(false);
    const analysis = await withAiExplanation(buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS)), context, provider);
    expect(analysis.aiStatus).toBe("deterministico");
    expect(analysis.aiProvider).toBe("nenhum");
  });

  it("resposta válida da IA → usada apenas como explicação (score intacto)", async () => {
    stubAiFetch(JSON.stringify({
      summary: "Resumo da IA.",
      opportunityReason: "Motivo da IA.",
      recommendationText: "Abordar com transfer aeroporto.",
    }));
    const provider = createAiAnalysisProvider({ AI_API_KEY: "test-key", AI_MODEL: "test-model" });
    expect(provider.enabled).toBe(true);
    const base = buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS), { aiProvider: provider });
    const analysis = await withAiExplanation(base, context, provider);
    expect(analysis.aiStatus).toBe("ia");
    expect(analysis.summary).toBe("Resumo da IA.");
    expect(analysis.opportunityReason).toBe("Motivo da IA.");
    expect(analysis.recommendationText).toBe("Abordar com transfer aeroporto.");
    expect(analysis.score).toBe(base.score);
    expect(analysis.breakdown).toEqual(base.breakdown);
  });

  it("resposta inválida (sem JSON) → fallback determinístico", async () => {
    stubAiFetch("isto não é JSON");
    const provider = createAiAnalysisProvider({ AI_API_KEY: "test-key" });
    const base = buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS), { aiProvider: provider });
    const analysis = await withAiExplanation(base, context, provider);
    expect(analysis.aiStatus).toBe("ia_falha");
    expect(analysis.score).toBe(base.score);
    expect(analysis.summary).toBe(base.summary);
  });

  it("resposta incompleta → fallback determinístico", async () => {
    stubAiFetch(JSON.stringify({ summary: "só resumo" }));
    const provider = createAiAnalysisProvider({ AI_API_KEY: "test-key" });
    const base = buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS), { aiProvider: provider });
    const analysis = await withAiExplanation(base, context, provider);
    expect(analysis.aiStatus).toBe("ia_falha");
  });

  it("erro de provider / timeout → fallback determinístico", async () => {
    stubAiFetch("", false);
    const provider = createAiAnalysisProvider({ AI_API_KEY: "test-key" });
    const base = buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS), { aiProvider: provider });
    const analysis = await withAiExplanation(base, context, provider);
    expect(analysis.aiStatus).toBe("ia_falha");
    expect(analysis.score).toBe(base.score);
  });

  it("JSON entre markdown fences é aceito", async () => {
    stubAiFetch("```json\n" + JSON.stringify({ summary: "S", opportunityReason: "O", recommendationText: "R" }) + "\n```");
    const provider = createAiAnalysisProvider({ AI_API_KEY: "test-key" });
    const analysis = await withAiExplanation(buildQualification(COMPANY, enrichmentWith(RICH_SIGNALS), { aiProvider: provider }), context, provider);
    expect(analysis.aiStatus).toBe("ia");
    expect(analysis.summary).toBe("S");
  });
});
