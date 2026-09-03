import { NextRequest, NextResponse } from "next/server";
import { createBatchExecutorDepsForClient, createBatchRun } from "@/lib/batch-executor";
import { requireBatchServerClient } from "@/lib/batch-server";
import { batchErrorResponse } from "@/lib/batch-http";
import { buildBatchRunListItem, type BatchRunListItem } from "@/domain/autoprospect/batch";

export const runtime = "nodejs";

export interface BatchCreateResponse {
  ok: boolean;
  run?: BatchRunListItem;
  total?: number;
  error?: string;
  detail?: string;
}

export interface BatchListResponse {
  ok: boolean;
  runs?: BatchRunListItem[];
  error?: string;
}

/**
 * POST — cria um lote para a campanha (fila persistida de empresas).
 * GET — lista os lotes mais recentes (com nome da campanha).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId : "";

  if (!campaignId) {
    return NextResponse.json(
      { ok: false, error: "Lote não criado.", detail: "ID da campanha é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const client = await requireBatchServerClient(request);
    const { data: campaign, error: campaignError } = await client
      .from("ap_campaigns")
      .select("id")
      .eq("id", campaignId)
      .maybeSingle();
    if (campaignError) throw campaignError;
    if (!campaign) {
      return NextResponse.json(
        { ok: false, error: "Lote não criado.", detail: "Campanha não encontrada." },
        { status: 404 },
      );
    }

    const { run, total } = await createBatchRun(
      campaignId,
      body,
      createBatchExecutorDepsForClient(client),
    );
    const { data: campaignNameRow } = await client
      .from("ap_campaigns")
      .select("name")
      .eq("id", campaignId)
      .maybeSingle();

    return NextResponse.json(
      {
        ok: true,
        total,
        run: buildBatchRunListItem({
          id: run.id,
          campaignId: run.campaignId,
          campaignName: (campaignNameRow?.name as string) || "",
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
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return batchErrorResponse(error, "Lote não criado.");
  }
}

export async function GET(
  request: NextRequest,
) {
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 20) || 20, 50);

  try {
    const client = await requireBatchServerClient(request);
    const { data, error } = await client
      .from("ap_batch_runs")
      .select("*, ap_campaigns(name)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    const runs: BatchRunListItem[] = (data || []).map((row) => {
      const base = row as Record<string, unknown>;
      const campaign = (base.ap_campaigns ?? {}) as Record<string, unknown>;
      return buildBatchRunListItem({
        id: base.id as string,
        campaignId: base.campaign_id as string,
        campaignName: (campaign.name as string) || "",
        status: (base.status as string) || "pendente",
        filters: base.filters,
        total: Number(base.total || 0),
        pending: Number(base.pending || 0),
        processing: Number(base.processing || 0),
        completed: Number(base.completed || 0),
        failed: Number(base.failed || 0),
        withoutData: Number(base.without_data || 0),
        cancelled: Number(base.cancelled || 0),
        startedAt: (base.started_at as string) || null,
        finishedAt: (base.finished_at as string) || null,
        createdAt: (base.created_at as string) || "",
      });
    });

    return NextResponse.json({ ok: true, runs });
  } catch (error) {
    console.error("[Auto Prospect] Falha ao listar lotes:", error);
    return NextResponse.json(
      { ok: false, error: "Lote não carregado.", detail: "Não foi possível listar os processamentos no momento. Tente novamente." },
      { status: 502 },
    );
  }
}
