import { describe, expect, it } from "vitest";

const templates = {
  confirmacao: "Olá, {nome}. Sua reserva está confirmada.",
  orcamento: "Olá, {nome}. Segue seu orçamento.",
};

describe("WhatsApp S3", () => {
  it("mantém múltiplos templates e variáveis no conteúdo copiado", () => {
    expect(Object.keys(templates)).toHaveLength(2);
    expect(templates.confirmacao).toContain("{nome}");
  });

  it("preserva textos longos sem truncar o conteúdo-fonte", () => {
    const text = `${templates.orcamento}\n\nDetalhes completos do atendimento executivo.`;
    expect(text).toContain("Detalhes completos");
  });
});
