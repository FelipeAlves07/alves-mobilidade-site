import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  apIntelligenceFromSupabase,
  apOpportunityListItemFromSupabase,
  apOpportunityToSupabase,
  type OpportunityListItemRow,
} from "@/lib/repository-mappers";
import {
  buildOpportunitySnapshot,
  isActiveOpportunityStatus,
  validateOpportunityCreation,
} from "@/domain/autoprospect/opportunity";

export const runtime = "nodejs";

const creatingLocks = new Map<string, boolean>();

export interface OpportunitiesResponse {
  ok: boolean;
  opportunities?: OpportunityListItemRow[];
  opportunity?: OpportunityListItemRow;
  error?: string;
  detail?: string;
}

const COMPANY_FIELDS =
  "name, segment, city, state, phone, whatsapp, email, website, instagram, linkedin";

/**
 * GET — lista oportunidades com os dados da empresa (join).
 * POST — cria oportunidade a partir da empresa já qualificada/inteligência
 *        persistida (NUNCA executa IA e NUNCA cria empresa duplicada).
 *        Apenas com snapshot da inteligência; 1 oportunidade ativa por empresa.
 */
export async function GET(): Promise<NextResponse<OpportunitiesResponse>> {
  try {
    const { data, error } = await supabase
      .from("ap_opportunities")
      .select(`*, ap_companies(${COMPANY_FIELDS})`)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const opportunities = (data || []).map((row) =>
      apOpportunityListItemFromSupabase(row as Record<string, unknown>),
    );
    return NextResponse.json({ ok: true, opportunities });
  } catch (error) {
    console.error("[Auto Prospect] Falha ao listar oportunidades:", error);
    return NextResponse.json(
      { ok: false, error: "Lista não carregada.", detail: "Não foi possível carregar as oportunidades no momento. Tente novamente." },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<OpportunitiesResponse>> {
  const body = await request.json().catch(() => null);
  const companyId = typeof body?.companyId === "string" ? body.companyId : "";

  if (!companyId) {
    return NextResponse.json(
      { ok: false, error: "Oportunidade não criada.", detail: "ID da empresa é obrigatório." },
      { status: 400 },
    );
  }

  if (creatingLocks.get(companyId)) {
    return NextResponse.json(
      { ok: false, error: "Oportunidade não criada.", detail: "Já existe uma criação de oportunidade em andamento para esta empresa." },
      { status: 409 },
    );
  }
  creatingLocks.set(companyId, true);

  try {
    const { data: companyRow, error: companyError } = await supabase
      .from("ap_companies")
      .select("*")
      .eq("id", companyId)
      .maybeSingle();
    if (companyError) throw companyError;
    if (!companyRow) {
      return NextResponse.json(
        { ok: false, error: "Oportunidade não criada.", detail: "Empresa não encontrada." },
        { status: 404 },
      );
    }

    const { data: intelligenceRow, error: intelligenceError } = await supabase
      .from("ap_intelligence")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (intelligenceError) throw intelligenceError;

    const { data: activeRow, error: activeError } = await supabase
      .from("ap_opportunities")
      .select("id, status")
      .eq("company_id", companyId)
      .limit(50);
    if (activeError) throw activeError;
    const hasActive = (activeRow || []).some((r) =>
      isActiveOpportunityStatus(r.status),
    );

    const validation = validateOpportunityCreation({
      hasIntelligence: !!intelligenceRow,
      hasActiveOpportunity: hasActive,
    });
    if (!validation.ok) {
      const status = validation.code === "ja_existe_ativa" ? 409 : 409;
      return NextResponse.json(
        { ok: false, error: "Oportunidade não criada.", detail: validation.detail },
        { status },
      );
    }

    const intelligence = apIntelligenceFromSupabase(intelligenceRow as Record<string, unknown>);
    const snapshot = buildOpportunitySnapshot(intelligence);

    const { data: insert, error: insertError } = await supabase
      .from("ap_opportunities")
      .insert(
        apOpportunityToSupabase({
          companyId,
          intelligenceId: intelligence.id,
          qualificationId: intelligence.qualificationId,
          status: "Nova",
          ...snapshot,
        }),
      )
      .select(`*, ap_companies(${COMPANY_FIELDS})`)
      .single();
    if (insertError) {
      if (String(insertError.message).toLowerCase().includes("idx_ap_opportunities_one_active")) {
        return NextResponse.json(
          { ok: false, error: "Oportunidade não criada.", detail: "Esta empresa já possui uma oportunidade em andamento." },
          { status: 409 },
        );
      }
      throw insertError;
    }
    const stored = apOpportunityListItemFromSupabase(insert as Record<string, unknown>);

    return NextResponse.json({
      ok: true,
      opportunity: stored,
      opportunities: [stored],
    });
  } catch (error) {
    console.error("[Auto Prospect] Falha ao criar oportunidade:", error);
    return NextResponse.json(
      { ok: false, error: "Oportunidade não criada.", detail: "Não foi possível criar a oportunidade no momento. Tente novamente." },
      { status: 502 },
    );
  } finally {
    creatingLocks.delete(companyId);
  }
}