export interface Repository<T, TCreate = T> {
  findAll(): Promise<T[]>;
  create(input: TCreate): Promise<T>;
  update(id: string, patch: Partial<TCreate>): Promise<void>;
  delete(id: string): Promise<void>;
}
