import { supabase } from "@/lib/supabase";

const MIGRATION_KEY = "ame-migration-v1";

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try { return JSON.parse(saved) as T; } catch { return fallback; }
}

function saveLocal(key: string, value: unknown) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
}

export async function checkMigrationStatus(): Promise<{ needsMigration: boolean; stats: Record<string, number> }> {
  const migrated = loadLocal(MIGRATION_KEY, false);
  const stats = {
    leads: loadLocal<any[]>("ame-leads-v2", []).length,
    trips: loadLocal<any[]>("ame-trips-v2", []).length,
    referrals: loadLocal<any[]>("ame-referrals-v2", []).length,
    finance: loadLocal<any[]>("ame-finance-v2", []).length,
    proposals: loadLocal<any[]>("ame-proposals-v1", []).length,
  };
  return { needsMigration: !migrated && Object.values(stats).some((v) => v > 0), stats };
}

export async function runMigration(): Promise<{ success: boolean; error?: string }> {
  try {
    const leads = loadLocal<any[]>("ame-leads-v2", []);
    const trips = loadLocal<any[]>("ame-trips-v2", []);
    const referrals = loadLocal<any[]>("ame-referrals-v2", []);
    const finance = loadLocal<any[]>("ame-finance-v2", []);
    const proposals = loadLocal<any[]>("ame-proposals-v1", []);

    if (leads.length > 0) {
      const { error } = await supabase.from("leads").insert(
        leads.map((l) => ({
          name: l.name || "",
          phone: l.phone || "",
          type: l.type || "Outro",
          origin: l.origin || "",
          status: l.status || "Novo contato",
          notes: l.notes || "",
          next_action: l.nextAction || "",
          next_date: l.nextDate || null,
          last_contact: l.lastContact || null,
        }))
      );
      if (error) throw error;
    }

    if (trips.length > 0) {
      const { error } = await supabase.from("trips").insert(
        trips.map((t) => ({
          client: t.client || "",
          phone: t.phone || "",
          date: t.date,
          time: t.time,
          route: t.route || "",
          value: Number(t.value || 0),
          status: t.status || "Agendada",
        }))
      );
      if (error) throw error;
    }

    if (referrals.length > 0) {
      const { error } = await supabase.from("referrals").insert(
        referrals.map((r) => ({
          referrer: r.referrer || "",
          referred: r.referred || "",
          status: r.status || "Indicado",
          credits: Number(r.credits || 0),
        }))
      );
      if (error) throw error;
    }

    if (finance.length > 0) {
      const { error } = await supabase.from("finance_entries").insert(
        finance.map((f) => ({
          description: f.description || "",
          value: Number(f.value || 0),
          type: f.type || "Entrada",
          date: f.date,
        }))
      );
      if (error) throw error;
    }

    if (proposals.length > 0) {
      const { error } = await supabase.from("proposals").insert(
        proposals.map((p) => ({
          client: p.client || "",
          phone: p.phone || "",
          origin: p.origin || "",
          destination: p.destination || "",
          km: Number(p.km || 0),
          passengers: Number(p.passengers || 1),
          bags: Number(p.bags || 0),
          value: Number(p.value || 0),
          status: p.status || "Rascunho",
          valid_until: p.validUntil || null,
          message: p.message || "",
        }))
      );
      if (error) throw error;
    }

    saveLocal(MIGRATION_KEY, true);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro na migração" };
  }
}

export function clearLocalStorageData() {
  const keys = ["ame-leads-v2", "ame-trips-v2", "ame-referrals-v2", "ame-finance-v2", "ame-proposals-v1", "ame-marketing-done-v3"];
  keys.forEach((key) => localStorage.removeItem(key));
}
