import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  apCompanyFromSupabase,
  apEnrichmentFromSupabase,
  apEnrichmentToSupabase,
  apEvidenceToSupabase,
  apIntelligenceFromSupabase,
  apIntelligenceToSupabase,
  apQualificationFromSupabase,
  apQualificationToSupabase,
} from "@/lib/repository-mappers";
import {
  createEnrichmentProvider,
  type EnrichmentOutcome,
} from "@/domain/autoprospect/enrichment";
import {
  buildQualification,
  createAiAnalysisProvider,
  withAiExplanation,
  type QualificationAnalysis,
} from "@/domain/autoprospect/qualification";
import {
  createCommercialIntelligenceProvider,
  runCommercialIntelligence,
  type IntelligenceAnalysis,
} from "@/domain/autoprospect/intelligence";

export const runtime = "nodejs";

const runningLocks = new Map<string, boolean>();

export interface AnalyzeResponse {
  ok: boolean;
  enrichment?: EnrichmentOutcome;
  qualification?: QualificationAnalysis;
  intelligence?: IntelligenceAnalysis;
  error?: string;
  detail?: string;
}

function friendlyEnrichmentReason(reason: string): string {
  return reason || "Enriquecimento indisponível.";
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
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

    // 1. Enriquecimento (site oficial; limites de coleta aplicados no provider)
    const enrichmentProvider = createEnrichmentProvider("website");
    const enrichment = await enrichmentProvider.enrich(company);

    const { data: enrichmentInsert, error: enrichmentError } = await supabase
      .from("ap_enrichments")
      .insert(
        apEnrichmentToSupabase({
          companyId: company.id,
          status: enrichment.status === "ok" ? "Concluido" : enrichment.status === "unavailable" ? "Indisponivel" : "Erro",
          sourceUrl: enrichment.sourceUrl,
          fetchedPages: enrichment.fetchedPages,
          title: enrichment.title,
          description: enrichment.description,
          reason: enrichment.reason,
        }),
      )
      .select()
      .single();
    if (enrichmentError) throw enrichmentError;
    const enrichmentRow = apEnrichmentFromSupabase(enrichmentInsert as Record<string, unknown>);

    // Evidências: cada fato/sinal com origem (URL + data)
    if (enrichment.status === "ok") {
      const evidences = [
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
      ];
      for (const evidence of evidences) {
        const { error: evidenceError } = await supabase
          .from("ap_enrichment_evidences")
          .insert(apEvidenceToSupabase({ ...evidence, enrichmentId: enrichmentRow.id }));
        if (evidenceError) throw evidenceError;
      }
    }

    // 2. Qualificação: regras determinísticas + IA como apoio (opcional)
    const aiProvider = createAiAnalysisProvider();
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

    const { data: qualificationInsert, error: qualificationError } = await supabase
      .from("ap_qualifications")
      .insert(
        apQualificationToSupabase({
          companyId: company.id,
          enrichmentId: enrichmentRow.id,
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
      )
      .select()
      .single();
    if (qualificationError) throw qualificationError;
    const qualificationRow = apQualificationFromSupabase(qualificationInsert as Record<string, unknown>);

    // 3. Inteligência comercial: interpretação + priorização sobre os dados
    //    coletados (determinística sempre; IA opcional como camada).
    const intelligence = await runCommercialIntelligence(
      {
        company,
        enrichment,
        qualification: finalAnalysis,
      },
      { provider: createCommercialIntelligenceProvider() },
    );

    const { data: intelligenceInsert, error: intelligenceError } = await supabase
      .from("ap_intelligence")
      .insert(
        apIntelligenceToSupabase({
          companyId: company.id,
          enrichmentId: enrichmentRow.id,
          qualificationId: qualificationRow.id,
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
      )
      .select()
      .single();
    if (intelligenceError) throw intelligenceError;
    const intelligenceRow = apIntelligenceFromSupabase(intelligenceInsert as Record<string, unknown>);

    return NextResponse.json({
      ok: true,
      enrichment: {
        ...enrichment,
        reason: enrichment.status === "unavailable" ? friendlyEnrichmentReason(enrichment.reason) : "",
      },
      qualification: {
        ...finalAnalysis,
        aiProvider: qualificationRow.aiProvider,
        aiModel: qualificationRow.aiModel,
        aiStatus: qualificationRow.aiStatus as QualificationAnalysis["aiStatus"],
      },
      intelligence: {
        ...intelligence,
        id: intelligenceRow.id,
        createdAt: intelligenceRow.createdAt,
        scoreSnapshot: finalAnalysis.score,
        potentialSnapshot: finalAnalysis.potential,
        confidenceSnapshot: finalAnalysis.confidence,
      },
    });
  } catch (error) {
    console.error("[Auto Prospect] Falha na análise da empresa:", error);
    return NextResponse.json(
      { ok: false, error: "Análise não concluída.", detail: "Não foi possível analisar a empresa no momento. Tente novamente." },
      { status: 502 },
    );
  } finally {
    runningLocks.delete(companyId);
  }
}
