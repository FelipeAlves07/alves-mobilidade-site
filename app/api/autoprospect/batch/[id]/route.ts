import { NextRequest, NextResponse } from "next/server";
import { requireBatchServerClient } from "@/lib/batch-server";
import {
  buildBatchRunListItem,
  type BatchRunDetail,
  type BatchRunDetailItem,
} from "@/domain/autoprospect/batch";

export const runtime = "nodejs";

export interface BatchDetailResponse {
  ok: boolean;
  detail?: BatchRunDetail | string;
  error?: string;
}

/**
 * GET — estado detalhado do lote: contadores, prioridades 1-4 da
 * inteligência do run, uso de IA e os últimos itens (empresa + estado).
 * Requer sessão de operador (service_role via bearer).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const client = await requireBatchServerClient(request);
    const { data: row, error } = await client
      .from("ap_batch_runs")
      .select("*, ap_campaigns(name)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Lote não carregado.", detail: "Processamento não encontrado." },
        { status: 404 },
      );
    }

    const base = row as Record<string, unknown>;
    const campaign = (base.ap_campaigns ?? {}) as Record<string, unknown>;
    const run = buildBatchRunListItem({
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

    const [itemsResult, priorityResult, aiResult] = await Promise.all([
      client
        .from("ap_batch_company_runs")
        .select("*, ap_companies(name, segment, city, state)")
        .eq("batch_run_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
      client
        .from("ap_intelligence")
        .select("priority")
        .eq("batch_run_id", id),
      client
        .from("ap_intelligence")
        .select("ai_status")
        .eq("batch_run_id", id),
    ]);
    if (itemsResult.error) throw itemsResult.error;
    if (priorityResult.error) throw priorityResult.error;
    if (aiResult.error) throw aiResult.error;

    const items: BatchRunDetailItem[] = (itemsResult.data || []).map((item) => {
      const rowItem = item as Record<string, unknown>;
      const company = (rowItem.ap_companies ?? {}) as Record<string, unknown>;
      return {
        companyId: rowItem.company_id as string,
        companyName: (company.name as string) || "Empresa removida",
        status: (rowItem.status as BatchRunDetailItem["status"]) || "pendente",
        errorCode: (rowItem.error_code as string) || "",
        errorMessage: (rowItem.error_message as string) || "",
        retryCount: Number(rowItem.retry_count || 0),
        updatedAt: (rowItem.updated_at as string) || "",
      };
    });

    const priorityCounts: Record<string, number> = {};
    for (const rowItem of priorityResult.data || []) {
      const key = String((rowItem as Record<string, unknown>).priority ?? "");
      priorityCounts[key] = (priorityCounts[key] || 0) + 1;
    }
    const aiStatusCounts: Record<string, number> = {};
    for (const rowItem of aiResult.data || []) {
      const key = String((rowItem as Record<string, unknown>).ai_status ?? "");
      aiStatusCounts[key] = (aiStatusCounts[key] || 0) + 1;
    }

    return NextResponse.json({ ok: true, detail: { run, items, priorityCounts, aiStatusCounts } });
  } catch (error) {
    console.error("[Auto Prospect] Falha ao carregar lote:", error);
    return NextResponse.json(
      { ok: false, error: "Lote não carregado.", detail: "Não foi possível carregar o processamento no momento. Tente novamente." },
      { status: 502 },
    );
  }
}
