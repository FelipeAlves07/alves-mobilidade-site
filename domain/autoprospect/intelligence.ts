import type { ProspectCompany } from "./types";
import type { EnrichmentOutcome, EnrichmentSignal } from "./enrichment";
import {
  AME_SERVICES,
  type QualificationAnalysis,
  type QualificationFact,
} from "./qualification";

// ════════════════════════════════════════════════════════════════
// INTELIGÊNCIA COMERCIAL (Etapa 5)
//
// Camada de interpretação e priorização sobre os dados existentes:
// Discovery → Enriquecimento → Evidências → Qualificação → Inteligência.
//
// Regras:
//  - A IA NUNCA é fonte de fatos: recebe apenas dados já coletados.
//  - Prioridade 1-4 é DETERMINÍSTICA (regras explícitas, testadas).
//  - A IA interpreta (resumo, serviços com motivo, confiança) e sugere,
//    mas nunca altera o Score determinístico em silêncio.
//  - Resposta da IA é validada (schema) antes de ser aceita.
//  - Sem chave de IA configurada, o sistema funciona determinístico.
// ════════════════════════════════════════════════════════════════

// ─── Prioridade comercial (1-4) ─────────────────────────────────

export type IntelligencePriority = 1 | 2 | 3 | 4;

export const PRIORITY_LABEL: Record<IntelligencePriority, string> = {
  1: "Abordar agora",
  2: "Abordar",
  3: "Avaliar",
  4: "Baixa prioridade",
};

export const NEXT_ACTION_BY_PRIORITY: Record<IntelligencePriority, string> = {
  1: "Abordar agora",
  2: "Abordar",
  3: "Investigar melhor",
  4: "Baixa prioridade",
};

export const PRIORITY_EMOJI: Record<IntelligencePriority, string> = {
  1: "🔥",
  2: "🟠",
  3: "🟡",
  4: "⚪",
};

export interface PriorityResult {
  priority: IntelligencePriority;
  priorityReason: string;
  reasons: string[];
}

export interface PriorityInput {
  score: number;
  confidence: "Baixa" | "Média" | "Alta";
  signalsCount: number;
  servicesCount: number;
  siteActive: boolean;
  breakdown: QualificationAnalysis["breakdown"];
}

/**
 * Prioridade determinística (1-4). Critérios:
 *  - Score (base): >=85 → 4 pts · >=70 → 3 · >=50 → 2 · >=30 → 1 · senão 0
 *  - Confiança: Alta +1 · Média 0 · Baixa -1 (mínimo 0)
 *  - Evidências/sinais: >=3 → +1
 *  - Compatibilidade com serviços da AME: >=2 → +1
 * Limites: >=6 → 1 · >=4 → 2 · >=2 → 3 · senão 4.
 */
export function computePriority(input: PriorityInput): PriorityResult {
  const points: number[] = [];
  const reasons: string[] = [];

  const scorePoints = input.score >= 85 ? 4 : input.score >= 70 ? 3 : input.score >= 50 ? 2 : input.score >= 30 ? 1 : 0;
  points.push(scorePoints);

  if (input.confidence === "Alta") {
    points.push(1);
    reasons.push("Alta confiança nos dados");
  } else if (input.confidence === "Baixa") {
    points.push(-1);
    reasons.push("Confiança baixa nos dados coletados");
  }

  if (input.signalsCount >= 3) {
    points.push(1);
    reasons.push(`${input.signalsCount} sinais comerciais encontrados`);
  } else if (input.signalsCount > 0) {
    reasons.push(`${input.signalsCount} ${input.signalsCount === 1 ? "sinal comercial" : "sinais comerciais"} encontrados`);
  } else {
    reasons.push("Nenhum sinal comercial encontrado");
  }

  if (input.servicesCount >= 2) {
    points.push(1);
    reasons.push(`${input.servicesCount} serviços da AME potencialmente compatíveis`);
  }

  const segmentItem = input.breakdown.find((item) => item.label === "Segmento compatível");
  if (segmentItem && segmentItem.points >= 20) {
    reasons.push("Segmento altamente compatível com o perfil da AME");
  }

  const locationItem = input.breakdown.find((item) => item.label === "Localização atendida");
  if (locationItem && locationItem.points >= 20) {
    reasons.push("Localização atendida pela AME");
  } else if (locationItem && locationItem.points >= 12) {
    reasons.push("Estado atendido (MG)");
  }

  const transferItem = input.breakdown.find((item) => item.label === "Possível demanda de transfer");
  if (transferItem && transferItem.points > 0) {
    reasons.push("Possível demanda por transfer");
  }

  if (input.siteActive) {
    reasons.push("Site comercial ativo");
  } else {
    reasons.push("Site não verificado no momento da coleta");
  }

  const total = Math.max(0, points.reduce((sum, value) => sum + value, 0));
  const priority: IntelligencePriority = total >= 6 ? 1 : total >= 4 ? 2 : total >= 2 ? 3 : 4;

  return {
    priority,
    priorityReason: `Prioridade ${priority} — ${PRIORITY_LABEL[priority]}. Pontuação da regra: ${total} ponto${total === 1 ? "" : "s"} (base de score + confiança + evidências + compatibilidade).`,
    reasons,
  };
}

// ─── Perfil comercial (resumo curto, mobile-first) ──────────────

export function buildCommercialSummary(
  company: ProspectCompany,
  qualification: QualificationAnalysis,
): string {
  const location = [company.city, company.state].filter(Boolean).join(" - ") || "localização não informada";
  const segment = company.segment.trim() || "segmento não informado";
  const needs =
    qualification.possibleServices.length > 0
      ? `Possíveis necessidades: ${qualification.possibleServices.slice(0, 3).join(", ")}.`
      : "Necessidade ainda não identificada.";
  return (
    `${company.name} atua com ${segment} em ${location}. ` +
    `${qualification.potential} potencial comercial (score determinístico ${qualification.score}/100, confiança ${qualification.confidence.toLowerCase()} nos dados). ` +
    needs
  );
}

export interface RecommendedService {
  service: string;
  reason: string;
}

// ─── Contexto entregue à IA (somente dados coletados) ───────────

export interface IntelligenceAiContext {
  company: ProspectCompany;
  enrichment: EnrichmentOutcome | null;
  signals: EnrichmentSignal[];
  facts: QualificationFact[];
  qualification: QualificationAnalysis;
}

export function buildIntelligenceContext(input: {
  company: ProspectCompany;
  enrichment: EnrichmentOutcome | null;
  signals: EnrichmentSignal[];
  facts: QualificationFact[];
  qualification: QualificationAnalysis;
}): string {
  return JSON.stringify({
    empresa: {
      nome: input.company.name,
      segmento: input.company.segment,
      cidade: input.company.city,
      estado: input.company.state,
      site: input.company.website,
    },
    enriquecimento: input.enrichment?.status === "ok"
      ? {
          titulo: input.enrichment.title,
          descricao: input.enrichment.description,
          paginasColetadas: input.enrichment.fetchedPages,
          fonte: input.enrichment.sourceUrl,
        }
      : { indisponivel: input.enrichment?.reason || "sem enriquecimento" },
    sinais: input.signals.map((signal) => ({
      sinal: signal.label,
      trecho: signal.snippet,
      fonte: signal.sourceUrl,
    })),
    evidencias: input.facts.map((fact) => ({
      fato: fact.label,
      texto: fact.text,
      fonte: fact.sourceUrl,
    })),
    qualificacao: {
      score: input.qualification.score,
      potencial: input.qualification.potential,
      confianca: input.qualification.confidence,
      breakdown: input.qualification.breakdown,
      servicosPossiveis: input.qualification.possibleServices,
      inferencias: input.qualification.inferences.map((inference) => inference.text),
    },
  });
}

// ─── Resposta estruturada da IA (schema validado) ───────────────

export const AI_POTENTIALS = ["Muito baixo", "Baixo", "Médio", "Alto", "Muito alto"] as const;
export const AI_NEXT_ACTIONS = ["approach_now", "approach", "investigate", "low_priority"] as const;

export interface IntelligenceAiResponse {
  summary: string;
  potential: string;
  priority: IntelligencePriority;
  reasons: string[];
  recommendedServices: RecommendedService[];
  nextAction: string;
  confidence: "Baixa" | "Média" | "Alta";
}

const MAX_REASON_LENGTH = 140;
const MAX_SERVICE_REASON_LENGTH = 200;
const MAX_REASONS = 8;
const MAX_SERVICES = 5;

export function validateIntelligenceResponse(raw: unknown): IntelligenceAiResponse {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Resposta da IA não é um objeto JSON válido");
  }
  const value = raw as Record<string, unknown>;

  const summary = typeof value.summary === "string" ? value.summary.trim().slice(0, 700) : "";
  if (!summary) throw new Error("Resposta da IA sem resumo (summary)");

  const potential = typeof value.potential === "string" ? value.potential : "";
  if (!(AI_POTENTIALS as readonly string[]).includes(potential)) {
    throw new Error("Resposta da IA com potencial inválido");
  }

  const priority = typeof value.priority === "number" ? value.priority : Number(value.priority);
  if (!Number.isInteger(priority) || priority < 1 || priority > 4) {
    throw new Error("Resposta da IA com prioridade inválida");
  }

  const nextAction = typeof value.nextAction === "string" ? value.nextAction : "";
  if (!(AI_NEXT_ACTIONS as readonly string[]).includes(nextAction)) {
    throw new Error("Resposta da IA com próxima ação inválida");
  }

  const confidence = typeof value.confidence === "string" ? value.confidence : "";
  if (confidence !== "Baixa" && confidence !== "Média" && confidence !== "Alta") {
    throw new Error("Resposta da IA com confiança inválida");
  }

  const reasons = Array.isArray(value.reasons)
    ? value.reasons
        .filter((reason): reason is string => typeof reason === "string")
        .map((reason) => reason.trim().slice(0, MAX_REASON_LENGTH))
        .filter((reason) => reason.length > 0)
        .slice(0, MAX_REASONS)
    : [];
  if (reasons.length === 0) throw new Error("Resposta da IA sem justificativas (reasons)");

  const recommendedServices = Array.isArray(value.recommendedServices)
    ? value.recommendedServices
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({
          service: typeof item.service === "string" ? item.service.trim() : "",
          reason: typeof item.reason === "string" ? item.reason.trim().slice(0, MAX_SERVICE_REASON_LENGTH) : "",
        }))
        .filter((item) => (AME_SERVICES as readonly string[]).includes(item.service) && item.reason.length > 0)
        .slice(0, MAX_SERVICES)
    : [];

  return {
    summary,
    potential,
    priority: priority as IntelligencePriority,
    reasons,
    recommendedServices,
    nextAction,
    confidence: confidence as IntelligenceAiResponse["confidence"],
  };
}

// ─── Provider de IA (componente substituível) ───────────────────

export interface IntelligenceAiCall {
  response: IntelligenceAiResponse;
  tokensIn: number;
  tokensOut: number;
}

export interface CommercialIntelligenceProvider {
  readonly name: string;
  readonly model: string;
  readonly enabled: boolean;
  analyze(context: IntelligenceAiContext): Promise<IntelligenceAiCall>;
}

const INTELLIGENCE_SYSTEM_PROMPT = [
  "Você é o analista de inteligência comercial do Auto Prospect da Alves Mobilidade (empresa de transporte executivo em Belo Horizonte/MG).",
  "Seu papel: interpretar dados JÁ coletados para ajudar o vendedor a decidir a ordem de abordagem.",
  "REGRAS OBRIGATÓRIAS:",
  "1. Use SOMENTE as informações fornecidas no JSON de entrada.",
  "2. NUNCA invente fatos: clientes, faturamento, funcionários, viagens, eventos, contratos, contatos ou demanda.",
  "3. NUNCA afirme que a empresa usa um serviço da AME sem evidência nos dados fornecidos.",
  "4. Não inferir dados pessoais (LGPD): a análise é sobre a empresa e a oportunidade comercial.",
  "5. Se faltar informação, escreva: 'Não identificado nos dados disponíveis.'",
  "6. O score determinístico fornecido é a base — sua prioridade é uma interpretação/sugestão, não uma alteração.",
  "Responda em português do Brasil, APENAS com JSON válido no formato:",
  '{"summary":"...","potential":"Alto|Baixo|Médio|Muito alto|Muito baixo","priority":1,"reasons":["..."],"recommendedServices":[{"service":"Transfer aeroporto","reason":"..."}],"nextAction":"approach_now|approach|investigate|low_priority","confidence":"Alta|Média|Baixa"}',
  "- summary: resumo comercial curto (1-2 frases) baseado apenas nos dados.",
  "- potential: interpretação do potencial comercial (não altera o score).",
  "- priority: sugestão 1-4 (1 = abordar primeiro).",
  "- reasons: porquês curtos (máx. 6).",
  "- recommendedServices: use APENAS estes serviços da AME: " + AME_SERVICES.join(", ") + ".",
  "- nextAction: ação sugerida (sistema recomenda, o usuário decide).",
].join("\n");

function parseIntelligenceJson(content: string): IntelligenceAiResponse {
  let cleaned = content.trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) cleaned = fenced[1].trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Resposta da IA sem JSON válido");
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
  return validateIntelligenceResponse(parsed);
}

export interface AiUsage {
  tokensIn: number;
  tokensOut: number;
}

class OpenAiCommercialProvider implements CommercialIntelligenceProvider {
  readonly enabled = true;
  constructor(
    readonly name: string,
    readonly model: string,
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly timeoutMs = 45_000,
  ) {}

  async analyze(context: IntelligenceAiContext): Promise<IntelligenceAiCall> {
    const input = buildIntelligenceContext(context);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          messages: [
            { role: "system", content: INTELLIGENCE_SYSTEM_PROMPT },
            { role: "user", content: `Dados coletados (somente isto):\n${input}` },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Provider de IA respondeu HTTP ${response.status}`);
      }
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error("Resposta da IA vazia");
      const parsed = parseIntelligenceJson(content);
      return {
        response: parsed,
        tokensIn: Number(payload.usage?.prompt_tokens || 0),
        tokensOut: Number(payload.usage?.completion_tokens || 0),
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

class DisabledCommercialProvider implements CommercialIntelligenceProvider {
  readonly name = "nenhum";
  readonly model = "";
  readonly enabled = false;
  async analyze(): Promise<IntelligenceAiCall> {
    throw new Error("Provider de IA não configurado");
  }
}

export function createCommercialIntelligenceProvider(
  env: Record<string, string | undefined> = process.env,
): CommercialIntelligenceProvider {
  const apiKey = env.AI_API_KEY;
  if (!apiKey) return new DisabledCommercialProvider();
  const baseUrl = env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = env.AI_MODEL || "gpt-4o-mini";
  const name = baseUrl.includes("openai.com") ? "OpenAI" : new URL(baseUrl).hostname;
  return new OpenAiCommercialProvider(name, model, baseUrl, apiKey);
}

// ─── Custo estimado (referência de preço do provider inicial) ───

export const AI_PRICE_PER_1M = { inputUsd: 0.15, outputUsd: 0.6 }; // gpt-4o-mini

export function estimateCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn * AI_PRICE_PER_1M.inputUsd + tokensOut * AI_PRICE_PER_1M.outputUsd) / 1_000_000;
}

// ─── Resultado da inteligência comercial ────────────────────────

export interface IntelligenceAnalysis {
  priority: IntelligencePriority;
  priorityReason: string;
  reasons: string[];
  nextAction: string;
  summary: string;
  recommendedServices: RecommendedService[];
  aiConfidence: "" | "Baixa" | "Média" | "Alta";
  aiProvider: string;
  aiModel: string;
  aiStatus: "deterministico" | "ia" | "ia_falha";
  error: string;
  aiResponse: IntelligenceAiResponse | null;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  analysisVersion: string;
}

export interface IntelligenceDeps {
  provider: CommercialIntelligenceProvider;
}

export async function runCommercialIntelligence(
  input: {
    company: ProspectCompany;
    enrichment: EnrichmentOutcome | null;
    qualification: QualificationAnalysis;
  },
  deps: IntelligenceDeps = { provider: createCommercialIntelligenceProvider({}) },
): Promise<IntelligenceAnalysis> {
  const { company, enrichment, qualification } = input;
  const signals = enrichment?.signals || [];

  const priorityResult = computePriority({
    score: qualification.score,
    confidence: qualification.confidence,
    signalsCount: signals.length,
    servicesCount: qualification.possibleServices.length,
    siteActive: enrichment?.status === "ok",
    breakdown: qualification.breakdown,
  });

  const deterministicServices: RecommendedService[] = qualification.possibleServices.map((service) => ({
    service,
    reason: "Identificado a partir dos sinais comerciais coletados.",
  }));

  const base: IntelligenceAnalysis = {
    ...priorityResult,
    nextAction: NEXT_ACTION_BY_PRIORITY[priorityResult.priority],
    summary: buildCommercialSummary(company, qualification),
    recommendedServices: deterministicServices,
    aiConfidence: "",
    aiProvider: deps.provider.name,
    aiModel: deps.provider.model,
    aiStatus: "deterministico",
    error: "",
    aiResponse: null,
    tokensIn: 0,
    tokensOut: 0,
    costEstimate: 0,
    analysisVersion: "intelligence-v1",
  };

  if (!deps.provider.enabled) return base;

  try {
    const call = await deps.provider.analyze({
      company,
      enrichment,
      signals,
      facts: qualification.facts,
      qualification,
    });
    return {
      ...base,
      summary: call.response.summary || base.summary,
      recommendedServices:
        call.response.recommendedServices.length > 0
          ? call.response.recommendedServices
          : deterministicServices,
      aiConfidence: call.response.confidence,
      aiProvider: deps.provider.name,
      aiModel: deps.provider.model,
      aiStatus: "ia",
      aiResponse: call.response,
      tokensIn: call.tokensIn,
      tokensOut: call.tokensOut,
      costEstimate: estimateCost(call.tokensIn, call.tokensOut),
    };
  } catch (error) {
    console.error("[Auto Prospect] IA indisponível — inteligência determinística mantida:", error);
    return {
      ...base,
      aiStatus: "ia_falha",
      error: error instanceof Error ? error.message : "Provider de IA indisponível",
    };
  }
}

// ─── Histórico (cada execução gera um registro; nada é sobrescrito) ──

export function latestIntelligencePerCompany<T extends { companyId: string; createdAt: string }>(
  rows: T[],
): Map<string, T> {
  const latest = new Map<string, T>();
  for (const row of rows) {
    const previous = latest.get(row.companyId);
    if (!previous || row.createdAt > previous.createdAt) latest.set(row.companyId, row);
  }
  return latest;
}
