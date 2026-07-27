import type { Repository } from "./repository";
import { uid } from "@/utils/helpers";

export class LocalStorageRepository<T extends { id: string }, TCreate = T>
  implements Repository<T, TCreate>
{
  constructor(
    private storageKey: string,
    private factory: (input: TCreate, id: string, now: string) => T,
  ) {}

  async findAll(): Promise<T[]> {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem(this.storageKey);
    if (!saved) return [];
    try { return JSON.parse(saved); } catch { return []; }
  }

  async create(input: TCreate): Promise<T> {
    const all = await this.findAll();
    const item = this.factory(input, uid(), new Date().toISOString());
    this.saveAll([item, ...all]);
    return item;
  }

  async update(id: string, patch: Partial<TCreate>): Promise<void> {
    const all = await this.findAll();
    this.saveAll(all.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async delete(id: string): Promise<void> {
    const all = await this.findAll();
    this.saveAll(all.filter((item) => item.id !== id));
  }

  private saveAll(items: T[]) {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    }
  }
}
