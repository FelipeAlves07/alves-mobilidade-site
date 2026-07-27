"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Referral } from "@/domain/referral/types";
import { createRepository } from "@/lib/repository-factory";
import {
  referralFromSupabase,
  referralFormToSupabase,
  referralPatchToSupabase,
} from "@/lib/repository-mappers";

export function useReferrals() {
  const [referrals, setReferrals] = useState<Referral[]>([]);

  const repo = useMemo(
    () =>
      createRepository<Referral, Omit<Referral, "id">>(
        "referrals",
        "ame-referrals-v2",
        (ref, id) => ({ ...ref, id, credits: Number(ref.credits || 0) }),
        {
          fromDb: referralFromSupabase,
          toDb: referralFormToSupabase,
          toDbPatch: referralPatchToSupabase,
        },
      ),
    [],
  );

  useEffect(() => {
    repo.findAll().then(setReferrals).catch(() => {});
  }, [repo]);

  const addReferral = useCallback(
    async (ref: Omit<Referral, "id">) => {
      if (!ref.referrer || !ref.referred) return;
      const novo = await repo.create(ref);
      setReferrals((prev) => [novo, ...prev]);
    },
    [repo],
  );

  const updateReferral = useCallback(
    async (id: string, patch: Partial<Referral>) => {
      await repo.update(id, patch);
      setReferrals((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      );
    },
    [repo],
  );

  const deleteReferral = useCallback(
    async (id: string) => {
      await repo.delete(id);
      setReferrals((prev) => prev.filter((ref) => ref.id !== id));
    },
    [repo],
  );

  return { referrals, setReferrals, addReferral, updateReferral, deleteReferral };
}
