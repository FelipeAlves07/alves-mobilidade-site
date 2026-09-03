import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  apInteractionFromSupabase,
  apInteractionToSupabase,
  type OpportunityInteractionRow,
} from "@/lib/repository-mappers";
import { normalizeInteractionForm } from "@/domain/autoprospect/opportunity";

export const runtime = "nodejs";

export interface InteractionsResponse {
  ok: boolean;
  interactions?: OpportunityInteractionRow[];
  interaction?: OpportunityInteractionRow;
  error?: string;
  detail?: string;
}

/**
 * GET — histórico de interações da oportunidade (mais recente primeiro).
 * POST — registra manualmente uma interação de abordagem.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<InteractionsResponse>> {
  const { id } = await params;
  try {
    const { data: rows, error } = await supabase
      .from("ap_opportunity_interactions")
      .select("*")
      .eq("opportunity_id", id)
      .order("occurred_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({
      ok: true,
      interactions: (rows || []).map((row) =>
        apInteractionFromSupabase(row as Record<string, unknown>),
      ),
    });
  } catch (error) {
    console.error("[Auto Prospect] Falha ao carregar interações:", error);
    return NextResponse.json(
      { ok: false, error: "Histórico não carregado.", detail: "Não foi possível carregar o histórico no momento. Tente novamente." },
      { status: 502 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<InteractionsResponse>> {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const normalized = normalizeInteractionForm({
    channel: typeof body?.channel === "string" ? body.channel : "",
    result: typeof body?.result === "string" ? body.result : "",
    note: typeof body?.note === "string" ? body.note : "",
    occurredAt: typeof body?.occurredAt === "string" ? body.occurredAt : undefined,
  });
  if ("error" in normalized) {
    return NextResponse.json(
      { ok: false, error: "Interação não registrada.", detail: normalized.error },
      { status: 400 },
    );
  }

  try {
    const { data: opportunity, error: opportunityError } = await supabase
      .from("ap_opportunities")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (opportunityError) throw opportunityError;
    if (!opportunity) {
      return NextResponse.json(
        { ok: false, error: "Interação não registrada.", detail: "Oportunidade não encontrada." },
        { status: 404 },
      );
    }

    const { data: insert, error: insertError } = await supabase
      .from("ap_opportunity_interactions")
      .insert(apInteractionToSupabase({ opportunityId: id, ...normalized }))
      .select()
      .single();
    if (insertError) throw insertError;
    const interaction = apInteractionFromSupabase(insert as Record<string, unknown>);

    return NextResponse.json({ ok: true, interaction });
  } catch (error) {
    console.error("[Auto Prospect] Falha ao registrar interação:", error);
    return NextResponse.json(
      { ok: false, error: "Interação não registrada.", detail: "Não foi possível registrar a interação no momento. Tente novamente." },
      { status: 502 },
    );
  }
}