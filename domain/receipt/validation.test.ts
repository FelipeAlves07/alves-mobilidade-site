import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateReceiptForm,
  validateReceiptPatch,
  assertValidReceiptForm,
  assertValidReceiptPatch,
  ValidationError,
} from "@/domain/receipt/validation";
import type { PaymentMethod, ReceiptForm, ReceiptPatch } from "@/domain/receipt/types";

describe("Receipt Validation", () => {
  const validForm: ReceiptForm = {
    number: "0001/2026",
    clientName: "João Silva",
    clientPhone: "31999999999",
    serviceDate: "2026-08-28",
    serviceDescription: "Translado aeroportuário",
    paymentMethod: "Pix",
    value: 140,
    observations: "Teste",
    tripId: "trip-123",
  };

  describe("validateReceiptForm", () => {
    it("should accept a valid form", () => {
      const result = validateReceiptForm(validForm);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject empty clientName", () => {
      const form = { ...validForm, clientName: "" };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "clientName")).toBe(true);
    });

    it("should reject whitespace-only clientName", () => {
      const form = { ...validForm, clientName: "   " };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "clientName")).toBe(true);
    });

    it("should reject empty serviceDescription", () => {
      const form = { ...validForm, serviceDescription: "" };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "serviceDescription")).toBe(true);
    });

    it("should reject invalid serviceDate format", () => {
      const form = { ...validForm, serviceDate: "28/08/2026" };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "serviceDate")).toBe(true);
    });

    it("should reject invalid serviceDate (non-existent date)", () => {
      const form = { ...validForm, serviceDate: "2026-02-30" };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "serviceDate")).toBe(true);
    });

    it("should accept valid serviceDate", () => {
      const form = { ...validForm, serviceDate: "2026-02-28" };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(true);
    });

    it("should reject invalid paymentMethod", () => {
      const form = { ...validForm, paymentMethod: "Bitcoin" as any };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "paymentMethod")).toBe(true);
    });

    it("should accept all valid paymentMethods", () => {
      const methods: PaymentMethod[] = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Transferência", "Outro"];
      for (const method of methods) {
        const form = { ...validForm, paymentMethod: method };
        const result = validateReceiptForm(form);
        expect(result.valid).toBe(true);
      }
    });

    it("should reject negative value", () => {
      const form = { ...validForm, value: -10 };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "value")).toBe(true);
    });

    it("should accept value 0", () => {
      const form = { ...validForm, value: 0 };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(true);
    });

    it("should accept value with cents", () => {
      const form = { ...validForm, value: 140.5 };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(true);
    });

    it("should reject NaN value", () => {
      const form = { ...validForm, value: NaN };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "value")).toBe(true);
    });

    it("should reject invalid number format", () => {
      const form = { ...validForm, number: "487/26" };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "number")).toBe(true);
    });

    it("should accept valid number format with >4 digits", () => {
      const form = { ...validForm, number: "10000/2026" };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(true);
    });

    it("should reject empty tripId string", () => {
      const form = { ...validForm, tripId: "" };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "tripId")).toBe(true);
    });

    it("should accept undefined tripId", () => {
      const { tripId: _, ...formWithoutTripId } = validForm;
      const result = validateReceiptForm(formWithoutTripId);
      expect(result.valid).toBe(true);
    });

    it("should trim and validate clientName", () => {
      const form = { ...validForm, clientName: "  João  " };
      const result = validateReceiptForm(form);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateReceiptPatch", () => {
    it("should accept valid patch", () => {
      const patch: ReceiptPatch = { clientName: "Maria", value: 200 };
      const result = validateReceiptPatch(patch);
      expect(result.valid).toBe(true);
    });

    it("should reject empty clientName in patch", () => {
      const patch: ReceiptPatch = { clientName: "" };
      const result = validateReceiptPatch(patch);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "clientName")).toBe(true);
    });

    it("should reject invalid paymentMethod in patch", () => {
      const patch: ReceiptPatch = { paymentMethod: "Crypto" as any };
      const result = validateReceiptPatch(patch);
      expect(result.valid).toBe(false);
    });

    it("should reject negative value in patch", () => {
      const patch: ReceiptPatch = { value: -50 };
      const result = validateReceiptPatch(patch);
      expect(result.valid).toBe(false);
    });

    it("should reject invalid date in patch", () => {
      const patch: ReceiptPatch = { serviceDate: "invalid" };
      const result = validateReceiptPatch(patch);
      expect(result.valid).toBe(false);
    });

    it("should reject empty serviceDescription in patch", () => {
      const patch: ReceiptPatch = { serviceDescription: "   " };
      const result = validateReceiptPatch(patch);
      expect(result.valid).toBe(false);
    });

    it("should allow partial patch without number", () => {
      const patch: ReceiptPatch = { clientName: "Novo Nome" };
      const result = validateReceiptPatch(patch);
      expect(result.valid).toBe(true);
    });

    it("should reject invalid number format in patch", () => {
      const patch: ReceiptPatch = { number: "abc" };
      const result = validateReceiptPatch(patch);
      expect(result.valid).toBe(false);
    });
  });

  describe("assertValidReceiptForm", () => {
    it("should not throw for valid form", () => {
      expect(() => assertValidReceiptForm(validForm)).not.toThrow();
    });

    it("should throw for invalid form", () => {
      expect(() => assertValidReceiptForm({ ...validForm, clientName: "" })).toThrow("Validação falhou");
    });
  });

  describe("assertValidReceiptPatch", () => {
    it("should not throw for valid patch", () => {
      expect(() => assertValidReceiptPatch({ value: 200 })).not.toThrow();
    });

    it("should throw for invalid patch", () => {
      expect(() => assertValidReceiptPatch({ value: -10 })).toThrow("Validação falhou");
    });
  });
});