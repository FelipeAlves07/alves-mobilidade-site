import { NextRequest, NextResponse } from "next/server";
import { createBatchExecutorDepsForClient, processChunk } from "@/lib/batch-executor";
import { requireBatchServerClient } from "@/lib/batch-server";
import { batchErrorResponse } from "@/lib/batch-http";
import { buildBatchRunListItem, type BatchRunListItem } from "@/domain/autoprospect/batch";

export const runtime = "nodejs";

export interface BatchProcessResponse {
  ok: boolean;
  processed?: number;
  remaining?: number;
  run?: BatchRunListItem;
  summary?: {
    success: number;
    failed: number;
    withoutData: number;
  };
  error?: string;
  detail?: string;
}

/**
 * POST — executa um chunk do lote: claim atômico (RPC
 * `ap_batch_claim_next`, SKIP LOCKED) + pipeline existente por empresa
 * (enriquecimento → qualificação → inteligência). O chunk roda até
 * N empresas OU até a janela de tempo (BATCH_CONFIG), o que vier primeiro.
 * Retorna o estado incremental do run (contadores/status) para o polling.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const client = await requireBatchServerClient(request);
    const result = await processChunk(id, {}, createBatchExecutorDepsForClient(client));
    const summary = { success: 0, failed: 0, withoutData: 0 };
    for (const outcome of result.processed) {
      if (outcome.status === "concluida") summary.success++;
      else if (outcome.status === "falha") summary.failed++;
      else if (outcome.status === "sem_dados") summary.withoutData++;
    }

    let run: BatchRunListItem | undefined;
    if (result.run) {
      const { data: campaign } = await client
        .from("ap_campaigns")
        .select("name")
        .eq("id", result.run.campaignId)
        .maybeSingle();
      run = buildBatchRunListItem({
        id: result.run.id,
        campaignId: result.run.campaignId,
        campaignName: (campaign?.name as string) || "",
        status: result.run.status,
        filters: result.run.filters,
        total: result.run.total,
        pending: result.run.pending,
        processing: result.run.processing,
        completed: result.run.completed,
        failed: result.run.failed,
        withoutData: result.run.withoutData,
        cancelled: result.run.cancelled,
        startedAt: result.run.startedAt,
        finishedAt: result.run.finishedAt,
        createdAt: result.run.createdAt,
      });
    }

    return NextResponse.json({
      ok: true,
      processed: result.processed.length,
      remaining: result.remaining,
      run,
      summary,
    });
  } catch (error) {
    return batchErrorResponse(error, "Processamento não concluído.");
  }
}
