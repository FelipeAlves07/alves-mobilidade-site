"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Proposal } from "@/domain/proposal/types";
import { createRepository } from "@/lib/repository-factory";
import {
  proposalFromSupabase,
  proposalFormToSupabase,
} from "@/lib/repository-mappers";

export function useProposals() {
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const repo = useMemo(
    () =>
      createRepository<Proposal, Omit<Proposal, "id" | "createdAt">>(
        "proposals",
        "ame-proposals-v1",
        (proposal, id, now) => ({ ...proposal, id, createdAt: now }),
        {
          fromDb: proposalFromSupabase,
          toDb: proposalFormToSupabase,
        },
      ),
    [],
  );

  useEffect(() => {
    repo.findAll().then(setProposals).catch(() => {});
  }, [repo]);

  const addProposal = useCallback(
    async (proposal: Omit<Proposal, "id" | "createdAt">) => {
      const nova = await repo.create(proposal);
      setProposals((prev) => [nova, ...prev]);
      return nova;
    },
    [repo],
  );

  const updateProposal = useCallback(
    async (id: string, patch: Partial<Proposal>) => {
      await repo.update(id, patch);
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      );
    },
    [repo],
  );

  const deleteProposal = useCallback(
    async (id: string) => {
      await repo.delete(id);
      setProposals((prev) => prev.filter((p) => p.id !== id));
    },
    [repo],
  );

  return { proposals, setProposals, addProposal, updateProposal, deleteProposal };
}
