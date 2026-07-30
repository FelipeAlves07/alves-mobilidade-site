"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Veiculo, VeiculoForm } from "@/domain/veiculo/types";
import { createRepository } from "@/lib/repository-factory";

export function useVeiculos() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);

  const repo = useMemo(
    () =>
      createRepository<Veiculo, VeiculoForm>(
        "veiculos",
        "ame-veiculos-v1",
        (input, id, now) => ({ ...input, id, createdAt: now }),
        { fromDb: (row) => row as unknown as Veiculo },
      ),
    [],
  );

  useEffect(() => {
    repo.findAll().then(setVeiculos).catch(() => {});
  }, [repo]);

  const addVeiculo = useCallback(
    async (form: VeiculoForm) => {
      if (!form.model || !form.plate) return;
      const item = await repo.create(form);
      setVeiculos((prev) => [item, ...prev]);
    },
    [repo],
  );

  const updateVeiculo = useCallback(
    async (id: string, patch: Partial<VeiculoForm>) => {
      await repo.update(id, patch);
      setVeiculos((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...patch } : v)),
      );
    },
    [repo],
  );

  const deleteVeiculo = useCallback(
    async (id: string) => {
      await repo.delete(id);
      setVeiculos((prev) => prev.filter((v) => v.id !== id));
    },
    [repo],
  );

  return { veiculos, setVeiculos, addVeiculo, updateVeiculo, deleteVeiculo };
}
