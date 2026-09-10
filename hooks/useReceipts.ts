"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Receipt, ReceiptForm, ReceiptPatch } from "@/domain/receipt/types";
import { createRepository } from "@/lib/repository-factory";
import {
  receiptFromSupabase,
  receiptFormToSupabase,
  receiptPatchToSupabase,
} from "@/lib/repository-mappers";
import { allocateReceiptNumber, peekNextReceiptNumber } from "@/services/receipt-numbering";
import { allocateLocalReceiptNumber, peekLocalReceiptNumber } from "@/services/receipt-numbering-local";
import { validateReceiptForm, assertValidReceiptForm, validateReceiptPatch, assertValidReceiptPatch } from "@/domain/receipt/validation";

export function useReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repo = useMemo(
    () =>
      createRepository<Receipt, ReceiptForm>(
        "receipts",
        "ame-receipts-v1",
        (form, id, now) => ({ ...form, id, createdAt: now, updatedAt: now }),
        {
          fromDb: receiptFromSupabase,
          toDb: receiptFormToSupabase,
          toDbPatch: receiptPatchToSupabase,
        },
      ),
    [],
  );

  useEffect(() => {
    repo.findAll()
      .then((data) => {
        setReceipts(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar recibos");
        setLoading(false);
      });
  }, [repo]);

  const createReceipt = useCallback(
    async (form: ReceiptForm): Promise<Receipt> => {
      // Validate before creating
      assertValidReceiptForm(form);

      // Allocate number at creation time (not at form open)
      let number: string;
      try {
        number = await allocateReceiptNumber();
      } catch {
        number = allocateLocalReceiptNumber();
      }

      const receiptWithNumber = { ...form, number };
      const nova = await repo.create(receiptWithNumber);
      setReceipts((prev) => [nova, ...prev]);
      return nova;
    },
    [repo],
  );

  const updateReceipt = useCallback(
    async (id: string, patch: ReceiptPatch): Promise<void> => {
      assertValidReceiptPatch(patch);
      // Never allow number to be changed
      const { number, ...safePatch } = patch;
      await repo.update(id, safePatch);
      setReceipts((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...safePatch, updatedAt: new Date().toISOString() } : r)),
      );
    },
    [repo],
  );

  const deleteReceipt = useCallback(
    async (id: string): Promise<void> => {
      await repo.delete(id);
      setReceipts((prev) => prev.filter((r) => r.id !== id));
    },
    [repo],
  );

  const getNextNumber = useCallback(async (): Promise<string> => {
    // Preview only - does NOT allocate
    try {
      return await peekNextReceiptNumber();
    } catch {
      return peekLocalReceiptNumber();
    }
  }, []);

  return {
    receipts,
    loading,
    error,
    createReceipt,
    updateReceipt,
    deleteReceipt,
    getNextNumber,
  };
}