import type { EnrichmentOutcome } from "./enrichment";

// ════════════════════════════════════════════════════════════════
// PROCESSAMENTO EM LOTE (Etapa 7)
//
// Camada de orquestração sobre o pipeline existente
// (Discovery → Enriquecimento → Qualificação → Inteligência).
//  - Fila persistida (ap_batch_runs + ap_batch_company_runs).
//  - Claim atômico no banco (SKIP LOCKED) — concorrência segura.
//  - Retomada: só `pendente` é reclamável; lease recupera órfãs.
//  - Retry: classificação de erro explícita (retryável vs definitivo).
//  - IA NUNCA é obrigatória nem faz retry (fallback determinístico).
//  - O lote NÃO cria oportunidades (abordagem manual, Etapa 6).
//
// Este módulo é PURAMENTE domínio: sem banco, sem fetch, testável.
// ════════════════════════════════════════════════════════════════

// ─── Configuração ───────────────────────────────────────────────

export const BATCH_CONFIG = {
  chunkSize: 10,
  chunkTimeoutMs: 25_000,
  maxChunkCompanies: 25,
  maxCompaniesPerRun: 500,
  delayBetweenCompaniesMs: 500,
  leaseMs: 5 * 60_000,
  dbRetryDelaysMs: [1_000, 3_000, 5_000],
} as const;

// ─── Estados ────────────────────────────────────────────────────

export const BATCH_RUN_STATUSES = [
  "pendente",
  "processando",
  "pausado",
  "concluido",
  "cancelado",
] as const;

export type BatchRunStatus = (typeof BATCH_RUN_STATUSES)[number];

export const BATCH_COMPANY_STATUSES = [
  "pendente",
  "processando",
  "concluida",
  "sem_dados",
  "falha",
  "cancelada",
] as const;

export type BatchCompanyStatus = (typeof BATCH_COMPANY_STATUSES)[number];

export const TERMINAL_COMPANY_STATUSES: readonly BatchCompanyStatus[] = [
  "concluida",
  "sem_dados",
  "falha",
  "cancelada",
];

// ─── Máquina de estados ─────────────────────────────────────────

export const BATCH_RUN_TRANSITIONS: Record<BatchRunStatus, readonly BatchRunStatus[]> = {
  pendente: ["processando", "pausado", "cancelado", "concluido"],
  processando: ["pausado", "cancelado", "concluido", "pendente"],
  pausado: ["pendente", "cancelado"],
  concluido: [],
  cancelado: [],
};

export function canBatchRunTransition(from: BatchRunStatus, to: BatchRunStatus): boolean {
  return (BATCH_RUN_TRANSITIONS[from] as readonly BatchRunStatus[]).includes(to);
}

const TERMINAL_RUN_STATUSES: readonly BatchRunStatus[] = ["concluido", "cancelado"];

export function isTerminalBatchStatus(status: BatchRunStatus): boolean {
  return (TERMINAL_RUN_STATUSES as readonly BatchRunStatus[]).includes(status);
}

export const BATCH_COMPANY_TRANSITIONS: Record<BatchCompanyStatus, readonly BatchCompanyStatus[]> = {
  pendente: ["processando", "cancelada"],
  processando: ["concluida", "sem_dados", "falha", "pendente"],
  concluida: [],
  sem_dados: [],
  falha: ["pendente"],
  cancelada: [],
};

export function canCompanyRunTransition(from: BatchCompanyStatus, to: BatchCompanyStatus): boolean {
  return (BATCH_COMPANY_TRANSITIONS[from] as readonly BatchCompanyStatus[]).includes(to);
}

// ─── Filtros de criação do run ──────────────────────────────────

export interface BatchRunFilters {
  apenasSemInteligencia: boolean;
  limiteMaximo: number;
  reprocessarFalhasDoRun?: string;
}

export function normalizeBatchRunFilters(raw: unknown): BatchRunFilters | { error: string } {
  const value =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const apenasSemInteligencia = value.apenasSemInteligencia === true;
  let limiteMaximo: number = BATCH_CONFIG.maxCompaniesPerRun;
  if (
    value.limiteMaximo !== undefined &&
    value.limiteMaximo !== null &&
    value.limiteMaximo !== ""
  ) {
    const parsed = Number(value.limiteMaximo);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { error: "Limite máximo de empresas inválido." };
    }
    limiteMaximo = Math.min(Math.floor(parsed), BATCH_CONFIG.maxCompaniesPerRun);
  }
  return { apenasSemInteligencia, limiteMaximo };
}

// ─── Erros de domínio (mapeados para HTTP pelas rotas) ──────────

export class BatchValidationError extends Error {}
export class BatchRunNotFoundError extends Error {}
export class BatchRunConflictError extends Error {}
export class BatchRunInvalidStateError extends Error {}
export class BatchClaimLostError extends BatchRunInvalidStateError {}
export class BatchRunPausedError extends Error {}
export class BatchNoEligibleCompaniesError extends Error {}
export class BatchDbError extends Error {}
export class BatchUnauthorizedError extends Error {}
export class BatchForbiddenError extends Error {}
export class BatchConfigurationError extends Error {}

// ─── Seleção de empresas (elegibilidade de criação) ─────────────

export function selectBatchCompanies(input: {
  companyIds: string[];
  companiesWithIntelligence: Set<string>;
  apenasSemInteligencia: boolean;
  limiteMaximo: number;
}): string[] {
  const ids = input.apenasSemInteligencia
    ? input.companyIds.filter((id) => !input.companiesWithIntelligence.has(id))
    : [...input.companyIds];
  return ids.slice(0, input.limiteMaximo);
}

// ─── Elegibilidade / retomada ───────────────────────────────────

export interface CompanyRunLike {
  status: BatchCompanyStatus;
  nextRetryAt: string | null;
  claimedAt: string | null;
}

export function isLeaseExpired(claimedAt: string, nowIso: string): boolean {
  const claimed = new Date(claimedAt).getTime();
  const now = new Date(nowIso).getTime();
  return Number.isFinite(claimed) && now - claimed >= BATCH_CONFIG.leaseMs;
}

/** Uma empresa só é processável se estiver pendente com retry vencido,
 *  ou se estiver processando com lease expirado (órfã de crash). */
export function isDueForProcessing(row: CompanyRunLike, nowIso: string): boolean {
  if (row.status === "pendente") {
    return row.nextRetryAt === null || row.nextRetryAt <= nowIso;
  }
  if (row.status === "processando") {
    return row.claimedAt !== null && isLeaseExpired(row.claimedAt, nowIso);
  }
  return false;
}

export function selectDueCompanies(rows: CompanyRunLike[], nowIso: string): number {
  return rows.filter((row) => isDueForProcessing(row, nowIso)).length;
}

// ─── Contadores e progresso ─────────────────────────────────────

export interface BatchCounters {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  withoutData: number;
  cancelled: number;
}

export const EMPTY_BATCH_COUNTERS: BatchCounters = {
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  withoutData: 0,
  cancelled: 0,
};

export function computeBatchCounters(rows: CompanyRunLike[]): BatchCounters {
  const counters: BatchCounters = { ...EMPTY_BATCH_COUNTERS, total: rows.length };
  for (const row of rows) {
    switch (row.status) {
      case "pendente":
        counters.pending++;
        break;
      case "processando":
        counters.processing++;
        break;
      case "concluida":
        counters.completed++;
        break;
      case "falha":
        counters.failed++;
        break;
      case "sem_dados":
        counters.withoutData++;
        break;
      case "cancelada":
        counters.cancelled++;
        break;
    }
  }
  return counters;
}

export function batchProgress(counters: BatchCounters): number {
  const terminal =
    counters.completed + counters.failed + counters.withoutData + counters.cancelled;
  return counters.total === 0 ? 0 : Math.round((terminal / counters.total) * 100);
}

export function canCompleteRun(counters: BatchCounters): boolean {
  return counters.pending === 0 && counters.processing === 0;
}

export function estimateBatchEtaSeconds(counters: BatchCounters, elapsedMs: number): number | null {
  const done = counters.completed + counters.failed + counters.withoutData;
  const remaining = counters.pending + counters.processing;
  if (remaining === 0) return 0;
  if (done === 0 || elapsedMs <= 0) return null;
  return Math.round((remaining * (elapsedMs / done)) / 1000);
}

// ─── Classificação de erros ─────────────────────────────────────

export type BatchErrorCode =
  | "sem_site"
  | "site_bloqueado"
  | "site_inacessivel"
  | "http_429"
  | "http_5xx"
  | "http_4xx"
  | "timeout"
  | "resposta_invalida"
  | "banco"
  | "validacao"
  | "desconhecido";

export interface BatchErrorPolicy {
  code: BatchErrorCode;
  retryable: boolean;
  maxRetries: number;
  backoffMs: (attemptIndex: number) => number;
  terminalStatus: "falha" | "sem_dados";
  message: string;
}

export function httpStatusFromEnrichmentReason(reason: string): number | null {
  const match = reason.match(/HTTP\s+(\d{3})/);
  return match ? Number(match[1]) : null;
}

/** Classifica o resultado do enriquecimento (site da empresa).
 *  Erros definitivos → sem_dados (mesma semântica `unavailable` do
 *  enriquecimento atual); erros de rede/429/5xx → retryável. */
export function classifyEnrichmentReason(
  reason: string,
  hasWebsite: boolean,
): BatchErrorPolicy {
  if (
    !hasWebsite ||
    reason.includes("não possui site cadastrado") ||
    reason.includes("endereço do site é inválido")
  ) {
    return {
      code: "sem_site",
      retryable: false,
      maxRetries: 0,
      backoffMs: () => 0,
      terminalStatus: "sem_dados",
      message: "Empresa sem site coletável.",
    };
  }
  if (reason.includes("robots.txt")) {
    return {
      code: "site_bloqueado",
      retryable: false,
      maxRetries: 0,
      backoffMs: () => 0,
      terminalStatus: "sem_dados",
      message: "Site não autoriza acesso automatizado (robots.txt).",
    };
  }
  const status = httpStatusFromEnrichmentReason(reason);
  if (status === 429) {
    return {
      code: "http_429",
      retryable: true,
      maxRetries: 3,
      backoffMs: (attempt) => [30_000, 60_000, 120_000][attempt] ?? 120_000,
      terminalStatus: "sem_dados",
      message: "O site limitou temporariamente o acesso (HTTP 429).",
    };
  }
  if (status !== null && status >= 500 && status <= 599) {
    return {
      code: "http_5xx",
      retryable: true,
      maxRetries: 2,
      backoffMs: (attempt) => [5_000, 30_000][attempt] ?? 30_000,
      terminalStatus: "sem_dados",
      message: `O site respondeu com erro (HTTP ${status}).`,
    };
  }
  if (status !== null && status >= 400 && status < 500) {
    return {
      code: "http_4xx",
      retryable: false,
      maxRetries: 0,
      backoffMs: () => 0,
      terminalStatus: "sem_dados",
      message: `O site respondeu com erro (HTTP ${status}).`,
    };
  }
  return {
    code: "site_inacessivel",
    retryable: true,
    maxRetries: 1,
    backoffMs: () => 15_000,
    terminalStatus: "sem_dados",
    message: "Não foi possível acessar o site (rede, timeout ou bloqueio).",
  };
}

/** Classifica erros lançados pelo executor (banco, validação, tempo). */
export function classifyExecutorError(error: unknown): BatchErrorPolicy {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "";
  if (/supabase|postgrest|database|relation|sql|constraint|violat/i.test(message)) {
    return {
      code: "banco",
      retryable: true,
      maxRetries: 3,
      backoffMs: (attempt) => BATCH_CONFIG.dbRetryDelaysMs[attempt] ?? 5_000,
      terminalStatus: "falha",
      message: "Erro de banco de dados ao registrar o resultado.",
    };
  }
  if (name === "AbortError" || /timeout|tempo limite|abort/i.test(message)) {
    return {
      code: "timeout",
      retryable: true,
      maxRetries: 2,
      backoffMs: (attempt) => [5_000, 15_000][attempt] ?? 15_000,
      terminalStatus: "falha",
      message: "Tempo limite excedido.",
    };
  }
  if (/inválid|invalid|json/i.test(message)) {
    return {
      code: "resposta_invalida",
      retryable: true,
      maxRetries: 1,
      backoffMs: () => 10_000,
      terminalStatus: "falha",
      message: "Resposta inválida recebida.",
    };
  }
  if (/não encontrad|not found|não possui|inexistent/i.test(message)) {
    return {
      code: "validacao",
      retryable: false,
      maxRetries: 0,
      backoffMs: () => 0,
      terminalStatus: "falha",
      message,
    };
  }
  return {
    code: "desconhecido",
    retryable: false,
    maxRetries: 0,
    backoffMs: () => 0,
    terminalStatus: "falha",
    message: "Erro inesperado durante o processamento.",
  };
}

// ─── Decisão de retry (dentro do chunk) ─────────────────────────

export type RetryDecision =
  | { action: "retry"; delayMs: number }
  | { action: "defer"; delayMs: number }
  | { action: "terminal" };

/** Retry no mesmo chunk se o backoff couber no orçamento restante;
 *  senão, devolve a empresa para a fila com next_retry_at (retomada). */
export function decideRetry(
  policy: BatchErrorPolicy,
  failures: number,
  remainingBudgetMs: number,
): RetryDecision {
  if (!policy.retryable || failures >= policy.maxRetries) {
    return { action: "terminal" };
  }
  const delayMs = policy.backoffMs(failures);
  if (delayMs <= remainingBudgetMs) {
    return { action: "retry", delayMs };
  }
  return { action: "defer", delayMs };
}

// ─── Tipos de resposta da API ───────────────────────────────────

export interface BatchCompanyOutcome {
  companyId: string;
  status: BatchCompanyStatus;
  errorCode?: string;
  errorMessage?: string;
}

export interface BatchRunListItem {
  id: string;
  campaignId: string;
  campaignName: string;
  status: BatchRunStatus;
  filters: BatchRunFilters;
  counters: BatchCounters;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface BatchRunDetailItem {
  companyId: string;
  companyName: string;
  status: BatchCompanyStatus;
  errorCode: string;
  errorMessage: string;
  retryCount: number;
  updatedAt: string;
}

export interface BatchRunDetail {
  run: BatchRunListItem;
  items: BatchRunDetailItem[];
  priorityCounts: Record<string, number>;
  aiStatusCounts: Record<string, number>;
}

export function buildBatchRunListItem(input: {
  id: string;
  campaignId: string;
  campaignName: string;
  status: string;
  filters: unknown;
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  withoutData: number;
  cancelled: number;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}): BatchRunListItem {
  return {
    id: input.id,
    campaignId: input.campaignId,
    campaignName: input.campaignName,
    status: input.status as BatchRunStatus,
    filters: {
      apenasSemInteligencia:
        (input.filters as Record<string, unknown>)?.apenasSemInteligencia === true,
      limiteMaximo: Number(
        (input.filters as Record<string, unknown>)?.limiteMaximo ??
          BATCH_CONFIG.maxCompaniesPerRun,
      ),
      reprocessarFalhasDoRun: (input.filters as Record<string, unknown>)
        ?.reprocessarFalhasDoRun as string | undefined,
    },
    counters: {
      total: input.total,
      pending: input.pending,
      processing: input.processing,
      completed: input.completed,
      failed: input.failed,
      withoutData: input.withoutData,
      cancelled: input.cancelled,
    },
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    createdAt: input.createdAt,
  };
}

export interface BatchChunkResponse {
  ok: boolean;
  processed: BatchCompanyOutcome[];
  remaining: number;
  run?: BatchRunListItem;
  error?: string;
  detail?: string;
}

// ─── Validação de enriquecimento (reutilizada pelo executor) ─────

export function enrichmentIsTerminal(outcome: EnrichmentOutcome, hasWebsite: boolean): boolean {
  const policy = classifyEnrichmentReason(outcome.reason, hasWebsite);
  return !policy.retryable;
}

export function isEnrichmentOk(outcome: EnrichmentOutcome): boolean {
  return outcome.status === "ok";
}
