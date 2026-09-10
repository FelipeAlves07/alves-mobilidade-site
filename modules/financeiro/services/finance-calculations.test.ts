import { afterEach, describe, expect, it, vi } from "vitest";
import type { FinanceEntry } from "@/domain/finance/types";
import type { Trip } from "@/domain/trip/types";
import {
  buildMonthHierarchy,
  getAReceber,
  getRealizado,
  getResumoMes,
} from "./finance-calculations";

const entry = (overrides: Partial<FinanceEntry> = {}): FinanceEntry => ({
  id: "finance-1",
  description: "Lançamento",
  value: 100,
  type: "Entrada",
  date: "2026-09-09",
  ...overrides,
});

const trip = (overrides: Partial<Trip> = {}): Trip => ({
  id: "trip-1",
  client: "Cliente",
  phone: "31999999999",
  date: "2099-01-10",
  time: "10:00",
  route: "BH → Confins",
  value: 180,
  status: "Agendada",
  ...overrides,
});

describe("finance calculations", () => {
  afterEach(() => vi.useRealTimers());

  it("uses only persisted entries in the realized month total", () => {
    expect(getResumoMes([
      entry({ value: 140, tripId: "trip-1" }),
      entry({ id: "expense", value: 50, type: "Saída" }),
    ], "2026-09")).toEqual({ entradas: 140, saidas: 50, resultado: 90 });
  });

  it("does not count a scheduled trip with a linked finance entry as forecast", () => {
    const linkedTrip = trip();
    const result = getAReceber([entry({ tripId: linkedTrip.id, date: "2099-01-10" })], [linkedTrip]);

    expect(result.finance).toHaveLength(1);
    expect(result.trips).toEqual([]);
  });

  it("includes only future scheduled trips without a linked entry in forecast", () => {
    const scheduled = trip();
    const cancelled = trip({ id: "cancelled", status: "Cancelada" });

    expect(getAReceber([], [scheduled, cancelled]).trips).toEqual([scheduled]);
  });

  it("groups entries into the requested month without adding trip values", () => {
    const hierarchy = buildMonthHierarchy([entry({ value: 140, tripId: "trip-1" })], "2026-09");

    expect(hierarchy.totals).toEqual({ entradas: 140, saidas: 0, resultado: 140 });
  });

  it("uses the provided date when selecting realized entries", () => {
    expect(getRealizado([entry({ date: "2026-09-10" })], "2026-09-10")).toHaveLength(1);
  });

  it("keeps a manual entry without tripId in the realized total", () => {
    expect(getResumoMes([entry({ value: 99.9 })], "2026-09")).toEqual({
      entradas: 99.9,
      saidas: 0,
      resultado: 99.9,
    });
  });

  it("keeps cents and subtracts expenses from the result", () => {
    expect(getResumoMes([
      entry({ id: "income", value: 140.5 }),
      entry({ id: "expense", type: "Saída", value: 99.9 }),
    ], "2026-09")).toEqual({ entradas: 140.5, saidas: 99.9, resultado: 40.6 });
  });

  it("keeps day, week, and month totals consistent", () => {
    const hierarchy = buildMonthHierarchy([
      entry({ id: "day-1", date: "2026-09-01", value: 100 }),
      entry({ id: "day-2", date: "2026-09-03", value: 40, type: "Saída" }),
      entry({ id: "day-3", date: "2026-09-10", value: 60 }),
    ], "2026-09");
    const weekResult = hierarchy.weeks.reduce((sum, week) => sum + week.totals.resultado, 0);
    const dayResult = hierarchy.weeks.flatMap((week) => week.days).reduce((sum, day) => sum + day.totals.resultado, 0);

    expect(hierarchy.totals.resultado).toBe(120);
    expect(weekResult).toBe(120);
    expect(dayResult).toBe(120);
  });

  it("isolates entries when changing month or year", () => {
    const entries = [
      entry({ id: "sep-2026", date: "2026-09-09", value: 100 }),
      entry({ id: "oct-2026", date: "2026-10-09", value: 200 }),
      entry({ id: "sep-2027", date: "2027-09-09", value: 300 }),
    ];

    expect(buildMonthHierarchy(entries, "2026-09").totals.entradas).toBe(100);
    expect(buildMonthHierarchy(entries, "2026-10").totals.entradas).toBe(200);
    expect(buildMonthHierarchy(entries, "2027-09").totals.entradas).toBe(300);
  });

  it("uses the Sao Paulo calendar date instead of the UTC date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T02:30:00.000Z"));

    expect(getRealizado([entry({ date: "2026-09-09" })])).toHaveLength(1);
  });
});
