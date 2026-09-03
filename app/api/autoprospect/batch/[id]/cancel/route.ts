import { NextRequest, NextResponse } from "next/server";
import { cancelBatchRun, createBatchExecutorDepsForClient } from "@/lib/batch-executor";
import { requireBatchServerClient } from "@/lib/batch-server";
import { batchErrorResponse } from "@/lib/batch-http";
import { buildBatchRunListItem, type BatchRunListItem } from "@/domain/autoprospect/batch";

export const runtime = "nodejs";

export interface BatchActionResponse {
  ok: boolean;
  run?: BatchRunListItem;
  error?: string;
  detail?: string;
}

/**
 * POST — cancela o lote: pendentes viram `cancelada` (uma instrução),
 * contadores recalculados e run marcado como `cancelado`. Empresas em
 * voo terminam e o executor descarta o resultado.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const client = await requireBatchServerClient(request);
    const run = await cancelBatchRun(id, createBatchExecutorDepsForClient(client));
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

    return NextResponse.json({ ok: true, run: listItem });
  } catch (error) {
    return batchErrorResponse(error, "Ação não executada.");
  }
}
