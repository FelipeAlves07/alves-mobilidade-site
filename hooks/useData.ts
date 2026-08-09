"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { checkMigrationStatus, runMigration, clearLocalStorageData } from "@/services/migration";
import { signIn, signOut, restoreSession, checkLocalAuth } from "@/services/auth";
import { trySyncLocalToSupabase } from "@/lib/repository-factory";
import { useLeads } from "./useLeads";
import { useTrips } from "./useTrips";
import { useFinance } from "./useFinance";
import { useReferrals } from "./useReferrals";
import { useProposals } from "./useProposals";
import { useMotoristas } from "./useMotoristas";
import { useVeiculos } from "./useVeiculos";
import { useAutoProspect } from "./useAutoProspect";
import type { DashboardStats } from "@/domain/shared/types";

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try { return JSON.parse(saved) as T; } catch { return fallback; }
}

function saveLocal(key: string, value: unknown) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function useData() {
  const [logged, setLogged] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState<{
    needsMigration: boolean; stats: Record<string, number>; running: boolean;
  }>({ needsMigration: false, stats: {}, running: false });
  const [completedMarketing, setCompletedMarketing] = useState<string[]>([]);

  const leads = useLeads();
  const trips = useTrips();
  const finance = useFinance();
  const referrals = useReferrals();
  const proposals = useProposals();
  const motoristas = useMotoristas();
  const veiculos = useVeiculos();
  const autoProspect = useAutoProspect();

  const today = todayISO();

  useEffect(() => {
    restoreSession().then((auth) => {
      setLogged(auth?.logged ?? checkLocalAuth());
      setAuthLoading(false);
    });
    setCompletedMarketing(loadLocal<string[]>("ame-marketing-done-v3", []));
    checkMigrationStatus()
      .then((result) => setMigrationStatus({ ...result, running: false }))
      .catch(() => {});
    trySyncLocalToSupabase();
  }, []);

  useEffect(() => { saveLocal("ame-marketing-done-v3", completedMarketing); }, [completedMarketing]);

  const stats = useMemo((): DashboardStats => {
    const pending = leads.leads.filter((l) => l.nextDate <= today && !["Arquivado", "Fechou"].includes(l.status));
    const openLeads = leads.leads.filter((l) => !["Arquivado", "Fechou"].includes(l.status));
    const closed = leads.leads.filter((l) => l.status === "Fechou").length;
    const revenueTrips = trips.trips
      .filter((t) => t.status !== "Cancelada")
      .reduce((sum, t) => sum + Number(t.value || 0), 0);
    const revenueFinance = finance.finance
      .reduce((sum, item) => sum + (item.type === "Entrada" ? Number(item.value || 0) : -Number(item.value || 0)), 0);
    const credits = referrals.referrals.reduce((sum, item) => sum + Number(item.credits || 0), 0);
    const todayTrips = trips.trips.filter((t) => t.date === today && t.status === "Agendada");
    const conversion = leads.leads.length ? Math.round((closed / leads.leads.length) * 100) : 0;
    return { pending, openLeads, closed, revenueTrips, revenueFinance, credits, todayTrips, conversion };
  }, [leads.leads, trips.trips, referrals.referrals, finance.finance, today]);

  const login = useCallback(async (email: string, password: string) => {
    const state = await signIn(email, password);
    setLogged(state.logged);
    return state.logged;
  }, []);

  const logout = useCallback(() => {
    signOut();
    setLogged(false);
  }, []);

  const executarMigracao = useCallback(async () => {
    setMigrationStatus((prev) => ({ ...prev, running: true }));
    const result = await runMigration();
    if (result.success) {
      setMigrationStatus({ needsMigration: false, stats: {}, running: false });
      clearLocalStorageData();
    } else {
      setMigrationStatus((prev) => ({ ...prev, running: false }));
    }
    return result;
  }, []);

  const completeMarketingTask = useCallback((id: string) => {
    setCompletedMarketing((prev) => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const resetMarketingTasks = useCallback(() => {
    setCompletedMarketing([]);
  }, []);

  return {
    logged, authLoading, login, logout, dbAvailable: true,
    ...leads,
    ...trips,
    ...finance,
    ...referrals,
    ...proposals,
    ...motoristas,
    ...veiculos,
    ...autoProspect,
    completedMarketing,
    completeMarketingTask,
    resetMarketingTasks,
    stats,
    today,
    migrationStatus,
    executarMigracao,
  };
}
