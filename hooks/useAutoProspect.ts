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

export function useAutoProspect() {
  const [campaigns, setCampaigns] = useState<AutoProspectCampaign[]>([]);
  const [companies, setCompanies] = useState<ProspectCompany[]>([]);
  const [discoveries, setDiscoveries] = useState<ProspectDiscovery[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, CompanyAnalysisResult>>({});
  const [intelligence, setIntelligence] = useState<Record<string, CompanyIntelligenceRow>>({});

  const companiesRef = useRef<ProspectCompany[]>([]);
  const discoveriesRef = useRef<ProspectDiscovery[]>([]);

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
  }, [campaignRepo, companyRepo, discoveryRepo, qualificationRepo, intelligenceRepo]);

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

  return {
    campaigns,
    companies,
    discoveries,
    analyses,
    intelligence,
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
  };
}
