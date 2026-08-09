import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  apCompanyFromSupabase,
  apEnrichmentFromSupabase,
  apIntelligenceFromSupabase,
  apIntelligenceToSupabase,
  apQualificationFromSupabase,
} from "@/lib/repository-mappers";
import { createCommercialIntelligenceProvider, runCommercialIntelligence } from "@/domain/autoprospect/intelligence";
import type { IntelligenceAnalysis } from "@/domain/autoprospect/intelligence";
import type { QualificationAnalysis } from "@/domain/autoprospect/qualification";
import type { EnrichmentOutcome, SignalCategory } from "@/domain/autoprospect/enrichment";

export const runtime = "nodejs";

const runningLocks = new Map<string, boolean>();

export interface IntelligenceResponse {
  ok: boolean;
  intelligence?: IntelligenceAnalysis;
  error?: string;
  detail?: string;
}

function signalCategoryFromLabel(label: string): SignalCategory {
  const normalized = label.toLowerCase();
  if (normalized.includes("evento corporativo")) return "eventos_corporativos";
  if (normalized.includes("evento")) return "eventos_sociais";
  if (normalized.includes("turismo") || normalized.includes("hospedagem")) return "turismo_hospedagem";
  if (normalized.includes("viagem") || normalized.includes("deslocamento")) return "viagens";
  if (normalized.includes("executivos")) return "executivos";
  if (normalized.includes("empresa") || normalized.includes("b2b")) return "atendimento_empresarial";
  return "executivos";
}

/**
 * Reanálise de inteligência comercial usando os dados PERSISTIDOS mais
 * recentes (empresa + enriquecimento + evidências + qualificação).
 * NÃO recolhe o site novamente — evita custos desnecessários.
 * Preserva histórico (nova linha a cada execução).
 */
export async function POST(request: NextRequest): Promise<NextResponse<IntelligenceResponse>> {
  const body = await request.json().catch(() => null);
  const companyId = typeof body?.companyId === "string" ? body.companyId : "";

  if (!companyId) {
    return NextResponse.json(
      { ok: false, error: "Análise não concluída.", detail: "ID da empresa é obrigatório." },
      { status: 400 },
    );
  }

  if (runningLocks.get(companyId)) {
    return NextResponse.json(
      { ok: false, error: "Análise não concluída.", detail: "Já existe uma análise em andamento para esta empresa." },
      { status: 409 },
    );
  }
  runningLocks.set(companyId, true);

  try {
    const { data: companyRow, error: companyError } = await supabase
      .from("ap_companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();
    if (companyError) throw companyError;
    if (!companyRow) {
      return NextResponse.json(
        { ok: false, error: "Análise não concluída.", detail: "Empresa não encontrada." },
        { status: 404 },
      );
    }
    const company = apCompanyFromSupabase(companyRow as Record<string, unknown>);

    // Enriquecimento e qualificação mais recentes (nada é recolhido agora)
    const { data: enrichmentRow, error: enrichmentError } = await supabase
      .from("ap_enrichments")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (enrichmentError) throw enrichmentError;

    const { data: qualificationRow, error: qualificationError } = await supabase
      .from("ap_qualifications")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (qualificationError) throw qualificationError;
    if (!qualificationRow) {
      return NextResponse.json(
        {
          ok: false,
          error: "Análise não concluída.",
          detail: "Esta empresa ainda não foi qualificada. Execute primeiro a análise completa.",
        },
        { status: 409 },
      );
    }

    const enrichment = enrichmentRow ? apEnrichmentFromSupabase(enrichmentRow as Record<string, unknown>) : null;
    const qualification = apQualificationFromSupabase(qualificationRow as Record<string, unknown>);

    // Sinais = evidências persistidas (origem obrigatória)
    const { data: evidenceRows, error: evidenceError } = await supabase
      .from("ap_enrichment_evidences")
      .select("*")
      .eq("enrichment_id", enrichment?.id ?? "")
      .eq("kind", "sinal");
    if (evidenceError) throw evidenceError;

    const signals: EnrichmentOutcome["signals"] = (evidenceRows || []).map((evidence) => ({
      category: signalCategoryFromLabel(String(evidence.label || "")),
      label: String(evidence.label || ""),
      snippet: String(evidence.text || "").slice(0, 240),
      sourceUrl: String(evidence.source_url || ""),
    }));

    const enrichmentOutcome: EnrichmentOutcome | null = enrichment
      ? {
          status: enrichment.status === "Concluido" ? "ok" : enrichment.status === "Indisponivel" ? "unavailable" : "error",
          sourceUrl: enrichment.sourceUrl,
          fetchedPages: enrichment.fetchedPages,
          title: enrichment.title,
          description: enrichment.description,
          signals,
          reason: enrichment.reason,
          collectedAt: enrichment.collectedAt,
        }
      : null;

    const qualificationAnalysis: QualificationAnalysis = {
      score: qualification.score,
      potential: qualification.potential as QualificationAnalysis["potential"],
      confidence: qualification.confidence as QualificationAnalysis["confidence"],
      confidenceReason: qualification.confidenceReason,
      summary: qualification.summary,
      opportunityReason: qualification.opportunityReason,
      facts: (qualification.facts as QualificationAnalysis["facts"]) ?? [],
      inferences: (qualification.inferences as QualificationAnalysis["inferences"]) ?? [],
      possibleServices: qualification.possibleServices,
      recommendation: qualification.recommendation as QualificationAnalysis["recommendation"],
      recommendationText: qualification.recommendationText,
      breakdown: (qualification.scoreBreakdown as QualificationAnalysis["breakdown"]) ?? [],
      aiProvider: qualification.aiProvider,
      aiModel: qualification.aiModel,
      aiStatus: qualification.aiStatus as QualificationAnalysis["aiStatus"],
    };

    const intelligence = await runCommercialIntelligence(
      {
        company,
        enrichment: enrichmentOutcome,
        qualification: qualificationAnalysis,
      },
      { provider: createCommercialIntelligenceProvider() },
    );

    const { data: insert, error: insertError } = await supabase
      .from("ap_intelligence")
      .insert(
        apIntelligenceToSupabase({
          companyId: company.id,
          enrichmentId: enrichment?.id ?? null,
          qualificationId: qualification.id,
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
          scoreSnapshot: qualification.score,
          potentialSnapshot: qualification.potential,
          confidenceSnapshot: qualification.confidence,
          aiResponse: intelligence.aiResponse as unknown,
          aiStatus: intelligence.aiStatus,
          tokensIn: intelligence.tokensIn,
          tokensOut: intelligence.tokensOut,
          costEstimate: intelligence.costEstimate,
          analysisVersion: intelligence.analysisVersion,
        }),
      )
      .select()
      .single();
    if (insertError) throw insertError;
    const stored = apIntelligenceFromSupabase(insert as Record<string, unknown>);

    return NextResponse.json({
      ok: true,
      intelligence: {
        ...intelligence,
        id: stored.id,
        createdAt: stored.createdAt,
        scoreSnapshot: qualification.score,
        potentialSnapshot: qualification.potential,
        confidenceSnapshot: qualification.confidence,
      },
    });
  } catch (error) {
    console.error("[Auto Prospect] Falha na inteligência comercial:", error);
    return NextResponse.json(
      { ok: false, error: "Análise não concluída.", detail: "Não foi possível analisar a oportunidade no momento. Tente novamente." },
      { status: 502 },
    );
  } finally {
    runningLocks.delete(companyId);
  }
}
