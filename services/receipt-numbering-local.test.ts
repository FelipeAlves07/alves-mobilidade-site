import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  allocateLocalReceiptNumber,
  peekLocalReceiptNumber,
  resetLocalReceiptCounter,
  setLocalReceiptCounter,
  getLocalReceiptCounters,
  _setNow,
  _resetNow,
} from "@/services/receipt-numbering-local";

function setYear(year: number, month = 1, day = 1): void {
  _setNow(() => new Date(year, month - 1, day, 12, 0, 0));
}

describe("Local Receipt Numbering", () => {
  beforeEach(() => {
    localStorage.clear();
    _resetNow();
  });

  afterEach(() => {
    localStorage.clear();
    _resetNow();
  });

  it("should allocate sequential numbers for current year", () => {
    const n1 = allocateLocalReceiptNumber();
    const n2 = allocateLocalReceiptNumber();
    const n3 = allocateLocalReceiptNumber();

    expect(n1).toBe("0001/2026");
    expect(n2).toBe("0002/2026");
    expect(n3).toBe("0003/2026");
  });

  it("should peek without allocating", () => {
    allocateLocalReceiptNumber(); // 0001
    const peeked = peekLocalReceiptNumber();
    const allocated = allocateLocalReceiptNumber();

    expect(peeked).toBe("0002/2026");
    expect(allocated).toBe("0002/2026");
  });

  it("should have independent counters per year", () => {
    setYear(2026, 8, 28);
    allocateLocalReceiptNumber(); // 2026: 0001

    setYear(2027, 1, 1);
    const first2027 = allocateLocalReceiptNumber(); // 2027: 0001

    expect(first2027).toBe("0001/2027");
  });

  it("should handle year transition correctly", () => {
    setYear(2026, 12, 31);
    allocateLocalReceiptNumber(); // 0001/2026

    setYear(2027, 1, 1);
    const first2027 = allocateLocalReceiptNumber();

    expect(first2027).toBe("0001/2027");
  });

  it("should format numbers with minimum 4 digits", () => {
    for (let i = 0; i < 9999; i++) {
      allocateLocalReceiptNumber();
    }
    const next = allocateLocalReceiptNumber();
    expect(next).toBe("10000/2026");
  });

  it("should peek without incrementing counter", () => {
    const before = peekLocalReceiptNumber();
    const after = peekLocalReceiptNumber();
    expect(before).toBe(after);
  });

  it("should reset counter for specific year", () => {
    allocateLocalReceiptNumber(); // 0001
    allocateLocalReceiptNumber(); // 0002
    resetLocalReceiptCounter(2026);
    const next = allocateLocalReceiptNumber();
    expect(next).toBe("0001/2026");
  });

  it("should set counter to specific value", () => {
    setLocalReceiptCounter(2026, 50);
    const next = allocateLocalReceiptNumber();
    expect(next).toBe("0051/2026");
  });

  it("should return current counters state", () => {
    allocateLocalReceiptNumber(); // 2026: 1
    setYear(2027, 1, 1);
    allocateLocalReceiptNumber(); // 2027: 1

    const counters = getLocalReceiptCounters();
    expect(counters[2026]).toBe(1);
    expect(counters[2027]).toBe(1);
  });

  it("should be monotonic within same browser instance", () => {
    const nums: string[] = [];
    for (let i = 0; i < 10; i++) {
      nums.push(allocateLocalReceiptNumber());
    }
    for (let i = 1; i < nums.length; i++) {
      const prev = parseInt(nums[i - 1].split("/")[0], 10);
      const curr = parseInt(nums[i].split("/")[0], 10);
      expect(curr).toBe(prev + 1);
    }
  });
});
