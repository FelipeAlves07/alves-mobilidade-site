"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lead, LeadForm } from "@/domain/lead/types";
import { createRepository } from "@/lib/repository-factory";
import {
  leadFromSupabase,
  leadFormToSupabase,
  leadPatchToSupabase,
} from "@/lib/repository-mappers";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);

  const repo = useMemo(
    () =>
      createRepository<Lead, LeadForm>(
        "contacts",
        "ame-leads-v2",
        (form, id, now) => ({ ...form, id, createdAt: now }),
        {
          fromDb: leadFromSupabase,
          toDb: leadFormToSupabase,
          toDbPatch: leadPatchToSupabase,
        },
      ),
    [],
  );

  useEffect(() => {
    repo.findAll().then(setLeads).catch(() => {});
  }, [repo]);

  const addLead = useCallback(
    async (form: LeadForm) => {
      if (!form.name.trim() || !form.phone.trim()) return;
      const novo = await repo.create(form);
      setLeads((prev) => [novo, ...prev]);
    },
    [repo],
  );

  const updateLead = useCallback(
    async (id: string, patch: Partial<LeadForm>) => {
      await repo.update(id, patch);
      setLeads((prev) =>
        prev.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)),
      );
    },
    [repo],
  );

  const deleteLead = useCallback(
    async (id: string) => {
      await repo.delete(id);
      setLeads((prev) => prev.filter((lead) => lead.id !== id));
    },
    [repo],
  );

  return { leads, setLeads, addLead, updateLead, deleteLead };
}
