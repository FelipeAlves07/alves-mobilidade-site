import { describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { nodeWebSocketTransport } from "@/lib/__tests__/node-websocket-transport";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const skip = !url || !key;
const admin: SupabaseClient | null = skip
  ? null
  : createClient(url, key, { realtime: { transport: nodeWebSocketTransport } });

describe("detalhes do teste real (leitura)", () => {
  it("extrai os registros do teste real", { timeout: 120_000 }, async () => {
    if (!admin) return;
    const client = admin;
    const { data: campaigns, error: campaignsError } = await client.from("ap_campaigns").select("id, name, created_at").like("name", "TESTE BATCH%").order("created_at", { ascending: true });
    expect(campaignsError).toBeNull();
    if (!campaigns || campaigns.length === 0) {
      console.log("Nenhuma campanha TESTE BATCH encontrada.");
      return;
    }
    const { data: disc, error: discError } = await client.from("ap_discoveries").select("campaign_id, source").in("campaign_id", campaigns.map((c) => c.id as string));
    expect(discError).toBeNull();
    const discPerCampaign: Record<string, number> = {};
    for (const d of disc || []) {
      const campaignId = d.campaign_id as string;
      discPerCampaign[campaignId] = (discPerCampaign[campaignId] || 0) + 1;
      if ((d.source as string) !== "teste-batch-etapa7") {
        console.log("AVISO: descoberta de teste com source inesperado:", JSON.stringify(d));
      }
    }
    for (const campaign of campaigns as Array<Record<string, unknown>>) {
      const campaignId = campaign.id as string;
      const { data: runs, error: runsError } = await client.from("ap_batch_runs").select("*").eq("campaign_id", campaignId).order("created_at", { ascending: true });
      expect(runsError).toBeNull();
      console.log("─────── CAMPANHA:", campaign.name, `(${campaignId}) descobertas: ${discPerCampaign[campaignId] ?? 0}`);
      for (const run of runs || []) {
        const runId = run.id as string;
        const { data: companyRuns, error: companyRunsError } = await client
          .from("ap_batch_company_runs")
          .select("ap_companies(name, website, segment), status, error_code, error_message, retry_count, next_retry_at")
          .eq("batch_run_id", runId)
          .order("created_at", { ascending: true });
        expect(companyRunsError).toBeNull();
        const { data: enr, error: enrError } = await client.from("ap_enrichments").select("id, status, source_url, reason, title").eq("batch_run_id", runId);
        expect(enrError).toBeNull();
        const { data: qual, error: qualError } = await client.from("ap_qualifications").select("score, ai_status").eq("batch_run_id", runId);
        expect(qualError).toBeNull();
        const { data: intel, error: intelError } = await client.from("ap_intelligence").select("priority, ai_status, cost_estimate, summary").eq("batch_run_id", runId);
        expect(intelError).toBeNull();
        const enrichmentIds = (enr || []).map((row) => row.id as string);
        const { data: evd, error: evdError } = enrichmentIds.length > 0
          ? await client.from("ap_enrichment_evidences").select("id").in("enrichment_id", enrichmentIds)
          : { data: [], error: null };
        expect(evdError).toBeNull();
        const counters: Record<string, number> = {};
        for (const cr of companyRuns || []) {
          const st = cr.status as string;
          counters[st] = (counters[st] || 0) + 1;
        }
        const statuses = Object.entries(counters)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
        console.log(` RUN: ${run.name ?? run.id} — status=${run.status}, { ${statuses} }, enrichments=${(enr || []).length}, evidences=${(evd || []).length}, qualifications=${(qual || []).length}, intelligence=${(intel || []).length}`);
        console.log(`  filtros: ${JSON.stringify(run.filters)} — erro_summary: ${JSON.stringify(run.error_summary)} — finished_at: ${run.finished_at as string}`);
        for (const cr of companyRuns || []) {
          const companyJoin = cr.ap_companies;
          const company = (Array.isArray(companyJoin) ? companyJoin[0] : companyJoin) ?? {};
          console.log(
            `  [${cr.status as string}] ${company.name as string} | site=${String(company.website || "").slice(0, 48) || "(sem site)"} | err=${cr.error_code as string} retry=${cr.retry_count as number}`,
          );
        }
        for (const row of enr || []) {
          console.log(`  ENRICH: status=${row.status as string} | url=${(row.source_url as string) || "-"} | reason=${(row.reason as string || "").slice(0, 90)}`);
        }
        const priorities: Record<string, number> = {};
        for (const row of intel || []) {
          const p = String(row.priority);
          priorities[p] = (priorities[p] || 0) + 1;
        }
        console.log(`  PRIORIDADES do run: ${JSON.stringify(priorities)} | ai_status: ${JSON.stringify([...(new Set((intel || []).map((i) => i.ai_status)))])} | custoIA total: ${(intel || []).reduce((s, i) => s + Number(i.cost_estimate || 0), 0)}`);
        for (const row of (intel || []).slice(0, 3)) {
          console.log(`  INTEL exemplo: P${row.priority as number} [${row.ai_status as string}] "${(row.summary as string || "").slice(0, 100)}"`);
        }
      }
    }
    const totals = await Promise.all([
      client.from("ap_intelligence").select("*", { count: "exact", head: true }),
      client.from("ap_enrichments").select("*", { count: "exact", head: true }),
      client.from("ap_qualifications").select("*", { count: "exact", head: true }),
      client.from("ap_enrichment_evidences").select("*", { count: "exact", head: true }),
      client.from("ap_opportunities").select("*", { count: "exact", head: true }),
      client.from("ap_batch_runs").select("*", { count: "exact", head: true }),
    ]);
    for (const total of totals) expect(total.error).toBeNull();
    const [totalIntel, totalEnr, totalQual, totalEvd, totalOpp, totalRuns] = totals.map((result) => result.count);
    console.log("TOTAIS ATUAIS: intelligence=", totalIntel, "enrichments=", totalEnr, "qualifications=", totalQual, "evidences=", totalEvd, "opportunities=", totalOpp, "batch_runs=", totalRuns);
  });
});
