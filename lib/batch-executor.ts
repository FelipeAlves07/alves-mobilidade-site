import "server-only";

import { supabase } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProspectCompany } from "@/domain/autoprospect/types";
import type { EnrichmentOutcome, EnrichmentProvider } from "@/domain/autoprospect/enrichment";
import { createEnrichmentProvider } from "@/domain/autoprospect/enrichment";
import type { AiAnalysisProvider } from "@/domain/autoprospect/qualification";
import { buildQualification, createAiAnalysisProvider, withAiExplanation } from "@/domain/autoprospect/qualification";
import type { CommercialIntelligenceProvider } from "@/domain/autoprospect/intelligence";
import { createCommercialIntelligenceProvider, runCommercialIntelligence } from "@/domain/autoprospect/intelligence";
import {
  apBatchRunFromSupabase,
  apBatchCompanyRunFromSupabase,
  apCompanyFromSupabase,
  apEnrichmentToSupabase,
  apEvidenceToSupabase,
  apIntelligenceToSupabase,
  apQualificationToSupabase,
  type BatchCompanyRunRow,
  type BatchRunRow,
} from "@/lib/repository-mappers";
import {
  BATCH_CONFIG,
  BatchClaimLostError,
  BatchDbError,
  BatchNoEligibleCompaniesError,
  BatchRunConflictError,
  BatchRunInvalidStateError,
  BatchRunNotFoundError,
  BatchRunPausedError,
  BatchValidationError,
  canBatchRunTransition,
  canCompleteRun,
  classifyEnrichmentReason,
  classifyExecutorError,
  decideRetry,
  normalizeBatchRunFilters,
  selectBatchCompanies,
  type BatchCompanyOutcome,
  type BatchCompanyStatus,
  type BatchCounters,
  type BatchRunFilters,
  type BatchRunStatus,
} from "@/domain/autoprospect/batch";

// ════════════════════════════════════════════════════════════════
// EXECUTOR DO LOTE (Etapa 7)
//
// Orquestra o pipeline EXISTENTE (enriquecimento → qualificação →
// inteligência) para cada empresa da fila, com claim atômico, retry,
// retomada e contadores. Nenhum provider/regra das Etapas 1-6 é
// alterado; este módulo apenas os reutiliza.
//
// As dependências de banco/relógio são injetáveis (padrão da casa,
// ex.: DiscoveryDeps) para testes com fakes.
// ════════════════════════════════════════════════════════════════

export interface CompanyRunFinishPatch {
  status: BatchCompanyStatus;
  claimedAt: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface CompanyRunDeferPatch {
  claimedAt: string;
  nextRetryAt: string;
  retryCount: number;
  errorCode: string;
  errorMessage: string;
}

export interface BatchClaim {
  batchRunId: string;
  companyId: string;
  claimedAt: string;
  retryCount: number;
}

export interface BatchExecutorDeps {
  newRunId(): string;
  nowIso(): string;
  sleep(ms: number): Promise<void>;
  fetchCompany(companyId: string): Promise<ProspectCompany | null>;
  fetchCompanyRun(runId: string, companyId: string): Promise<BatchCompanyRunRow | null>;
  fetchRun(runId: string): Promise<BatchRunRow | null>;
  claimNext(runId: string): Promise<BatchClaim | null>;
  insertEnrichment(payload: Record<string, unknown>): Promise<string>;
  replaceEvidences(
    enrichmentId: string,
    claimedAt: string,
    payloads: Record<string, unknown>[],
  ): Promise<void>;
  insertQualification(payload: Record<string, unknown>): Promise<string>;
  insertIntelligence(payload: Record<string, unknown>): Promise<string>;
  finishCompanyRun(runId: string, companyId: string, patch: CompanyRunFinishPatch): Promise<void>;
  deferCompanyRun(runId: string, companyId: string, patch: CompanyRunDeferPatch): Promise<void>;
  refreshRunCounters(runId: string): Promise<BatchCounters>;
  setRunStatus(runId: string, status: BatchRunStatus, expectedStatuses?: BatchRunStatus[]): Promise<void>;
  finishRun(runId: string): Promise<boolean>;
  cancelRun(runId: string): Promise<boolean>;
  countActiveRuns(campaignId: string): Promise<number>;
  selectEligibleCompanyIds(campaignId: string, filters: BatchRunFilters): Promise<string[]>;
  insertRunWithCompanies(
    id: string,
    campaignId: string,
    filters: BatchRunFilters,
    companyIds: string[],
  ): Promise<BatchRunRow>;
  listFailedCompanyIds(runId: string): Promise<string[]>;
  enrichmentProvider: EnrichmentProvider;
  aiProvider: AiAnalysisProvider;
  intelligenceProvider: CommercialIntelligenceProvider;
}

// ─── Implementação real (Supabase + providers existentes) ───────

function isoAddMs(nowIso: string, ms: number): string {
  return new Date(new Date(nowIso).getTime() + ms).toISOString();
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message || "");
  }
  return String(error);
}

function isBatchPermissionError(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";
  return code === "42501" || /permission denied|insufficient privilege/i.test(errorMessage(error));
}

function claimLostError(error: unknown): BatchClaimLostError | null {
  if (error instanceof BatchClaimLostError) return error;
  const message = errorMessage(error);
  if (/claim de batch|lease (?:do lote )?(?:ausente|cancelado|expirado|perdido)/i.test(message)) {
    return new BatchClaimLostError("O lease deste item não é mais válido.");
  }
  return null;
}

function isActiveRunUniqueViolation(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";
  return (
    code === "23505" &&
    /idx_ap_batch_runs_one_active_campaign/i.test(errorMessage(error))
  );
}

function rpcId(data: unknown, operation: string): string {
  if (typeof data === "string" && data) return data;
  throw new BatchDbError(`${operation} não retornou o identificador do artefato.`);
}

export function createBatchExecutorDepsForClient(
  client: SupabaseClient,
  overrides: Partial<BatchExecutorDeps> = {},
): BatchExecutorDeps {
  const deps: BatchExecutorDeps = {
    newRunId: () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    nowIso: () => new Date().toISOString(),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

    fetchCompany: async (companyId) => {
      const { data, error } = await client
        .from("ap_companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data ? apCompanyFromSupabase(data as Record<string, unknown>) : null;
    },

    fetchCompanyRun: async (runId, companyId) => {
      const { data, error } = await client
        .from("ap_batch_company_runs")
        .select("*")
        .eq("batch_run_id", runId)
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      return data
        ? apBatchCompanyRunFromSupabase(data as Record<string, unknown>)
        : null;
    },

    fetchRun: async (runId) => {
      const { data, error } = await client
        .from("ap_batch_runs")
        .select("*")
        .eq("id", runId)
        .maybeSingle();
      if (error) throw error;
      return data ? apBatchRunFromSupabase(data as Record<string, unknown>) : null;
    },

    claimNext: async (runId) => {
      const { data, error } = await client.rpc("ap_batch_claim_next", {
        p_run_id: runId,
      });
      if (error) {
        if (isBatchPermissionError(error)) {
          throw new BatchDbError(
            "Processamento em lote não autorizado para esta sessão.",
          );
        }
        throw error;
      }
      if (!data || typeof data !== "object") return null;
      const claim = data as Record<string, unknown>;
      const parsed: BatchClaim = {
        batchRunId: String(claim.batchRunId || ""),
        companyId: String(claim.companyId || ""),
        claimedAt: String(claim.claimedAt || ""),
        retryCount: Number(claim.retryCount || 0),
      };
      if (
        parsed.batchRunId !== runId ||
        !parsed.companyId ||
        !parsed.claimedAt ||
        !Number.isInteger(parsed.retryCount) ||
        parsed.retryCount < 0
      ) {
        throw new BatchDbError("A RPC de claim retornou um lease inválido.");
      }
      return parsed;
    },

    insertEnrichment: async (payload) => {
      const { data, error } = await client.rpc("ap_batch_upsert_enrichment", {
        p_payload: payload,
      });
      if (error) throw error;
      return rpcId(data, "Enriquecimento");
    },

    replaceEvidences: async (enrichmentId, claimedAt, payloads) => {
      const { error } = await client.rpc("ap_batch_replace_evidences", {
        p_enrichment_id: enrichmentId,
        p_claimed_at: claimedAt,
        p_evidences: payloads,
      });
      if (error) throw error;
    },

    insertQualification: async (payload) => {
      const { data, error } = await client.rpc("ap_batch_upsert_qualification", {
        p_payload: payload,
      });
      if (error) throw error;
      return rpcId(data, "Qualificação");
    },

    insertIntelligence: async (payload) => {
      const { data, error } = await client.rpc("ap_batch_upsert_intelligence", {
        p_payload: payload,
      });
      if (error) throw error;
      return rpcId(data, "Inteligência");
    },

    finishCompanyRun: async (runId, companyId, patch) => {
      const { data, error } = await client.rpc("ap_batch_finish_company", {
        p_run_id: runId,
        p_company_id: companyId,
        p_claimed_at: patch.claimedAt,
        p_status: patch.status,
        p_error_code: patch.errorCode ?? "",
        p_error_message: patch.errorMessage ?? "",
      });
      if (error) throw error;
      if (data !== true) {
        throw new BatchClaimLostError(
          "O lease do item mudou antes da finalização.",
        );
      }
    },

    deferCompanyRun: async (runId, companyId, patch) => {
      const { data, error } = await client.rpc("ap_batch_defer_company", {
        p_run_id: runId,
        p_company_id: companyId,
        p_claimed_at: patch.claimedAt,
        p_retry_count: patch.retryCount,
        p_next_retry_at: patch.nextRetryAt,
        p_error_code: patch.errorCode,
        p_error_message: patch.errorMessage,
      });
      if (error) throw error;
      if (data !== true) {
        throw new BatchClaimLostError(
          "O lease do item mudou antes do reagendamento.",
        );
      }
    },

    refreshRunCounters: async (runId) => {
      const { data, error } = await client.rpc("ap_batch_refresh_run_counters", {
        p_run_id: runId,
      });
      if (error) throw error;
      if (!data || typeof data !== "object") {
        throw new BatchRunNotFoundError("Processamento não encontrado.");
      }
      const counters = data as Record<string, unknown>;
      return {
        total: Number(counters.total || 0),
        pending: Number(counters.pending || 0),
        processing: Number(counters.processing || 0),
        completed: Number(counters.completed || 0),
        failed: Number(counters.failed || 0),
        withoutData: Number(counters.withoutData || 0),
        cancelled: Number(counters.cancelled || 0),
      };
    },

    setRunStatus: async (runId, status, expectedStatuses) => {
      const { data, error } = await client.rpc("ap_batch_set_run_status", {
        p_run_id: runId,
        p_status: status,
        p_expected_statuses: expectedStatuses ?? [],
      });
      if (error) throw error;
      if (data !== true) {
        throw new BatchRunInvalidStateError("O estado do processamento mudou durante a operação.");
      }
    },

    finishRun: async (runId) => {
      const { data, error } = await client.rpc("ap_batch_finish_run", {
        p_run_id: runId,
      });
      if (error) throw error;
      return data === true;
    },

    cancelRun: async (runId) => {
      const { data, error } = await client.rpc("ap_batch_cancel_run", {
        p_run_id: runId,
      });
      if (error) throw error;
      return data === true;
    },

    countActiveRuns: async (campaignId) => {
      const { data, error } = await client
        .from("ap_batch_runs")
        .select("id")
        .eq("campaign_id", campaignId)
        .in("status", ["pendente", "processando", "pausado"]);
      if (error) throw error;
      return (data || []).length;
    },

    selectEligibleCompanyIds: async (campaignId, filters) => {
      const { data, error } = await client
        .from("ap_discoveries")
        .select("company_id")
        .eq("campaign_id", campaignId);
      if (error) throw error;
      const companyIds = [...new Set((data || []).map((row) => row.company_id as string))];
      let companiesWithIntelligence = new Set<string>();
      if (filters.apenasSemInteligencia && companyIds.length > 0) {
        const { data: intelRows, error: intelError } = await client
          .from("ap_intelligence")
          .select("company_id")
          .in("company_id", companyIds);
        if (intelError) throw intelError;
        companiesWithIntelligence = new Set(
          (intelRows || []).map((row) => row.company_id as string),
        );
      }
      return selectBatchCompanies({
        companyIds,
        companiesWithIntelligence,
        apenasSemInteligencia: filters.apenasSemInteligencia,
        limiteMaximo: filters.limiteMaximo,
      });
    },

    insertRunWithCompanies: async (id, campaignId, filters, companyIds) => {
      const { data, error } = await client.rpc("ap_batch_create_run", {
        p_run_id: id,
        p_campaign_id: campaignId,
        p_filters: filters,
        p_company_ids: companyIds,
      });
      if (error) {
        if (isBatchPermissionError(error)) {
          throw new BatchDbError("Criação de lote não autorizada para esta sessão.");
        }
        throw error;
      }
      return apBatchRunFromSupabase(data as Record<string, unknown>);
    },

    listFailedCompanyIds: async (runId) => {
      const { data, error } = await client
        .from("ap_batch_company_runs")
        .select("company_id")
        .eq("batch_run_id", runId)
        .eq("status", "falha");
      if (error) throw error;
      return (data || []).map((row) => row.company_id as string);
    },

    enrichmentProvider: createEnrichmentProvider("website"),
    aiProvider: createAiAnalysisProvider(),
    intelligenceProvider: createCommercialIntelligenceProvider(),
  };
  return { ...deps, ...overrides };
}

export function createBatchExecutorDeps(
  overrides: Partial<BatchExecutorDeps> = {},
): BatchExecutorDeps {
  return createBatchExecutorDepsForClient(supabase, overrides);
}

// ─── Retry de operações de banco (dentro do orçamento do chunk) ──

async function withDbRetry<T>(
  op: () => Promise<T>,
  deps: BatchExecutorDeps,
  budgetMs: number,
): Promise<T> {
  let lastError: unknown;
  const delays = BATCH_CONFIG.dbRetryDelaysMs;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await op();
    } catch (error) {
      const lost = claimLostError(error);
      if (lost) throw lost;
      lastError = error;
    }
    if (attempt >= delays.length) break;
    const delay = delays[attempt];
    if (delay > budgetMs) break;
    await deps.sleep(delay);
  }
  throw lastError;
}

// ─── Criação de runs ────────────────────────────────────────────

async function buildRun(
  campaignId: string,
  companyIds: string[],
  filters: BatchRunFilters,
  deps: BatchExecutorDeps,
): Promise<{ run: BatchRunRow; total: number }> {
  const id = deps.newRunId();
  let run: BatchRunRow;
  try {
    run = await deps.insertRunWithCompanies(id, campaignId, filters, companyIds);
  } catch (error) {
    if (isActiveRunUniqueViolation(error)) {
      throw new BatchRunConflictError(
        "Já existe um processamento em andamento para esta campanha.",
      );
    }
    throw error;
  }
  return { run, total: companyIds.length };
}

export async function createBatchRun(
  campaignId: string,
  rawFilters: unknown,
  deps: BatchExecutorDeps = createBatchExecutorDeps(),
): Promise<{ run: BatchRunRow; total: number }> {
  const normalized = normalizeBatchRunFilters(rawFilters);
  if ("error" in normalized) {
    throw new BatchValidationError(normalized.error);
  }
  const active = await deps.countActiveRuns(campaignId);
  if (active > 0) {
    throw new BatchRunConflictError(
      "Já existe um processamento em andamento para esta campanha.",
    );
  }
  const companyIds = await deps.selectEligibleCompanyIds(campaignId, normalized);
  if (companyIds.length === 0) {
    throw new BatchNoEligibleCompaniesError(
      "Nenhuma empresa elegível para processamento. Verifique se a campanha possui empresas descobertas.",
    );
  }
  return buildRun(campaignId, companyIds, normalized, deps);
}

export async function retryBatchFailures(
  sourceRunId: string,
  deps: BatchExecutorDeps = createBatchExecutorDeps(),
): Promise<{ run: BatchRunRow; total: number }> {
  const source = await deps.fetchRun(sourceRunId);
  if (!source) {
    throw new BatchRunNotFoundError("Processamento não encontrado.");
  }
  const failedIds = await deps.listFailedCompanyIds(sourceRunId);
  if (failedIds.length === 0) {
    throw new BatchNoEligibleCompaniesError(
      "Não há empresas com falha para reprocessar.",
    );
  }
  const active = await deps.countActiveRuns(source.campaignId);
  if (active > 0) {
    throw new BatchRunConflictError(
      "Já existe um processamento em andamento para esta campanha.",
    );
  }
  return buildRun(
    source.campaignId,
    failedIds.slice(0, BATCH_CONFIG.maxCompaniesPerRun),
    {
      apenasSemInteligencia: false,
      limiteMaximo: BATCH_CONFIG.maxCompaniesPerRun,
      reprocessarFalhasDoRun: sourceRunId,
    },
    deps,
  );
}

// ─── Processamento de UMA empresa (pipeline existente) ──────────

export interface ProcessOneCompanyOptions {
  budgetMs: number;
  claim: BatchClaim;
}

export async function processOneCompany(
  runId: string,
  companyId: string,
  deps: BatchExecutorDeps,
  options: ProcessOneCompanyOptions,
): Promise<BatchCompanyOutcome> {
  const { budgetMs, claim } = options;

  if (
    !claim ||
    claim.batchRunId !== runId ||
    claim.companyId !== companyId ||
    !claim.claimedAt
  ) {
    return {
      companyId,
      status: "falha",
      errorCode: "validacao",
      errorMessage: "Claim inválido para este processamento.",
    };
  }

  // O item da fila e identificado pela chave composta. Nunca processe uma
  // empresa apenas porque o company_id existe fora do contexto deste run.
  const companyRun = await withDbRetry(
    () => deps.fetchCompanyRun(runId, companyId),
    deps,
    budgetMs,
  );
  if (!companyRun) {
    return {
      companyId,
      status: "falha",
      errorCode: "validacao",
      errorMessage: "Empresa não está claimada neste processamento.",
    };
  }
  if (
    companyRun.status !== "processando" ||
    companyRun.claimedAt !== claim.claimedAt
  ) {
    throw new BatchClaimLostError("O lease deste item não é mais válido.");
  }

  // 1. Empresa (404 → falha definitiva de validação)
  let company: ProspectCompany;
  try {
    const found = await withDbRetry(
      () => deps.fetchCompany(companyId),
      deps,
      budgetMs,
    );
    if (!found) {
      await deps.finishCompanyRun(runId, companyId, {
        status: "falha",
        claimedAt: claim.claimedAt,
        errorCode: "validacao",
        errorMessage: "Empresa não encontrada.",
      });
      return { companyId, status: "falha", errorCode: "validacao", errorMessage: "Empresa não encontrada." };
    }
    company = found;
  } catch (error) {
    const lost = claimLostError(error);
    if (lost) throw lost;
    const policy = classifyExecutorError(error);
    await deps.finishCompanyRun(runId, companyId, {
      status: "falha",
      claimedAt: claim.claimedAt,
      errorCode: policy.code,
      errorMessage: policy.message,
    });
    return { companyId, status: "falha", errorCode: policy.code, errorMessage: policy.message };
  }

  const hasWebsite = company.website.trim().length > 0;

  // 2. Enriquecimento (com retry/backoff por classificação de erro)
  let enrichment: EnrichmentOutcome;
  let enrichmentFailures = claim.retryCount;
  for (;;) {
    enrichment = await deps.enrichmentProvider.enrich(company);
    if (enrichment.status === "ok") break;

    const policy = classifyEnrichmentReason(enrichment.reason, hasWebsite);
    const decision = decideRetry(policy, enrichmentFailures, budgetMs);
    if (decision.action === "retry") {
      enrichmentFailures++;
      await deps.sleep(decision.delayMs);
      continue;
    }
    if (decision.action === "defer") {
      await deps.deferCompanyRun(runId, companyId, {
        claimedAt: claim.claimedAt,
        retryCount: enrichmentFailures + 1,
        nextRetryAt: isoAddMs(deps.nowIso(), decision.delayMs),
        errorCode: policy.code,
        errorMessage: policy.message,
      });
      return { companyId, status: "pendente", errorCode: policy.code, errorMessage: policy.message };
    }
    break; // terminal — pipeline continua com confiança baixa
  }

  const enrichmentPolicy =
    enrichment.status === "ok"
      ? null
      : classifyEnrichmentReason(enrichment.reason, hasWebsite);

  // 3. Persistência do enriquecimento (+ evidências)
  let enrichmentId: string | null = null;
  try {
    enrichmentId = await withDbRetry(
      () =>
        deps.insertEnrichment({
          ...apEnrichmentToSupabase({
            companyId,
            status:
              enrichment.status === "ok"
                ? "Concluido"
                : enrichment.status === "unavailable"
                  ? "Indisponivel"
                  : "Erro",
            sourceUrl: enrichment.sourceUrl,
            fetchedPages: enrichment.fetchedPages,
            title: enrichment.title,
            description: enrichment.description,
            reason: enrichment.reason,
          }),
          batch_run_id: runId,
          batch_claimed_at: claim.claimedAt,
        }),
      deps,
      budgetMs,
    );
    const evidences =
      enrichment.status === "ok"
        ? [
            ...(enrichment.title
              ? [{ kind: "fato" as const, label: "Título do site", text: enrichment.title, sourceUrl: enrichment.sourceUrl }]
              : []),
            ...(enrichment.description
              ? [{ kind: "fato" as const, label: "Descrição do negócio", text: enrichment.description, sourceUrl: enrichment.sourceUrl }]
              : []),
            ...enrichment.signals.map((signal) => ({
              kind: "sinal" as const,
              label: signal.label,
              text: signal.snippet,
              sourceUrl: signal.sourceUrl,
            })),
          ]
        : [];
    await withDbRetry(
      () =>
        deps.replaceEvidences(
          enrichmentId as string,
          claim.claimedAt,
          evidences.map((evidence) => ({
            ...apEvidenceToSupabase({
              ...evidence,
              enrichmentId: enrichmentId as string,
            }),
            batch_claimed_at: claim.claimedAt,
          })),
        ),
      deps,
      budgetMs,
    );
  } catch (error) {
    const lost = claimLostError(error);
    if (lost) throw lost;
    const policy = classifyExecutorError(error);
    await deps.finishCompanyRun(runId, companyId, {
      status: "falha",
      claimedAt: claim.claimedAt,
      errorCode: policy.code,
      errorMessage: policy.message,
    });
    return { companyId, status: "falha", errorCode: policy.code, errorMessage: policy.message };
  }

  // 4. Qualificação (determinística + IA opcional com fallback)
  try {
    const aiProvider = deps.aiProvider;
    const analysis = buildQualification(company, enrichment, { aiProvider });
    const finalAnalysis = await withAiExplanation(
      analysis,
      {
        company,
        enrichment,
        signals: enrichment.signals || [],
        facts: analysis.facts,
      },
      aiProvider,
    );

    let qualificationId: string | null = null;
    qualificationId = await withDbRetry(
      () =>
        deps.insertQualification({
          ...apQualificationToSupabase({
            companyId,
            enrichmentId,
            score: finalAnalysis.score,
            potential: finalAnalysis.potential,
            confidence: finalAnalysis.confidence,
            confidenceReason: finalAnalysis.confidenceReason,
            summary: finalAnalysis.summary,
            opportunityReason: finalAnalysis.opportunityReason,
            recommendation: finalAnalysis.recommendation,
            recommendationText: finalAnalysis.recommendationText,
            facts: finalAnalysis.facts,
            inferences: finalAnalysis.inferences,
            possibleServices: finalAnalysis.possibleServices,
            scoreBreakdown: finalAnalysis.breakdown,
            aiProvider: finalAnalysis.aiProvider,
            aiModel: finalAnalysis.aiModel,
            aiStatus: finalAnalysis.aiStatus,
          }),
          batch_run_id: runId,
          batch_claimed_at: claim.claimedAt,
        }),
      deps,
      budgetMs,
    );

    // 5. Inteligência comercial (determinística sempre; IA opcional)
    const intelligence = await runCommercialIntelligence(
      { company, enrichment, qualification: finalAnalysis },
      { provider: deps.intelligenceProvider },
    );

    await withDbRetry(
      () =>
        deps.insertIntelligence({
          ...apIntelligenceToSupabase({
            companyId,
            enrichmentId,
            qualificationId,
            provider: intelligence.aiProvider,
            model: intelligence.aiModel,
            status: "Concluido",
            error: intelligence.error,
            priority: intelligence.priority,
            priorityReason: intelligence.priorityReason,
            reasons: intelligence.reasons,
            nextAction: intelligence.nextAction,
            summary: intelligence.summary,
            recommendedServices: intelligence.recommendedServices as unknown[],
            aiConfidence: intelligence.aiConfidence,
            scoreSnapshot: finalAnalysis.score,
            potentialSnapshot: finalAnalysis.potential,
            confidenceSnapshot: finalAnalysis.confidence,
            aiResponse: intelligence.aiResponse as unknown,
            aiStatus: intelligence.aiStatus,
            tokensIn: intelligence.tokensIn,
            tokensOut: intelligence.tokensOut,
            costEstimate: intelligence.costEstimate,
            analysisVersion: intelligence.analysisVersion,
          }),
          batch_run_id: runId,
          batch_claimed_at: claim.claimedAt,
        }),
      deps,
      budgetMs,
    );
  } catch (error) {
    const lost = claimLostError(error);
    if (lost) throw lost;
    const policy = classifyExecutorError(error);
    await deps.finishCompanyRun(runId, companyId, {
      status: "falha",
      claimedAt: claim.claimedAt,
      errorCode: policy.code,
      errorMessage: policy.message,
    });
    return { companyId, status: "falha", errorCode: policy.code, errorMessage: policy.message };
  }

  // 6. Terminal: concluída (site ok) ou sem_dados (enriquecimento indisponível)
  const terminalStatus: BatchCompanyStatus = enrichment.status === "ok" ? "concluida" : "sem_dados";
  await deps.finishCompanyRun(runId, companyId, {
    status: terminalStatus,
    claimedAt: claim.claimedAt,
    errorCode: enrichmentPolicy?.code,
    errorMessage: enrichmentPolicy?.message,
  });
  return { companyId, status: terminalStatus, errorCode: enrichmentPolicy?.code, errorMessage: enrichmentPolicy?.message };
}

// ─── Processamento de um chunk (servidor) ───────────────────────

export interface ChunkOptions {
  maxCompanies?: number;
  maxTimeMs?: number;
}

export interface ChunkResult {
  processed: BatchCompanyOutcome[];
  remaining: number;
  run: BatchRunRow | null;
}

export async function processChunk(
  runId: string,
  options: ChunkOptions,
  deps: BatchExecutorDeps = createBatchExecutorDeps(),
): Promise<ChunkResult> {
  const run = await deps.fetchRun(runId);
  if (!run) {
    throw new BatchRunNotFoundError("Processamento não encontrado.");
  }
  if (run.status === "pausado") {
    throw new BatchRunPausedError("Processamento pausado. Retome antes de continuar.");
  }
  if (run.status === "cancelado" || run.status === "concluido") {
    throw new BatchRunInvalidStateError(
      run.status === "cancelado"
        ? "Processamento cancelado. Inicie um novo lote."
        : "Processamento já concluído.",
    );
  }
  if (run.status === "pendente") {
    try {
      await deps.setRunStatus(runId, "processando", ["pendente"]);
    } catch (error) {
      if (!(error instanceof BatchRunInvalidStateError)) throw error;
      const concurrent = await deps.fetchRun(runId);
      if (!concurrent || concurrent.status !== "processando") throw error;
    }
  }

  const maxCompanies = Math.min(
    options.maxCompanies ?? BATCH_CONFIG.chunkSize,
    BATCH_CONFIG.maxChunkCompanies,
  );
  const maxTimeMs = options.maxTimeMs ?? BATCH_CONFIG.chunkTimeoutMs;
  const startedAt = Date.now();
  const processed: BatchCompanyOutcome[] = [];

  for (;;) {
    if (processed.length >= maxCompanies) break;
    const budgetMs = maxTimeMs - (Date.now() - startedAt);
    if (budgetMs <= 0) break;

    // Revalida o status do run a cada empresa (pausa/cancelamento responsivo)
    const current = await deps.fetchRun(runId);
    if (!current || current.status === "pausado" || current.status === "cancelado" || current.status === "concluido") break;

    const claim = await deps.claimNext(runId);
    if (!claim) break;

    try {
      const outcome = await processOneCompany(runId, claim.companyId, deps, {
        budgetMs,
        claim,
      });
      processed.push(outcome);
    } catch (error) {
      // Outro worker assumiu o lease ou cancelou o run. O resultado desse
      // worker e descartado; a proxima iteracao reconsulta o estado do run.
      if (!(error instanceof BatchClaimLostError)) throw error;
    }

    if (processed.length < maxCompanies) {
      const remainingBudget = maxTimeMs - (Date.now() - startedAt);
      await deps.sleep(Math.min(BATCH_CONFIG.delayBetweenCompaniesMs, Math.max(0, remainingBudget)));
    }
  }

  const counters = await deps.refreshRunCounters(runId);
  const beforeFinish = await deps.fetchRun(runId);
  const runStillActive =
    beforeFinish !== null &&
    (beforeFinish.status === "pendente" || beforeFinish.status === "processando");
  if (runStillActive && canCompleteRun(counters)) {
    await deps.finishRun(runId);
  }
  const finalRun = await deps.fetchRun(runId);
  return {
    processed,
    remaining: finalRun
      ? finalRun.pending + finalRun.processing
      : counters.pending + counters.processing,
    run: finalRun,
  };
}

// ─── Controles ──────────────────────────────────────────────────

export async function pauseBatchRun(
  runId: string,
  deps: BatchExecutorDeps = createBatchExecutorDeps(),
): Promise<BatchRunRow> {
  const run = await deps.fetchRun(runId);
  if (!run) throw new BatchRunNotFoundError("Processamento não encontrado.");
  if (!canBatchRunTransition(run.status, "pausado")) {
    throw new BatchRunInvalidStateError(
      run.status === "concluido" || run.status === "cancelado"
        ? "Processamento finalizado não pode ser pausado."
        : "Só é possível pausar um processamento em andamento.",
    );
  }
  await deps.setRunStatus(runId, "pausado", [run.status]);
  const updated = await deps.fetchRun(runId);
  return updated as BatchRunRow;
}

export async function resumeBatchRun(
  runId: string,
  deps: BatchExecutorDeps = createBatchExecutorDeps(),
): Promise<BatchRunRow> {
  const run = await deps.fetchRun(runId);
  if (!run) throw new BatchRunNotFoundError("Processamento não encontrado.");
  if (!canBatchRunTransition(run.status, "pendente")) {
    throw new BatchRunInvalidStateError(
      run.status === "concluido" || run.status === "cancelado"
        ? "Processamento finalizado não pode ser retomado."
        : "Só é possível retomar um processamento pausado.",
    );
  }
  await deps.setRunStatus(runId, "pendente", ["pausado"]);
  const updated = await deps.fetchRun(runId);
  return updated as BatchRunRow;
}

export async function cancelBatchRun(
  runId: string,
  deps: BatchExecutorDeps = createBatchExecutorDeps(),
): Promise<BatchRunRow> {
  const run = await deps.fetchRun(runId);
  if (!run) throw new BatchRunNotFoundError("Processamento não encontrado.");
  if (!canBatchRunTransition(run.status, "cancelado")) {
    throw new BatchRunInvalidStateError("Processamento já finalizado não pode ser cancelado.");
  }
  const cancelled = await deps.cancelRun(runId);
  if (!cancelled) {
    throw new BatchRunInvalidStateError("O estado do processamento mudou durante o cancelamento.");
  }
  const updated = await deps.fetchRun(runId);
  return updated as BatchRunRow;
}

export type { BatchRunRow, BatchCompanyRunRow };
