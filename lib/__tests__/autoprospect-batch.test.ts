import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// O executor importa lib/supabase (cliente real) apenas para as
// dependências padrão; os testes injetam dependências falsas em todas
// as operações de banco, então o cliente nunca é usado aqui.
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("server-only", () => ({}));

import type { ProspectCompany } from "@/domain/autoprospect/types";
import type { EnrichmentOutcome, EnrichmentProvider } from "@/domain/autoprospect/enrichment";
import type { AiAnalysisProvider } from "@/domain/autoprospect/qualification";
import type { CommercialIntelligenceProvider } from "@/domain/autoprospect/intelligence";
import {
  BATCH_RUN_TRANSITIONS,
  BATCH_CONFIG,
  BatchNoEligibleCompaniesError,
  BatchClaimLostError,
  BatchRunConflictError,
  BatchRunInvalidStateError,
  BatchRunNotFoundError,
  BatchRunPausedError,
  BatchValidationError,
  canBatchRunTransition,
  canCompanyRunTransition,
  canCompleteRun,
  classifyEnrichmentReason,
  classifyExecutorError,
  computeBatchCounters,
  batchProgress,
  decideRetry,
  estimateBatchEtaSeconds,
  isDueForProcessing,
  isLeaseExpired,
  isTerminalBatchStatus,
  normalizeBatchRunFilters,
  selectBatchCompanies,
  type BatchCompanyStatus,
  type BatchRunStatus,
} from "@/domain/autoprospect/batch";
import {
  cancelBatchRun,
  createBatchExecutorDeps,
  createBatchRun,
  pauseBatchRun,
  processChunk,
  processOneCompany,
  resumeBatchRun,
  retryBatchFailures,
  type BatchClaim,
  type BatchExecutorDeps,
  type CompanyRunDeferPatch,
  type CompanyRunFinishPatch,
} from "@/lib/batch-executor";
import type { BatchCompanyRunRow, BatchRunRow } from "@/lib/repository-mappers";

// ════════════════════════════════════════════════════════════════
// Processamento em lote (Etapa 7) — testes
//  1-5: domínio puro (classificação de erro, máquina de estados,
//       elegibilidade, seleção, contadores, retry/backoff).
//  6-12: executor com dependências falsas (sem rede, sem banco).
// ════════════════════════════════════════════════════════════════

function company(overrides: Partial<ProspectCompany> = {}): ProspectCompany {
  return {
    id: "c1",
    name: "Hotel Executivo BH",
    segment: "Hotéis",
    city: "Belo Horizonte",
    state: "MG",
    address: "",
    website: "https://exemplo.com.br",
    phone: "",
    whatsapp: "",
    email: "",
    instagram: "",
    linkedin: "",
    notes: "",
    source: "teste",
    collectedAt: "2026-08-10T12:00:00.000Z",
    createdAt: "2026-08-10T12:00:00.000Z",
    ...overrides,
  };
}

function okEnrichment(overrides: Partial<EnrichmentOutcome> = {}): EnrichmentOutcome {
  return {
    status: "ok",
    sourceUrl: "https://exemplo.com.br",
    fetchedPages: 1,
    title: "Hotel Executivo BH",
    description: "Hotel corporativo com 120 apartamentos.",
    signals: [],
    reason: "",
    collectedAt: "2026-08-10T12:00:00.000Z",
    ...overrides,
  };
}

const disabledAiProvider: AiAnalysisProvider = {
  name: "deterministico",
  model: "",
  enabled: false,
  analyze: vi.fn(async () => {
    throw new Error("nunca chamado");
  }),
};

const disabledIntelligenceProvider: CommercialIntelligenceProvider = {
  name: "deterministico",
  model: "",
  enabled: false,
  analyze: vi.fn(async () => {
    throw new Error("nunca chamado");
  }),
};

function makeEnrichmentProvider(
  behavior: (attempt: number, comp: ProspectCompany) => EnrichmentOutcome,
): EnrichmentProvider {
  const attempts = new Map<string, number>();
  return {
    name: "fake-website",
    enrich: async (comp) => {
      const attempt = attempts.get(comp.id) ?? 0;
      attempts.set(comp.id, attempt + 1);
      return behavior(attempt, comp);
    },
  };
}

// ─── Banco de fila falso (espelha o contrato do Supabase) ────────

interface CompanyRunState {
  status: BatchCompanyStatus;
  errorCode: string;
  errorMessage: string;
  retryCount: number;
  nextRetryAt: string | null;
  claimedAt: string | null;
}

interface RunState {
  campaignId: string;
  status: BatchRunStatus;
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
}

function makeRunState(overrides: Partial<RunState> = {}): RunState {
  return {
    campaignId: "camp-1",
    status: "pendente",
    filters: {},
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    withoutData: 0,
    cancelled: 0,
    startedAt: null,
    finishedAt: null,
    createdAt: "2026-08-10T12:00:00.000Z",
    ...overrides,
  };
}

class FakeBatchDb {
  runs = new Map<string, RunState>();
  companyRuns = new Map<string, Map<string, CompanyRunState>>();
  companies = new Map<string, ProspectCompany>();
  enrichments: Record<string, unknown>[] = [];
  evidences: Record<string, unknown>[] = [];
  qualifications: Record<string, unknown>[] = [];
  intelligences: Record<string, unknown>[] = [];
  claims: string[] = [];

  nowIso = "2026-08-10T12:00:00.000Z";

  addRun(runId: string, state: RunState) {
    this.runs.set(runId, state);
  }

  addCompanyRuns(runId: string, companyIds: string[]) {
    const map = new Map<string, CompanyRunState>();
    for (const companyId of companyIds) {
      map.set(companyId, {
        status: "pendente",
        errorCode: "",
        errorMessage: "",
        retryCount: 0,
        nextRetryAt: null,
        claimedAt: null,
      });
    }
    this.companyRuns.set(runId, map);
  }

  runRow(runId: string): BatchRunRow | null {
    const state = this.runs.get(runId);
    if (!state) return null;
    return {
      id: runId,
      campaignId: state.campaignId,
      status: state.status,
      filters: state.filters,
      total: state.total,
      pending: state.pending,
      processing: state.processing,
      completed: state.completed,
      failed: state.failed,
      withoutData: state.withoutData,
      cancelled: state.cancelled,
      errorSummary: [],
      startedAt: state.startedAt,
      finishedAt: state.finishedAt,
      createdAt: state.createdAt,
      updatedAt: state.createdAt,
    };
  }

  claimNext(runId: string): BatchClaim | null {
    const run = this.runs.get(runId);
    if (!run || (run.status !== "pendente" && run.status !== "processando")) {
      return null;
    }
    const map = this.companyRuns.get(runId);
    if (!map) return null;
    for (const [companyId, st] of map) {
      const eligible =
        (st.status === "pendente" && (st.nextRetryAt === null || st.nextRetryAt <= this.nowIso)) ||
        (st.status === "processando" &&
          st.claimedAt !== null &&
          isLeaseExpired(st.claimedAt, this.nowIso));
      if (eligible) {
        const enrichmentIds = new Set(
          this.enrichments
            .filter(
              (row) =>
                row.batch_run_id === runId && row.company_id === companyId,
            )
            .map((row) => row.id),
        );
        this.evidences = this.evidences.filter(
          (row) => !enrichmentIds.has(row.enrichment_id),
        );
        this.enrichments = this.enrichments.filter(
          (row) =>
            row.batch_run_id !== runId || row.company_id !== companyId,
        );
        this.qualifications = this.qualifications.filter(
          (row) =>
            row.batch_run_id !== runId || row.company_id !== companyId,
        );
        this.intelligences = this.intelligences.filter(
          (row) =>
            row.batch_run_id !== runId || row.company_id !== companyId,
        );
        st.status = "processando";
        st.claimedAt = this.nowIso;
        this.claims.push(companyId);
        return {
          batchRunId: runId,
          companyId,
          claimedAt: st.claimedAt,
          retryCount: st.retryCount,
        };
      }
    }
    return null;
  }

  companyRunRow(runId: string, companyId: string): BatchCompanyRunRow | null {
    const st = this.companyRuns.get(runId)?.get(companyId);
    if (!st) return null;
    return {
      batchRunId: runId,
      companyId,
      status: st.status,
      errorCode: st.errorCode,
      errorMessage: st.errorMessage,
      retryCount: st.retryCount,
      nextRetryAt: st.nextRetryAt,
      claimedAt: st.claimedAt,
      createdAt: this.nowIso,
      updatedAt: this.nowIso,
    };
  }

  finishCompanyRun(runId: string, companyId: string, patch: CompanyRunFinishPatch) {
    const st = this.companyRuns.get(runId)?.get(companyId);
    if (
      !st ||
      st.status !== "processando" ||
      st.claimedAt !== patch.claimedAt ||
      isLeaseExpired(patch.claimedAt, this.nowIso)
    ) {
      throw new BatchClaimLostError(`lease perdido para ${companyId} no run ${runId}`);
    }
    st.status = patch.status;
    st.nextRetryAt = null;
    if (patch.errorCode !== undefined) st.errorCode = patch.errorCode;
    if (patch.errorMessage !== undefined) st.errorMessage = patch.errorMessage;
  }

  deferCompanyRun(runId: string, companyId: string, patch: CompanyRunDeferPatch) {
    const st = this.companyRuns.get(runId)?.get(companyId);
    if (
      !st ||
      st.status !== "processando" ||
      st.claimedAt !== patch.claimedAt ||
      isLeaseExpired(patch.claimedAt, this.nowIso)
    ) {
      throw new BatchClaimLostError("lease perdido para reagendamento");
    }
    st.status = "pendente";
    st.claimedAt = null;
    st.nextRetryAt = patch.nextRetryAt;
    st.retryCount = patch.retryCount;
    st.errorCode = patch.errorCode;
    st.errorMessage = patch.errorMessage;
  }

  refreshRunCounters(runId: string) {
    const rows = [...(this.companyRuns.get(runId)?.values() ?? [])];
    const counters = computeBatchCounters(
      rows.map((row) => ({ status: row.status, nextRetryAt: null, claimedAt: null })),
    );
    const state = this.runs.get(runId);
    if (!state) throw new Error("run não existe");
    state.total = counters.total;
    state.pending = counters.pending;
    state.processing = counters.processing;
    state.completed = counters.completed;
    state.failed = counters.failed;
    state.withoutData = counters.withoutData;
    state.cancelled = counters.cancelled;
    return counters;
  }

  assertArtifactClaim(payload: Record<string, unknown>) {
    const runId = typeof payload.batch_run_id === "string" ? payload.batch_run_id : "";
    if (!runId) {
      if (payload.batch_claimed_at) {
        throw new BatchClaimLostError("claim informado sem batch");
      }
      return;
    }
    const companyId = String(payload.company_id || "");
    const claimedAt = String(payload.batch_claimed_at || "");
    const leaseExpired = claimedAt
      ? isLeaseExpired(claimedAt, this.nowIso)
      : true;
    const run = this.runs.get(runId);
    const item = this.companyRuns.get(runId)?.get(companyId);
    if (
      !run ||
      !["pendente", "processando", "pausado"].includes(run.status) ||
      !item ||
      item.status !== "processando" ||
      item.claimedAt !== claimedAt ||
      leaseExpired
    ) {
      throw new BatchClaimLostError("claim de batch ausente, cancelado ou expirado");
    }
  }

  upsertArtifact(
    rows: Record<string, unknown>[],
    payload: Record<string, unknown>,
    prefix: string,
  ): string {
    this.assertArtifactClaim(payload);
    const runId = payload.batch_run_id;
    const companyId = payload.company_id;
    const current = rows.find(
      (row) => row.batch_run_id === runId && row.company_id === companyId,
    );
    if (current) {
      Object.assign(current, payload);
      return String(current.id);
    }
    const id = `${prefix}-${rows.length + 1}`;
    rows.push({ ...payload, id });
    return id;
  }

  insertEvidences(payloads: Record<string, unknown>[]) {
    for (const payload of payloads) {
      const enrichment = this.enrichments.find(
        (row) => row.id === payload.enrichment_id,
      );
      if (!enrichment || enrichment.batch_claimed_at !== payload.batch_claimed_at) {
        throw new BatchClaimLostError("claim de batch da evidencia expirado");
      }
      this.assertArtifactClaim({
        batch_run_id: enrichment.batch_run_id,
        company_id: enrichment.company_id,
        batch_claimed_at: payload.batch_claimed_at,
      });
      const duplicate = this.evidences.some(
        (row) =>
          row.enrichment_id === payload.enrichment_id &&
          row.kind === payload.kind &&
          row.label === payload.label &&
          row.text === payload.text &&
          row.source_url === payload.source_url,
      );
      if (!duplicate) {
        this.evidences.push({ ...payload, id: `evidence-${this.evidences.length + 1}` });
      }
    }
  }
}

function makeDeps(db: FakeBatchDb, enrichmentProvider: EnrichmentProvider): BatchExecutorDeps {
  return createBatchExecutorDeps({
    newRunId: () => `run-${db.claims.length + 1}-${Math.random().toString(36).slice(2)}`,
    nowIso: () => db.nowIso,
    sleep: async () => undefined,
    fetchCompany: async (companyId) => db.companies.get(companyId) ?? null,
    fetchCompanyRun: async (runId, companyId) => db.companyRunRow(runId, companyId),
    fetchRun: async (runId) => db.runRow(runId),
    claimNext: async (runId) => db.claimNext(runId),
    insertEnrichment: async (payload) =>
      db.upsertArtifact(db.enrichments, payload, "enrich"),
    replaceEvidences: async (enrichmentId, claimedAt, payloads) => {
      db.evidences = db.evidences.filter(
        (row) => row.enrichment_id !== enrichmentId,
      );
      db.insertEvidences(
        payloads.map((payload) => ({
          ...payload,
          enrichment_id: enrichmentId,
          batch_claimed_at: claimedAt,
        })),
      );
    },
    insertQualification: async (payload) =>
      db.upsertArtifact(db.qualifications, payload, "qual"),
    insertIntelligence: async (payload) =>
      db.upsertArtifact(db.intelligences, payload, "intel"),
    finishCompanyRun: async (runId, companyId, patch) => db.finishCompanyRun(runId, companyId, patch),
    deferCompanyRun: async (runId, companyId, patch) => db.deferCompanyRun(runId, companyId, patch),
    refreshRunCounters: async (runId) => db.refreshRunCounters(runId),
    setRunStatus: async (runId, status, expectedStatuses) => {
      const state = db.runs.get(runId);
      if (
        !state ||
        (expectedStatuses && !expectedStatuses.includes(state.status))
      ) {
        throw new BatchRunInvalidStateError("estado do run mudou");
      }
      const previous = state.status;
      state.status = status;
      if (previous === "pendente" && status === "processando" && !state.startedAt) {
        state.startedAt = db.nowIso;
      }
    },
    finishRun: async (runId) => {
      const state = db.runs.get(runId);
      const rows = [...(db.companyRuns.get(runId)?.values() ?? [])];
      if (
        !state ||
        (state.status !== "pendente" && state.status !== "processando") ||
        rows.some((row) => row.status === "pendente" || row.status === "processando")
      ) {
        return false;
      }
      state.status = "concluido";
      state.finishedAt = db.nowIso;
      return true;
    },
    cancelRun: async (runId) => {
      const state = db.runs.get(runId);
      if (
        !state ||
        (state.status !== "pendente" &&
          state.status !== "processando" &&
          state.status !== "pausado")
      ) {
        return false;
      }
      state.status = "cancelado";
      state.finishedAt = db.nowIso;
      const map = db.companyRuns.get(runId);
      for (const st of map?.values() ?? []) {
        if (st.status === "pendente" || st.status === "processando") {
          st.status = "cancelada";
          st.claimedAt = null;
          st.nextRetryAt = null;
        }
      }
      db.refreshRunCounters(runId);
      return true;
    },
    countActiveRuns: async (campaignId) => {
      let count = 0;
      for (const state of db.runs.values()) {
        if (
          state.campaignId === campaignId &&
          (state.status === "pendente" || state.status === "processando" || state.status === "pausado")
        ) {
          count++;
        }
      }
      return count;
    },
    selectEligibleCompanyIds: async (_campaignId, filters) =>
      selectBatchCompanies({
        companyIds: [...db.companies.keys()],
        companiesWithIntelligence: filters.apenasSemInteligencia
          ? new Set(db.intelligences.map((i) => i.company_id as string))
          : new Set(),
        apenasSemInteligencia: filters.apenasSemInteligencia,
        limiteMaximo: filters.limiteMaximo,
      }),
    insertRunWithCompanies: async (id, campaignId, filters, companyIds) => {
      const total = companyIds.length;
      db.addRun(id, makeRunState({ campaignId, filters, total, pending: total, createdAt: db.nowIso }));
      db.addCompanyRuns(id, companyIds);
      return db.runRow(id) as BatchRunRow;
    },
    listFailedCompanyIds: async (runId) => {
      const map = db.companyRuns.get(runId);
      if (!map) return [];
      return [...map.entries()]
        .filter(([, st]) => st.status === "falha")
        .map(([companyId]) => companyId);
    },
    enrichmentProvider,
    aiProvider: disabledAiProvider,
    intelligenceProvider: disabledIntelligenceProvider,
  });
}

// ════════════════════════════════════════════════════════════════
// 1-5. Domínio puro
// ════════════════════════════════════════════════════════════════

describe("Etapa 7 — contrato SQL do claim isolado", () => {
  const migration = readFileSync(
    resolve(process.cwd(), "supabase/migrations/00012_fix_auto_prospect_batch_claim_isolation.sql"),
    "utf8",
  )
    .replace(/--.*$/gm, " ")
    .replace(/\s+/g, " ");

  it("atualiza somente a chave composta selecionada no batch informado", () => {
    expect(migration).toMatch(/where bcr2\.batch_run_id = p_run_id/i);
    expect(migration).toMatch(/where bcr\.batch_run_id = p_run_id/i);
    expect(migration).toMatch(/bcr\.company_id = v_company_id/i);
  });

  it("preserva SKIP LOCKED, lease e bloqueia runs pausados ou terminais", () => {
    expect(migration).toMatch(/br\.status in \('pendente', 'processando'\)/i);
    expect(migration).toMatch(/for update of bcr2 skip locked/i);
    expect(migration).toMatch(/claimed_at <= clock_timestamp\(\) - interval '5 minutes'/i);
    expect(migration).toMatch(/next_retry_at is null or bcr2\.next_retry_at <= clock_timestamp\(\)/i);
  });

  it("mantém todas as mutações de item escopadas ao batch correto", () => {
    const executor = readFileSync(
      resolve(process.cwd(), "lib/batch-executor.ts"),
      "utf8",
    );
    const finish = executor.match(/finishCompanyRun: async([\s\S]*?)deferCompanyRun:/)?.[1] ?? "";
    const defer = executor.match(/deferCompanyRun: async([\s\S]*?)refreshRunCounters:/)?.[1] ?? "";

    expect(finish).toContain('client.rpc("ap_batch_finish_company"');
    expect(defer).toContain('client.rpc("ap_batch_defer_company"');
    for (const mutation of [finish, defer]) {
      expect(mutation).toContain("p_run_id: runId");
      expect(mutation).toContain("p_company_id: companyId");
      expect(mutation).toContain("p_claimed_at: patch.claimedAt");
    }
    expect(executor).toContain('client.rpc("ap_batch_cancel_run"');
    expect(executor).toContain("createBatchExecutorDepsForClient");
    expect(executor).not.toMatch(/\.from\("ap_batch_company_runs"\)\s*\.delete\(/);
    expect(migration).toMatch(/where bcr\.batch_run_id = p_run_id and bcr\.company_id = p_company_id and bcr\.status = 'processando' and bcr\.claimed_at = p_claimed_at/i);
  });

  it("protege artefatos, evidências, contadores e transições terminais no banco", () => {
    expect(migration).toMatch(/alter table public\.ap_enrichment_evidences add column batch_claimed_at/i);
    expect(migration).toMatch(/bcr\.claimed_at = new\.batch_claimed_at/i);
    expect(migration).toMatch(/bcr\.claimed_at > clock_timestamp\(\) - interval '5 minutes'/i);
    expect(migration).toMatch(/new\.batch_claimed_at <> v_claimed_at/i);
    expect(migration).toMatch(/create unique index idx_ap_enrichments_batch_company_unique/i);
    expect(migration).toMatch(/create unique index idx_ap_qualifications_batch_company_unique/i);
    expect(migration).toMatch(/create unique index idx_ap_intelligence_batch_company_unique/i);
    expect(migration).toMatch(/create unique index idx_ap_batch_runs_one_active_campaign/i);
    expect(migration).toMatch(/create or replace function public\.ap_batch_refresh_run_counters/i);
    expect(migration).toMatch(/create or replace function public\.ap_batch_finish_run/i);
    expect(migration).toMatch(/create or replace function public\.ap_batch_cancel_run/i);
    expect(migration).toMatch(/create or replace function public\.ap_batch_create_run/i);
    expect(migration).toMatch(/create or replace function public\.ap_batch_replace_evidences/i);
    expect(migration).toMatch(/create or replace function public\.ap_batch_finish_company/i);
    expect(migration).toMatch(/create or replace function public\.ap_batch_defer_company/i);
    expect(migration).toMatch(/create or replace function public\.ap_batch_upsert_enrichment/i);
    expect(migration).toMatch(/create or replace function public\.ap_batch_upsert_qualification/i);
    expect(migration).toMatch(/create or replace function public\.ap_batch_upsert_intelligence/i);
    expect(migration).toMatch(/revoke insert, update, delete on public\.ap_batch_runs/i);
    expect(migration).toMatch(/revoke select on public\.ap_batch_runs\s+from anon, authenticated/i);
    expect(migration).toMatch(/revoke select on public\.ap_batch_company_runs\s+from anon, authenticated/i);
    expect(migration).not.toMatch(/create policy "read_anon" on public\.ap_batch_runs/i);
    expect(migration).not.toMatch(/create policy "read_anon" on public\.ap_batch_company_runs/i);
    expect(migration).toMatch(/on delete restrict/i);
    expect(migration).toMatch(/grant execute on function public\.ap_batch_claim_next\(uuid\) to service_role/i);
    expect(migration).toMatch(/revoke execute on function public\.ap_batch_claim_next\(uuid\) from anon, authenticated/i);
    expect(migration).not.toMatch(/ap_batch_claim_next\(uuid\) to anon/i);
  });

  it("retém histórico de campanha e valida a proveniência dos artefatos", () => {
    expect(migration).toMatch(/migration interrompida: existem enriquecimentos duplicados por run e empresa/i);
    expect(migration).toMatch(/drop constraint ap_batch_runs_campaign_id_fkey, add constraint ap_batch_runs_campaign_id_fkey foreign key \(campaign_id\) references public\.ap_campaigns\(id\) on delete restrict/i);
    expect(migration).toMatch(/from public\.ap_enrichments e where e\.id = v_enrichment_id and e\.batch_run_id = v_run_id and e\.company_id = v_company_id and e\.batch_claimed_at = v_claimed_at for share/i);
    expect(migration).toMatch(/from public\.ap_qualifications q where q\.id = v_qualification_id and q\.batch_run_id = v_run_id and q\.company_id = v_company_id and q\.batch_claimed_at = v_claimed_at for share/i);
  });

  it("injeta o cliente server-only em toda mutação HTTP", () => {
    const routeFiles = [
      "app/api/autoprospect/batch/route.ts",
      "app/api/autoprospect/batch/[id]/process/route.ts",
      "app/api/autoprospect/batch/[id]/pause/route.ts",
      "app/api/autoprospect/batch/[id]/resume/route.ts",
      "app/api/autoprospect/batch/[id]/cancel/route.ts",
      "app/api/autoprospect/batch/[id]/retry-failures/route.ts",
    ];
    for (const file of routeFiles) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).toContain("requireBatchServerClient");
      expect(source).toContain("createBatchExecutorDepsForClient(client)");
    }
    const server = readFileSync(resolve(process.cwd(), "lib/batch-server.ts"), "utf8");
    expect(server).toContain('import "server-only"');
    expect(server).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(server).toContain("BATCH_OPERATOR_USER_IDS");
    expect(server).toContain("BatchForbiddenError");
    const executor = readFileSync(resolve(process.cwd(), "lib/batch-executor.ts"), "utf8");
    expect(executor).toContain('import "server-only"');
    const hook = readFileSync(resolve(process.cwd(), "hooks/useAutoProspect.ts"), "utf8");
    expect(hook).toContain("Authorization: `Bearer ${accessToken}`");
    const setup = readFileSync(resolve(process.cwd(), "app/api/auth/setup/route.ts"), "utf8");
    expect(setup).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(setup).toContain("status: 410");
    const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
    expect(packageJson).toMatch(/"server-only":/);
    const getRoutes = [
      "app/api/autoprospect/batch/route.ts",
      "app/api/autoprospect/batch/[id]/route.ts",
    ];
    for (const file of getRoutes) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).toContain("requireBatchServerClient");
      expect(source).not.toContain('from "@/lib/supabase"');
    }
  });
});

describe("Etapa 7 — classificação de erros (tabela §8)", () => {
  it("sem site → sem_dados definitivo, sem retry", () => {
    const policy = classifyEnrichmentReason("A empresa não possui site cadastrado.", false);
    expect(policy).toMatchObject({ code: "sem_site", retryable: false, maxRetries: 0, terminalStatus: "sem_dados" });
  });

  it("robots.txt → site_bloqueado definitivo", () => {
    const policy = classifyEnrichmentReason("O site bloqueou o acesso (robots.txt).", true);
    expect(policy).toMatchObject({ code: "site_bloqueado", retryable: false, terminalStatus: "sem_dados" });
  });

  it("HTTP 429 → retryável, máx 3, backoff 30s/60s/120s", () => {
    const policy = classifyEnrichmentReason("HTTP 429 — site limitou o acesso.", true);
    expect(policy).toMatchObject({ code: "http_429", retryable: true, maxRetries: 3, terminalStatus: "sem_dados" });
    expect(policy.backoffMs(0)).toBe(30_000);
    expect(policy.backoffMs(1)).toBe(60_000);
    expect(policy.backoffMs(2)).toBe(120_000);
  });

  it("HTTP 5xx → retryável, máx 2, backoff 5s/30s", () => {
    const policy = classifyEnrichmentReason("HTTP 503 Service Unavailable", true);
    expect(policy).toMatchObject({ code: "http_5xx", retryable: true, maxRetries: 2, terminalStatus: "sem_dados" });
    expect(policy.backoffMs(0)).toBe(5_000);
    expect(policy.backoffMs(1)).toBe(30_000);
  });

  it("HTTP 4xx → definitivo, sem retry", () => {
    const policy = classifyEnrichmentReason("HTTP 404 Not Found", true);
    expect(policy).toMatchObject({ code: "http_4xx", retryable: false, maxRetries: 0, terminalStatus: "sem_dados" });
  });

  it("site inacessível (rede) → retryável, máx 1, 15s", () => {
    const policy = classifyEnrichmentReason("Não foi possível acessar o site.", true);
    expect(policy).toMatchObject({ code: "site_inacessivel", retryable: true, maxRetries: 1, terminalStatus: "sem_dados" });
    expect(policy.backoffMs(0)).toBe(15_000);
  });

  it("erro de banco → retryável, máx 3, 1s/3s/5s", () => {
    const policy = classifyExecutorError(new Error("Supabase: relation ap_batch_runs does not exist"));
    expect(policy).toMatchObject({ code: "banco", retryable: true, maxRetries: 3, terminalStatus: "falha" });
  });

  it("timeout/abort → retryável, máx 2, 5s/15s", () => {
    const abort = new Error("The operation was aborted due to timeout");
    abort.name = "AbortError";
    const policy = classifyExecutorError(abort);
    expect(policy).toMatchObject({ code: "timeout", retryable: true, maxRetries: 2, terminalStatus: "falha" });
    expect(policy.backoffMs(0)).toBe(5_000);
    expect(policy.backoffMs(1)).toBe(15_000);
  });

  it("resposta inválida → retryável, máx 1", () => {
    const policy = classifyExecutorError(new Error("JSON inválido recebido"));
    expect(policy).toMatchObject({ code: "resposta_invalida", retryable: true, maxRetries: 1, terminalStatus: "falha" });
  });

  it("validação (404) → definitivo", () => {
    const policy = classifyExecutorError(new Error("Empresa não encontrada."));
    expect(policy).toMatchObject({ code: "validacao", retryable: false, maxRetries: 0, terminalStatus: "falha" });
  });

  it("erro desconhecido → definitivo, sem retry", () => {
    const policy = classifyExecutorError(new Error("algo totalmente inesperado"));
    expect(policy).toMatchObject({ code: "desconhecido", retryable: false, maxRetries: 0, terminalStatus: "falha" });
  });
});

describe("Etapa 7 — máquina de estados (§5)", () => {
  it("transições válidas do run", () => {
    expect(canBatchRunTransition("pendente", "processando")).toBe(true);
    expect(canBatchRunTransition("pendente", "pausado")).toBe(true);
    expect(canBatchRunTransition("pendente", "cancelado")).toBe(true);
    expect(canBatchRunTransition("processando", "pausado")).toBe(true);
    expect(canBatchRunTransition("processando", "cancelado")).toBe(true);
    expect(canBatchRunTransition("pausado", "pendente")).toBe(true);
    expect(canBatchRunTransition("pausado", "cancelado")).toBe(true);
    expect(canBatchRunTransition("concluido", "cancelado")).toBe(false);
    expect(canBatchRunTransition("cancelado", "processando")).toBe(false);
    expect(canBatchRunTransition("pausado", "processando")).toBe(false);
  });

  it("todas as transições declaradas são válidas (tabela de referência)", () => {
    for (const [from, tos] of Object.entries(BATCH_RUN_TRANSITIONS)) {
      for (const to of tos) {
        expect(canBatchRunTransition(from as BatchRunStatus, to as BatchRunStatus)).toBe(true);
      }
    }
  });

  it("transições da empresa", () => {
    expect(canCompanyRunTransition("pendente", "processando")).toBe(true);
    expect(canCompanyRunTransition("pendente", "cancelada")).toBe(true);
    expect(canCompanyRunTransition("processando", "concluida")).toBe(true);
    expect(canCompanyRunTransition("processando", "sem_dados")).toBe(true);
    expect(canCompanyRunTransition("processando", "falha")).toBe(true);
    expect(canCompanyRunTransition("processando", "pendente")).toBe(true);
    expect(canCompanyRunTransition("falha", "pendente")).toBe(true);
    expect(canCompanyRunTransition("concluida", "processando")).toBe(false);
    expect(canCompanyRunTransition("cancelada", "pendente")).toBe(false);
    expect(canCompanyRunTransition("sem_dados", "processando")).toBe(false);
  });

  it("estados terminais do run", () => {
    expect(isTerminalBatchStatus("concluido")).toBe(true);
    expect(isTerminalBatchStatus("cancelado")).toBe(true);
    expect(isTerminalBatchStatus("pausado")).toBe(false);
    expect(isTerminalBatchStatus("processando")).toBe(false);
  });
});

describe("Etapa 7 — elegibilidade e retomada (§11)", () => {
  const now = "2026-08-10T12:00:00.000Z";

  it("pendente sem next_retry_at é processável", () => {
    expect(isDueForProcessing({ status: "pendente", nextRetryAt: null, claimedAt: null }, now)).toBe(true);
  });

  it("pendente com retry futuro não é processável", () => {
    expect(
      isDueForProcessing({ status: "pendente", nextRetryAt: "2026-08-10T13:00:00.000Z", claimedAt: null }, now),
    ).toBe(false);
  });

  it("processando com lease ativo não é re-processável", () => {
    expect(
      isDueForProcessing({ status: "processando", nextRetryAt: null, claimedAt: now }, now),
    ).toBe(false);
  });

  it("processando com lease expirado (>5min) é recuperado", () => {
    const old = new Date(new Date(now).getTime() - 6 * 60_000).toISOString();
    expect(isDueForProcessing({ status: "processando", nextRetryAt: null, claimedAt: old }, now)).toBe(true);
  });

  it("concluida/sem_dados/falha/cancelada nunca são re-processadas", () => {
    for (const status of ["concluida", "sem_dados", "falha", "cancelada"] as const) {
      expect(isDueForProcessing({ status, nextRetryAt: null, claimedAt: null }, now)).toBe(false);
    }
  });

  it("isLeaseExpired respeita a janela de 5 minutos", () => {
    const claimed = new Date(new Date(now).getTime() - 5 * 60_000).toISOString();
    expect(isLeaseExpired(claimed, now)).toBe(true);
    expect(isLeaseExpired(now, now)).toBe(false);
  });
});

describe("Etapa 7 — seleção de empresas e filtros (§6.1)", () => {
  const ids = ["a", "b", "c", "d", "e"];

  it("sem filtro: todas as empresas, respeitando o limite", () => {
    expect(selectBatchCompanies({ companyIds: ids, companiesWithIntelligence: new Set(), apenasSemInteligencia: false, limiteMaximo: 3 })).toEqual(["a", "b", "c"]);
  });

  it("apenasSemInteligencia remove empresas com inteligência", () => {
    expect(
      selectBatchCompanies({
        companyIds: ids,
        companiesWithIntelligence: new Set(["b", "d"]),
        apenasSemInteligencia: true,
        limiteMaximo: 500,
      }),
    ).toEqual(["a", "c", "e"]);
  });

  it("limite máximo por run é aplicado após o filtro", () => {
    expect(
      selectBatchCompanies({
        companyIds: ids,
        companiesWithIntelligence: new Set(["b"]),
        apenasSemInteligencia: true,
        limiteMaximo: 2,
      }),
    ).toEqual(["a", "c"]);
  });

  it("normalizeBatchRunFilters: padrões, inválidos e teto de 500", () => {
    expect(normalizeBatchRunFilters({})).toEqual({ apenasSemInteligencia: false, limiteMaximo: 500 });
    expect(normalizeBatchRunFilters({ apenasSemInteligencia: true, limiteMaximo: "30" })).toEqual({ apenasSemInteligencia: true, limiteMaximo: 30 });
    expect(normalizeBatchRunFilters({ limiteMaximo: 9999 })).toEqual({ apenasSemInteligencia: false, limiteMaximo: 500 });
    expect("error" in normalizeBatchRunFilters({ limiteMaximo: -5 })).toBe(true);
    expect("error" in normalizeBatchRunFilters({ limiteMaximo: "abc" })).toBe(true);
  });
});

describe("Etapa 7 — contadores, progresso e ETA", () => {
  it("computeBatchCounters soma os estados", () => {
    const counters = computeBatchCounters([
      { status: "pendente", nextRetryAt: null, claimedAt: null },
      { status: "processando", nextRetryAt: null, claimedAt: null },
      { status: "concluida", nextRetryAt: null, claimedAt: null },
      { status: "concluida", nextRetryAt: null, claimedAt: null },
      { status: "sem_dados", nextRetryAt: null, claimedAt: null },
      { status: "falha", nextRetryAt: null, claimedAt: null },
      { status: "cancelada", nextRetryAt: null, claimedAt: null },
    ]);
    expect(counters).toEqual({ total: 7, pending: 1, processing: 1, completed: 2, failed: 1, withoutData: 1, cancelled: 1 });
  });

  it("progresso = terminais / total", () => {
    expect(batchProgress({ total: 10, pending: 3, processing: 2, completed: 3, failed: 1, withoutData: 1, cancelled: 0 })).toBe(50);
    expect(batchProgress({ total: 0, pending: 0, processing: 0, completed: 0, failed: 0, withoutData: 0, cancelled: 0 })).toBe(0);
  });

  it("canCompleteRun exige zero pendentes/processando", () => {
    expect(canCompleteRun({ total: 5, pending: 0, processing: 0, completed: 5, failed: 0, withoutData: 0, cancelled: 0 })).toBe(true);
    expect(canCompleteRun({ total: 5, pending: 1, processing: 0, completed: 4, failed: 0, withoutData: 0, cancelled: 0 })).toBe(false);
    expect(canCompleteRun({ total: 5, pending: 0, processing: 1, completed: 4, failed: 0, withoutData: 0, cancelled: 0 })).toBe(false);
  });

  it("ETA estima a partir do ritmo médio", () => {
    const counters = { total: 10, pending: 5, processing: 0, completed: 5, failed: 0, withoutData: 0, cancelled: 0 };
    expect(estimateBatchEtaSeconds(counters, 50_000)).toBe(50);
    expect(estimateBatchEtaSeconds({ ...counters, pending: 0 }, 50_000)).toBe(0);
    expect(estimateBatchEtaSeconds({ ...counters, completed: 0 }, 50_000)).toBeNull();
  });
});

describe("Etapa 7 — decisão de retry/backoff (§8)", () => {
  const retryable429 = classifyEnrichmentReason("HTTP 429", true);
  const terminal = classifyEnrichmentReason("HTTP 404", true);

  it("retry no mesmo chunk quando o backoff cabe no orçamento", () => {
    expect(decideRetry(retryable429, 0, 120_000)).toEqual({ action: "retry", delayMs: 30_000 });
  });

  it("defer (retomada) quando o backoff não cabe no orçamento", () => {
    expect(decideRetry(retryable429, 0, 10_000)).toEqual({ action: "defer", delayMs: 30_000 });
  });

  it("terminal quando o máximo de retries é atingido", () => {
    expect(decideRetry(retryable429, 3, 300_000)).toEqual({ action: "terminal" });
  });

  it("terminal imediato para erros definitivos", () => {
    expect(decideRetry(terminal, 0, 300_000)).toEqual({ action: "terminal" });
  });
});

// ════════════════════════════════════════════════════════════════
// 6-12. Executor com dependências falsas
// ════════════════════════════════════════════════════════════════

describe("Etapa 7 — executor: pipeline completo por empresa", () => {
  it("percorre enriquecimento → qualificação → inteligência e conclui", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company());
    db.addRun("run-1", makeRunState({ total: 1, pending: 1 }));
    db.addCompanyRuns("run-1", ["c1"]);

    const enrichCalls = vi.fn();
    const provider = makeEnrichmentProvider((attempt, comp) => {
      enrichCalls(comp.id, attempt);
      return okEnrichment();
    });
    const deps = makeDeps(db, provider);
    const claim = await deps.claimNext("run-1");
    expect(claim).toMatchObject({ batchRunId: "run-1", companyId: "c1" });

    const outcome = await processOneCompany("run-1", "c1", deps, { budgetMs: 60_000, claim: claim as BatchClaim });

    expect(enrichCalls).toHaveBeenCalledWith("c1", 0);
    expect(outcome).toMatchObject({ companyId: "c1", status: "concluida" });
    expect(db.enrichments).toHaveLength(1);
    expect(db.evidences).toHaveLength(2);
    expect(db.qualifications).toHaveLength(1);
    expect(db.intelligences).toHaveLength(1);
    expect(db.companyRuns.get("run-1")?.get("c1")?.status).toBe("concluida");
  });

  it("sem AI_API_KEY: 100% determinístico, providers nunca chamados", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company());
    db.addRun("run-1", makeRunState({ total: 1, pending: 1 }));
    db.addCompanyRuns("run-1", ["c1"]);
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));
    const claim = await deps.claimNext("run-1");
    expect(claim).toMatchObject({ companyId: "c1" });

    await processOneCompany("run-1", "c1", deps, { budgetMs: 60_000, claim: claim as BatchClaim });

    expect(deps.aiProvider.analyze).not.toHaveBeenCalled();
    expect(deps.intelligenceProvider.analyze).not.toHaveBeenCalled();
    expect(db.qualifications[0]).toMatchObject({ ai_status: "deterministico" });
    expect(db.intelligences[0]).toMatchObject({ ai_status: "deterministico" });
    expect(db.intelligences[0]).toMatchObject({ priority: expect.any(Number) });
    expect(outcomeOf(db, "run-1", "c1")).toBe("concluida");
  });

  it("empresa sem site → sem_dados definitivo, pipeline segue até a inteligência", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company({ website: "" }));
    db.addRun("run-1", makeRunState({ total: 1, pending: 1 }));
    db.addCompanyRuns("run-1", ["c1"]);
    const deps = makeDeps(
      db,
      makeEnrichmentProvider(() => ({
        ...okEnrichment(),
        status: "unavailable" as const,
        title: "",
        description: "",
        reason: "A empresa não possui site cadastrado.",
      })),
    );
    const claim = await deps.claimNext("run-1");
    expect(claim).toMatchObject({ companyId: "c1" });

    const outcome = await processOneCompany("run-1", "c1", deps, { budgetMs: 60_000, claim: claim as BatchClaim });

    expect(outcome).toMatchObject({ companyId: "c1", status: "sem_dados", errorCode: "sem_site" });
    expect(db.qualifications).toHaveLength(1);
    expect(db.intelligences).toHaveLength(1);
    expect(db.enrichments[0]).toMatchObject({ status: "Indisponivel" });
  });

  it("não processa company_id existente fora da chave composta do run", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company());
    db.addRun("run-a", makeRunState({ total: 0 }));
    db.addRun("run-b", makeRunState({ status: "processando", total: 1, processing: 1 }));
    db.companyRuns.set(
      "run-b",
      new Map([
        [
          "c1",
          { status: "processando", errorCode: "", errorMessage: "", retryCount: 0, nextRetryAt: null, claimedAt: db.nowIso },
        ],
      ]),
    );
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));
    const runBBefore = { ...db.companyRuns.get("run-b")?.get("c1") };

    const outcome = await processOneCompany("run-a", "c1", deps, {
      budgetMs: 60_000,
      claim: {
        batchRunId: "run-a",
        companyId: "c1",
        claimedAt: db.nowIso,
        retryCount: 0,
      },
    });

    expect(outcome).toMatchObject({
      companyId: "c1",
      status: "falha",
      errorCode: "validacao",
    });
    expect(db.companyRuns.get("run-b")?.get("c1")).toEqual(runBBefore);
    expect(db.enrichments).toHaveLength(0);
    expect(db.qualifications).toHaveLength(0);
    expect(db.intelligences).toHaveLength(0);
  });
});

describe("Etapa 7 — executor: chunk, falha parcial e contadores", () => {
  it("processa o chunk inteiro e conclui o run com o resumo correto", async () => {
    const db = new FakeBatchDb();
    for (let i = 1; i <= 5; i++) db.companies.set(`c${i}`, company({ id: `c${i}`, name: `Empresa ${i}` }));
    db.addRun("run-1", makeRunState({ total: 5, pending: 5 }));
    db.addCompanyRuns("run-1", ["c1", "c2", "c3", "c4", "c5"]);
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));

    const result = await processChunk("run-1", { maxCompanies: 10, maxTimeMs: 300_000 }, deps);

    expect(result.processed.map((o) => o.status)).toEqual(["concluida", "concluida", "concluida", "concluida", "concluida"]);
    expect(result.remaining).toBe(0);
    expect(result.run?.status).toBe("concluido");
    expect(db.claims).toEqual(["c1", "c2", "c3", "c4", "c5"]);
    expect(db.intelligences).toHaveLength(5);
  });

  it("falha parcial: empresa 3 falha (banco) sem interromper 4 e 5", async () => {
    const db = new FakeBatchDb();
    for (let i = 1; i <= 5; i++) db.companies.set(`c${i}`, company({ id: `c${i}`, name: `Empresa ${i}` }));
    db.addRun("run-1", makeRunState({ total: 5, pending: 5 }));
    db.addCompanyRuns("run-1", ["c1", "c2", "c3", "c4", "c5"]);
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));
    deps.insertIntelligence = async (payload) => {
      if (payload.company_id === "c3") {
        throw new Error("Supabase: relation ap_intelligence does not exist");
      }
      return db.upsertArtifact(db.intelligences, payload, "intel");
    };

    const result = await processChunk("run-1", { maxCompanies: 10, maxTimeMs: 300_000 }, deps);

    expect(result.processed.map((o) => o.status)).toEqual(["concluida", "concluida", "falha", "concluida", "concluida"]);
    expect(result.processed[2]).toMatchObject({ errorCode: "banco" });
    const finalRun = result.run;
    expect(finalRun?.status).toBe("concluido");
    expect(db.runs.get("run-1")).toMatchObject({ total: 5, completed: 4, failed: 1 });
  });

  it("não duplica: empresa já concluída nunca é reclamada", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company());
    db.companies.set("c2", company({ id: "c2" }));
    db.addRun("run-1", makeRunState({ total: 2, pending: 1, completed: 1 }));
    const map = new Map<string, { status: BatchCompanyStatus; errorCode: string; errorMessage: string; retryCount: number; nextRetryAt: string | null; claimedAt: string | null }>();
    map.set("c1", { status: "concluida", errorCode: "", errorMessage: "", retryCount: 0, nextRetryAt: null, claimedAt: null });
    map.set("c2", { status: "pendente", errorCode: "", errorMessage: "", retryCount: 0, nextRetryAt: null, claimedAt: null });
    db.companyRuns.set("run-1", map);
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));

    const result = await processChunk("run-1", { maxCompanies: 10, maxTimeMs: 300_000 }, deps);

    expect(db.claims).toEqual(["c2"]);
    expect(result.processed).toHaveLength(1);
    expect(db.intelligences).toHaveLength(1);
  });

  it("isola claim, finalização e contadores para a mesma empresa em dois runs", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company());
    db.addRun("run-a", makeRunState({ total: 1, pending: 1 }));
    db.addCompanyRuns("run-a", ["c1"]);
    db.addRun("run-b", makeRunState({ total: 1, pending: 1 }));
    db.addCompanyRuns("run-b", ["c1"]);
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));
    const runBBefore = { ...db.companyRuns.get("run-b")?.get("c1") };

    const runAClaim = await deps.claimNext("run-a");
    expect(runAClaim).toMatchObject({ batchRunId: "run-a", companyId: "c1" });
    expect(outcomeOf(db, "run-a", "c1")).toBe("processando");
    expect(db.companyRuns.get("run-b")?.get("c1")).toEqual(runBBefore);

    await deps.finishCompanyRun("run-a", "c1", {
      status: "concluida",
      claimedAt: (runAClaim as BatchClaim).claimedAt,
    });
    expect(outcomeOf(db, "run-a", "c1")).toBe("concluida");
    expect(db.companyRuns.get("run-b")?.get("c1")).toEqual(runBBefore);
    expect(await deps.refreshRunCounters("run-a")).toEqual({
      total: 1,
      pending: 0,
      processing: 0,
      completed: 1,
      failed: 0,
      withoutData: 0,
      cancelled: 0,
    });
    expect(db.runs.get("run-b")).toMatchObject({
      total: 1,
      pending: 1,
      processing: 0,
      completed: 0,
    });

    const runAAfter = { ...db.companyRuns.get("run-a")?.get("c1") };
    expect(await deps.claimNext("run-a")).toBeNull();
    expect(await deps.claimNext("run-b")).toMatchObject({
      batchRunId: "run-b",
      companyId: "c1",
    });
    expect(db.companyRuns.get("run-a")?.get("c1")).toEqual(runAAfter);
  });
});

describe("Etapa 7 — retry e backoff no chunk", () => {
  it("429 → retry no mesmo chunk → sucesso (3 chamadas)", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company());
    db.addRun("run-1", makeRunState({ total: 1, pending: 1 }));
    db.addCompanyRuns("run-1", ["c1"]);
    let calls = 0;
    const deps = makeDeps(
      db,
      makeEnrichmentProvider(() => {
        calls++;
        return calls < 3 ? { ...okEnrichment(), status: "unavailable" as const, title: "", description: "", reason: "HTTP 429 — site limitou o acesso." } : okEnrichment();
      }),
    );
    const claim = await deps.claimNext("run-1");
    expect(claim).toMatchObject({ companyId: "c1" });

    const outcome = await processOneCompany("run-1", "c1", deps, { budgetMs: 300_000, claim: claim as BatchClaim });

    expect(calls).toBe(3);
    expect(outcome.status).toBe("concluida");
  });

  it("429 persistente → sem_dados com error_code http_429 após esgotar retries", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company());
    db.addRun("run-1", makeRunState({ total: 1, pending: 1 }));
    db.addCompanyRuns("run-1", ["c1"]);
    let calls = 0;
    const deps = makeDeps(
      db,
      makeEnrichmentProvider(() => {
        calls++;
        return { ...okEnrichment(), status: "unavailable" as const, title: "", description: "", reason: "HTTP 429 — site limitou o acesso." };
      }),
    );
    const claim = await deps.claimNext("run-1");
    expect(claim).toMatchObject({ companyId: "c1" });

    const outcome = await processOneCompany("run-1", "c1", deps, { budgetMs: 300_000, claim: claim as BatchClaim });

    expect(calls).toBe(4); // 1 tentativa + 3 retries
    expect(outcome).toMatchObject({ status: "sem_dados", errorCode: "http_429" });
  });

  it("backoff não cabe no orçamento → defer com next_retry_at (retomada)", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company());
    db.addRun("run-1", makeRunState({ total: 1, pending: 1 }));
    db.addCompanyRuns("run-1", ["c1"]);
    const deps = makeDeps(
      db,
      makeEnrichmentProvider(() => ({ ...okEnrichment(), status: "unavailable" as const, title: "", description: "", reason: "Não foi possível acessar o site." })),
    );
    const claim = await deps.claimNext("run-1");
    expect(claim).toMatchObject({ companyId: "c1" });

    const outcome = await processOneCompany("run-1", "c1", deps, { budgetMs: 5_000, claim: claim as BatchClaim });

    expect(outcome.status).toBe("pendente");
    const st = db.companyRuns.get("run-1")?.get("c1");
    expect(st?.status).toBe("pendente");
    expect(st?.retryCount).toBe(1);
    expect(st?.nextRetryAt).not.toBeNull();
    expect(isDueForProcessing({ status: "pendente", nextRetryAt: st?.nextRetryAt ?? null, claimedAt: null }, db.nowIso)).toBe(false);
  });
});

describe("Etapa 7 — retomada com lease expirado (§11)", () => {
  it("processando órfão (lease vencido) é re-claimado; concluída nunca", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company({ id: "c1" }));
    db.companies.set("c2", company({ id: "c2" }));
    const oldClaim = new Date(new Date(db.nowIso).getTime() - 10 * 60_000).toISOString();
    const map = new Map<string, { status: BatchCompanyStatus; errorCode: string; errorMessage: string; retryCount: number; nextRetryAt: string | null; claimedAt: string | null }>();
    map.set("c1", { status: "processando", errorCode: "", errorMessage: "", retryCount: 0, nextRetryAt: null, claimedAt: oldClaim });
    map.set("c2", { status: "concluida", errorCode: "", errorMessage: "", retryCount: 0, nextRetryAt: null, claimedAt: null });
    db.companyRuns.set("run-1", map);
    db.addRun("run-1", makeRunState({ total: 2, pending: 0, processing: 1, completed: 1 }));
    db.addRun("run-2", makeRunState({ status: "concluido", total: 1, completed: 1 }));
    db.companyRuns.set(
      "run-2",
      new Map([
        [
          "c1",
          { status: "concluida", errorCode: "", errorMessage: "", retryCount: 0, nextRetryAt: null, claimedAt: null },
        ],
      ]),
    );
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));
    const siblingBefore = { ...db.companyRuns.get("run-2")?.get("c1") };

    const result = await processChunk("run-1", { maxCompanies: 10, maxTimeMs: 300_000 }, deps);

    expect(db.claims).toEqual(["c1"]);
    expect(result.processed).toHaveLength(1);
    expect(db.companyRuns.get("run-1")?.get("c2")?.status).toBe("concluida");
    expect(db.companyRuns.get("run-2")?.get("c1")).toEqual(siblingBefore);
    expect(db.runs.get("run-2")).toMatchObject({
      status: "concluido",
      total: 1,
      completed: 1,
      processing: 0,
    });
    expect(db.intelligences).toHaveLength(1);
  });

  it("worker antigo não grava nem finaliza depois que outro worker assume o lease", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company());
    db.addRun("run-1", makeRunState({ status: "processando", total: 1, processing: 1 }));
    db.addCompanyRuns("run-1", ["c1"]);

    const oldClaim = db.claimNext("run-1") as BatchClaim;
    let releaseOld!: () => void;
    let markOldStarted!: () => void;
    const oldStarted = new Promise<void>((resolve) => {
      markOldStarted = resolve;
    });
    const oldGate = new Promise<void>((resolve) => {
      releaseOld = resolve;
    });
    const oldDeps = makeDeps(db, {
      name: "worker-antigo",
      enrich: async () => {
        markOldStarted();
        await oldGate;
        return okEnrichment({ title: "resultado antigo" });
      },
    });
    const oldWork = processOneCompany("run-1", "c1", oldDeps, {
      budgetMs: 300_000,
      claim: oldClaim,
    });
    await oldStarted;

    db.nowIso = new Date(
      new Date(oldClaim.claimedAt).getTime() + BATCH_CONFIG.leaseMs + 1,
    ).toISOString();
    const newClaim = db.claimNext("run-1") as BatchClaim;
    expect(newClaim.claimedAt).not.toBe(oldClaim.claimedAt);
    const newDeps = makeDeps(
      db,
      makeEnrichmentProvider(() => okEnrichment({ title: "resultado novo" })),
    );
    await expect(
      processOneCompany("run-1", "c1", newDeps, {
        budgetMs: 300_000,
        claim: newClaim,
      }),
    ).resolves.toMatchObject({ status: "concluida" });

    releaseOld();
    await expect(oldWork).rejects.toBeInstanceOf(BatchClaimLostError);
    expect(db.enrichments).toHaveLength(1);
    expect(db.enrichments[0]).toMatchObject({
      title: "resultado novo",
      batch_claimed_at: newClaim.claimedAt,
    });
    expect(db.qualifications).toHaveLength(1);
    expect(db.intelligences).toHaveLength(1);
    expect(outcomeOf(db, "run-1", "c1")).toBe("concluida");
  });

  it("worker não grava nem finaliza após cinco minutos mesmo sem takeover", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company());
    db.addRun("run-1", makeRunState({ status: "processando", total: 1, processing: 1 }));
    db.addCompanyRuns("run-1", ["c1"]);
    const claim = db.claimNext("run-1") as BatchClaim;
    db.nowIso = new Date(
      new Date(claim.claimedAt).getTime() + BATCH_CONFIG.leaseMs,
    ).toISOString();
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));

    await expect(
      processOneCompany("run-1", "c1", deps, {
        budgetMs: 300_000,
        claim,
      }),
    ).rejects.toBeInstanceOf(BatchClaimLostError);
    expect(outcomeOf(db, "run-1", "c1")).toBe("processando");
    expect(db.enrichments).toHaveLength(0);
    expect(db.qualifications).toHaveLength(0);
    expect(db.intelligences).toHaveLength(0);
  });

  it("takeover remove artefatos parciais do lease anterior", async () => {
    const db = new FakeBatchDb();
    db.addRun("run-1", makeRunState({ status: "processando", total: 1, processing: 1 }));
    db.addCompanyRuns("run-1", ["c1"]);
    const oldClaim = db.claimNext("run-1") as BatchClaim;
    const enrichmentId = db.upsertArtifact(
      db.enrichments,
      {
        batch_run_id: "run-1",
        company_id: "c1",
        batch_claimed_at: oldClaim.claimedAt,
      },
      "enrich",
    );
    db.evidences.push({
      enrichment_id: enrichmentId,
      batch_claimed_at: oldClaim.claimedAt,
      kind: "fato",
      label: "parcial",
      text: "parcial",
      source_url: "https://example.com",
    });
    db.upsertArtifact(
      db.qualifications,
      {
        batch_run_id: "run-1",
        company_id: "c1",
        batch_claimed_at: oldClaim.claimedAt,
      },
      "qual",
    );
    db.upsertArtifact(
      db.intelligences,
      {
        batch_run_id: "run-1",
        company_id: "c1",
        batch_claimed_at: oldClaim.claimedAt,
      },
      "intel",
    );

    db.nowIso = new Date(
      new Date(oldClaim.claimedAt).getTime() + BATCH_CONFIG.leaseMs,
    ).toISOString();
    expect(db.claimNext("run-1")).toMatchObject({ companyId: "c1" });
    expect(db.enrichments).toHaveLength(0);
    expect(db.evidences).toHaveLength(0);
    expect(db.qualifications).toHaveLength(0);
    expect(db.intelligences).toHaveLength(0);
  });
});

describe("Etapa 7 — pausa, retomada e cancelamento", () => {
  it("process em run pausado é negado", async () => {
    const db = new FakeBatchDb();
    db.addRun("run-1", makeRunState({ status: "pausado" }));
    db.addCompanyRuns("run-1", ["c1"]);
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));
    await expect(processChunk("run-1", {}, deps)).rejects.toBeInstanceOf(BatchRunPausedError);
  });

  it("process em run cancelado/concluido é negado", async () => {
    const db = new FakeBatchDb();
    db.addRun("run-1", makeRunState({ status: "cancelado" }));
    db.addCompanyRuns("run-1", ["c1"]);
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));
    await expect(processChunk("run-1", {}, deps)).rejects.toBeInstanceOf(BatchRunInvalidStateError);

    db.addRun("run-2", makeRunState({ status: "concluido" }));
    db.addCompanyRuns("run-2", ["c1"]);
    await expect(processChunk("run-2", {}, deps)).rejects.toBeInstanceOf(BatchRunInvalidStateError);
  });

  it("process em run inexistente → not found", async () => {
    const db = new FakeBatchDb();
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));
    await expect(processChunk("nao-existe", {}, deps)).rejects.toBeInstanceOf(BatchRunNotFoundError);
  });

  it("pause→resume habilita/desabilita claims e preserva o progresso", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company({ id: "c1" }));
    db.companies.set("c2", company({ id: "c2" }));
    db.addRun("run-1", makeRunState({ status: "processando", total: 2, pending: 1, processing: 1 }));
    const map = new Map<string, { status: BatchCompanyStatus; errorCode: string; errorMessage: string; retryCount: number; nextRetryAt: string | null; claimedAt: string | null }>();
    map.set("c1", { status: "concluida", errorCode: "", errorMessage: "", retryCount: 0, nextRetryAt: null, claimedAt: null });
    map.set("c2", { status: "pendente", errorCode: "", errorMessage: "", retryCount: 0, nextRetryAt: null, claimedAt: null });
    db.companyRuns.set("run-1", map);
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));

    const paused = await pauseBatchRun("run-1", deps);
    expect(paused.status).toBe("pausado");
    await expect(processChunk("run-1", {}, deps)).rejects.toBeInstanceOf(BatchRunPausedError);

    const resumed = await resumeBatchRun("run-1", deps);
    expect(resumed.status).toBe("pendente");
    const result = await processChunk("run-1", {}, deps);
    expect(db.claims).toEqual(["c2"]);
    expect(result.processed).toHaveLength(1);
    expect(result.run?.status).toBe("concluido");
  });

  it("cancelamento transforma pendentes em canceladas e não cria oportunidades", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company({ id: "c1" }));
    db.companies.set("c2", company({ id: "c2" }));
    db.addRun("run-1", makeRunState({ status: "processando", total: 2, pending: 1, processing: 1 }));
    const map = new Map<string, { status: BatchCompanyStatus; errorCode: string; errorMessage: string; retryCount: number; nextRetryAt: string | null; claimedAt: string | null }>();
    map.set("c1", { status: "processando", errorCode: "", errorMessage: "", retryCount: 0, nextRetryAt: null, claimedAt: "2026-08-10T11:55:00.000Z" });
    map.set("c2", { status: "pendente", errorCode: "", errorMessage: "", retryCount: 0, nextRetryAt: null, claimedAt: null });
    db.companyRuns.set("run-1", map);
    db.addRun("run-2", makeRunState({ total: 1, pending: 1 }));
    db.addCompanyRuns("run-2", ["c2"]);
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));

    const cancelled = await cancelBatchRun("run-1", deps);
    expect(cancelled.status).toBe("cancelado");
    expect(cancelled.finishedAt).not.toBeNull();
    expect(db.companyRuns.get("run-1")?.get("c1")?.status).toBe("cancelada");
    expect(db.companyRuns.get("run-1")?.get("c2")?.status).toBe("cancelada");
    expect(db.companyRuns.get("run-2")?.get("c2")?.status).toBe("pendente");

    const cancelledItem = { ...db.companyRuns.get("run-1")?.get("c2") };
    expect(await deps.claimNext("run-2")).toMatchObject({ companyId: "c2" });
    expect(db.companyRuns.get("run-1")?.get("c2")).toEqual(cancelledItem);

    // Regressão: chunk após cancelamento NÃO pode concluir o run
    await expect(processChunk("run-1", {}, deps)).rejects.toBeInstanceOf(BatchRunInvalidStateError);
    expect(db.runs.get("run-1")?.status).toBe("cancelado");
  });

  it("cancelamento invalida o lease de worker ainda em execução", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company());
    db.addRun("run-1", makeRunState({ status: "processando", total: 1, processing: 1 }));
    db.addCompanyRuns("run-1", ["c1"]);
    const claim = db.claimNext("run-1") as BatchClaim;

    let releaseWorker!: () => void;
    let markWorkerStarted!: () => void;
    const workerStarted = new Promise<void>((resolve) => {
      markWorkerStarted = resolve;
    });
    const workerGate = new Promise<void>((resolve) => {
      releaseWorker = resolve;
    });
    const deps = makeDeps(db, {
      name: "worker-em-cancelamento",
      enrich: async () => {
        markWorkerStarted();
        await workerGate;
        return okEnrichment();
      },
    });
    const work = processOneCompany("run-1", "c1", deps, {
      budgetMs: 300_000,
      claim,
    });
    await workerStarted;

    const cancelled = await cancelBatchRun("run-1", deps);
    expect(cancelled).toMatchObject({ status: "cancelado", cancelled: 1 });
    releaseWorker();

    await expect(work).rejects.toBeInstanceOf(BatchClaimLostError);
    expect(outcomeOf(db, "run-1", "c1")).toBe("cancelada");
    expect(db.enrichments).toHaveLength(0);
    expect(db.qualifications).toHaveLength(0);
    expect(db.intelligences).toHaveLength(0);
  });

  it("cancelamento só é permitido em estado ativo", async () => {
    const db = new FakeBatchDb();
    db.addRun("run-1", makeRunState({ status: "concluido" }));
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));
    await expect(cancelBatchRun("run-1", deps)).rejects.toBeInstanceOf(BatchRunInvalidStateError);
  });
});

describe("Etapa 7 — criação de run, idempotência e reprocessamento", () => {
  it("cria run com snapshot das empresas e estado pendente", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company({ id: "c1" }));
    db.companies.set("c2", company({ id: "c2" }));
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));

    const { run, total } = await createBatchRun("camp-1", { apenasSemInteligencia: false, limiteMaximo: 500 }, deps);

    expect(total).toBe(2);
    expect(run.status).toBe("pendente");
    expect(run.pending).toBe(2);
    const rows = [...(db.companyRuns.get(run.id)?.values() ?? [])];
    expect(rows.every((row) => row.status === "pendente")).toBe(true);
  });

  it("409 quando já existe run ativo para a campanha (anti-duplicação)", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company());
    db.addRun("run-ativo", makeRunState({ status: "processando", filters: {} }));
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));

    await expect(createBatchRun("camp-1", {}, deps)).rejects.toBeInstanceOf(BatchRunConflictError);
  });

  it("filtros inválidos → erro de validação (400)", async () => {
    const db = new FakeBatchDb();
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));
    await expect(createBatchRun("camp-1", { limiteMaximo: 0 }, deps)).rejects.toBeInstanceOf(BatchValidationError);
  });

  it("sem empresas elegíveis → erro explícito", async () => {
    const db = new FakeBatchDb();
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));
    await expect(createBatchRun("camp-1", {}, deps)).rejects.toBeInstanceOf(BatchNoEligibleCompaniesError);
  });

  it("retry-failures cria NOVO run apenas com as empresas falha (histórico preservado)", async () => {
    const db = new FakeBatchDb();
    db.companies.set("c1", company({ id: "c1" }));
    db.companies.set("c2", company({ id: "c2" }));
    db.companies.set("c3", company({ id: "c3" }));
    const map = new Map<string, { status: BatchCompanyStatus; errorCode: string; errorMessage: string; retryCount: number; nextRetryAt: string | null; claimedAt: string | null }>();
    map.set("c1", { status: "falha", errorCode: "banco", errorMessage: "erro", retryCount: 3, nextRetryAt: null, claimedAt: null });
    map.set("c2", { status: "concluida", errorCode: "", errorMessage: "", retryCount: 0, nextRetryAt: null, claimedAt: null });
    map.set("c3", { status: "falha", errorCode: "timeout", errorMessage: "erro", retryCount: 2, nextRetryAt: null, claimedAt: null });
    db.companyRuns.set("run-origem", map);
    db.addRun("run-origem", makeRunState({ status: "concluido", filters: { apenasSemInteligencia: false }, total: 3, completed: 1, failed: 2 }));
    db.addRun("run-cancelado", makeRunState({ campaignId: "camp-2", status: "cancelado", total: 2, cancelled: 2 }));
    db.companyRuns.set(
      "run-cancelado",
      new Map([
        ["c1", { status: "cancelada", errorCode: "", errorMessage: "", retryCount: 0, nextRetryAt: null, claimedAt: null }],
        ["c3", { status: "cancelada", errorCode: "", errorMessage: "", retryCount: 0, nextRetryAt: null, claimedAt: null }],
      ]),
    );
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));
    const sourceBefore = structuredClone([...map.entries()]);
    const cancelledBefore = structuredClone([
      ...(db.companyRuns.get("run-cancelado")?.entries() ?? []),
    ]);

    const { run, total } = await retryBatchFailures("run-origem", deps);

    expect(total).toBe(2);
    expect(run.id).not.toBe("run-origem");
    expect(run.filters).toMatchObject({ reprocessarFalhasDoRun: "run-origem" });
    const rows = [...(db.companyRuns.get(run.id)?.values() ?? [])];
    expect(rows.map((r) => r.status)).toEqual(["pendente", "pendente"]);
    expect(db.companyRuns.get("run-origem")?.get("c1")?.status).toBe("falha");
    expect(db.companyRuns.get("run-origem")?.get("c2")?.status).toBe("concluida");

    const result = await processChunk(run.id, { maxCompanies: 10, maxTimeMs: 300_000 }, deps);
    expect(result.run).toMatchObject({
      status: "concluido",
      total: 2,
      pending: 0,
      processing: 0,
      completed: 2,
    });
    expect([...db.companyRuns.get("run-origem")!.entries()]).toEqual(sourceBefore);
    expect([...db.companyRuns.get("run-cancelado")!.entries()]).toEqual(cancelledBefore);
    const retryIntel = db.intelligences.filter((row) => row.batch_run_id === run.id);
    expect(retryIntel).toHaveLength(2);
    expect(new Set(retryIntel.map((row) => row.company_id)).size).toBe(2);
    expect(await deps.claimNext(run.id)).toBeNull();
  });

  it("retry-failures sem falhas → erro explícito", async () => {
    const db = new FakeBatchDb();
    db.addRun("run-origem", makeRunState({ status: "concluido" }));
    db.addCompanyRuns("run-origem", []);
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));
    await expect(retryBatchFailures("run-origem", deps)).rejects.toBeInstanceOf(BatchNoEligibleCompaniesError);
  });

  it("dois process concorrentes nunca processam a mesma empresa (claim atômico)", async () => {
    const db = new FakeBatchDb();
    for (let i = 1; i <= 8; i++) db.companies.set(`c${i}`, company({ id: `c${i}`, name: `Empresa ${i}` }));
    db.addRun("run-1", makeRunState({ total: 8, pending: 8 }));
    db.addCompanyRuns("run-1", ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"]);
    const deps = makeDeps(db, makeEnrichmentProvider(() => okEnrichment()));

    const [a, b] = await Promise.all([
      processChunk("run-1", { maxCompanies: 10, maxTimeMs: 300_000 }, deps),
      processChunk("run-1", { maxCompanies: 10, maxTimeMs: 300_000 }, deps),
    ]);

    const allClaims = [...a.processed.map((o) => o.companyId), ...b.processed.map((o) => o.companyId)];
    expect(new Set(allClaims).size).toBe(allClaims.length);
    expect(db.claims.length).toBe(new Set(db.claims).size);
    expect(allClaims).toHaveLength(8);
    const artifactKeys = db.intelligences.map(
      (row) => `${String(row.batch_run_id)}:${String(row.company_id)}`,
    );
    expect(artifactKeys).toHaveLength(8);
    expect(new Set(artifactKeys).size).toBe(8);
    expect(db.runs.get("run-1")).toMatchObject({
      status: "concluido",
      total: 8,
      pending: 0,
      processing: 0,
      completed: 8,
      failed: 0,
      withoutData: 0,
    });
  });
});

function outcomeOf(db: FakeBatchDb, runId: string, companyId: string): BatchCompanyStatus | undefined {
  return db.companyRuns.get(runId)?.get(companyId)?.status;
}
