import { NextRequest, NextResponse } from "next/server";
import { createBatchExecutorDepsForClient, retryBatchFailures } from "@/lib/batch-executor";
import { requireBatchServerClient } from "@/lib/batch-server";
import { batchErrorResponse } from "@/lib/batch-http";
import { buildBatchRunListItem, type BatchRunListItem } from "@/domain/autoprospect/batch";

export const runtime = "nodejs";

export interface BatchRetryFailuresResponse {
  ok: boolean;
  run?: BatchRunListItem;
  total?: number;
  error?: string;
  detail?: string;
}

/**
 * POST — reprocessa as empresas que falharam (status `falha`) do run
 * informado. Cria um NOVO run de continuação (histórico preservado —
 * o run original permanece imutável) e devolve 201 com o novo run.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const client = await requireBatchServerClient(request);
    const { run, total } = await retryBatchFailures(
      id,
      createBatchExecutorDepsForClient(client),
    );
    const { data: campaign } = await client
      .from("ap_campaigns")
      .select("name")
      .eq("id", run.campaignId)
      .maybeSingle();

    const listItem = buildBatchRunListItem({
      id: run.id,
      campaignId: run.campaignId,
      campaignName: (campaign?.name as string) || "",
      status: run.status,
      filters: run.filters,
      total: run.total,
      pending: run.pending,
      processing: run.processing,
      completed: run.completed,
      failed: run.failed,
      withoutData: run.withoutData,
      cancelled: run.cancelled,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      createdAt: run.createdAt,
    });

    return NextResponse.json({ ok: true, run: listItem, total }, { status: 201 });
  } catch (error) {
    return batchErrorResponse(error, "Falhas não reenfileiradas.");
  }
}
