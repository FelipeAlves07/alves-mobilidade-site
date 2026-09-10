import type { FinanceEntry } from "@/domain/finance/types";
import type { Trip } from "@/domain/trip/types";
import { brazilISODate } from "@/lib/date";

export interface FinancialTotals {
  entradas: number;
  saidas: number;
  resultado: number;
}

export interface DayData {
  date: string;
  label: string;
  totals: FinancialTotals;
  items: FinanceEntry[];
}

export interface WeekData {
  weekNumber: number;
  startDate: string;
  endDate: string;
  label: string;
  totals: FinancialTotals;
  days: DayData[];
}

export interface MonthData {
  monthKey: string;
  label: string;
  totals: FinancialTotals;
  weeks: WeekData[];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatDateBR(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

function formatMonthBR(monthKey: string): string {
  if (!monthKey) return "";
  const [y, m] = monthKey.split("-");
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return m && y ? `${months[parseInt(m) - 1]} ${y}` : monthKey;
}

function getTodayISO(): string {
  return brazilISODate();
}

function getCurrentMonthKey(): string {
  return getTodayISO().slice(0, 7);
}

export function isToday(date: string): boolean {
  return date === getTodayISO();
}

export function isFutureDate(date: string): boolean {
  return date > getTodayISO();
}

export function isPastDate(date: string): boolean {
  return date < getTodayISO();
}

function computeTotals(items: FinanceEntry[]): FinancialTotals {
  const entradas = items.filter((f) => f.type === "Entrada").reduce((s, f) => s + Number(f.value), 0);
  const saidas = items.filter((f) => f.type === "Saída").reduce((s, f) => s + Number(f.value), 0);
  return {
    entradas: Number(entradas.toFixed(2)),
    saidas: Number(saidas.toFixed(2)),
    resultado: Number((entradas - saidas).toFixed(2)),
  };
}

export function getRealizado(finance: FinanceEntry[], date?: string): FinanceEntry[] {
  const targetDate = date || getTodayISO();
  return finance.filter((f) => f.type === "Entrada" && f.date === targetDate);
}

export function getRealizadoPeriod(finance: FinanceEntry[], start: string, end: string): FinanceEntry[] {
  return finance.filter((f) => f.type === "Entrada" && f.date >= start && f.date <= end);
}

export function getSaidasPeriod(finance: FinanceEntry[], start: string, end: string): FinanceEntry[] {
  return finance.filter((f) => f.type === "Saída" && f.date >= start && f.date <= end);
}

export function getPrevistoTrips(trips: Trip[], finance: FinanceEntry[]): Trip[] {
  return trips.filter(
    (t) =>
      t.status === "Agendada" &&
      isFutureDate(t.date) &&
      !finance.some((f) => f.tripId === t.id)
  );
}

export function getPrevistoFinance(finance: FinanceEntry[]): FinanceEntry[] {
  return finance.filter((f) => f.type === "Entrada" && isFutureDate(f.date));
}

export function getAReceber(finance: FinanceEntry[], trips: Trip[]): { finance: FinanceEntry[]; trips: Trip[] } {
  return {
    finance: getPrevistoFinance(finance),
    trips: getPrevistoTrips(trips, finance),
  };
}

export function buildDayData(date: string, finance: FinanceEntry[]): DayData {
  const dayFinance = finance.filter((f) => f.date === date);

  const totals = computeTotals(dayFinance);

  return {
    date,
    label: formatDateBR(date),
    totals,
    items: dayFinance,
  };
}

export function buildWeekData(weekStart: Date, finance: FinanceEntry[]): WeekData {
  const { start, end } = getWeekBounds(weekStart);
  const startISO = start.toISOString().slice(0, 10);
  const endISO = end.toISOString().slice(0, 10);

  const days: DayData[] = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const dateISO = d.toISOString().slice(0, 10);
    days.push(buildDayData(dateISO, finance));
  }

  const weekFinance = finance.filter((f) => f.date >= startISO && f.date <= endISO);
  const totals = computeTotals(weekFinance.filter((f) => f.type === "Entrada" || f.type === "Saída"));

  return {
    weekNumber: getWeekNumber(weekStart),
    startDate: startISO,
    endDate: endISO,
    label: `Semana ${getWeekNumber(weekStart)}`,
    totals,
    days,
  };
}

export function buildMonthData(monthKey: string, finance: FinanceEntry[]): MonthData {
  const [year, month] = monthKey.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const startISO = start.toISOString().slice(0, 10);
  const endISO = end.toISOString().slice(0, 10);

  const weeks: WeekData[] = [];
  let current = new Date(start);
  while (current <= end) {
    const week = buildWeekData(current, finance);
    if (week.days.some((d) => d.items.length > 0)) {
      weeks.push(week);
    }
    current = addDays(current, 7);
  }

  const monthFinance = finance.filter((f) => f.date >= startISO && f.date <= endISO);
  const totals = computeTotals(monthFinance.filter((f) => f.type === "Entrada" || f.type === "Saída"));

  return {
    monthKey,
    label: formatMonthBR(monthKey),
    totals,
    weeks,
  };
}

export function getFinanceByMonth(finance: FinanceEntry[], monthKey: string): FinanceEntry[] {
  return finance.filter((f) => f.date.startsWith(monthKey));
}

export function getAvailableMonths(finance: FinanceEntry[]): string[] {
  return [...new Set(finance.map((f) => f.date.slice(0, 7)))].sort().reverse();
}

export function buildMonthHierarchy(finance: FinanceEntry[], monthKey?: string): MonthData {
  const key = monthKey || getCurrentMonthKey();
  return buildMonthData(key, finance);
}

export function getRealizadoHoje(finance: FinanceEntry[]): FinanceEntry[] {
  return finance.filter((f) => f.type === "Entrada" && f.date === getTodayISO());
}

export function getResumoHoje(finance: FinanceEntry[]): { entradas: number; saidas: number; resultado: number } {
  const hoje = getTodayISO();
  const entradas = finance.filter((f) => f.type === "Entrada" && f.date === hoje).reduce((s, f) => s + Number(f.value), 0);
  const saidas = finance.filter((f) => f.type === "Saída" && f.date === hoje).reduce((s, f) => s + Number(f.value), 0);
  return {
    entradas,
    saidas,
    resultado: entradas - saidas,
  };
}

export function getResumoSemana(finance: FinanceEntry[]): { entradas: number; saidas: number; resultado: number } {
  const { start, end } = getWeekBounds(new Date());
  const weekFinance = finance.filter((f) => f.date >= start.toISOString().slice(0, 10) && f.date <= end.toISOString().slice(0, 10));
  return computeTotals(weekFinance);
}

export function getResumoMes(finance: FinanceEntry[], monthKey?: string): { entradas: number; saidas: number; resultado: number } {
  const key = monthKey || getCurrentMonthKey();
  const monthFinance = finance.filter((f) => f.date.startsWith(key));
  return computeTotals(monthFinance);
}

export { computeTotals, formatDateBR, formatMonthBR, getTodayISO, getCurrentMonthKey };
