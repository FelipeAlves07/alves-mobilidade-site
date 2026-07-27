import { supabase } from "./supabase";
import { SupabaseRepository } from "./supabase-repository";
import type { SupabaseRepositoryOptions } from "./supabase-repository";
import { LocalStorageRepository } from "./local-storage-repository";
import type { Repository } from "./repository";

type StorageStrategy = "supabase" | "local";

let cachedStrategy: StorageStrategy | null = null;

export function getStorageStrategy(): StorageStrategy {
  if (cachedStrategy) return cachedStrategy;

  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  cachedStrategy = hasUrl && hasKey ? "supabase" : "local";
  return cachedStrategy;
}

export function resetStorageStrategy(): void {
  cachedStrategy = null;
}

export function createRepository<T extends { id: string }, TCreate = T>(
  tableName: string,
  storageKey: string,
  localFactory: (input: TCreate, id: string, now: string) => T,
  options: SupabaseRepositoryOptions<T, TCreate>,
): Repository<T, TCreate> {
  const strategy = getStorageStrategy();

  if (strategy === "supabase") {
    return new SupabaseRepository<T, TCreate>(tableName, options);
  }

  return new LocalStorageRepository<T, TCreate>(storageKey, localFactory);
}

// ─── Auto-sync: localStorage → Supabase ───────────────────────

const SYNC_DONE_KEY = "ame-sync-v2";

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return fallback;
  }
}

export async function trySyncLocalToSupabase(): Promise<void> {
  if (typeof window === "undefined") return;
  if (getStorageStrategy() !== "supabase") return;
  if (loadLocal(SYNC_DONE_KEY, false)) return;

  const tables = [
    { name: "contacts", lsKey: "ame-leads-v2" },
    { name: "trips", lsKey: "ame-trips-v2" },
    { name: "finance_entries", lsKey: "ame-finance-v2" },
    { name: "referrals", lsKey: "ame-referrals-v2" },
    { name: "proposals", lsKey: "ame-proposals-v1" },
  ];

  let syncedAny = false;

  for (const { name, lsKey } of tables) {
    try {
      const { count, error } = await supabase
        .from(name)
        .select("*", { count: "exact", head: true });

      if (error) continue;
      if (count && count > 0) continue;

      const localData = loadLocal<unknown[]>(lsKey, []);
      if (!localData.length) continue;

      const { error: insertError } = await supabase
        .from(name)
        .insert(localData);

      if (insertError) continue;
      syncedAny = true;
    } catch {
      continue;
    }
  }

  if (syncedAny) {
    try {
      localStorage.setItem(SYNC_DONE_KEY, "true");
    } catch {
      // localStorage may be full or unavailable
    }
  }
}
