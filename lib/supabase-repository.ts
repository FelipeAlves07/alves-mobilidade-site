import { supabase } from "./supabase";
import type { Repository } from "./repository";
import { mapKeysToSnake } from "./utils/string";

export interface SupabaseRepositoryOptions<T, TCreate> {
  fromDb: (row: Record<string, unknown>) => T;
  toDb?: (input: TCreate) => Record<string, unknown>;
  toDbPatch?: (patch: Partial<TCreate>) => Record<string, unknown>;
}

export class SupabaseRepository<T extends { id: string }, TCreate = T>
  implements Repository<T, TCreate>
{
  constructor(
    private readonly tableName: string,
    private readonly options: SupabaseRepositoryOptions<T, TCreate>,
  ) {}

  async findAll(): Promise<T[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => this.options.fromDb(row as Record<string, unknown>));
  }

  async create(input: TCreate): Promise<T> {
    const dbData = this.options.toDb
      ? this.options.toDb(input)
      : mapKeysToSnake(input as Record<string, unknown>);

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(dbData)
      .select()
      .single();

    if (error) throw error;
    return this.options.fromDb(data as Record<string, unknown>);
  }

  async update(id: string, patch: Partial<TCreate>): Promise<void> {
    const dbPatch = this.options.toDbPatch
      ? this.options.toDbPatch(patch)
      : mapKeysToSnake(patch as Record<string, unknown>);

    const { error } = await supabase
      .from(this.tableName)
      .update(dbPatch)
      .eq("id", id);

    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
