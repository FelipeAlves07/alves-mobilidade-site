import { afterEach, describe, expect, it } from "vitest";
import type { FinanceEntry, FinanceEntryForm } from "@/domain/finance/types";
import { LocalStorageRepository } from "@/lib/local-storage-repository";

const storageKey = "finance-persistence-test";

function repository() {
  return new LocalStorageRepository<FinanceEntry, FinanceEntryForm>(
    storageKey,
    (form, id) => ({ ...form, id, value: Number(form.value) }),
  );
}

describe("finance persistence", () => {
  afterEach(() => localStorage.removeItem(storageKey));

  it("persists create, edit, and delete across repository reloads", async () => {
    const firstSession = repository();
    const created = await firstSession.create({
      description: "Combustível",
      value: 120.5,
      type: "Saída",
      date: "2026-09-09",
      category: "gastos_combustivel",
    });

    await firstSession.update(created.id, { description: "Combustível premium", value: 140.75 });
    const refreshedSession = repository();
    expect(await refreshedSession.findAll()).toMatchObject([{ id: created.id, description: "Combustível premium", value: 140.75 }]);

    await refreshedSession.delete(created.id);
    expect(await repository().findAll()).toEqual([]);
  });
});
