import { describe, it, expect, vi, beforeEach } from "vitest";
import { SupabaseRepository } from "../supabase-repository";
import type { Repository } from "../repository";

const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
};

vi.mock("../supabase", () => ({
  supabase: {
    from: vi.fn(() => mockQueryBuilder),
  },
}));

interface TestEntity {
  id: string;
  name: string;
  value: number;
  nextAction: string;
  createdAt: string;
}

interface TestEntityForm {
  name: string;
  value: number;
  nextAction: string;
}

describe("SupabaseRepository", () => {
  let repo: Repository<TestEntity, TestEntityForm>;

  const fromDb = (row: Record<string, unknown>): TestEntity => ({
    id: row.id as string,
    name: row.name as string,
    value: row.value as number,
    nextAction: row.next_action as string,
    createdAt: row.created_at as string,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new SupabaseRepository<TestEntity, TestEntityForm>("test_table", { fromDb });
  });

  describe("findAll", () => {
    it("retorna lista vazia quando não há dados", async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      const result = await repo.findAll();

      expect(result).toEqual([]);
    });

    it("retorna itens mapeados do banco", async () => {
      const dbRows = [
        { id: "1", name: "Item A", value: 100, next_action: "Follow-up", created_at: "2026-01-01T00:00:00Z" },
        { id: "2", name: "Item B", value: 200, next_action: "Review", created_at: "2026-01-02T00:00:00Z" },
      ];

      mockQueryBuilder.order.mockResolvedValue({ data: dbRows, error: null });

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "1",
        name: "Item A",
        value: 100,
        nextAction: "Follow-up",
        createdAt: "2026-01-01T00:00:00Z",
      });
      expect(result[1].nextAction).toBe("Review");
    });

    it("lança erro quando a consulta falha", async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: null, error: new Error("DB error") });

      await expect(repo.findAll()).rejects.toThrow("DB error");
    });

    it("chama select * com order by created_at desc", async () => {
      mockQueryBuilder.order.mockResolvedValue({ data: [], error: null });

      await repo.findAll();

      expect(mockQueryBuilder.select).toHaveBeenCalledWith("*");
      expect(mockQueryBuilder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    });
  });

  describe("create", () => {
    it("insere e retorna o item criado", async () => {
      const input: TestEntityForm = {
        name: "Novo Item",
        value: 150,
        nextAction: "Approach",
      };

      const dbResponse = {
        id: "new-uuid",
        name: "Novo Item",
        value: 150,
        next_action: "Approach",
        created_at: "2026-07-25T12:00:00Z",
      };

      mockQueryBuilder.single.mockResolvedValue({ data: dbResponse, error: null });

      const result = await repo.create(input);

      expect(result.id).toBe("new-uuid");
      expect(result.name).toBe("Novo Item");
      expect(result.nextAction).toBe("Approach");
      expect(result.createdAt).toBe("2026-07-25T12:00:00Z");
    });

    it("converte camelCase para snake_case no insert", async () => {
      const input: TestEntityForm = {
        name: "Test",
        value: 50,
        nextAction: "Pending",
      };

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: "x", name: "Test", value: 50, next_action: "Pending", created_at: "" },
        error: null,
      });

      await repo.create(input);

      const insertArg = mockQueryBuilder.insert.mock.calls[0][0];
      expect(insertArg).toEqual({
        name: "Test",
        value: 50,
        next_action: "Pending",
      });
      expect(insertArg).not.toHaveProperty("nextAction");
    });

    it("lança erro quando insert falha", async () => {
      mockQueryBuilder.single.mockResolvedValue({ data: null, error: new Error("Insert failed") });

      await expect(repo.create({ name: "X", value: 1, nextAction: "" })).rejects.toThrow("Insert failed");
    });

    it("chama insert, select e single corretamente", async () => {
      mockQueryBuilder.single.mockResolvedValue({
        data: { id: "1", name: "X", value: 10, next_action: "", created_at: "" },
        error: null,
      });

      await repo.create({ name: "X", value: 10, nextAction: "" });

      expect(mockQueryBuilder.insert).toHaveBeenCalledOnce();
      expect(mockQueryBuilder.select).toHaveBeenCalledOnce();
      expect(mockQueryBuilder.single).toHaveBeenCalledOnce();
    });
  });

  describe("update", () => {
    it("aplica patch com keys convertidas para snake_case", async () => {
      mockQueryBuilder.eq.mockResolvedValue({ error: null });

      await repo.update("entity-1", { name: "Updated", nextAction: "Done" });

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        name: "Updated",
        next_action: "Done",
      });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", "entity-1");
    });

    it("ignora undefined no patch", async () => {
      mockQueryBuilder.eq.mockResolvedValue({ error: null });

      await repo.update("entity-1", { name: "Only Name", value: undefined, nextAction: undefined as unknown as string });

      const updateArg = mockQueryBuilder.update.mock.calls[0][0];
      expect(updateArg).toEqual({ name: "Only Name" });
    });

    it("lança erro quando update falha", async () => {
      mockQueryBuilder.eq.mockResolvedValue({ error: new Error("Update failed") });

      await expect(repo.update("x", { name: "Fail" })).rejects.toThrow("Update failed");
    });
  });

  describe("delete", () => {
    it("chama delete com id correto", async () => {
      mockQueryBuilder.eq.mockResolvedValue({ error: null });

      await repo.delete("entity-to-delete");

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", "entity-to-delete");
    });

    it("lança erro quando delete falha", async () => {
      mockQueryBuilder.eq.mockResolvedValue({ error: new Error("Delete failed") });

      await expect(repo.delete("x")).rejects.toThrow("Delete failed");
    });
  });

  describe("integração com mappers existentes", () => {
    it("funciona com leadFromDatabase", async () => {
      const { leadFromDatabase } = await import("@/domain/lead/mapper");

      const leadRepo = new SupabaseRepository<any, any>(
        "contacts",
        { fromDb: (row) => leadFromDatabase(row as any) },
      );

      const dbRow = {
        id: "lead-1",
        name: "Rayssa",
        phone: "31998458084",
        type: "Aeroporto",
        origin: "Cliente atual",
        status: "Pós-atendimento",
        notes: "Potencial indicação",
        next_action: "Enviar Programa de Indicação",
        next_date: "2026-07-26",
        created_at: "2026-07-20T00:00:00Z",
        last_contact: "2026-07-22T00:00:00Z",
      };

      mockQueryBuilder.order.mockResolvedValue({ data: [dbRow], error: null });

      const [lead] = await leadRepo.findAll();

      expect(lead.id).toBe("lead-1");
      expect(lead.name).toBe("Rayssa");
      expect(lead.nextAction).toBe("Enviar Programa de Indicação");
      expect(lead.nextDate).toBe("2026-07-26");
      expect(lead.createdAt).toBe("2026-07-20T00:00:00Z");
      expect(lead.lastContact).toBe("2026-07-22T00:00:00Z");
    });
  });
});

describe("mapKeysToSnake (comportamento via SupabaseRepository)", () => {
  it("converte múltiplos camelCase corretamente", async () => {
    const testRepo = new SupabaseRepository<any, any>("t", { fromDb: (r: any) => r });
    mockQueryBuilder.single.mockResolvedValue({
      data: { id: "1", first_name: "John", last_name: "Doe", phone_number: "123" },
      error: null,
    });

    await testRepo.create({ firstName: "John", lastName: "Doe", phoneNumber: "123" });

    const inserted = mockQueryBuilder.insert.mock.calls[0][0];
    expect(inserted).toEqual({
      first_name: "John",
      last_name: "Doe",
      phone_number: "123",
    });
  });

  it("não altera keys que já são snake_case", async () => {
    const testRepo = new SupabaseRepository<any, any>("t", { fromDb: (r: any) => r });
    mockQueryBuilder.eq.mockResolvedValue({ error: null });

    await testRepo.update("1", { name: "Test", phone_number: "999" } as any);

    const updateArg = mockQueryBuilder.update.mock.calls[0][0];
    expect(updateArg).toHaveProperty("name");
    expect(updateArg).toHaveProperty("phone_number");
  });
});
