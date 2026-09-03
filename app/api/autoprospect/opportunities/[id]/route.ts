import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  apInteractionFromSupabase,
  apOpportunityListItemFromSupabase,
  apOpportunityPatchToSupabase,
  type OpportunityInteractionRow,
  type OpportunityListItemRow,
} from "@/lib/repository-mappers";
import { isOpportunityStatus } from "@/domain/autoprospect/opportunity";

export const runtime = "nodejs";

const COMPANY_FIELDS =
  "name, segment, city, state, phone, whatsapp, email, website, instagram, linkedin";

export interface OpportunityDetailResponse {
  ok: boolean;
  opportunity?: OpportunityListItemRow;
  interactions?: OpportunityInteractionRow[];
  error?: string;
  detail?: string;
}

/**
 * GET — detalhe da oportunidade (empresa + histórico de interações).
 * PATCH — altera apenas o status comercial da oportunidade.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<OpportunityDetailResponse>> {
  const { id } = await params;
  try {
    const { data: row, error } = await supabase
      .from("ap_opportunities")
      .select(`*, ap_companies(${COMPANY_FIELDS})`)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Oportunidade não encontrada.", detail: "Esta oportunidade não existe ou foi removida." },
        { status: 404 },
      );
    }
    const opportunity = apOpportunityListItemFromSupabase(row as Record<string, unknown>);

    const { data: interactions, error: interactionsError } = await supabase
      .from("ap_opportunity_interactions")
      .select("*")
      .eq("opportunity_id", id)
      .order("occurred_at", { ascending: false });
    if (interactionsError) throw interactionsError;

    return NextResponse.json({
      ok: true,
      opportunity,
      interactions: (interactions || []).map((item) =>
        apInteractionFromSupabase(item as Record<string, unknown>),
      ),
    });
  } catch (error) {
    console.error("[Auto Prospect] Falha ao carregar oportunidade:", error);
    return NextResponse.json(
      { ok: false, error: "Oportunidade não encontrada.", detail: "Não foi possível carregar a oportunidade no momento. Tente novamente." },
      { status: 502 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<OpportunityDetailResponse>> {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = typeof body?.status === "string" ? body.status : "";

  if (!isOpportunityStatus(status)) {
    return NextResponse.json(
      { ok: false, error: "Status não alterado.", detail: "Status comercial inválido." },
      { status: 400 },
    );
  }

  try {
    const { data: existing, error: existingError } = await supabase
      .from("ap_opportunities")
      .select("company_id")
      .eq("id", id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Status não alterado.", detail: "Oportunidade não encontrada." },
        { status: 404 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("ap_opportunities")
      .update(apOpportunityPatchToSupabase({ status }))
      .eq("id", id)
      .select(`*, ap_companies(${COMPANY_FIELDS})`)
      .single();
    if (updateError) {
      if (String(updateError.message).toLowerCase().includes("idx_ap_opportunities_one_active")) {
        return NextResponse.json(
          { ok: false, error: "Status não alterado.", detail: "Esta empresa já possui outra oportunidade em andamento." },
          { status: 409 },
        );
      }
      throw updateError;
    }
    const opportunity = apOpportunityListItemFromSupabase(updated as Record<string, unknown>);

    return NextResponse.json({ ok: true, opportunity });
  } catch (error) {
    console.error("[Auto Prospect] Falha ao alterar status:", error);
    return NextResponse.json(
      { ok: false, error: "Status não alterado.", detail: "Não foi possível alterar o status no momento. Tente novamente." },
      { status: 502 },
    );
  }
}