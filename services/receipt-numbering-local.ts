const LOCAL_COUNTER_KEY = "ame-receipt-counters-v1";

interface LocalCounters {
  [year: number]: number;
}

let _nowFn: () => Date = () => new Date();

export function _now(): Date {
  return _nowFn();
}

export function _setNow(fn: () => Date): void {
  _nowFn = fn;
}

export function _resetNow(): void {
  _nowFn = () => new Date();
}

function loadCounters(): LocalCounters {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(LOCAL_COUNTER_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveCounters(counters: LocalCounters): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_COUNTER_KEY, JSON.stringify(counters));
  }
}

/**
 * Allocate next receipt number from localStorage (monotonic within this browser instance).
 * Returns formatted: "NNNN/AAAA"
 */
export function allocateLocalReceiptNumber(): string {
  const year = _now().getFullYear();
  const counters = loadCounters();
  const current = counters[year] ?? 0;
  const next = current + 1;
  counters[year] = next;
  saveCounters(counters);
  return `${String(next).padStart(4, "0")}/${year}`;
}

/**
 * Peek next number without allocating.
 */
export function peekLocalReceiptNumber(): string {
  const year = _now().getFullYear();
  const counters = loadCounters();
  const next = (counters[year] ?? 0) + 1;
  return `${String(next).padStart(4, "0")}/${year}`;
}

/**
 * Reset local counter for a year.
 */
export function resetLocalReceiptCounter(year: number): void {
  const counters = loadCounters();
  counters[year] = 0;
  saveCounters(counters);
}

/**
 * Set local counter to specific value (for migration sync).
 */
export function setLocalReceiptCounter(year: number, lastNumber: number): void {
  const counters = loadCounters();
  counters[year] = lastNumber;
  saveCounters(counters);
}

/**
 * Get current counter state for all years.
 */
export function getLocalReceiptCounters(): LocalCounters {
  return loadCounters();
}