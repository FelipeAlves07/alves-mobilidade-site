"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FinanceEntry, FinanceEntryForm } from "@/domain/finance/types";
import { createRepository } from "@/lib/repository-factory";
import {
  financeFromSupabase,
  financeFormToSupabase,
} from "@/lib/repository-mappers";

export function useFinance() {
  const [finance, setFinance] = useState<FinanceEntry[]>([]);

  const repo = useMemo(
    () =>
      createRepository<FinanceEntry, FinanceEntryForm>(
        "finance_entries",
        "ame-finance-v2",
        (form, id) => ({ ...form, id, value: Number(form.value) }),
        {
          fromDb: financeFromSupabase,
          toDb: financeFormToSupabase,
        },
      ),
    [],
  );

  useEffect(() => {
    repo.findAll().then(setFinance).catch(() => {});
  }, [repo]);

  const addFinance = useCallback(
    async (form: FinanceEntryForm) => {
      if (!form.description || !form.value) return;
      const nova = await repo.create(form);
      setFinance((prev) => [nova, ...prev]);
    },
    [repo],
  );

  const deleteFinance = useCallback(
    async (id: string) => {
      await repo.delete(id);
      setFinance((prev) => prev.filter((item) => item.id !== id));
    },
    [repo],
  );

  return { finance, setFinance, addFinance, deleteFinance };
}
