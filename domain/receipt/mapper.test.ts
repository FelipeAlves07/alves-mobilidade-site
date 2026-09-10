import { describe, it, expect } from "vitest";
import {
  receiptToDatabase,
  receiptFromDatabase,
  receiptFormToDatabase,
  receiptToPdfData,
} from "@/domain/receipt/mapper";
import type { Receipt, ReceiptForm } from "@/domain/receipt/types";

describe("Receipt Mapper", () => {
  const sampleReceipt: Receipt = {
    id: "test-id-123",
    number: "0487/2026",
    tripId: "trip-123",
    clientName: "Luciana Soriano Valente",
    clientPhone: "31998458084",
    serviceDate: "2026-08-28",
    serviceDescription: "Translado aeroportuário",
    paymentMethod: "Pix",
    value: 140,
    observations: "Observação de teste",
    createdAt: "2026-08-28T10:00:00.000Z",
    updatedAt: "2026-08-28T10:00:00.000Z",
  };

  it("should convert Receipt to Database format with value as string (numeric(12,2))", () => {
    const db = receiptToDatabase(sampleReceipt);
    expect(db.value).toBe("140.00");
    expect(typeof db.value).toBe("string");
  });

  it("should convert Receipt with cents to Database format correctly", () => {
    const receiptWithCents = { ...sampleReceipt, value: 140.5 };
    const db = receiptToDatabase(receiptWithCents);
    expect(db.value).toBe("140.50");
  });

  it("should convert Receipt with fractional cents correctly", () => {
    const receiptWithCents = { ...sampleReceipt, value: 140.555 };
    const db = receiptToDatabase(receiptWithCents);
    expect(db.value).toBe("140.56"); // toFixed(2) rounds
  });

  it("should convert Database to Domain with numeric value", () => {
    const dbReceipt = {
      id: "test-id",
      number: "0487/2026",
      trip_id: "trip-123",
      client_name: "Luciana",
      client_phone: "3199999999",
      service_date: "2026-08-28",
      service_description: "Translado",
      payment_method: "Pix",
      value: "140.00", // string from Postgres numeric
      observations: "Obs",
      created_at: "2026-08-28T10:00:00.000Z",
      updated_at: "2026-08-28T10:00:00.000Z",
    };

    const domain = receiptFromDatabase(dbReceipt);
    expect(domain.value).toBe(140);
    expect(typeof domain.value).toBe("number");
  });

  it("should handle cents in Database to Domain conversion", () => {
    const dbReceipt = {
      id: "test-id",
      number: "0488/2026",
      client_name: "Test",
      service_date: "2026-08-28",
      service_description: "Test",
      payment_method: "Dinheiro",
      value: "140.50",
      created_at: "2026-08-28T10:00:00.000Z",
    };

    const domain = receiptFromDatabase(dbReceipt);
    expect(domain.value).toBe(140.5);
  });

  it("should convert Form to Database with value as string", () => {
    const form: Omit<Receipt, "id" | "createdAt" | "updatedAt"> = {
      number: "0489/2026",
      clientName: "Test",
      serviceDate: "2026-08-28",
      serviceDescription: "Test",
      paymentMethod: "Pix",
      value: 150.75,
    };

    const db = receiptFormToDatabase(form as any);
    expect(db.value).toBe("150.75");
    expect(typeof db.value).toBe("string");
  });

  it("should convert Receipt to PDF data with formatted date", () => {
    const pdfData = receiptToPdfData(sampleReceipt);
    expect(pdfData.number).toBe("0487/2026");
    expect(pdfData.clientName).toBe("Luciana Soriano Valente");
    expect(pdfData.date).toBe("28/08/2026"); // DD/MM/YYYY
    expect(pdfData.service).toBe("Translado aeroportuário");
    expect(pdfData.paymentMethod).toBe("Pix");
    expect(pdfData.value).toBe(140);
    expect(pdfData.observations).toBe("Observação de teste");
  });

  it("should handle missing observations in PDF data", () => {
    const receiptNoObs = { ...sampleReceipt, observations: undefined };
    const pdfData = receiptToPdfData(receiptNoObs);
    expect(pdfData.observations).toBe("");
  });
});