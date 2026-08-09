import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  apCampaignFromSupabase,
  apCompanyFromSupabase,
  apCompanyFormToSupabase,
  apDiscoveryFromSupabase,
  apDiscoveryFormToSupabase,
} from "@/lib/repository-mappers";
import {
  createDiscoveryProvider,
  DiscoveryProviderError,
  parseCriteriaFromCampaign,
  runAutomaticDiscovery,
  type AutomaticDiscoveryResponse,
} from "@/domain/autoprospect/discovery";

export const runtime = "nodejs";

const runningLocks = new Map<string, boolean>();

export async function POST(request: NextRequest): Promise<NextResponse<AutomaticDiscoveryResponse>> {
  const body = await request.json().catch(() => null);
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId : "";

  if (!campaignId) {
    return NextResponse.json(
      { ok: false, error: "Pesquisa não concluída.", detail: "ID da campanha é obrigatório." },
      { status: 400 },
    );
  }

  if (runningLocks.get(campaignId)) {
    return NextResponse.json(
      { ok: false, error: "Pesquisa não concluída.", detail: "Já existe uma pesquisa em andamento para esta campanha." },
      { status: 409 },
    );
  }
  runningLocks.set(campaignId, true);

  try {
    const { data: campaignRow, error: campaignError } = await supabase
      .from("ap_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError) throw campaignError;
    if (!campaignRow) {
      return NextResponse.json(
        { ok: false, error: "Pesquisa não concluída.", detail: "Campanha não encontrada." },
        { status: 404 },
      );
    }

    const campaign = apCampaignFromSupabase(campaignRow as Record<string, unknown>);
    const criteria = parseCriteriaFromCampaign(campaign);

    if (!criteria.city) {
      return NextResponse.json(
        { ok: false, error: "Pesquisa não concluída.", detail: "Informe a cidade na localização da campanha." },
        { status: 400 },
      );
    }
    if (!criteria.keyword && criteria.segments.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Pesquisa não concluída.", detail: "Informe ao menos uma palavra-chave ou um segmento na campanha." },
        { status: 400 },
      );
    }

    const provider = createDiscoveryProvider(process.env.DISCOVERY_PROVIDER || "overpass");
    const rawResults = await provider.search(criteria);

    const [companiesResult, discoveriesResult] = await Promise.all([
      supabase.from("ap_companies").select("*"),
      supabase.from("ap_discoveries").select("*"),
    ]);
    if (companiesResult.error) throw companiesResult.error;
    if (discoveriesResult.error) throw discoveriesResult.error;

    const companies = (companiesResult.data || []).map((row) =>
      apCompanyFromSupabase(row as Record<string, unknown>),
    );
    const discoveries = (discoveriesResult.data || []).map((row) =>
      apDiscoveryFromSupabase(row as Record<string, unknown>),
    );

    const outcome = await runAutomaticDiscovery(
      companies,
      discoveries,
      rawResults,
      campaign.id,
      criteria,
      {
        createCompany: async (form) => {
          const { data, error } = await supabase
            .from("ap_companies")
            .insert(apCompanyFormToSupabase(form))
            .select()
            .single();
          if (error) throw error;
          return apCompanyFromSupabase(data as Record<string, unknown>);
        },
        createDiscovery: async (form) => {
          const { data, error } = await supabase
            .from("ap_discoveries")
            .insert(apDiscoveryFormToSupabase(form))
            .select()
            .single();
          if (error) throw error;
          return apDiscoveryFromSupabase(data as Record<string, unknown>);
        },
      },
      provider.name,
    );

    return NextResponse.json({
      ok: true,
      counts: outcome.counts,
      results: outcome.results,
    });
  } catch (error) {
    console.error("[Auto Prospect] Falha na pesquisa automática:", error);
    const message =
      error instanceof DiscoveryProviderError
        ? error.message
        : "A fonte externa não respondeu. Tente novamente em instantes.";
    return NextResponse.json(
      { ok: false, error: "Pesquisa não concluída.", detail: message },
      { status: 502 },
    );
  } finally {
    runningLocks.delete(campaignId);
  }
}
