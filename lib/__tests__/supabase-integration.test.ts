import { describe, it, expect, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const skipSuite = !supabaseUrl || !serviceRoleKey || !anonKey;

const admin = skipSuite
  ? null
  : createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: WebSocket },
    });

function uuid() {
  return crypto.randomUUID();
}

const T = {
  contacts: "contacts",
  trips: "trips",
  proposals: "proposals",
  referrals: "referrals",
  finance_entries: "finance_entries",
};

describe("integração Supabase", () => {
  // track created IDs for cleanup
  const cleanup: Record<string, string[]> = {};

  afterAll(async () => {
    if (!admin) return;
    for (const [table, ids] of Object.entries(cleanup)) {
      for (const id of ids) {
        await admin.from(table).delete().eq("id", id);
      }
    }
  });

  // ─── 1. Conexão e schema ──────────────────────────────────────

  describe("1. conexão e schema", () => {
    it("variáveis de ambiente estão configuradas", () => {
      expect(supabaseUrl).toBeTruthy();
      expect(serviceRoleKey).toBeTruthy();
      expect(anonKey).toBeTruthy();
      expect(supabaseUrl.endsWith("/rest/v1/")).toBe(false);
      expect(supabaseUrl).toBe("https://slapyjstnzzesnlnubof.supabase.co");
    });

    it("consegue conectar - SELECT 1 de cada tabela", { timeout: 30000 }, async () => {
      if (!admin) return;
      const tables = [
        "contacts", "trips", "proposals", "referrals", "finance_entries",
        "profiles", "companies", "company_settings", "pricing_rules",
        "drivers", "vehicles", "trip_reviews", "marketing_tasks",
        "conversations", "messages", "follow_ups", "lead_status_log",
        "trip_status_log", "audit_log", "finance_categories", "trip_contents",
      ];
      for (const table of tables) {
        const { error } = await admin.from(table).select("id").limit(1);
        expect(error, `tabela ${table} deve ser acessível`).toBeNull();
      }
    });
  });

  // ─── 2. CRUD contacts ─────────────────────────────────────────

  describe("2. contacts (leads) CRUD", () => {
    const table = T.contacts;
    let insertedId: string;

    it("INSERT - deve criar lead com lead_status, next_action, next_date", async () => {
      if (!admin) return;
      const id = uuid();
      const payload = {
        id,
        name: "Lead Teste Integração",
        phone: "31999999999",
        type: "Aeroporto",
        origin: "Teste automatizado",
        lead_status: "Novo contato",
        notes: "Validando integração Supabase",
        next_action: "Ligar para validar",
        next_date: "2026-07-28",
      };

      const { error } = await admin.from(table).insert(payload);
      expect(error).toBeNull();

      insertedId = id;
      cleanup[table] = [...(cleanup[table] || []), id];
    });

    it("SELECT - deve ler lead criado com campos mapeáveis", async () => {
      if (!admin || !insertedId) return;
      const { data, error } = await admin
        .from(table)
        .select("id, name, phone, lead_status, next_action, next_date, type, origin, notes, created_at")
        .eq("id", insertedId)
        .single();

      expect(error).toBeNull();
      expect(data.name).toBe("Lead Teste Integração");
      expect(data.lead_status).toBe("Novo contato");
      expect(data.next_action).toBe("Ligar para validar");
      expect(data.next_date).toBe("2026-07-28");
      expect(data.type).toBe("Aeroporto");
      expect(data.created_at).toBeTruthy();
    });

    it("UPDATE - deve atualizar lead_status e notes", async () => {
      if (!admin || !insertedId) return;
      const { error } = await admin
        .from(table)
        .update({ lead_status: "Apresentação enviada", notes: "Lead atualizado via UPDATE no teste" })
        .eq("id", insertedId);

      expect(error).toBeNull();

      const { data } = await admin
        .from(table)
        .select("lead_status, notes")
        .eq("id", insertedId)
        .single();
      expect(data.lead_status).toBe("Apresentação enviada");
      expect(data.notes).toBe("Lead atualizado via UPDATE no teste");
    });

    it("DELETE - deve remover lead (hard delete test)", async () => {
      if (!admin) return;
      const tmpId = uuid();
      await admin.from(table).insert({
        id: tmpId, name: "Temp Delete", phone: "31988888888",
        type: "Outro", origin: "Teste", lead_status: "Novo contato",
      });

      const { error } = await admin.from(table).delete().eq("id", tmpId);
      expect(error).toBeNull();

      const { data } = await admin.from(table).select("id").eq("id", tmpId).maybeSingle();
      expect(data).toBeNull();
    });
  });

  // ─── 3. CRUD trips ────────────────────────────────────────────

  describe("3. trips CRUD", () => {
    const table = T.trips;
    let insertedId: string;

    it("INSERT com client_name, client_phone, origin, destination + status ENUM", async () => {
      if (!admin) return;
      const id = uuid();
      const payload = {
        id,
        client_name: "Passageiro Teste",
        client_phone: "31977777777",
        origin: "Belo Horizonte - MG",
        destination: "Aeroporto de Confins (CNF)",
        date: "2026-07-30",
        time: "08:00",
        value: 150,
        status: "scheduled",
      };

      const { error } = await admin.from(table).insert(payload);
      expect(error).toBeNull();
      insertedId = id;
      cleanup[table] = [...(cleanup[table] || []), id];
    });

    it("SELECT - campos mapeáveis: client → client_name, route ← origin + destination", async () => {
      if (!admin || !insertedId) return;
      const { data, error } = await admin
        .from(table)
        .select("id, client_name, client_phone, origin, destination, date, time, value, status")
        .eq("id", insertedId)
        .single();

      expect(error).toBeNull();
      expect(data.client_name).toBe("Passageiro Teste");
      expect(data.client_phone).toBe("31977777777");
      expect(data.origin).toBe("Belo Horizonte - MG");
      expect(data.destination).toBe("Aeroporto de Confins (CNF)");
      expect(data.status).toBe("scheduled");
      expect(data.value).toBe(150);
    });

    it("UPDATE status → completed", async () => {
      if (!admin || !insertedId) return;
      const { error } = await admin.from(table).update({ status: "completed" }).eq("id", insertedId);
      expect(error).toBeNull();

      const { data } = await admin.from(table).select("status").eq("id", insertedId).single();
      expect(data.status).toBe("completed");
    });
  });

  // ─── 4. CRUD proposals ────────────────────────────────────────

  describe("4. proposals CRUD", () => {
    const table = T.proposals;
    let insertedId: string;

    it("INSERT com client_name, client_phone, origin, destination, km, value", async () => {
      if (!admin) return;
      const id = uuid();
      const payload = {
        id,
        client_name: "Cliente Proposta Teste",
        client_phone: "31966666666",
        origin: "Savassi",
        destination: "Aeroporto de Confins",
        km: 50,
        passengers: 2,
        bags: 1,
        value: 180,
        status: "Rascunho",
        valid_until: "2026-08-05",
        message: "Proposta gerada para validar integração",
      };

      const { error } = await admin.from(table).insert(payload);
      expect(error).toBeNull();
      insertedId = id;
      cleanup[table] = [...(cleanup[table] || []), id];
    });

    it("SELECT - campos mapeáveis: client → client_name", async () => {
      if (!admin || !insertedId) return;
      const { data, error } = await admin
        .from(table)
        .select("id, client_name, client_phone, origin, destination, km, value, status, valid_until")
        .eq("id", insertedId)
        .single();

      expect(error).toBeNull();
      expect(data.client_name).toBe("Cliente Proposta Teste");
      expect(data.client_phone).toBe("31966666666");
      expect(data.value).toBe(180);
      expect(data.km).toBe(50);
      expect(data.valid_until).toBe("2026-08-05");
    });
  });

  // ─── 5. CRUD referrals ────────────────────────────────────────

  describe("5. referrals CRUD", () => {
    const table = T.referrals;
    let insertedId: string;

    it("INSERT com referrer_name, referred_name", async () => {
      if (!admin) return;
      const id = uuid();
      const payload = {
        id,
        referrer_name: "Quem Indicou Teste",
        referred_name: "Quem Foi Indicado Teste",
        status: "Indicado",
        credits: 0,
      };

      const { error } = await admin.from(table).insert(payload);
      expect(error).toBeNull();
      insertedId = id;
      cleanup[table] = [...(cleanup[table] || []), id];
    });

    it("SELECT - mapeamento referrer_name → referrer", async () => {
      if (!admin || !insertedId) return;
      const { data, error } = await admin
        .from(table)
        .select("id, referrer_name, referred_name, status")
        .eq("id", insertedId)
        .single();

      expect(error).toBeNull();
      expect(data.referrer_name).toBe("Quem Indicou Teste");
      expect(data.referred_name).toBe("Quem Foi Indicado Teste");
    });
  });

  // ─── 6. CRUD finance_entries ──────────────────────────────────

  describe("6. finance_entries CRUD", () => {
    const table = T.finance_entries;
    let insertedId: string;

    it("INSERT com description, value, type ENUM", async () => {
      if (!admin) return;
      const id = uuid();
      const payload = {
        id,
        description: "Transfer Teste Integração",
        value: 150,
        type: "Entrada",
        date: "2026-07-26",
      };

      const { error } = await admin.from(table).insert(payload);
      expect(error).toBeNull();
      insertedId = id;
      cleanup[table] = [...(cleanup[table] || []), id];
    });

    it("SELECT - description, value, type", async () => {
      if (!admin || !insertedId) return;
      const { data, error } = await admin
        .from(table)
        .select("id, description, value, type, date")
        .eq("id", insertedId)
        .single();

      expect(error).toBeNull();
      expect(data.description).toBe("Transfer Teste Integração");
      expect(Number(data.value)).toBe(150);
      expect(data.type).toBe("Entrada");
    });
  });

  // ─── 7. Mappers ───────────────────────────────────────────────

  describe("7. repository-mappers", () => {
    it("leadFromSupabase → status = lead_status", async () => {
      const { leadFromSupabase } = await import("@/lib/repository-mappers");
      const row = {
        id: uuid(), name: "A", phone: "31", type: "Hotel",
        origin: "Google", lead_status: "Negociação", notes: "",
        next_action: "Ligar", next_date: "2026-07-30",
        created_at: "2026-07-26T00:00:00Z", last_contact: null,
      };
      const lead = leadFromSupabase(row as any);
      expect(lead.status).toBe("Negociação");
      expect(lead.nextAction).toBe("Ligar");
    });

    it("tripFromSupabase → route = origin + destination", async () => {
      const { tripFromSupabase } = await import("@/lib/repository-mappers");
      const row = {
        id: uuid(), client_name: "João", client_phone: "31",
        origin: "BH", destination: "Confins", date: "2026-07-28",
        time: "10:00", value: 120, status: "scheduled",
        created_at: "2026-07-26T00:00:00Z",
      };
      const trip = tripFromSupabase(row as any);
      expect(trip.client).toBe("João");
      expect(trip.route).toBe("BH → Confins");
    });

    it("tripFormToSupabase → route → origin + destination", async () => {
      const { tripFormToSupabase } = await import("@/lib/repository-mappers");
      const form = {
        client: "Maria", phone: "31", date: "2026-08-01", time: "14:00",
        route: "Savassi → Aeroporto de Confins", value: 200,
        status: "scheduled" as const,
      };
      const db = tripFormToSupabase(form);
      expect(db.client_name).toBe("Maria");
      expect(db.origin).toBe("Savassi");
      expect(db.destination).toBe("Aeroporto de Confins");
    });

    it("referralFromSupabase → referrer = referrer_name", async () => {
      const { referralFromSupabase } = await import("@/lib/repository-mappers");
      const row = { id: uuid(), referrer_name: "Ana", referred_name: "Beto", status: "Indicado", credits: 0 };
      const ref = referralFromSupabase(row as any);
      expect(ref.referrer).toBe("Ana");
      expect(ref.referred).toBe("Beto");
    });

    it("proposalFromSupabase → client = client_name", async () => {
      const { proposalFromSupabase } = await import("@/lib/repository-mappers");
      const row = {
        id: uuid(), client_name: "Carla", client_phone: "31",
        origin: "A", destination: "B", km: 30, passengers: 1, bags: 0,
        value: 100, status: "Rascunho", created_at: "",
        valid_until: "2026-08-10", message: "",
      };
      const prop = proposalFromSupabase(row as any);
      expect(prop.client).toBe("Carla");
    });
  });

  // ─── 8. ENUMs e constraints ──────────────────────────────────

  describe("8. ENUMs e constraints", () => {
    it("trip_status aceita: scheduled, confirmed, in_progress, completed, cancelled, no_show", async () => {
      if (!admin) return;
      for (const status of ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"]) {
        const id = uuid();
        const { error } = await admin.from("trips").insert({
          id, client_name: "ENUM Test", client_phone: "31",
          origin: "A", destination: "B", date: "2026-07-30", time: "12:00",
          value: 100, status,
        });
        expect(error, `status '${status}' deve ser aceito`).toBeNull();
        cleanup.trips = [...(cleanup.trips || []), id];
      }
    });

    it("finance_type aceita 'Entrada' e 'Saída'", async () => {
      if (!admin) return;
      for (const type of ["Entrada", "Saída"]) {
        const id = uuid();
        const { error } = await admin.from("finance_entries").insert({
          id, description: `Test ${type}`, value: 100, type, date: "2026-07-26",
        });
        expect(error, `type '${type}' deve ser aceito`).toBeNull();
        cleanup.finance_entries = [...(cleanup.finance_entries || []), id];
      }
    });

    it("contacts.type CHECK rejeita valor inválido", async () => {
      if (!admin) return;
      const { error } = await admin.from("contacts").insert({
        id: uuid(), name: "Invalid", phone: "31900000000",
        type: "TipoInexistente", origin: "Test", lead_status: "Novo contato",
      });
      expect(error).not.toBeNull();
    });
  });

  // ─── 9. Fallback: getStorageStrategy ──────────────────────────
  // Nota: getStorageStrategy é testado via unit tests existentes em outro arquivo.
  // A importação de repository-factory em Node.js 20 requer WebSocket transport
  // no createClient de lib/supabase.ts. Os hooks rodam no browser, onde o
  // WebSocket é nativo — o fallback funciona sem alterações no runtime real.
});
