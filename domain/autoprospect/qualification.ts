import type { ProspectCompany } from "./types";
import type { EnrichmentOutcome, EnrichmentSignal, SignalCategory } from "./enrichment";

// ─── Serviços da AME (documentados em app/servicos) ─────────────

export const AME_SERVICES = [
  "Transfer aeroporto",
  "Transporte executivo",
  "Transporte corporativo",
  "Transporte para eventos",
  "Viagens intermunicipais",
  "Deslocamentos programados",
] as const;

export const SERVICE_BY_SIGNAL: Partial<Record<SignalCategory, string[]>> = {
  eventos_corporativos: ["Transporte para eventos"],
  eventos_sociais: ["Transporte para eventos"],
  viagens: ["Transfer aeroporto", "Viagens intermunicipais"],
  turismo_hospedagem: ["Transfer aeroporto"],
  executivos: ["Transporte executivo", "Transporte corporativo"],
  atendimento_empresarial: ["Transporte executivo", "Transporte corporativo"],
};

export const INFERENCE_BY_SIGNAL: Partial<Record<SignalCategory, string>> = {
  eventos_corporativos:
    "Pode possuir demanda por transporte de participantes e executivos em eventos.",
  atendimento_empresarial:
    "Pode atender clientes e executivos que exigem transporte executivo.",
  turismo_hospedagem:
    "Pode precisar de transfers de aeroporto para hóspedes e grupos.",
  viagens:
    "Pode demandar transfers de aeroporto e viagens intermunicipais.",
  executivos:
    "Pode possuir executivos que necessitam de deslocamentos executivos.",
  eventos_sociais:
    "Pode demandar transporte de convidados em eventos sociais.",
};

// ─── Classificação (0–29 / 30–49 / 50–69 / 70–84 / 85–100) ──────

export type Potential = "Muito baixo" | "Baixo" | "Médio" | "Alto" | "Muito alto";

export function scoreToPotential(score: number): Potential {
  if (score >= 85) return "Muito alto";
  if (score >= 70) return "Alto";
  if (score >= 50) return "Médio";
  if (score >= 30) return "Baixo";
  return "Muito baixo";
}

// ─── Área de atuação da AME (região de Belo Horizonte / MG) ─────

const COVERED_CITIES = new Set([
  "belo horizonte", "nova lima", "contagem", "betim", "santa luzia",
  "lagoa santa", "vespasiano", "ribeirão das neves", "ribeirao das neves",
  "sabarÁ", "sabara", "ibirité", "ibirite", "confins", "pedro leopoldo",
  "brumadinho", "caeté", "caete",
]);

function locationPoints(company: ProspectCompany): { points: number; reason: string } {
  const city = company.city.trim().toLowerCase();
  const state = company.state.trim().toUpperCase();
  if (city && COVERED_CITIES.has(city)) {
    return { points: 20, reason: `Localização atendida: ${company.city}` };
  }
  if (state === "MG") {
    return { points: 12, reason: "Estado atendido (MG)" };
  }
  if (city) {
    return { points: 5, reason: `Cidade fora da área principal da AME (${company.city})` };
  }
  return { points: 0, reason: "Localização não informada" };
}

// ─── Sinais determinísticos → pontos ────────────────────────────

function hasSignal(signals: EnrichmentSignal[], category: SignalCategory): boolean {
  return signals.some((signal) => signal.category === category);
}

export interface ScoreBreakdownItem {
  label: string;
  points: number;
  reason: string;
}

export interface QualificationFact {
  label: string;
  text: string;
  sourceUrl: string;
}

export interface QualificationInference {
  text: string;
  fromSignal: string;
  sourceUrl: string;
}

export type Recommendation = "abordar" | "investigar" | "baixa_prioridade";

export interface QualificationAnalysis {
  score: number;
  potential: Potential;
  confidence: "Baixa" | "Média" | "Alta";
  confidenceReason: string;
  summary: string;
  opportunityReason: string;
  facts: QualificationFact[];
  inferences: QualificationInference[];
  possibleServices: string[];
  recommendation: Recommendation;
  recommendationText: string;
  breakdown: ScoreBreakdownItem[];
  aiProvider: string;
  aiModel: string;
  aiStatus: "deterministico" | "ia" | "ia_falha";
}

// ─── Regras de score (0–100, explicáveis e reproduzíveis) ───────

export function computeScore(
  company: ProspectCompany,
  enrichment: EnrichmentOutcome | null,
  signals: EnrichmentSignal[],
): { score: number; breakdown: ScoreBreakdownItem[] } {
  const breakdown: ScoreBreakdownItem[] = [];

  const compatibleSegments = [
    "hotéis", "agências de eventos", "agências de turismo", "empresas",
    "escritórios", "indústrias", "faculdades", "clínicas",
  ];
  const segment = company.segment.trim().toLowerCase();
  if (segment) {
    const compatible = compatibleSegments.some((candidate) => segment.includes(candidate) || candidate.includes(segment));
    breakdown.push({
      label: "Segmento compatível",
      points: compatible ? 20 : 8,
      reason: compatible
        ? `Segmento "${company.segment}" está entre os perfis atendidos pela AME`
        : `Segmento "${company.segment}" identificado, mas fora do perfil principal`,
    });
  } else {
    breakdown.push({ label: "Segmento compatível", points: 0, reason: "Segmento não informado" });
  }

  const location = locationPoints(company);
  breakdown.push({ label: "Localização atendida", points: location.points, reason: location.reason });

  const hasEvents = hasSignal(signals, "eventos_corporativos") || hasSignal(signals, "eventos_sociais");
  breakdown.push({
    label: "Sinais de eventos",
    points: hasEvents ? 15 : 0,
    reason: hasEvents
      ? "Sinais de eventos encontrados no site (público de participantes/convidados)"
      : "Nenhum sinal de eventos encontrado",
  });

  const transferRelevant = [
    "viagens", "turismo_hospedagem", "executivos", "eventos_corporativos",
  ].some((category) => hasSignal(signals, category as SignalCategory));
  breakdown.push({
    label: "Possível demanda de transfer",
    points: transferRelevant ? 15 : 0,
    reason: transferRelevant
      ? "Sinais de viagens/turismo/executivos sugerem deslocamentos aeroportuários"
      : "Sem sinais de demanda de transfer",
  });

  const siteActive = enrichment?.status === "ok";
  breakdown.push({
    label: "Site comercial ativo",
    points: siteActive ? 10 : 0,
    reason: siteActive
      ? "Site oficial acessado com sucesso"
      : enrichment ? "Site indisponível no momento da coleta" : "Site não verificado",
  });

  const hasInfo = siteActive && (!!enrichment!.title || !!enrichment!.description || signals.length > 0);
  breakdown.push({
    label: "Informações comerciais encontradas",
    points: hasInfo ? 10 : 0,
    reason: hasInfo
      ? "Título, descrição ou conteúdo comercial coletado do site"
      : "Poucas informações comerciais coletadas",
  });

  const b2b = hasSignal(signals, "atendimento_empresarial");
  breakdown.push({
    label: "Atendimento empresarial",
    points: b2b ? 5 : 0,
    reason: b2b ? "Sinais de atendimento a empresas (B2B)" : "Sem sinais B2B",
  });

  const travel = hasSignal(signals, "turismo_hospedagem") || hasSignal(signals, "viagens");
  breakdown.push({
    label: "Turismo e viagens",
    points: travel ? 5 : 0,
    reason: travel ? "Sinais de turismo/hospedagem ou viagens" : "Sem sinais de turismo/viagens",
  });

  const score = breakdown.reduce((total, item) => total + item.points, 0);
  return { score: Math.min(100, Math.max(0, score)), breakdown };
}

// ─── Confiança da análise (separada do potencial) ───────────────

export function computeConfidence(
  enrichment: EnrichmentOutcome | null,
  signals: EnrichmentSignal[],
): { confidence: "Baixa" | "Média" | "Alta"; reason: string } {
  if (enrichment?.status === "ok" && signals.length >= 2) {
    return { confidence: "Alta", reason: "Site oficial acessado com múltiplos sinais comerciais." };
  }
  if (enrichment?.status === "ok") {
    return { confidence: "Média", reason: "Site oficial acessado, mas com poucas informações comerciais." };
  }
  return {
    confidence: "Baixa",
    reason: enrichment
      ? `Enriquecimento indisponível (${enrichment.reason}). Análise baseada apenas nos dados do Discovery.`
      : "Análise baseada apenas nos dados do Discovery.",
  };
}

// ─── Fatos, inferências e serviços sugeridos ─────────────────────

export function buildFacts(
  company: ProspectCompany,
  enrichment: EnrichmentOutcome | null,
  signals: EnrichmentSignal[],
): QualificationFact[] {
  const facts: QualificationFact[] = [
    { label: "Nome", text: company.name, sourceUrl: "" },
  ];
  if (company.segment) facts.push({ label: "Segmento", text: company.segment, sourceUrl: "" });
  if (company.city || company.state) {
    facts.push({ label: "Localização", text: [company.city, company.state].filter(Boolean).join(" - "), sourceUrl: "" });
  }
  if (company.website) facts.push({ label: "Site oficial", text: company.website, sourceUrl: company.website });
  if (enrichment?.status === "ok") {
    if (enrichment.title) facts.push({ label: "Título do site", text: enrichment.title, sourceUrl: enrichment.sourceUrl });
    if (enrichment.description) facts.push({ label: "Descrição do negócio", text: enrichment.description, sourceUrl: enrichment.sourceUrl });
    for (const signal of signals) {
      facts.push({ label: signal.label, text: signal.snippet, sourceUrl: signal.sourceUrl });
    }
  }
  return facts;
}

export function buildInferences(
  signals: EnrichmentSignal[],
): QualificationInference[] {
  const seen = new Set<SignalCategory>();
  const inferences: QualificationInference[] = [];
  for (const signal of signals) {
    if (seen.has(signal.category)) continue;
    seen.add(signal.category);
    const text = INFERENCE_BY_SIGNAL[signal.category];
    if (text) {
      inferences.push({ text, fromSignal: signal.label, sourceUrl: signal.sourceUrl });
    }
  }
  return inferences;
}

export function buildPossibleServices(signals: EnrichmentSignal[]): string[] {
  const seen = new Set<SignalCategory>();
  const services: string[] = [];
  for (const signal of signals) {
    if (seen.has(signal.category)) continue;
    seen.add(signal.category);
    for (const service of SERVICE_BY_SIGNAL[signal.category] || []) {
      if (!services.includes(service)) services.push(service);
    }
  }
  return services;
}

export function buildSummary(
  company: ProspectCompany,
  enrichment: EnrichmentOutcome | null,
  signals: EnrichmentSignal[],
): string {
  const location = [company.city, company.state].filter(Boolean).join(" - ") || "localização não informada";
  const segment = company.segment.trim() || "segmento não informado";
  let summary = `${company.name} atua com ${segment} em ${location}.`;
  if (enrichment?.status === "ok") {
    const labels = signals.map((signal) => signal.label);
    if (labels.length > 0) {
      summary += ` O site oficial indica: ${labels.join(", ").toLowerCase()}.`;
    } else {
      summary += " O site oficial foi acessado, mas nenhum sinal comercial específico foi encontrado.";
    }
  } else if (enrichment) {
    summary += ` O site oficial não pôde ser verificado (${enrichment.reason.toLowerCase()}).`;
  }
  return summary;
}

export function buildOpportunityReason(
  company: ProspectCompany,
  score: number,
  potential: Potential,
  signals: EnrichmentSignal[],
  breakdown: ScoreBreakdownItem[],
): string {
  const reasons: string[] = [];
  const segmentItem = breakdown.find((item) => item.label === "Segmento compatível");
  const locationItem = breakdown.find((item) => item.label === "Localização atendida");
  if (segmentItem && segmentItem.points >= 20) reasons.push(`atua no segmento ${company.segment.toLowerCase()}`);
  if (locationItem && locationItem.points >= 20) reasons.push(`está em ${company.city || "área atendida"}`);
  if (signals.length > 0) {
    reasons.push(`apresenta sinais de ${signals.slice(0, 3).map((s) => s.label.toLowerCase()).join(", ")}`);
  }
  if (reasons.length === 0) {
    return `${potential} potencial porque há poucas informações disponíveis para avaliar a oportunidade comercial.`;
  }
  const main = reasons.slice(0, 2).join(", ");
  return `${potential} potencial porque a empresa ${main}. Score de ${score}/100 com base em critérios objetivos.`;
}

export function buildRecommendation(score: number, potential: Potential): {
  recommendation: Recommendation;
  text: string;
} {
  if (score >= 70) {
    return {
      recommendation: "abordar",
      text: `Alto potencial (${potential}): empresa compatível com o perfil da AME. Recomenda-se abordagem comercial.`,
    };
  }
  if (score >= 50) {
    return {
      recommendation: "investigar",
      text: `Potencial médio (${potential}): vale investigar mais a empresa antes de decidir a abordagem.`,
    };
  }
  return {
    recommendation: "baixa_prioridade",
    text: `Potencial baixo (${potential}): poucos sinais comerciais. Baixa prioridade de abordagem.`,
  };
}

// ─── IA (componente substituível — nunca bloqueia a análise) ─────

export interface AiAnalysis {
  summary: string;
  opportunityReason: string;
  recommendationText: string;
  provider: string;
  model: string;
}

export interface AiAnalysisContext {
  company: ProspectCompany;
  enrichment: EnrichmentOutcome | null;
  signals: EnrichmentSignal[];
  facts: QualificationFact[];
}

export interface AiAnalysisProvider {
  readonly name: string;
  readonly model: string;
  readonly enabled: boolean;
  analyze(context: AiAnalysisContext): Promise<AiAnalysis>;
}

const AI_SYSTEM_PROMPT = [
  "Você é o analista comercial do Auto Prospect da Alves Mobilidade (empresa de transporte executivo).",
  "Analise APENAS as informações fornecidas no JSON de entrada (fatos e sinais coletados de fontes públicas).",
  "NUNCA invente informações: clientes, faturamento, funcionários, viagens, eventos, contratos ou contatos.",
  "Responda em português do Brasil, em JSON com as chaves:",
  '{"summary": "...", "opportunityReason": "...", "recommendationText": "..."}',
  "- summary: resumo de 1 a 2 frases do negócio com base apenas nos fatos.",
  "- opportunityReason: por que essa empresa pode ser uma boa oportunidade comercial para a AME (transporte executivo, transfer aeroporto, transporte corporativo, eventos, viagens).",
  "- recommendationText: ação sugerida (abordar / investigar / baixa prioridade) com justificativa.",
  "Se faltarem informações, diga que os dados são insuficientes — não preencha lacunas com suposições.",
].join("\n");

function parseAiJson(content: string): { summary: string; opportunityReason: string; recommendationText: string } {
  let cleaned = content.trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) cleaned = fenced[1].trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Resposta da IA sem JSON válido");
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
    summary?: unknown;
    opportunityReason?: unknown;
    recommendationText?: unknown;
  };
  const result = {
    summary: typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, 600) : "",
    opportunityReason: typeof parsed.opportunityReason === "string" ? parsed.opportunityReason.trim().slice(0, 600) : "",
    recommendationText: typeof parsed.recommendationText === "string" ? parsed.recommendationText.trim().slice(0, 600) : "",
  };
  if (!result.summary || !result.opportunityReason || !result.recommendationText) {
    throw new Error("Resposta da IA incompleta");
  }
  return result;
}

class OpenAiCompatibleProvider implements AiAnalysisProvider {
  readonly enabled = true;
  constructor(
    readonly name: string,
    readonly model: string,
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly timeoutMs = 30_000,
  ) {}

  async analyze(context: AiAnalysisContext): Promise<AiAnalysis> {
    const input = JSON.stringify({
      empresa: {
        nome: context.company.name,
        segmento: context.company.segment,
        cidade: context.company.city,
        estado: context.company.state,
      },
      enriquecimento: context.enrichment?.status === "ok"
        ? {
            titulo: context.enrichment.title,
            descricao: context.enrichment.description,
            paginasColetadas: context.enrichment.fetchedPages,
          }
        : { indisponivel: context.enrichment?.reason || "sem enriquecimento" },
      sinais: context.signals.map((signal) => ({
        sinal: signal.label,
        trecho: signal.snippet,
        fonte: signal.sourceUrl,
      })),
      fatos: context.facts.map((fact) => ({
        fato: fact.label,
        texto: fact.text,
        fonte: fact.sourceUrl,
      })),
    });

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
            { role: "system", content: AI_SYSTEM_PROMPT },
            { role: "user", content: `Informações coletadas (somente isto):\n${input}` },
          ],
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Provider de IA respondeu HTTP ${response.status}`);
      }
      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error("Resposta da IA vazia");
      const parsed = parseAiJson(content);
      if (!parsed.summary && !parsed.opportunityReason && !parsed.recommendationText) {
        throw new Error("Resposta da IA incompleta");
      }
      return { ...parsed, provider: this.name, model: this.model };
    } finally {
      clearTimeout(timer);
    }
  }
}

class DisabledAiProvider implements AiAnalysisProvider {
  readonly name = "nenhum";
  readonly model = "";
  readonly enabled = false;
  async analyze(): Promise<AiAnalysis> {
    throw new Error("Provider de IA não configurado");
  }
}

export function createAiAnalysisProvider(env: Record<string, string | undefined> = process.env): AiAnalysisProvider {
  const apiKey = env.AI_API_KEY;
  if (!apiKey) return new DisabledAiProvider();
  const baseUrl = env.AI_BASE_URL || "https://api.openai.com/v1";
  const model = env.AI_MODEL || "gpt-4o-mini";
  const name = baseUrl.includes("openai.com") ? "OpenAI-compatible" : new URL(baseUrl).hostname;
  return new OpenAiCompatibleProvider(name, model, baseUrl, apiKey);
}

// ─── Orquestração da qualificação ───────────────────────────────

export interface QualificationDeps {
  aiProvider: AiAnalysisProvider;
}

export function buildQualification(
  company: ProspectCompany,
  enrichment: EnrichmentOutcome | null,
  deps: QualificationDeps = { aiProvider: createAiAnalysisProvider({}) },
): QualificationAnalysis {
  const signals = enrichment?.signals || [];
  const { score, breakdown } = computeScore(company, enrichment, signals);
  const potential = scoreToPotential(score);
  const confidence = computeConfidence(enrichment, signals);
  const facts = buildFacts(company, enrichment, signals);
  const inferences = buildInferences(signals);
  const possibleServices = buildPossibleServices(signals);
  const summary = buildSummary(company, enrichment, signals);
  const opportunityReason = buildOpportunityReason(company, score, potential, signals, breakdown);
  const recommendation = buildRecommendation(score, potential);

  return {
    score,
    potential,
    confidence: confidence.confidence,
    confidenceReason: confidence.reason,
    summary,
    opportunityReason,
    facts,
    inferences,
    possibleServices,
    recommendation: recommendation.recommendation,
    recommendationText: recommendation.text,
    breakdown,
    aiProvider: deps.aiProvider.name,
    aiModel: deps.aiProvider.model,
    aiStatus: "deterministico",
  };
}

export async function withAiExplanation(
  analysis: QualificationAnalysis,
  context: AiAnalysisContext,
  aiProvider: AiAnalysisProvider,
): Promise<QualificationAnalysis> {
  if (!aiProvider.enabled) return analysis;
  try {
    const ai = await aiProvider.analyze(context);
    return {
      ...analysis,
      summary: ai.summary || analysis.summary,
      opportunityReason: ai.opportunityReason || analysis.opportunityReason,
      recommendationText: ai.recommendationText || analysis.recommendationText,
      aiProvider: ai.provider,
      aiModel: ai.model,
      aiStatus: "ia",
    };
  } catch (error) {
    console.error("[Auto Prospect] IA indisponível — usando análise determinística:", error);
    return { ...analysis, aiStatus: "ia_falha" };
  }
}
