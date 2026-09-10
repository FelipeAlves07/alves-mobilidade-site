import { describe, it, expect } from "vitest";
import type { FinanceEntry } from "@/domain/finance/types";
import type { Trip } from "@/domain/trip/types";
import type { DashboardStats } from "@/domain/shared/types";
import type { Lead } from "@/domain/lead/types";

// ── PURE FINANCIAL CALCULATION FUNCTIONS (extracted from DashboardView) ──

interface TripForCalc extends Pick<Trip, "id" | "date" | "value" | "status"> {}
interface LeadForCalc extends Pick<Lead, "nextDate" | "nextAction" | "name"> {}
interface StatsForCalc extends Pick<DashboardStats, "pending" | "todayTrips" | "credits" | "revenueFinance" | "revenueTrips"> {}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function formatDateBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function formatDateFull(dateISO: string): string {
  const date = new Date(`${dateISO}T12:00:00`);
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

// ── RECEITA HOJE ──
// Fonte canônica: finance entries de hoje (Entrada).
// Viagens concluídas hoje JÁ geraram FinanceEntry via finishTrip → buildFinishTripEffects.
function computeRevenueToday(finance: FinanceEntry[], today: string): number {
  const financeToday = finance.filter((f) => f.date === today && f.type === "Entrada");
  return financeToday.reduce((s, f) => s + Number(f.value), 0);
}

// ── A RECEBER ──
// Finance futuras (Entrada, date > today) + trips agendadas futuras (não canceladas, não concluídas).
// stats.credits são créditos de indicação (fidelidade), NÃO contas a receber.
function computeReceivable(
  finance: FinanceEntry[],
  trips: { id: string; date: string; value: number; status: string }[],
  today: string
): number {
  const financeFuture = finance.filter((f) => f.date > today && f.type === "Entrada");
  const receivableFinance = financeFuture.reduce((s, f) => s + Number(f.value), 0);

  const futureTrips = trips
    .filter((t) => t.date > today && t.status === "Agendada")
    .reduce((s, t) => s + Number(t.value || 0), 0);

  return receivableFinance + futureTrips;
}

// ── PENDÊNCIAS ──
function computePendencias(stats: { pending: { nextDate: string }[] }): number {
  return stats.pending.length;
}

// ── RESUMO FINANCEIRO DO MÊS ──
// Baseado apenas em finance entries para evitar dupla contagem
function computeMonthFinance(
  finance: FinanceEntry[],
  today: string
): { entradas: number; saidas: number; resultado: number } {
  const currentMonth = today.slice(0, 7);
  const monthFinance = finance.filter((f) => f.date.startsWith(currentMonth));
  const entradas = monthFinance.filter((f) => f.type === "Entrada").reduce((s, f) => s + Number(f.value), 0);
  const saidas = monthFinance.filter((f) => f.type === "Saída").reduce((s, f) => s + Number(f.value), 0);
  return { entradas, saidas, resultado: entradas - saidas };
}

// Viagens do mês sem finance entry (previsto)
function computeMonthTripsPending(
  trips: { id: string; date: string; value: number; status: string }[],
  finance: FinanceEntry[],
  today: string
): number {
  const currentMonth = today.slice(0, 7);
  const monthTrips = trips.filter((t) => t.date.startsWith(currentMonth) && t.status !== "Cancelada");
  const monthTripsWithoutFinance = monthTrips.filter((t) => !finance.some((f) => f.tripId === t.id));
  return monthTripsWithoutFinance.reduce((s, t) => s + Number(t.value || 0), 0);
}

// ── ATENÇÃO ITEMS ──
interface AttentionItem {
  type: string;
  title: string;
  subtitle: string;
  variant?: "warning" | "info" | "danger";
}

function computeAttentionItems(
  stats: { pending: { nextDate: string; nextAction?: string; name: string }[]; todayTrips: { id: string; status: string; time?: string; client: string; route: string; value: number }[] },
  today: string
): AttentionItem[] {
  const items: AttentionItem[] = [];
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // 1. Viagem próxima
  const upcomingTrip = stats.todayTrips
    .filter((t) => t.status === "Agendada" && t.time && t.time >= currentTime)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""))[0];

  if (upcomingTrip) {
    items.push({
      type: "viagem",
      title: `Viagem às ${upcomingTrip.time} — ${upcomingTrip.client}`,
      subtitle: `${upcomingTrip.route} • R$ ${Number(upcomingTrip.value || 0).toLocaleString("pt-BR")}`,
      variant: "info",
    });
  }

  // 2. Follow-ups atrasados
  const overdueFollowups = stats.pending.filter((l) => l.nextDate < today);
  if (overdueFollowups.length > 0) {
    items.push({
      type: "followup",
      title: `${overdueFollowups.length} follow-up${overdueFollowups.length > 1 ? "s" : ""} atrasado${overdueFollowups.length > 1 ? "s" : ""}`,
      subtitle: overdueFollowups.slice(0, 3).map((l) => l.name).join(", ") + (overdueFollowups.length > 3 ? "..." : ""),
      variant: "danger",
    });
  }

  // 3. Follow-ups de hoje
  const todayFollowups = stats.pending.filter((l) => l.nextDate === today);
  if (todayFollowups.length > 0 && overdueFollowups.length === 0) {
    items.push({
      type: "followup",
      title: `${todayFollowups.length} follow-up${todayFollowups.length > 1 ? "s" : ""} para hoje`,
      subtitle: todayFollowups.slice(0, 3).map((l) => l.name).join(", ") + (todayFollowups.length > 3 ? "..." : ""),
      variant: "warning",
    });
  }

  // 4. Viagens sem recibo
  const tripsWithoutReceipt = stats.todayTrips.filter((t) => t.status === "Concluída");
  if (tripsWithoutReceipt.length > 0) {
    items.push({
      type: "recibo",
      title: `${tripsWithoutReceipt.length} viagem${tripsWithoutReceipt.length > 1 ? "s" : ""} concluída${tripsWithoutReceipt.length > 1 ? "s" : ""} sem recibo`,
      subtitle: "Clique em 'Gerar recibo' na Agenda",
      variant: "info",
    });
  }

  return items;
}

// ── FOLLOW-UPS PRIORIZADOS ──
function computePrioritizedFollowups(
  pending: { nextDate: string; nextAction?: string; name: string }[],
  today: string
) {
  return [...pending].sort((a, b) => {
    const aOverdue = a.nextDate < today;
    const bOverdue = b.nextDate < today;
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    const aToday = a.nextDate === today;
    const bToday = b.nextDate === today;
    if (aToday !== bToday) return aToday ? -1 : 1;
    return a.nextDate.localeCompare(b.nextDate);
  }).slice(0, 5);
}

// ── PRÓXIMAS VIAGENS ──
function computeUpcomingTrips(
  todayTrips: { status: string; time?: string; client: string; route: string; value: number; id: string }[],
  currentTime: string
) {
  return todayTrips
    .filter((t) => t.status === "Agendada" && t.time && t.time >= currentTime)
    .slice(0, 3);
}

// ── TESTS ──

describe("Dashboard Financial Metrics - Pure Functions", () => {
  const today = "2026-09-09";

  // Helper factories
  const mkFinance = (overrides: Partial<{ id: string; date: string; type: "Entrada" | "Saída"; value: number; tripId?: string }> = {}): FinanceEntry => ({
    id: `fin-${Date.now()}-${Math.random()}`,
    description: "Teste",
    value: 100,
    type: "Entrada",
    date: today,
    category: "ganhos_ame",
    ...overrides,
  });

  const mkTrip = (overrides: Partial<{ id: string; date: string; value: number; status: string; time?: string }> = {}): Trip => ({
    id: `trip-${Date.now()}-${Math.random()}`,
    client: "Teste",
    phone: "31999999999",
    date: today,
    time: "14:00",
    route: "A → B",
    value: 140,
    status: "Agendada",
    ...overrides,
  });

  describe("RECEITA HOJE (computeRevenueToday)", () => {
    it("Cenário 1: Trip concluída R$ 140 + FinanceEntry correspondente R$ 140 → Receita = R$ 140 (sem dupla contagem)", () => {
      const fin = mkFinance({ value: 140, date: "2026-09-09", tripId: "trip-1" });
      const result = computeRevenueToday([fin], "2026-09-09");
      expect(result).toBe(140);
    });

    it("Cenário 2: Trip futura R$ 200 → Receita hoje = R$ 0", () => {
      const fin = mkFinance({ value: 200, date: "2026-09-15" });
      const result = computeRevenueToday([fin], "2026-09-09");
      expect(result).toBe(0);
    });

    it("Cenário 3: Entrada manual hoje R$ 100 → Receita = R$ 100", () => {
      const fin = mkFinance({ value: 100, date: "2026-09-09" });
      const result = computeRevenueToday([fin], "2026-09-09");
      expect(result).toBe(100);
    });

    it("Cenário 4: Saída hoje R$ 50 → Receita = R$ 0 (saída não é receita)", () => {
      const fin = mkFinance({ value: 50, type: "Saída", date: today });
      const result = computeRevenueToday([fin], today);
      expect(result).toBe(0);
    });

    it("Cenário 8: Valores com centavos (140.50 + 99.90 = 240.40)", () => {
      const fin1 = mkFinance({ value: 140.50 });
      const fin2 = mkFinance({ value: 99.90 });
      const result = computeRevenueToday([fin1, fin2], today);
      expect(result).toBeCloseTo(240.40);
    });

    it("Cenário 7: Duas viagens diferentes de R$ 140 → Receita = R$ 280 (não deduplicar por valor)", () => {
      const fin1 = mkFinance({ id: "fin-1", value: 140, tripId: "trip-1" });
      const fin2 = mkFinance({ id: "fin-2", value: 140, tripId: "trip-2" });
      const result = computeRevenueToday([fin1, fin2], today);
      expect(result).toBe(280);
    });
  });

  describe("A RECEBER (computeReceivable)", () => {
    it("Cenário 5: Finance futuro Entrada R$ 300 + Trip futura R$ 250 → A Receber = R$ 550", () => {
      const fin = mkFinance({ id: "fin-fut", value: 300, date: "2026-09-15" });
      const trip = { id: "trip-fut", date: "2026-09-20", value: 250, status: "Agendada" } as any;
      const result = computeReceivable([fin], [trip], "2026-09-09");
      expect(result).toBe(550);
    });

    it("Cenário 6: stats.credits (créditos de indicação) NÃO entram em A RECEBER", () => {
      // A função computeReceivable não usa stats.credits
      const result = computeReceivable([], [], today);
      expect(result).toBe(0);
    });

    it("Saída futura NÃO aumenta A RECEBER", () => {
      const fin = mkFinance({ value: 100, type: "Saída", date: "2026-09-15" });
      const result = computeReceivable([fin], [], today);
      expect(result).toBe(0);
    });

    it("Apenas Entrada futura conta", () => {
      const finEntrada = mkFinance({ value: 200, date: "2026-09-15" });
      const finSaida = mkFinance({ value: 100, type: "Saída", date: "2026-09-15" });
      const result = computeReceivable([finEntrada, finSaida], [], today);
      expect(result).toBe(200);
    });
  });

  describe("PENDÊNCIAS (computePendencias)", () => {
    it("Deve retornar contagem de pending", () => {
      const stats = { pending: [{ nextDate: "2026-09-08" }, { nextDate: "2026-09-09" }] };
      expect(computePendencias(stats)).toBe(2);
    });
  });

  describe("RESUMO DO MÊS (computeMonthFinance)", () => {
    it("Deve usar apenas finance entries (não trips) para evitar dupla contagem", () => {
      const fin = mkFinance({ value: 140, date: "2026-09-05", tripId: "trip-1" });
      const tripConcluida = { id: "trip-1", date: "2026-09-05", value: 140, status: "Concluída" } as any;
      const tripFutura = { id: "trip-2", date: "2026-09-15", value: 200, status: "Agendada" } as any;

      const finance = [mkFinance({ value: 140, date: "2026-09-05", tripId: "trip-1" })];
      const trips = [
        { id: "trip-1", date: "2026-09-05", value: 140, status: "Concluída" },
        { id: "trip-2", date: "2026-09-15", value: 200, status: "Agendada" },
      ];

      const monthFinance = computeMonthFinance(finance, "2026-09-09");
      expect(monthFinance.entradas).toBe(140);
      expect(monthFinance.saidas).toBe(0);
      expect(monthFinance.resultado).toBe(140);
    });

    it("Deve calcular previsto (viagens sem finance entry)", () => {
      const trips = [
        { id: "trip-1", date: "2026-09-05", value: 140, status: "Concluída" },
        { id: "trip-2", date: "2026-09-15", value: 200, status: "Agendada" },
      ];
      const finance = [{ id: "fin-1", date: "2026-09-05", value: 140, type: "Entrada", tripId: "trip-1" } as FinanceEntry];

      const pendingValue = computeMonthTripsPending(trips, finance, "2026-09-09");
      // trip-1 tem finance entry, trip-2 não tem → 200
      expect(pendingValue).toBe(200);
    });
  });

  describe("ATENÇÃO (computeAttentionItems)", () => {
    const today = "2026-09-09";

    it("Deve mostrar viagem próxima se houver trip agendada ≥ hora atual", () => {
      const stats = {
        pending: [],
        todayTrips: [
          { id: "t1", status: "Agendada", time: "14:00", client: "Claudia", route: "A → B", value: 140 },
        ],
      };
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-09T12:00:00"));
      const items = computeAttentionItems(stats, today);
      expect(items.some((i) => i.type === "viagem" && i.title.includes("Claudia"))).toBe(true);
      vi.useRealTimers();
    });

    it("Deve mostrar follow-ups atrasados como danger", () => {
      const stats = {
        pending: [{ nextDate: "2026-09-08", name: "João", nextAction: "Ligar" }],
        todayTrips: [],
      };
      const items = computeAttentionItems(stats, today);
      expect(items.some((i) => i.variant === "danger" && i.title.includes("atrasado"))).toBe(true);
    });

    it("Deve mostrar follow-ups de hoje como warning se não houver atrasados", () => {
      const stats = {
        pending: [{ nextDate: "2026-09-09", name: "Maria", nextAction: "Enviar" }],
        todayTrips: [],
      };
      const items = computeAttentionItems(stats, today);
      expect(items.some((i) => i.variant === "warning" && i.title.includes("para hoje"))).toBe(true);
    });

    it("Deve mostrar 'Tudo certo por enquanto' quando não há itens", () => {
      const stats = { pending: [], todayTrips: [] };
      const items = computeAttentionItems(stats, today);
      expect(items.length).toBe(0);
    });
  });

  describe("FOLLOW-UPS PRIORIZADOS", () => {
    it("Ordem: atrasados → hoje → futuros", () => {
      const pending = [
        { nextDate: "2026-09-10", name: "Futuro" },
        { nextDate: "2026-09-08", name: "Atrasado" },
        { nextDate: "2026-09-09", name: "Hoje" },
      ];
      const result = computePrioritizedFollowups(pending, "2026-09-09");
      expect(result.map((r) => r.name)).toEqual(["Atrasado", "Hoje", "Futuro"]);
    });
  });

  describe("PRÓXIMAS VIAGENS (computeUpcomingTrips)", () => {
    it("Apenas trips agendadas com time ≥ hora atual", () => {
      const trips = [
        { id: "t1", status: "Agendada", time: "10:00", client: "Cedo" },
        { id: "t2", status: "Agendada", time: "14:00", client: "Tarde" },
        { id: "t3", status: "Concluída", time: "14:00", client: "Concluída" },
      ];
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-09T12:00:00"));
      const result = computeUpcomingTrips(trips, "12:00");
      expect(result.map((t) => t.client)).toEqual(["Tarde"]);
      vi.useRealTimers();
    });
  });
});