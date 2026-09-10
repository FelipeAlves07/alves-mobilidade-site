import { describe, expect, it } from "vitest";
import { quoteResultToProposalDraft } from "./proposal.mapper";
import type { QuoteResult2 } from "@/domain/quote/types";

describe("quoteResultToProposalDraft", () => {
  it("maps the actual quote form and commercial details without recalculating", () => {
    const result: QuoteResult2 = {
      price: 420,
      type: "long",
      form: {
        origin: "Belo Horizonte", destination: "Rio de Janeiro", distanceKm: 440,
        durationSec: 18000, durationText: "5h", tollCost: 80, tollPlazas: [], passengers: 3, roundTrip: false,
      },
      breakdown: { fuelCost: 0, tollCost: 80, mealCost: 0, totalCost: 80, totalPrice: 420, profit: 340, profitPerKm: 0, durationHours: 5, mealsCount: 0 },
    };

    expect(quoteResultToProposalDraft(result, {
      client: "  Ana  ", phone: "31999999999", date: "2026-09-10", time: "08:30",
      bags: 2, validUntil: "2026-09-20", message: "Proposta",
    })).toMatchObject({
      client: "Ana", origin: "Belo Horizonte", destination: "Rio de Janeiro", km: 440,
      passengers: 3, bags: 2, value: 420, status: "Rascunho",
    });
  });
});
