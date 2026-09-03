"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AutoProspectCampaign,
  AutoProspectCampaignForm,
  ProspectCompany,
  ProspectCompanyForm,
  ProspectDiscovery,
  ProspectDiscoveryForm,
} from "@/domain/autoprospect/types";
import { runDiscovery } from "@/domain/autoprospect/service";
import type { AutomaticDiscoveryResponse } from "@/domain/autoprospect/discovery";
import type { EnrichmentOutcome } from "@/domain/autoprospect/enrichment";
import type { QualificationAnalysis } from "@/domain/autoprospect/qualification";
import { createRepository } from "@/lib/repository-factory";
import { supabase } from "@/lib/supabase";
import {
  apCampaignFromSupabase,
  apCampaignFormToSupabase,
  apCampaignPatchToSupabase,
  apCompanyFromSupabase,
  apCompanyFormToSupabase,
  apCompanyPatchToSupabase,
  apDiscoveryFromSupabase,
  apDiscoveryFormToSupabase,
  apDiscoveryPatchToSupabase,
  apIntelligenceFromSupabase,
  apIntelligenceToSupabase,
  apQualificationFromSupabase,
  apQualificationToSupabase,
  type CompanyIntelligenceRow,
  type CompanyQualificationRow,
} from "@/lib/repository-mappers";
import { latestIntelligencePerCompany } from "@/domain/autoprospect/intelligence";
import type { IntelligenceAnalysis } from "@/domain/autoprospect/intelligence";
import { isTerminalBatchStatus, type BatchRunDetail, type BatchRunListItem } from "@/domain/autoprospect/batch";
import type { OpportunityInteractionForm, OpportunityStatus } from "@/domain/autoprospect/opportunity";
import type {
  OpportunityInteractionRow,
  OpportunityListItemRow,
} from "@/lib/repository-mappers";

export interface CompanyAnalysisResult {
  enrichment: EnrichmentOutcome | null;
  qualification: QualificationAnalysis;
  intelligence?: CompanyIntelligenceRow | null;
}

export type IntelligenceApiResult = IntelligenceAnalysis & {
  id: string;
  createdAt: string;
  scoreSnapshot?: number;
  potentialSnapshot?: string;
  confidenceSnapshot?: string;
};

function qualificationRowToAnalysis(row: CompanyQualificationRow): QualificationAnalysis {
  return {
    score: row.score,
    potential: row.potential as QualificationAnalysis["potential"],
    confidence: row.confidence as QualificationAnalysis["confidence"],
    confidenceReason: row.confidenceReason,
    summary: row.summary,
    opportunityReason: row.opportunityReason,
    facts: row.facts as QualificationAnalysis["facts"],
    inferences: row.inferences as QualificationAnalysis["inferences"],
    possibleServices: row.possibleServices,
    recommendation: row.recommendation as QualificationAnalysis["recommendation"],
    recommendationText: row.recommendationText,
    breakdown: row.scoreBreakdown as QualificationAnalysis["breakdown"],
    aiProvider: row.aiProvider,
    aiModel: row.aiModel,
    aiStatus: row.aiStatus as QualificationAnalysis["aiStatus"],
  };
}

async function batchRequestHeaders(contentType = false): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error("Faça login para executar ações de lote.");
  }
  return {
    ...(contentType ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${accessToken}`,
  };
}

export function useAutoProspect() {
  const [campaigns, setCampaigns] = useState<AutoProspectCampaign[]>([]);
  const [companies, setCompanies] = useState<ProspectCompany[]>([]);
  const [discoveries, setDiscoveries] = useState<ProspectDiscovery[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, CompanyAnalysisResult>>({});
  const [intelligence, setIntelligence] = useState<Record<string, CompanyIntelligenceRow>>({});
  const [opportunities, setOpportunities] = useState<OpportunityListItemRow[]>([]);
  const [interactions, setInteractions] = useState<Record<string, OpportunityInteractionRow[]>>({});
  const [batchRuns, setBatchRuns] = useState<BatchRunListItem[]>([]);
  const [batchDetail, setBatchDetail] = useState<BatchRunDetail | null>(null);
  const [batchPolling, setBatchPolling] = useState(false);

  const companiesRef = useRef<ProspectCompany[]>([]);
  const discoveriesRef = useRef<ProspectDiscovery[]>([]);
  const batchPollRef = useRef<number | null>(null);
  const lastBatchIdRef = useRef<string | null>(null);

  useEffect(() => { companiesRef.current = companies; }, [companies]);
  useEffect(() => { discoveriesRef.current = discoveries; }, [discoveries]);

  const campaignRepo = useMemo(
    () =>
      createRepository<AutoProspectCampaign, AutoProspectCampaignForm>(
        "ap_campaigns",
        "ame-ap-campaigns-v1",
        (form, id, now) => ({ ...form, id, createdAt: now }),
        {
          fromDb: apCampaignFromSupabase,
          toDb: apCampaignFormToSupabase,
          toDbPatch: apCampaignPatchToSupabase,
        },
      ),
    [],
  );

  const companyRepo = useMemo(
    () =>
      createRepository<ProspectCompany, ProspectCompanyForm>(
        "ap_companies",
        "ame-ap-companies-v1",
        (form, id, now) => ({ ...form, id, collectedAt: now, createdAt: now }),
        {
          fromDb: apCompanyFromSupabase,
          toDb: apCompanyFormToSupabase,
          toDbPatch: apCompanyPatchToSupabase,
        },
      ),
    [],
  );

  const discoveryRepo = useMemo(
    () =>
      createRepository<ProspectDiscovery, ProspectDiscoveryForm>(
        "ap_discoveries",
        "ame-ap-discoveries-v1",
        (form, id, now) => ({ ...form, id, createdAt: now }),
        {
          fromDb: apDiscoveryFromSupabase,
          toDb: apDiscoveryFormToSupabase,
          toDbPatch: apDiscoveryPatchToSupabase,
        },
      ),
    [],
  );

  const qualificationRepo = useMemo(
    () =>
      createRepository<CompanyQualificationRow, CompanyQualificationRow>(
        "ap_qualifications",
        "ame-ap-qualifications-v1",
        (form, id, now) => ({ ...form, id, createdAt: now }),
        {
          fromDb: apQualificationFromSupabase,
          toDb: apQualificationToSupabase,
        },
      ),
    [],
  );

  const intelligenceRepo = useMemo(
    () =>
      createRepository<CompanyIntelligenceRow, CompanyIntelligenceRow>(
        "ap_intelligence",
        "ame-ap-intelligence-v1",
        (form, id, now) => ({ ...form, id, createdAt: now }),
        {
          fromDb: apIntelligenceFromSupabase,
          toDb: apIntelligenceToSupabase,
        },
      ),
    [],
  );

  useEffect(() => {
    campaignRepo.findAll().then(setCampaigns).catch(() => {});
    companyRepo.findAll().then(setCompanies).catch(() => {});
    discoveryRepo.findAll().then(setDiscoveries).catch(() => {});
    qualificationRepo.findAll().then((rows) => {
      const latest = new Map<string, CompanyQualificationRow>();
      for (const row of rows) {
        const previous = latest.get(row.companyId);
        if (!previous || row.createdAt > previous.createdAt) latest.set(row.companyId, row);
      }
      const map: Record<string, CompanyAnalysisResult> = {};
      for (const row of latest.values()) {
        map[row.companyId] = { enrichment: null, qualification: qualificationRowToAnalysis(row) };
      }
      setAnalyses(map);
    }).catch(() => {});
    // Cache de inteligência: abrir a empresa NUNCA dispara IA; apenas lê o
    // último resultado persistido (a IA roda só em ação explícita do usuário).
    intelligenceRepo.findAll().then((rows) => {
      const latest = latestIntelligencePerCompany(rows);
      const map: Record<string, CompanyIntelligenceRow> = {};
      for (const row of latest.values()) map[row.companyId] = row;
      setIntelligence(map);
    }).catch(() => {});
    // Oportunidades comerciais (Etapa 6): leitura via API (join com a empresa)
    fetch("/api/autoprospect/opportunities")
      .then((response) => response.json().catch(() => null))
      .then((payload) => {
        if (payload?.ok && Array.isArray(payload.opportunities)) {
          setOpportunities(payload.opportunities);
        }
      })
      .catch(() => {});
    // Processamentos em lote (Etapa 7): apenas leitura; execução é manual.
    batchRequestHeaders()
      .then((headers) => fetch("/api/autoprospect/batch", { headers }))
      .then((response) => response.json().catch(() => null))
      .then((payload) => {
        if (payload?.ok && Array.isArray(payload.runs)) {
          setBatchRuns(payload.runs);
        }
      })
      .catch(() => {});
  }, [campaignRepo, companyRepo, discoveryRepo, qualificationRepo, intelligenceRepo]);

  useEffect(
    () => () => {
      if (batchPollRef.current !== null) {
        window.clearInterval(batchPollRef.current);
        batchPollRef.current = null;
      }
    },
    [],
  );

  const addCampaign = useCallback(
    async (form: AutoProspectCampaignForm) => {
      if (!form.name.trim()) return;
      const item = await campaignRepo.create(form);
      setCampaigns((prev) => [item, ...prev]);
    },
    [campaignRepo],
  );

  const updateCampaign = useCallback(
    async (id: string, patch: Partial<AutoProspectCampaignForm>) => {
      await campaignRepo.update(id, patch);
      setCampaigns((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [campaignRepo],
  );

  const deleteCampaign = useCallback(
    async (id: string) => {
      await campaignRepo.delete(id);
      setCampaigns((prev) => prev.filter((item) => item.id !== id));
    },
    [campaignRepo],
  );

  const addCompany = useCallback(
    async (form: ProspectCompanyForm) => {
      if (!form.name.trim()) return;
      const item = await companyRepo.create(form);
      setCompanies((prev) => [item, ...prev]);
      return item;
    },
    [companyRepo],
  );

  const updateCompany = useCallback(
    async (id: string, patch: Partial<ProspectCompanyForm>) => {
      await companyRepo.update(id, patch);
      setCompanies((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [companyRepo],
  );

  const deleteCompany = useCallback(
    async (id: string) => {
      await companyRepo.delete(id);
      setCompanies((prev) => prev.filter((item) => item.id !== id));
      setAnalyses((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setIntelligence((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      const related = discoveriesRef.current
        .filter((discovery) => discovery.companyId === id)
        .map((discovery) => discovery.id);
      for (const discoveryId of related) {
        await discoveryRepo.delete(discoveryId);
      }
      setDiscoveries((prev) => prev.filter((discovery) => discovery.companyId !== id));
    },
    [companyRepo, discoveryRepo],
  );

  const discoverCompany = useCallback(
    async (form: ProspectCompanyForm, campaignId: string | null) =>
      runDiscovery(companiesRef.current, discoveriesRef.current, form, campaignId, {
        createCompany: async (companyForm) => {
          const company = await companyRepo.create(companyForm);
          setCompanies((prev) => [company, ...prev]);
          return company;
        },
        createDiscovery: async (discoveryForm) => {
          const discovery = await discoveryRepo.create(discoveryForm);
          setDiscoveries((prev) => [discovery, ...prev]);
          return discovery;
        },
      }),
    [companyRepo, discoveryRepo],
  );

  const addDiscovery = useCallback(
    async (form: ProspectDiscoveryForm) => {
      const item = await discoveryRepo.create(form);
      setDiscoveries((prev) => [item, ...prev]);
      return item;
    },
    [discoveryRepo],
  );

  const runCampaignDiscovery = useCallback(
    async (campaignId: string): Promise<AutomaticDiscoveryResponse> => {
      const response = await fetch("/api/autoprospect/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const payload = (await response.json().catch(() => null)) as AutomaticDiscoveryResponse | null;
      if (!response.ok || !payload?.ok) {
        const detail = payload?.detail || payload?.error || "Pesquisa não concluída.";
        throw new Error(detail);
      }
      const [companiesResult, discoveriesResult] = await Promise.all([
        companyRepo.findAll(),
        discoveryRepo.findAll(),
      ]);
      setCompanies(companiesResult);
      setDiscoveries(discoveriesResult);
      return payload;
    },
    [companyRepo, discoveryRepo],
  );

  const deleteDiscovery = useCallback(
    async (id: string) => {
      await discoveryRepo.delete(id);
      setDiscoveries((prev) => prev.filter((item) => item.id !== id));
    },
    [discoveryRepo],
  );

  const analyzeCompany = useCallback(
    async (companyId: string): Promise<CompanyAnalysisResult> => {
      const response = await fetch("/api/autoprospect/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok: boolean;
        enrichment?: EnrichmentOutcome | null;
        qualification?: QualificationAnalysis;
        intelligence?: IntelligenceApiResult;
        error?: string;
        detail?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.qualification) {
        const detail = payload?.detail || payload?.error || "Análise não concluída.";
        throw new Error(detail);
      }
      const result: CompanyAnalysisResult = {
        enrichment: payload.enrichment || null,
        qualification: payload.qualification,
        intelligence: payload.intelligence ? {
          id: payload.intelligence.id,
          companyId,
          enrichmentId: null,
          qualificationId: null,
          status: "Concluido",
          provider: payload.intelligence.aiProvider,
          model: payload.intelligence.aiModel,
          error: payload.intelligence.error,
          priority: payload.intelligence.priority,
          priorityReason: payload.intelligence.priorityReason,
          reasons: payload.intelligence.reasons,
          nextAction: payload.intelligence.nextAction,
          summary: payload.intelligence.summary,
          recommendedServices: payload.intelligence.recommendedServices as unknown[],
          aiConfidence: payload.intelligence.aiConfidence,
          scoreSnapshot: payload.intelligence.scoreSnapshot ?? 0,
          potentialSnapshot: payload.intelligence.potentialSnapshot ?? "",
          confidenceSnapshot: payload.intelligence.confidenceSnapshot ?? "",
          aiResponse: payload.intelligence.aiResponse as unknown,
          aiStatus: payload.intelligence.aiStatus,
          tokensIn: payload.intelligence.tokensIn,
          tokensOut: payload.intelligence.tokensOut,
          costEstimate: payload.intelligence.costEstimate,
          analysisVersion: payload.intelligence.analysisVersion,
          createdAt: payload.intelligence.createdAt,
        } : null,
      };
      setAnalyses((prev) => ({ ...prev, [companyId]: result }));
      if (result.intelligence) {
        setIntelligence((prev) => ({ ...prev, [companyId]: result.intelligence as CompanyIntelligenceRow }));
      }
      return result;
    },
    [],
  );

  // Reanálise da inteligência comercial usando dados já persistidos
  // (sem recolher o site — evita custos desnecessários).
  const reanalyzeIntelligence = useCallback(
    async (companyId: string): Promise<CompanyIntelligenceRow> => {
      const response = await fetch("/api/autoprospect/intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok: boolean;
        intelligence?: IntelligenceApiResult;
        error?: string;
        detail?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.intelligence) {
        const detail = payload?.detail || payload?.error || "Análise não concluída.";
        throw new Error(detail);
      }
      const row: CompanyIntelligenceRow = {
        id: payload.intelligence.id,
        companyId,
        enrichmentId: null,
        qualificationId: null,
        status: "Concluido",
        provider: payload.intelligence.aiProvider,
        model: payload.intelligence.aiModel,
        error: payload.intelligence.error,
        priority: payload.intelligence.priority,
        priorityReason: payload.intelligence.priorityReason,
        reasons: payload.intelligence.reasons,
        nextAction: payload.intelligence.nextAction,
        summary: payload.intelligence.summary,
        recommendedServices: payload.intelligence.recommendedServices as unknown[],
        aiConfidence: payload.intelligence.aiConfidence,
        scoreSnapshot: payload.intelligence.scoreSnapshot ?? 0,
        potentialSnapshot: payload.intelligence.potentialSnapshot ?? "",
        confidenceSnapshot: payload.intelligence.confidenceSnapshot ?? "",
        aiResponse: payload.intelligence.aiResponse as unknown,
        aiStatus: payload.intelligence.aiStatus,
        tokensIn: payload.intelligence.tokensIn,
        tokensOut: payload.intelligence.tokensOut,
        costEstimate: payload.intelligence.costEstimate,
        analysisVersion: payload.intelligence.analysisVersion,
        createdAt: payload.intelligence.createdAt,
      };
      setIntelligence((prev) => ({ ...prev, [companyId]: row }));
      return row;
    },
    [],
  );

  // ─── Oportunidade comercial (Etapa 6) ──────────────────────────
  // Fluxo manual: criar a partir da inteligência persistida, alterar
  // status e registrar interações. Nenhum envio automático.

  const createOpportunity = useCallback(
    async (companyId: string): Promise<OpportunityListItemRow> => {
      const response = await fetch("/api/autoprospect/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok: boolean;
        opportunity?: OpportunityListItemRow;
        error?: string;
        detail?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.detail || payload?.error || "Oportunidade não criada.");
      }
      if (!payload?.ok || !payload.opportunity) {
        throw new Error("Oportunidade não criada.");
      }
      setOpportunities((prev) => [payload.opportunity as OpportunityListItemRow, ...prev]);
      return payload.opportunity;
    },
    [],
  );

  const updateOpportunityStatus = useCallback(
    async (opportunityId: string, status: OpportunityStatus): Promise<void> => {
      const response = await fetch(`/api/autoprospect/opportunities/${opportunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok: boolean;
        opportunity?: OpportunityListItemRow;
        error?: string;
        detail?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.opportunity) {
        throw new Error(payload?.detail || payload?.error || "Status não alterado.");
      }
      setOpportunities((prev) =>
        prev.map((item) =>
          item.id === opportunityId ? (payload.opportunity as OpportunityListItemRow) : item,
        ),
      );
    },
    [],
  );

  const loadInteractions = useCallback(
    async (opportunityId: string): Promise<OpportunityInteractionRow[]> => {
      const response = await fetch(`/api/autoprospect/opportunities/${opportunityId}/interactions`);
      const payload = (await response.json().catch(() => null)) as {
        ok: boolean;
        interactions?: OpportunityInteractionRow[];
        error?: string;
      } | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Histórico não carregado.");
      }
      const rows = payload.interactions || [];
      setInteractions((prev) => ({ ...prev, [opportunityId]: rows }));
      return rows;
    },
    [],
  );

  const addInteraction = useCallback(
    async (opportunityId: string, form: OpportunityInteractionForm): Promise<OpportunityInteractionRow> => {
      const response = await fetch(`/api/autoprospect/opportunities/${opportunityId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok: boolean;
        interaction?: OpportunityInteractionRow;
        error?: string;
        detail?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.interaction) {
        throw new Error(payload?.detail || payload?.error || "Interação não registrada.");
      }
      setInteractions((prev) => ({
        ...prev,
        [opportunityId]: [
          payload.interaction as OpportunityInteractionRow,
          ...(prev[opportunityId] ?? []),
        ],
      }));
      return payload.interaction;
    },
    [],
  );

  // ─── Processamento em lote (Etapa 7) ───────────────────────────
  // Lote = fila persistida de empresas para processamento contínuo.
  // A execução é disparada manualmente (botão) e acompanhada por
  // polling do detalhe enquanto o lote não atinge estado terminal.

  const refreshBatchRuns = useCallback(async (): Promise<void> => {
    const response = await fetch("/api/autoprospect/batch", {
      headers: await batchRequestHeaders(),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok: boolean;
      runs?: BatchRunListItem[];
      error?: string;
    } | null;
    if (!response.ok || !payload?.ok || !Array.isArray(payload.runs)) {
      throw new Error(payload?.error || "Lote não carregado.");
    }
    setBatchRuns(payload.runs);
  }, []);

  const loadBatchDetail = useCallback(async (runId: string): Promise<BatchRunDetail | null> => {
    const response = await fetch(`/api/autoprospect/batch/${runId}`, {
      headers: await batchRequestHeaders(),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok: boolean;
      detail?: BatchRunDetail | string;
      error?: string;
    } | null;
    if (!response.ok || !payload?.ok || !payload.detail || typeof payload.detail === "string") {
      throw new Error(
        typeof payload?.detail === "string"
          ? payload.detail
          : payload?.error || "Lote não carregado.",
      );
    }
    setBatchDetail(payload.detail);
    return payload.detail;
  }, []);

  const stopBatchPolling = useCallback((): void => {
    if (batchPollRef.current !== null) {
      window.clearInterval(batchPollRef.current);
      batchPollRef.current = null;
    }
    setBatchPolling(false);
  }, []);

  const startBatchPolling = useCallback(
    (runId: string): void => {
      lastBatchIdRef.current = runId;
      setBatchPolling(true);
      if (batchPollRef.current !== null) {
        window.clearInterval(batchPollRef.current);
      }
      const tick = async (): Promise<void> => {
        const current = lastBatchIdRef.current;
        if (!current) return;
        const headers = await batchRequestHeaders().catch(() => null);
        if (!headers) return;
        const response = await fetch(`/api/autoprospect/batch/${current}`, { headers }).catch(() => null);
        const payload = response ? await response.json().catch(() => null) : null;
        if (!payload?.ok || !payload.detail) return;
        setBatchDetail(payload.detail as BatchRunDetail);
        refreshBatchRuns().catch(() => {});
        if (isTerminalBatchStatus((payload.detail as BatchRunDetail).run.status)) {
          stopBatchPolling();
        }
      };
      tick();
      batchPollRef.current = window.setInterval(tick, 4000);
    },
    [refreshBatchRuns, stopBatchPolling],
  );

  const createBatch = useCallback(
    async (campaignId: string, form?: { apenasSemInteligencia?: boolean; limiteMaximo?: number }): Promise<BatchRunListItem> => {
      const response = await fetch("/api/autoprospect/batch", {
        method: "POST",
        headers: await batchRequestHeaders(true),
        body: JSON.stringify({ campaignId, ...form }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok: boolean;
        run?: BatchRunListItem;
        error?: string;
        detail?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.run) {
        throw new Error(payload?.detail || payload?.error || "Lote não criado.");
      }
      setBatchRuns((prev) => [payload.run as BatchRunListItem, ...prev]);
      setBatchDetail(null);
      startBatchPolling(payload.run.id);
      return payload.run;
    },
    [startBatchPolling],
  );

  const processBatch = useCallback(
    async (runId: string): Promise<{ remaining: number }> => {
      const response = await fetch(`/api/autoprospect/batch/${runId}/process`, {
        method: "POST",
        headers: await batchRequestHeaders(),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok: boolean;
        remaining?: number;
        error?: string;
        detail?: string;
      } | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.detail || payload?.error || "Processamento não concluído.");
      }
      startBatchPolling(runId);
      refreshBatchRuns().catch(() => {});
      return { remaining: payload.remaining ?? 0 };
    },
    [refreshBatchRuns, startBatchPolling],
  );

  const runBatchAction = useCallback(
    async (action: "pause" | "resume" | "cancel", runId: string): Promise<void> => {
      const response = await fetch(`/api/autoprospect/batch/${runId}/${action}`, {
        method: "POST",
        headers: await batchRequestHeaders(),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok: boolean;
        run?: BatchRunListItem;
        error?: string;
        detail?: string;
      } | null;
      if (!response.ok || !payload?.ok || !payload.run) {
        throw new Error(payload?.detail || payload?.error || "Ação não executada.");
      }
      const updated = payload.run as BatchRunListItem;
      setBatchRuns((prev) => prev.map((run) => (run.id === runId ? updated : run)));
      setBatchDetail((prev) => (prev && prev.run.id === runId ? { ...prev, run: updated } : prev));
      if (action === "resume") {
        startBatchPolling(runId);
      }
      if (action === "cancel") {
        stopBatchPolling();
      }
    },
    [startBatchPolling, stopBatchPolling],
  );

  const retryBatchFailures = useCallback(
    async (runId: string): Promise<void> => {
      const response = await fetch(`/api/autoprospect/batch/${runId}/retry-failures`, {
        method: "POST",
        headers: await batchRequestHeaders(),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok: boolean;
        run?: BatchRunListItem;
        error?: string;
        detail?: string;
      } | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.detail || payload?.error || "Falhas não reenfileiradas.");
      }
      const newRun = payload.run as BatchRunListItem;
      setBatchRuns((prev) => [newRun, ...prev.filter((run) => run.id !== newRun.id)]);
      setBatchDetail(null);
      startBatchPolling(newRun.id);
    },
    [startBatchPolling],
  );

  return {
    campaigns,
    companies,
    discoveries,
    analyses,
    intelligence,
    opportunities,
    interactions,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    addCompany,
    updateCompany,
    deleteCompany,
    discoverCompany,
    addDiscovery,
    deleteDiscovery,
    runCampaignDiscovery,
    analyzeCompany,
    reanalyzeIntelligence,
    createOpportunity,
    updateOpportunityStatus,
    loadInteractions,
    addInteraction,
    batchRuns,
    batchDetail,
    batchPolling,
    refreshBatchRuns,
    loadBatchDetail,
    createBatch,
    processBatch,
    pauseBatch: (runId: string) => runBatchAction("pause", runId),
    resumeBatch: (runId: string) => runBatchAction("resume", runId),
    cancelBatch: (runId: string) => runBatchAction("cancel", runId),
    retryBatchFailures,
  };
}
