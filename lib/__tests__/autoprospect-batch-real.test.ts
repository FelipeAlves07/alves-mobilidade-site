import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { nodeWebSocketTransport } from "@/lib/__tests__/node-websocket-transport";

// O executor ainda importa lib/supabase para suas dependências padrão. O teste
// real injeta o cliente service-role diretamente e este mock preserva as
// importações compartilhadas sem expor credenciais no cliente da aplicação.
vi.mock("@/lib/supabase", async () => {
  const { createClient: makeClient } = await import("@supabase/supabase-js");
  const { nodeWebSocketTransport: transport } = await import(
    "@/lib/__tests__/node-websocket-transport"
  );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return {
    supabase: makeClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport },
    }),
  };
});
vi.mock("server-only", () => ({}));

// ════════════════════════════════════════════════════════════════
// ETAPA 7 — TESTE REAL (Supabase oficial)
//
// Executa o pipeline de lote contra o banco real: criação de campanha
// de TESTE, empresas REAIS já existentes (sem inteligência), claim
// atômico, processamento completo (enriquecimento → qualificação →
// inteligência), retomada de órfãos, pause/resume/cancelamento,
// retry de falhas, idempotência e contagens antes/depois.
//
// REGRAS:
//  - Nenhum dado real é alterado (apenas insere artefatos de análise
//    vinculados ao run de teste — histórico, padrão das Etapas 1-6).
//  - Nenhuma limpeza automática ao final (aguarda autorização).
//  - Sem AI_API_KEY → processamento 100% determinístico.
// ════════════════════════════════════════════════════════════════

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const realTestAuthorized = process.env.RUN_ETAPA7_REAL === "1";
const skipSuite = !realTestAuthorized || !supabaseUrl || !serviceRoleKey || !anonKey;

const admin: SupabaseClient | null = skipSuite
  ? null
  : createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: nodeWebSocketTransport },
    });

function uuid(): string {
  return crypto.randomUUID();
}

const runTag = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
const TEST_CAMPAIGN_NAME = `TESTE BATCH ETAPA7 ${runTag} (remover apos validacao)`;

interface Counts {
  campaigns: number;
  companies: number;
  discoveries: number;
  enrichments: number;
  evidences: number;
  qualifications: number;
  intelligence: number;
  opportunities: number;
  interactions: number;
  batchRuns: number;
  batchCompanyRuns: number;
  visionState: number;
}

async function countAll(): Promise<Counts> {
  const client = requireAdmin();
  const tables: Array<[keyof Counts, string]> = [
    ["campaigns", "ap_campaigns"],
    ["companies", "ap_companies"],
    ["discoveries", "ap_discoveries"],
    ["enrichments", "ap_enrichments"],
    ["evidences", "ap_enrichment_evidences"],
    ["qualifications", "ap_qualifications"],
    ["intelligence", "ap_intelligence"],
    ["opportunities", "ap_opportunities"],
    ["interactions", "ap_opportunity_interactions"],
    ["batchRuns", "ap_batch_runs"],
    ["batchCompanyRuns", "ap_batch_company_runs"],
    ["visionState", "ame_vision_state"],
  ];
  const out = {} as Counts;
  for (const [key, table] of tables) {
    const { count, error } = await client.from(table).select("*", { count: "exact", head: true });
    if (error) throw new Error(`contagem ${table}: ${error.message}`);
    out[key] = count ?? -1;
  }
  return out;
}

function requireAdmin(): SupabaseClient {
  if (!admin) {
    throw new Error("Teste real não autorizado ou Supabase oficial não configurado.");
  }
  return admin;
}

function requireRow<T>(row: T | null, context: string): T {
  if (row === null) throw new Error(`${context}: resposta sem linha.`);
  return row;
}

describe.skipIf(skipSuite)("ETAPA 7 — teste real no Supabase oficial (opt-in)", () => {
  let beforeCounts: Counts;
  let testCampaignId: string;
  let selectedCompanies: Array<{ id: string; name: string; website: string; segment: string }> = [];
  let runA: { id: string; total: number };
  let runB: { id: string };

  // Dados de teste criados (relatados, NUNCA removidos automaticamente)
  let createdCampaigns = 0;
  let createdDiscoveries = 0;
  let createdBatchRuns = 0;

  beforeAll(async () => {
    if (skipSuite) return;
    const client = requireAdmin();
    const { data: version, error } = await client.rpc("ap_batch_claim_version");
    if (error || version !== 2) {
      throw new Error(
        `Migration 00012 não confirmada; teste mutante interrompido antes de qualquer escrita: ${error?.message ?? `versão ${String(version)}`}`,
      );
    }
    beforeCounts = await countAll();
    console.log("[ETAPA7 REAL] Contagens INICIAIS:", JSON.stringify(beforeCounts, null, 2));
  });

  afterAll(async () => {
    if (skipSuite) return;
    try {
      const after = await countAll();
      console.log("[ETAPA7 REAL] Contagens FINAIS:", JSON.stringify(after, null, 2));
      console.log(
        "[ETAPA7 REAL] Deltas:",
        JSON.stringify(
          Object.fromEntries(
            Object.keys(after).map((k) => [k, after[k as keyof Counts] - beforeCounts[k as keyof Counts]]),
          ),
          null,
          2,
        ),
      );
      console.log(
        "[ETAPA7 REAL] Dados de teste criados — campanhas:",
        createdCampaigns,
        "descobertas:",
        createdDiscoveries,
        "runs:",
        createdBatchRuns,
      );
    } catch (error) {
      console.error("[ETAPA7 REAL] Falha ao capturar contagens finais:", error);
    }
  });

  it("0. migrations 00011 e 00012 confirmadas no banco real", { timeout: 30_000 }, async () => {
    if (skipSuite) return;
    const client = requireAdmin();
    const { error } = await client.from("ap_batch_runs").select("id").limit(1);
    expect(error, `ap_batch_runs deve existir (migration 00011): ${error?.message ?? ""}`).toBeNull();
    const { data: claimData, error: claimError } = await client.rpc("ap_batch_claim_next", {
      p_run_id: uuid(),
    });
    expect(claimError, `função ap_batch_claim_next deve existir: ${claimError?.message ?? ""}`).toBeNull();
    expect(claimData).toBeNull();
    const { data: claimVersion, error: versionError } = await client.rpc(
      "ap_batch_claim_version",
    );
    expect(versionError, `função ap_batch_claim_version: ${versionError?.message ?? ""}`).toBeNull();
    expect(claimVersion).toBe(2);
    const { error: colError } = await client
      .from("ap_intelligence")
      .select("batch_run_id")
      .limit(1);
    expect(colError, `coluna batch_run_id em ap_intelligence: ${colError?.message ?? ""}`).toBeNull();
    console.log("[ETAPA7 REAL] Migrations 00011 e 00012 CONFIRMADAS.");
  });

  it("1. cria campanha de TESTE e seleciona empresas reais sem inteligência", { timeout: 60_000 }, async () => {
    if (skipSuite) return;
    const client = requireAdmin();

    const { data: campaign, error: campError } = await client
      .from("ap_campaigns")
      .insert({ name: TEST_CAMPAIGN_NAME, location: "Teste Etapa 7", status: "Ativa" })
      .select("id")
      .single();
    expect(campError, `criar campanha de teste: ${campError?.message ?? ""}`).toBeNull();
    testCampaignId = requireRow(campaign, "criar campanha de teste").id;
    createdCampaigns++;

    const { data: withIntel } = await client.from("ap_intelligence").select("company_id");
    const intelSet = new Set((withIntel || []).map((r) => r.company_id as string));

    const { data: allCompanies, error: allError } = await client
      .from("ap_companies")
      .select("id, name, website, segment");
    expect(allError, `listar empresas: ${allError?.message ?? ""}`).toBeNull();
    const rawCandidates = (allCompanies || []).filter((c) => !intelSet.has(c.id as string));

    const { data: allDiscoveries, error: discError } = await client
      .from("ap_discoveries")
      .select("company_id");
    expect(discError, `listar descobertas: ${discError?.message ?? ""}`).toBeNull();
    const discovered = new Set((allDiscoveries || []).map((d) => d.company_id as string));
    const candidates = rawCandidates.filter((c) => discovered.has(c.id as string));

    const withSite = candidates.filter((c) => String(c.website || "").trim().length > 0);
    const withoutSite = candidates.filter((c) => String(c.website || "").trim().length === 0);

    if (candidates.length === 0) {
      console.log(
        "[ETAPA7 REAL] Nenhuma empresa SEM inteligência restante — queda de segurança: selecionando empresas já analisadas (reanálise legítima, histórico imutável).",
      );
    }
    const sourcePool = candidates.length > 0 ? candidates : (allCompanies as unknown[]);

    expect(sourcePool.length, `deve haver empresas reais elegíveis`).toBeGreaterThan(0);
    console.log(
      `[ETAPA7 REAL] Candidatas reais: ${candidates.length} (${withSite.length} com site, ${withoutSite.length} sem site).`,
    );
    console.log(
      "[ETAPA7 REAL] Exemplos sem site:",
      withoutSite.slice(0, 5).map((c) => ({ id: c.id, name: c.name })),
    );

    if (withoutSite.length === 0) {
      console.log("[ETAPA7 REAL] AVISO: nenhuma empresa real sem site — item 9 parcialmente sem cobertura real.");
    }

    const pick = [...withSite, ...withoutSite].slice(0, 12);
    if (pick.length < 3) {
      for (const c of allCompanies as unknown[]) {
        if (pick.length >= 12) break;
        const candidate = c as { id: string; name?: string; website?: string; segment?: string };
        if (!pick.some((p) => p.id === candidate.id)) {
          pick.push({ id: candidate.id, name: candidate.name || "", website: candidate.website || "", segment: candidate.segment || "" });
        }
      }
    }
    expect(pick.length).toBeGreaterThanOrEqual(3);

    const rows = pick.map((c) => ({
      company_id: c.id as string,
      campaign_id: testCampaignId,
      source: "teste-batch-etapa7",
      url: "teste-etapa7",
    }));
    const { error: insDiscError } = await client.from("ap_discoveries").insert(rows);
    expect(insDiscError, `vincular empresas à campanha de teste: ${insDiscError?.message ?? ""}`).toBeNull();
    createdDiscoveries += rows.length;
    selectedCompanies = pick.map((c) => ({
      id: c.id as string,
      name: c.name as string,
      website: String(c.website || ""),
      segment: String(c.segment || ""),
    }));
    console.log(
      "[ETAPA7 REAL] Empresas selecionadas:",
      JSON.stringify(selectedCompanies.map((c) => ({ id: c.id, name: c.name, site: !!(c.website.trim()) })), null, 2),
    );
  });

  it("2. cria o run (snapshot) e valida claim atômico concorrente (5 chamadas RPC paralelas)", { timeout: 60_000 }, async () => {
    if (skipSuite) return;
    const client = requireAdmin();
    const { createBatchExecutorDepsForClient, createBatchRun } = await import("@/lib/batch-executor");
    const deps = createBatchExecutorDepsForClient(client);
    const { run, total } = await createBatchRun(
      testCampaignId,
      { apenasSemInteligencia: false, limiteMaximo: 500 },
      deps,
    );
    runA = { id: run.id, total };
    createdBatchRuns++;
    expect(run.status).toBe("pendente");
    expect(run.total).toBe(selectedCompanies.length);
    expect(run.pending).toBe(selectedCompanies.length);
    console.log(`[ETAPA7 REAL] Run A criado: ${run.id} — ${total} empresas pendentes.`);

    const { data: rows } = await client
      .from("ap_batch_company_runs")
      .select("company_id, status")
      .eq("batch_run_id", run.id);
    const pending = (rows || []).filter((r) => r.status === "pendente").length;
    expect(pending).toBe(total);

    const claims = await Promise.all(
      Array.from({ length: 5 }, () =>
        client.rpc("ap_batch_claim_next", { p_run_id: run.id }),
      ),
    );
    const claimedIds = claims
      .map((result) => {
        const claim = result.data as Record<string, unknown> | null;
        return typeof claim?.companyId === "string" ? claim.companyId : null;
      })
      .filter((companyId): companyId is string => companyId !== null);
    expect(claims.every((c) => c.error === null), "RPC de claim não deve falhar").toBe(true);
    expect(claimedIds).toHaveLength(5);
    expect(new Set(claimedIds).size, "5 claims concorrentes não podem se repetir (SKIP LOCKED)").toBe(5);
    console.log(`[ETAPA7 REAL] Claim concorrente: 5 chamadas paralelas → ${claimedIds.length} distintas.`);

    const { data: claimedRows } = await client
      .from("ap_batch_company_runs")
      .select("company_id, status, claimed_at")
      .eq("batch_run_id", run.id);
    const processingRows = (claimedRows || []).filter((r) => r.status === "processando");
    expect(processingRows).toHaveLength(5);
    for (const row of processingRows) {
      expect(row.claimed_at, "empresas claimadas devem ter claimed_at preenchido").not.toBeNull();
    }
  });

  it("3. retomada de órfãos (lease expirado) + processamento completo do run A", { timeout: 1_200_000 }, async () => {
    if (skipSuite) return;
    const client = requireAdmin();

    // Simula navegador fechado no meio do processamento: claims de 10+ min
    const { error: leaseError } = await client
      .from("ap_batch_company_runs")
      .update({ claimed_at: new Date(Date.now() - 10 * 60_000).toISOString() })
      .eq("batch_run_id", runA.id)
      .eq("status", "processando");
    expect(leaseError, `simular leases expirados: ${leaseError?.message ?? ""}`).toBeNull();
    console.log("[ETAPA7 REAL] Leases dos 5 órfãos expirados (claimed_at = now - 10min).");

    const { createBatchExecutorDepsForClient, processChunk } = await import("@/lib/batch-executor");
    const deps = createBatchExecutorDepsForClient(client);

    let remaining = -1;
    let guard = 0;
    const outcomes: string[] = [];
    do {
      const result = await processChunk(runA.id, { maxCompanies: 50, maxTimeMs: 300_000 }, deps);
      for (const o of result.processed) outcomes.push(`${o.companyId}:${o.status}`);
      remaining = result.remaining;
      guard++;
      console.log(
        `[ETAPA7 REAL] chunk ${guard}: processadas ${result.processed.length} (${result.processed.map((o) => o.status).join(",")}), restantes ${remaining}, run=${result.run?.status}`,
      );
      if (guard > 20) throw new Error("loop de chunks excedeu guarda de segurança");
    } while (remaining > 0);

    expect(guard, `run A deve concluir em chunks (guard=${guard})`).toBeLessThanOrEqual(20);

    const { data: runRowData, error: runError } = await client
      .from("ap_batch_runs")
      .select("status, total, pending, processing, completed, failed, without_data, cancelled, finished_at")
      .eq("id", runA.id)
      .single();
    expect(runError, `carregar run A: ${runError?.message ?? ""}`).toBeNull();
    const runRow = requireRow(runRowData, "carregar run A");
    expect(runRow.status).toBe("concluido");
    expect(runRow.finished_at).not.toBeNull();
    expect(Number(runRow.total)).toBe(runA.total);
    expect(Number(runRow.pending)).toBe(0);
    expect(Number(runRow.processing)).toBe(0);
    expect(Number(runRow.completed) + Number(runRow.without_data) + Number(runRow.failed)).toBe(runA.total);
    expect(Number(runRow.cancelled)).toBe(0);
    console.log(
      `[ETAPA7 REAL] Run A CONCLUÍDO: ${runRow.completed} concluídas, ${runRow.without_data} sem dados, ${runRow.failed} falhas.`,
    );

    const { data: compRows } = await client
      .from("ap_batch_company_runs")
      .select("company_id, status, retry_count, error_code")
      .eq("batch_run_id", runA.id);
    for (const row of compRows || []) {
      expect(["concluida", "sem_dados", "falha"]).toContain(row.status);
    }
    const statusCounts: Record<string, number> = {};
    for (const row of compRows || []) {
      statusCounts[row.status as string] = (statusCounts[row.status as string] || 0) + 1;
    }
    console.log("[ETAPA7 REAL] Distribuição por empresa:", JSON.stringify(statusCounts));
    const runTab = Object.fromEntries(compRows?.map((r) => [r.company_id, r.status]) || []);
    const tabMap: Record<string, string> = {};
    for (const [cid, st] of Object.entries(runTab)) tabMap[cid as string] = st as string;
    const finalStatusMap = tabMap;
    for (const company of selectedCompanies) {
      const st = finalStatusMap[company.id];
      if (!company.website.trim()) {
        expect(st, `empresa sem site ${company.name} deve ser sem_dados`).toBe("sem_dados");
      }
    }
  });

  it("4. persistência real dos artefatos (enriquecimento/evidências/qualificação/inteligência) vinculados ao run", { timeout: 60_000 }, async () => {
    if (skipSuite) return;
    const client = requireAdmin();

    const { data: enr, error: enrError } = await client.from("ap_enrichments").select("id, company_id, batch_run_id").eq("batch_run_id", runA.id);
    expect(enrError, `carregar enriquecimentos: ${enrError?.message ?? ""}`).toBeNull();
    const enrichmentIds = (enr || []).map((row) => row.id as string);
    const { data: evd, error: evdError } = enrichmentIds.length > 0
      ? await client.from("ap_enrichment_evidences").select("id, enrichment_id").in("enrichment_id", enrichmentIds)
      : { data: [], error: null };
    expect(evdError, `carregar evidências: ${evdError?.message ?? ""}`).toBeNull();
    const { data: qual } = await client.from("ap_qualifications").select("id, company_id, batch_run_id, ai_status").eq("batch_run_id", runA.id);
    const { data: intel } = await client.from("ap_intelligence").select("id, company_id, batch_run_id, ai_status, priority, cost_estimate").eq("batch_run_id", runA.id);

    const companiesWithIntel = (intel || []).length;
    expect(companiesWithIntel, "toda empresa terminal deve ter inteligência vinculada").toBe(runA.total);
    expect((enr || []).length).toBe(runA.total);
    expect((qual || []).length).toBe(runA.total);
    for (const row of intel || []) {
      expect(row.ai_status).toBe("deterministico");
      expect(Number(row.priority)).toBeGreaterThanOrEqual(1);
      expect(Number(row.priority)).toBeLessThanOrEqual(4);
      expect(Number(row.cost_estimate)).toBe(0);
    }
    for (const row of qual || []) {
      expect(row.ai_status).toBe("deterministico");
    }
    const priorityCounts: Record<string, number> = {};
    for (const row of intel || []) {
      const p = String(row.priority);
      priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    }
    console.log("[ETAPA7 REAL] Persistência:", {
      enrichments: (enr || []).length,
      evidences: (evd || []).length,
      qualifications: (qual || []).length,
      intelligence: (intel || []).length,
      prioridades: priorityCounts,
      aiStatus: "deterministico (sem AI_API_KEY)",
    });
  });

  it("5. reload/nova leitura: estado persistido sobrevive a nova leitura", { timeout: 30_000 }, async () => {
    if (skipSuite) return;
    const client = requireAdmin();
    const { data: runRowData, error: runError } = await client.from("ap_batch_runs").select("*").eq("id", runA.id).single();
    expect(runError, `recarregar run A: ${runError?.message ?? ""}`).toBeNull();
    const runRow = requireRow(runRowData, "recarregar run A");
    expect(runRow.status).toBe("concluido");
    const { data: items } = await client
      .from("ap_batch_company_runs")
      .select("company_id, status")
      .eq("batch_run_id", runA.id);
    expect(items?.length).toBe(runA.total);
    console.log(
      "[ETAPA7 REAL] Reload OK: run concluido com ",
      runA.total,
      "linhas persistidas nesta segunda leitura (navegador fechado → reabrir: mesmo estado).",
    );
  });

  it("6. empresa inexistente → falha de validação sem quebrar o run", { timeout: 60_000 }, async () => {
    if (skipSuite) return;
    const { createBatchExecutorDepsForClient, processOneCompany } = await import("@/lib/batch-executor");
    const deps = createBatchExecutorDepsForClient(requireAdmin());
    const fakeId = uuid();
    const outcome = await processOneCompany(runA.id, fakeId, deps, {
      budgetMs: 30_000,
      claim: {
        batchRunId: runA.id,
        companyId: fakeId,
        claimedAt: new Date().toISOString(),
        retryCount: 0,
      },
    });
    expect(outcome).toMatchObject({ companyId: fakeId, status: "falha", errorCode: "validacao" });
    const { count } = await requireAdmin()
      .from("ap_intelligence")
      .select("*", { count: "exact", head: true })
      .eq("batch_run_id", runA.id);
    expect(count).toBe(runA.total);
    console.log("[ETAPA7 REAL] Empresa 404 → falha/validacao, sem artefato extra, run intacto.");
  });

  it("7. pause bloqueia chunks; resume libera; cancelamento zera pendentes", { timeout: 120_000 }, async () => {
    if (skipSuite) return;
    const { createBatchExecutorDepsForClient, createBatchRun, pauseBatchRun, resumeBatchRun, cancelBatchRun, processChunk } =
      await import("@/lib/batch-executor");
    const client = requireAdmin();
    const deps = createBatchExecutorDepsForClient(client);

    const { run: runB0 } = await createBatchRun(
      testCampaignId,
      { apenasSemInteligencia: false, limiteMaximo: 500 },
      deps,
    );
    runB = { id: runB0.id };
    createdBatchRuns++;

    const paused = await pauseBatchRun(runB.id, deps);
    expect(paused.status).toBe("pausado");
    await expect(processChunk(runB.id, {}, deps)).rejects.toThrow(/Pausado|pausado/);
    const { data: runAfterPauseData, error: pauseReadError } = await client.from("ap_batch_runs").select("status").eq("id", runB.id).single();
    expect(pauseReadError, `reler run pausado: ${pauseReadError?.message ?? ""}`).toBeNull();
    const runAfterPause = requireRow(runAfterPauseData, "reler run pausado");
    expect(runAfterPause.status).toBe("pausado");
    console.log("[ETAPA7 REAL] Pausa OK: process negado em run pausado (409 na API/erro de domínio).");

    const resumed = await resumeBatchRun(runB.id, deps);
    expect(resumed.status).toBe("pendente");
    console.log("[ETAPA7 REAL] Resume OK: run volta a aceitar process.");

    const cancelled = await cancelBatchRun(runB.id, deps);
    expect(cancelled.status).toBe("cancelado");
    const { data: compRows } = await client
      .from("ap_batch_company_runs")
      .select("status")
      .eq("batch_run_id", runB.id);
    const cancelledRows = (compRows || []).filter((r) => r.status === "cancelada").length;
    expect(cancelledRows).toBe((compRows || []).length);
    await expect(processChunk(runB.id, {}, deps)).rejects.toThrow(/cancelado|Cancelado/);
    console.log(`[ETAPA7 REAL] Cancelamento OK: ${cancelledRows} pendentes → canceladas; process rejeitado.`);
  });

  it("8. retry de falhas: novo run apenas com empresas falha (histórico preservado)", { timeout: 120_000 }, async () => {
    if (skipSuite) return;
    const client = requireAdmin();
    const { createBatchExecutorDepsForClient, retryBatchFailures, processChunk } = await import("@/lib/batch-executor");
    const deps = createBatchExecutorDepsForClient(client);

    // Manufactura 1 falha DENTRO do run de teste A (dado de teste, não dado real)
    const { data: anyRowData, error: anyRowError } = await client
      .from("ap_batch_company_runs")
      .select("batch_run_id, company_id, status, error_code, error_message, retry_count, next_retry_at, claimed_at")
      .eq("batch_run_id", runA.id)
      .limit(1)
      .single();
    expect(anyRowError, `selecionar item para retry: ${anyRowError?.message ?? ""}`).toBeNull();
    const anyRow = requireRow(anyRowData, "selecionar item para retry");
    const failedCompanyId = anyRow.company_id;
    const { error: failError } = await client
      .from("ap_batch_company_runs")
      .update({ status: "falha", error_code: "timeout", error_message: "teste etapa7: falha fabricada para validar retry" })
      .eq("batch_run_id", runA.id)
      .eq("company_id", failedCompanyId);
    expect(failError, `marcar empresa do run de teste como falha: ${failError?.message ?? ""}`).toBeNull();
    await deps.refreshRunCounters(runA.id);
    const { data: runArowData, error: runAError } = await client
      .from("ap_batch_runs")
      .select("status, total, pending, processing, completed, failed, without_data, cancelled")
      .eq("id", runA.id)
      .single();
    expect(runAError, `reler run A antes do retry: ${runAError?.message ?? ""}`).toBeNull();
    const runArow = requireRow(runArowData, "reler run A antes do retry");
    expect(runArow.status, "run A deve permanecer concluido (histórico imutável)").toBe("concluido");

    const itemFields = "batch_run_id, company_id, status, error_code, error_message, retry_count, next_retry_at, claimed_at";
    const { data: sourceBeforeData, error: sourceBeforeError } = await client
      .from("ap_batch_company_runs")
      .select(itemFields)
      .eq("batch_run_id", runA.id)
      .eq("company_id", failedCompanyId)
      .single();
    expect(sourceBeforeError, `snapshot do item no run A: ${sourceBeforeError?.message ?? ""}`).toBeNull();
    const sourceBefore = requireRow(sourceBeforeData, "snapshot do item no run A");
    const { data: cancelledBeforeData, error: cancelledBeforeError } = await client
      .from("ap_batch_company_runs")
      .select(itemFields)
      .eq("batch_run_id", runB.id)
      .eq("company_id", failedCompanyId)
      .single();
    expect(cancelledBeforeError, `snapshot do item no run B: ${cancelledBeforeError?.message ?? ""}`).toBeNull();
    const cancelledBefore = requireRow(cancelledBeforeData, "snapshot do item no run B");
    expect(sourceBefore.status).toBe("falha");
    expect(cancelledBefore.status).toBe("cancelada");

    const { run: retryRun, total } = await retryBatchFailures(runA.id, deps);
    createdBatchRuns++;
    expect(total).toBe(1);
    expect(retryRun.filters).toMatchObject({ reprocessarFalhasDoRun: runA.id });
    expect(retryRun.id).not.toBe(runA.id);
    console.log(`[ETAPA7 REAL] retry-failures: novo run ${retryRun.id} com ${total} empresa(s).`);

    let remaining = total;
    let guard = 0;
    while (remaining > 0) {
      const result = await processChunk(retryRun.id, { maxCompanies: 10, maxTimeMs: 300_000 }, deps);
      remaining = result.remaining;
      guard++;
      if (guard > 10) throw new Error("guarda de segurança do retry");
    }
    const { data: retryRowData, error: retryRowError } = await client
      .from("ap_batch_runs")
      .select("status, total, completed, failed, without_data")
      .eq("id", retryRun.id)
      .single();
    expect(retryRowError, `reler run de retry: ${retryRowError?.message ?? ""}`).toBeNull();
    const retryRow = requireRow(retryRowData, "reler run de retry");
    expect(retryRow.status).toBe("concluido");
    expect(Number(retryRow.total)).toBe(1);
    expect(Number(retryRow.completed) + Number(retryRow.without_data) + Number(retryRow.failed)).toBe(1);
    console.log(
      `[ETAPA7 REAL] Run de retry concluído: completed=${retryRow.completed}, without_data=${retryRow.without_data}, failed=${retryRow.failed}.`,
    );

    const { data: newIntel } = await client
      .from("ap_intelligence")
      .select("company_id")
      .eq("batch_run_id", retryRun.id);
    expect(newIntel?.length).toBe(1);
    const { data: oldIntel } = await client
      .from("ap_intelligence")
      .select("company_id")
      .eq("batch_run_id", runA.id);
    expect((oldIntel || []).length).toBe(runA.total);

    const { data: sourceAfterData, error: sourceAfterError } = await client
      .from("ap_batch_company_runs")
      .select(itemFields)
      .eq("batch_run_id", runA.id)
      .eq("company_id", failedCompanyId)
      .single();
    expect(sourceAfterError, `reler item do run A: ${sourceAfterError?.message ?? ""}`).toBeNull();
    expect(requireRow(sourceAfterData, "reler item do run A")).toEqual(sourceBefore);
    const { data: cancelledAfterData, error: cancelledAfterError } = await client
      .from("ap_batch_company_runs")
      .select(itemFields)
      .eq("batch_run_id", runB.id)
      .eq("company_id", failedCompanyId)
      .single();
    expect(cancelledAfterError, `reler item do run B: ${cancelledAfterError?.message ?? ""}`).toBeNull();
    expect(requireRow(cancelledAfterData, "reler item do run B")).toEqual(cancelledBefore);
    const { data: runAAfterData, error: runAAfterError } = await client
      .from("ap_batch_runs")
      .select("status, total, pending, processing, completed, failed, without_data, cancelled")
      .eq("id", runA.id)
      .single();
    expect(runAAfterError, `reler contadores do run A: ${runAAfterError?.message ?? ""}`).toBeNull();
    expect(requireRow(runAAfterData, "reler contadores do run A")).toEqual(runArow);
    console.log("[ETAPA7 REAL] Retry OK: reanálise com vínculo ao novo run; run original preservado.");
  });

  it("9. apenasSemInteligencia: empresas com inteligência do run NÃO são reprocessadas", { timeout: 60_000 }, async () => {
    if (skipSuite) return;
    const { createBatchExecutorDepsForClient, createBatchRun } = await import("@/lib/batch-executor");
    const { BatchNoEligibleCompaniesError } = await import("@/domain/autoprospect/batch");
    const deps = createBatchExecutorDepsForClient(requireAdmin());
    await expect(
      createBatchRun(testCampaignId, { apenasSemInteligencia: true, limiteMaximo: 500 }, deps),
    ).rejects.toBeInstanceOf(BatchNoEligibleCompaniesError);
    console.log("[ETAPA7 REAL] Idempotência OK: nenhuma empresa com inteligência foi re-selecionada (filtro ativo).");
  });

  it("10. nenhuma oportunidade criada automaticamente + dados reais intactos", { timeout: 60_000 }, async () => {
    if (skipSuite) return;
    const client = requireAdmin();
    const { count: oppCount } = await client.from("ap_opportunities").select("*", { count: "exact", head: true });
    expect(oppCount).toBe(beforeCounts.opportunities);
    const { count: interactionCount } = await client.from("ap_opportunity_interactions").select("*", { count: "exact", head: true });
    expect(interactionCount).toBe(beforeCounts.interactions);
    const { count: testCampaigns } = await client
      .from("ap_campaigns")
      .select("*", { count: "exact", head: true })
      .like("name", "TESTE BATCH%");
    expect(testCampaigns as number).toBeGreaterThanOrEqual(createdCampaigns);
    console.log(
      `[ETAPA7 REAL] Oportunidades e interações inalteradas (${beforeCounts.opportunities}/${beforeCounts.interactions}); campanhas reais intocadas — ${testCampaigns} campanhas TESTE BATCH totais no histórico (inclui tentativas anteriores).`,
    );
  });

  it("11. resumo: contagens antes/depois e dados de teste criados", { timeout: 60_000 }, async () => {
    if (skipSuite) return;
    const after = await countAll();
    console.log("[ETAPA7 REAL] Contagens DEPOIS:", JSON.stringify(after, null, 2));
    const delta = (k: keyof Counts) => after[k] - beforeCounts[k];
    expect(delta("campaigns")).toBe(createdCampaigns);
    expect(delta("discoveries")).toBe(createdDiscoveries);
    expect(delta("batchRuns")).toBe(createdBatchRuns);
    expect(delta("companies")).toBe(0);
    expect(delta("opportunities")).toBe(0);
    expect(delta("interactions")).toBe(0);
    expect(delta("visionState")).toBe(0);
    const totalIntel = delta("intelligence");
    console.log(
      `[ETAPA7 REAL] Resumo de deltas: campanhas +${delta("campaigns")}, descobertas +${delta("discoveries")}, runs +${delta("batchRuns")}, inteligência +${totalIntel}, oportunidades +0, ame_vision_state +0.`,
    );
    console.log("[ETAPA7 REAL] DADOS DE TESTE CRIADOS (aguardando autorização para remoção):");
    console.log(`  - campanha de teste: ${TEST_CAMPAIGN_NAME} (${testCampaignId})`);
    console.log(`  - ${createdDiscoveries} descobertas (company_id, campaign_id=${testCampaignId}, source=teste-batch-etapa7)`);
    console.log(`  - runs ${createdBatchRuns}: A=${runA.id}${runB ? `, B=${runB.id}` : ""} e retry`);
    console.log(`  - 1 empresa do run A marcada como falha fabricada (error_code=timeout, error_message=teste etapa7...)`);
    expect(after.campaigns).toBeGreaterThanOrEqual(beforeCounts.campaigns);
  });
});
