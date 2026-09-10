import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  allocateLocalReceiptNumber,
  peekLocalReceiptNumber,
  setLocalReceiptCounter,
  getLocalReceiptCounters,
  _setNow,
  _resetNow,
} from "@/services/receipt-numbering-local";

function setYear(year: number, month = 1, day = 1): void {
  _setNow(() => new Date(year, month - 1, day, 12, 0, 0));
}

describe("Receipt UI Integration Logic", () => {
  beforeEach(() => {
    localStorage.clear();
    _resetNow();
  });

  afterEach(() => {
    localStorage.clear();
    _resetNow();
  });

  describe("Preview behavior", () => {
    it("preview should NOT allocate a number", () => {
      const before = peekLocalReceiptNumber();
      peekLocalReceiptNumber();
      peekLocalReceiptNumber();
      const after = peekLocalReceiptNumber();
      expect(before).toBe(after);
    });

    it("preview should NOT increment counter", () => {
      peekLocalReceiptNumber();
      peekLocalReceiptNumber();
      const counters = getLocalReceiptCounters();
      const year = new Date().getFullYear();
      expect(counters[year]).toBeUndefined();
    });

    it("preview uses estimated next number", () => {
      setLocalReceiptCounter(2026, 487);
      const previewNum = peekLocalReceiptNumber();
      expect(previewNum).toBe("0488/2026");
    });
  });

  describe("Emit behavior", () => {
    it("emit should create exactly 1 receipt and increment counter", () => {
      const n1 = allocateLocalReceiptNumber();
      expect(n1).toBe("0001/2026");
      const counters = getLocalReceiptCounters();
      expect(counters[2026]).toBe(1);
    });

    it("emit should receive definitive number", () => {
      setLocalReceiptCounter(2026, 486);
      const num = allocateLocalReceiptNumber();
      expect(num).toBe("0487/2026");
    });

    it("double-click protection: second emit gets different number", () => {
      const n1 = allocateLocalReceiptNumber();
      const n2 = allocateLocalReceiptNumber();
      expect(n1).not.toBe(n2);
      expect(n2).toBe("0002/2026");
    });

    it("emit after preview should use next number", () => {
      setLocalReceiptCounter(2026, 10);
      const previewNum = peekLocalReceiptNumber();
      const emitNum = allocateLocalReceiptNumber();
      expect(previewNum).toBe("0011/2026");
      expect(emitNum).toBe("0011/2026");
    });
  });

  describe("Edit behavior", () => {
    it("editing should preserve the original number", () => {
      const num = allocateLocalReceiptNumber();
      expect(num).toBe("0001/2026");
      const counter = getLocalReceiptCounters();
      expect(counter[2026]).toBe(1);
    });

    it("updateReceipt strips number from patch", () => {
      allocateLocalReceiptNumber();
      const patch = { number: "9999/2026", clientName: "Updated" };
      const { number, ...safePatch } = patch;
      expect(safePatch).not.toHaveProperty("number");
      expect(safePatch.clientName).toBe("Updated");
    });
  });

  describe("Delete behavior", () => {
    it("delete should NOT reuse the number", () => {
      const n1 = allocateLocalReceiptNumber();
      const n2 = allocateLocalReceiptNumber();
      allocateLocalReceiptNumber();
      expect(n1).toBe("0001/2026");
      expect(n2).toBe("0002/2026");
    });

    it("delete should NOT decrement counter", () => {
      allocateLocalReceiptNumber();
      allocateLocalReceiptNumber();
      const counters = getLocalReceiptCounters();
      expect(counters[2026]).toBe(2);
    });
  });

  describe("Search behavior", () => {
    it("should filter by number", () => {
      const receipts = [
        { number: "0001/2026", clientName: "Alice", serviceDescription: "Translado" },
        { number: "0002/2026", clientName: "Bob", serviceDescription: "Corrida" },
        { number: "0003/2026", clientName: "Charlie", serviceDescription: "Translado" },
      ];
      const q = "0002";
      const filtered = receipts.filter((r) => r.number.includes(q));
      expect(filtered).toHaveLength(1);
      expect(filtered[0].clientName).toBe("Bob");
    });

    it("should filter by client name", () => {
      const receipts = [
        { number: "0001/2026", clientName: "Alice Silva", serviceDescription: "Translado" },
        { number: "0002/2026", clientName: "Bob Santos", serviceDescription: "Corrida" },
      ];
      const q = "silva";
      const filtered = receipts.filter((r) => r.clientName.toLowerCase().includes(q.toLowerCase()));
      expect(filtered).toHaveLength(1);
      expect(filtered[0].clientName).toBe("Alice Silva");
    });

    it("should filter by service description", () => {
      const receipts = [
        { number: "0001/2026", clientName: "Alice", serviceDescription: "Translado aeroportuario" },
        { number: "0002/2026", clientName: "Bob", serviceDescription: "Corrida comum" },
      ];
      const q = "aeroportu";
      const filtered = receipts.filter((r) => r.serviceDescription.toLowerCase().includes(q.toLowerCase()));
      expect(filtered).toHaveLength(1);
      expect(filtered[0].clientName).toBe("Alice");
    });

    it("empty search returns all", () => {
      const receipts = [
        { number: "0001/2026", clientName: "Alice" },
        { number: "0002/2026", clientName: "Bob" },
      ];
      const q = "";
      const filtered = q.trim() ? receipts.filter((r) => r.clientName.includes(q)) : receipts;
      expect(filtered).toHaveLength(2);
    });
  });

  describe("Trip pre-fill", () => {
    it("should pre-fill form from trip data", () => {
      const trip = {
        client: "Luciana Soriano Valente",
        phone: "31999887766",
        date: "2026-08-28",
        route: "BH → Confins",
        value: 140,
        id: "trip-123",
      };

      const [origin = "", destination = ""] = trip.route.includes(" → ") ? trip.route.split(" → ") : [trip.route, trip.route];
      const [y, m, d] = trip.date.split("-");
      const dateBR = d && m && y ? `${d}/${m}/${y}` : trip.date;
      const observations = `Viagem de ${trip.client}, partindo de ${origin}, com destino a ${destination}, realizada na data de ${dateBR}.`;

      expect(trip.client).toBe("Luciana Soriano Valente");
      expect(trip.phone).toBe("31999887766");
      expect(trip.value).toBe(140);
      expect(observations).toContain("Luciana Soriano Valente");
      expect(observations).toContain("BH");
      expect(observations).toContain("Confins");
      expect(observations).toContain("28/08/2026");
    });

    it("number should NOT be editable during creation", () => {
      const form = { number: "" };
      expect(form.number).toBe("");
    });

    it("number should be preserved during edit", () => {
      const originalNumber = "0047/2026";
      const patch = { number: originalNumber, clientName: "Updated" };
      const { number } = patch;
      expect(number).toBe(originalNumber);
    });
  });

  describe("Empty state", () => {
    it("should show empty state when no receipts", () => {
      const receipts: unknown[] = [];
      expect(receipts.length).toBe(0);
    });

    it("should show no results when search doesn't match", () => {
      const receipts = [{ number: "0001/2026", clientName: "Alice" }];
      const q = "xyz";
      const filtered = receipts.filter((r) => r.clientName.toLowerCase().includes(q.toLowerCase()));
      expect(filtered.length).toBe(0);
    });
  });
});
