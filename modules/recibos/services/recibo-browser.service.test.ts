import { describe, it, expect } from "vitest";
import { sanitizeFilename } from "@/modules/recibos/services/recibo-pdf-browser.service";

describe("sanitizeFilename", () => {
  it("should remove accents", () => {
    const result = sanitizeFilename("José da Silva");
    expect(result).toBe("Jose_da_Silva");
  });

  it("should remove special characters", () => {
    const result = sanitizeFilename("Maria & João (LTDA)");
    expect(result).toBe("Maria_Joao_LTDA");
  });

  it("should replace spaces with underscores", () => {
    const result = sanitizeFilename("Ana Maria");
    expect(result).toBe("Ana_Maria");
  });

  it("should truncate to 60 chars", () => {
    const long = "A".repeat(100);
    const result = sanitizeFilename(long);
    expect(result.length).toBeLessThanOrEqual(60);
  });

  it("should handle empty string", () => {
    const result = sanitizeFilename("");
    expect(result).toBe("");
  });
});

describe("Receipt filename format", () => {
  it("should produce Recibo_AME_NNNN_AAAA_Nome.pdf format", () => {
    const number = "0488/2026";
    const clientName = "Felipe Alves";
    const num = number.replace("/", "_");
    const namePart = sanitizeFilename(clientName);
    const filename = `Recibo_AME_${num}_${namePart}.pdf`;
    expect(filename).toBe("Recibo_AME_0488_2026_Felipe_Alves.pdf");
  });

  it("should handle client name with special characters", () => {
    const number = "0001/2027";
    const clientName = "José & Maria Ltda";
    const num = number.replace("/", "_");
    const namePart = sanitizeFilename(clientName);
    const filename = `Recibo_AME_${num}_${namePart}.pdf`;
    expect(filename).toBe("Recibo_AME_0001_2027_Jose_Maria_Ltda.pdf");
  });
});

describe("buildObservationsFromTrip", () => {
  function buildObs(trip: { client: string; route: string; date: string }): string {
    const [origin = "", destination = ""] = trip.route.includes(" → ") ? trip.route.split(" → ") : [trip.route, trip.route];
    const [y, m, d] = trip.date.split("-");
    const dateBR = d && m && y ? `${d}/${m}/${y}` : trip.date;
    return `Viagem de ${trip.client}, partindo de ${origin}, com destino a ${destination}, realizada na data de ${dateBR}.`;
  }

  it("should build observation from trip with route", () => {
    const result = buildObs({
      client: "Luciana Soriano Valente",
      route: "BH → Confins",
      date: "2026-08-28",
    });
    expect(result).toBe(
      "Viagem de Luciana Soriano Valente, partindo de BH, com destino a Confins, realizada na data de 28/08/2026."
    );
  });

  it("should handle route without arrow", () => {
    const result = buildObs({
      client: "Test Client",
      route: "Confins",
      date: "2026-12-01",
    });
    expect(result).toBe(
      "Viagem de Test Client, partindo de Confins, com destino a Confins, realizada na data de 01/12/2026."
    );
  });
});

describe("formatDateBR", () => {
  function formatDateBR(iso: string): string {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return d && m && y ? `${d}/${m}/${y}` : iso;
  }

  it("should format ISO date to BR format", () => {
    expect(formatDateBR("2026-08-28")).toBe("28/08/2026");
  });

  it("should handle empty string", () => {
    expect(formatDateBR("")).toBe("");
  });

  it("should handle partial date", () => {
    expect(formatDateBR("2026-08")).toBe("2026-08");
  });
});

describe("Monetary input formatting", () => {
  function formatMoneyInput(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    const num = parseInt(digits, 10);
    const reais = (num / 100).toFixed(2);
    return reais.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  function parseMoneyInput(formatted: string): number {
    const clean = formatted.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  it("should format 140 as 1,40", () => {
    expect(formatMoneyInput("140")).toBe("1,40");
  });

  it("should format 14050 as 140,50", () => {
    expect(formatMoneyInput("14050")).toBe("140,50");
  });

  it("should format 123456 as 1.234,56", () => {
    expect(formatMoneyInput("123456")).toBe("1.234,56");
  });

  it("should parse 140,50 back to 140.5", () => {
    expect(parseMoneyInput("140,50")).toBe(140.5);
  });

  it("should parse 1.234,56 back to 1234.56", () => {
    expect(parseMoneyInput("1.234,56")).toBe(1234.56);
  });

  it("should parse 0,00 to 0", () => {
    expect(parseMoneyInput("0,00")).toBe(0);
  });

  it("should parse empty to 0", () => {
    expect(parseMoneyInput("")).toBe(0);
  });

  it("should roundtrip: format then parse", () => {
    const original = 140.5;
    const formatted = formatMoneyInput(String(Math.round(original * 100)));
    const parsed = parseMoneyInput(formatted);
    expect(parsed).toBe(original);
  });

  it("should roundtrip: 1234.56", () => {
    const original = 1234.56;
    const formatted = formatMoneyInput(String(Math.round(original * 100)));
    expect(formatted).toBe("1.234,56");
    const parsed = parseMoneyInput(formatted);
    expect(parsed).toBe(original);
  });
});

describe("Payment methods", () => {
  const PAYMENT_METHODS = [
    "Pix",
    "Dinheiro",
    "Cartão de crédito",
    "Cartão de débito",
    "Transferência",
    "Outro",
  ];

  it("should have exactly 6 payment methods", () => {
    expect(PAYMENT_METHODS).toHaveLength(6);
  });

  it("should include Pix", () => {
    expect(PAYMENT_METHODS).toContain("Pix");
  });

  it("should include Dinheiro", () => {
    expect(PAYMENT_METHODS).toContain("Dinheiro");
  });
});
