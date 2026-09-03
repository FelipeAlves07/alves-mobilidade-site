import { describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { nodeWebSocketTransport } from "@/lib/__tests__/node-websocket-transport";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const skip = !url || !key;
const admin: SupabaseClient | null = skip
  ? null
  : createClient(url, key, { realtime: { transport: nodeWebSocketTransport } });

describe("diagnóstico (leitura)", () => {
  it("runs, linhas presas e timestamps", { timeout: 120_000 }, async () => {
    if (!admin) return;
    const client = admin;
    const { data: campaigns, error: campaignsError } = await client
      .from("ap_campaigns")
      .select("id, name, created_at")
      .like("name", "TESTE BATCH%")
      .order("created_at", { ascending: true });
    expect(campaignsError).toBeNull();
    for (const campaign of campaigns || []) {
      console.log("==== CAMPANHA", (campaign.name as string).slice(0, 40), campaign.id as string);
      const { data: runs, error: runsError } = await client
        .from("ap_batch_runs")
        .select("id, status, created_at, updated_at, finished_at")
        .eq("campaign_id", campaign.id as string)
        .order("created_at", { ascending: true });
      expect(runsError).toBeNull();
      for (const run of runs || []) {
        console.log(`  RUN ${run.id as string} status=${run.status as string} created=${run.created_at as string} updated=${run.updated_at as string} finished=${run.finished_at as string}`);
        const { data: rows, error: rowsError } = await client
          .from("ap_batch_company_runs")
          .select("company_id, status, error_code, error_message, retry_count, next_retry_at, claimed_at, created_at, updated_at")
          .eq("batch_run_id", run.id as string)
          .order("created_at", { ascending: true });
        expect(rowsError).toBeNull();
        const rowsAny = (rows || []) as Array<Record<string, unknown>>;
        const stuck = rowsAny.filter(
          (r) => r.status === "processando" || (r.status === "pendente" && r.next_retry_at !== null),
        );
        for (const r of stuck) {
          console.log(
            `    ★ ${r.status as string} company=${r.company_id as string} err=${r.error_code as string} retry=${r.retry_count as number} claimed=${r.claimed_at as string} next_retry=${r.next_retry_at as string} updated=${r.updated_at as string}`,
          );
        }
        const done = rowsAny.filter((r) => ["concluida", "sem_dados", "falha", "cancelada"].includes(r.status as string)).length;
        console.log(`    (${rowsAny.length} linhas; ${done} terminais)`);
      }
    }
  });
});
