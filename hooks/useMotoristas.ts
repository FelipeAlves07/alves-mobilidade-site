"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Motorista, MotoristaForm } from "@/domain/motorista/types";
import { createRepository } from "@/lib/repository-factory";

export function useMotoristas() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);

  const repo = useMemo(
    () =>
      createRepository<Motorista, MotoristaForm>(
        "motoristas",
        "ame-motoristas-v1",
        (input, id, now) => ({ ...input, id, createdAt: now }),
        { fromDb: (row) => row as unknown as Motorista },
      ),
    [],
  );

  useEffect(() => {
    repo.findAll().then(setMotoristas).catch(() => {});
  }, [repo]);

  const addMotorista = useCallback(
    async (form: MotoristaForm) => {
      if (!form.name || !form.phone) return;
      const item = await repo.create(form);
      setMotoristas((prev) => [item, ...prev]);
    },
    [repo],
  );

  const updateMotorista = useCallback(
    async (id: string, patch: Partial<MotoristaForm>) => {
      await repo.update(id, patch);
      setMotoristas((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      );
    },
    [repo],
  );

  const deleteMotorista = useCallback(
    async (id: string) => {
      await repo.delete(id);
      setMotoristas((prev) => prev.filter((m) => m.id !== id));
    },
    [repo],
  );

  return { motoristas, setMotoristas, addMotorista, updateMotorista, deleteMotorista };
}
