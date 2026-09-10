import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  allocateLocalReceiptNumber,
  peekLocalReceiptNumber,
  resetLocalReceiptCounter,
  setLocalReceiptCounter,
  _setNow,
  _resetNow,
} from "@/services/receipt-numbering-local";

function setYear(year: number, month = 1, day = 1): void {
  _setNow(() => new Date(year, month - 1, day, 12, 0, 0));
}

describe("Receipt Numbering Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    _resetNow();
  });

  afterEach(() => {
    localStorage.clear();
    _resetNow();
  });

  it("should format 1 as 0001/2026", () => {
    const num = allocateLocalReceiptNumber();
    expect(num).toBe("0001/2026");
  });

  it("should format 487 as 0487/2026", () => {
    for (let i = 0; i < 486; i++) allocateLocalReceiptNumber();
    const num = allocateLocalReceiptNumber();
    expect(num).toBe("0487/2026");
  });

  it("should format 9999 as 9999/2026", () => {
    for (let i = 0; i < 9998; i++) allocateLocalReceiptNumber();
    const num = allocateLocalReceiptNumber();
    expect(num).toBe("9999/2026");
  });

  it("should format 10000 as 10000/2026 (no upper limit)", () => {
    for (let i = 0; i < 9999; i++) allocateLocalReceiptNumber();
    const num = allocateLocalReceiptNumber();
    expect(num).toBe("10000/2026");
  });

  it("should have independent counters per year", () => {
    setYear(2026, 8, 28);
    const n2026 = allocateLocalReceiptNumber(); // 0001/2026
    setYear(2027, 1, 1);
    const n2027 = allocateLocalReceiptNumber(); // 0001/2027
    expect(n2026).toBe("0001/2026");
    expect(n2027).toBe("0001/2027");
  });

  it("peek should not increment counter", () => {
    const before = peekLocalReceiptNumber();
    const after = peekLocalReceiptNumber();
    expect(before).toBe(after);
  });

  it("allocate should increment exactly once per call", () => {
    const n1 = allocateLocalReceiptNumber();
    const n2 = allocateLocalReceiptNumber();
    expect(n1).toBe("0001/2026");
    expect(n2).toBe("0002/2026");
  });

  it("two allocations should result in different numbers", () => {
    const n1 = allocateLocalReceiptNumber();
    const n2 = allocateLocalReceiptNumber();
    expect(n1).not.toBe(n2);
  });

  it("counter should be monotonic within same instance", () => {
    const nums: number[] = [];
    for (let i = 0; i < 10; i++) {
      const num = allocateLocalReceiptNumber();
      nums.push(parseInt(num.split("/")[0], 10));
    }
    for (let i = 1; i < nums.length; i++) {
      expect(nums[i]).toBe(nums[i - 1] + 1);
    }
  });

  it("peek should not affect next allocation", () => {
    allocateLocalReceiptNumber(); // 0001
    const peeked = peekLocalReceiptNumber(); // 0002
    const allocated = allocateLocalReceiptNumber(); // 0002
    expect(peeked).toBe(allocated);
  });

  it("reset counter should work", () => {
    allocateLocalReceiptNumber(); // 0001
    allocateLocalReceiptNumber(); // 0002
    resetLocalReceiptCounter(2026);
    const next = allocateLocalReceiptNumber();
    expect(next).toBe("0001/2026");
  });

  it("set counter should work for migration", () => {
    setLocalReceiptCounter(2026, 487);
    const next = allocateLocalReceiptNumber();
    expect(next).toBe("0488/2026");
  });
});
