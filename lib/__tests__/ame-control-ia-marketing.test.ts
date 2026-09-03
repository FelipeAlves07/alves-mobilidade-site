import { describe, it, expect } from "vitest";
import { buildAiRecommendations } from "@/modules/ai/services/ai.service";
import {
  MARKETING_SUGGESTIONS,
  getMarketingRotation,
  buildVisibleSuggestions,
} from "@/modules/marketing/services/marketing.service";
import type { Lead } from "@/domain/lead/types";

const leadBase: Lead = {
  id: "lead-1",
  name: "Rafaela",
  phone: "31999991111",
  type: "Outro",
  origin: "Indicação",
  status: "Novo contato",
  notes: "",
  nextAction: "Enviar apresentação da Alves",
  nextDate: "2026-08-10",
  createdAt: "2026-08-01",
};

describe("IA da Alves — recomendações com ações", () => {
  const today = "2026-08-10";
  const counts = { pending: 0, trips: 0, credits: 0 };

  it("follow-up atrasado gera recomendação com lead e ação clicável", () => {
    const late: Lead = { ...leadBase, status: "Pós-atendimento", nextAction: "Agradecer e apresentar Programa de Indicação", nextDate: "2026-08-09" };
    const items = buildAiRecommendations([late], today, counts);
    const rec = items.find((i) => i.lead?.id === "lead-1");
    expect(rec).toBeDefined();
    expect(rec?.lead).toBeDefined();
    expect(rec?.messageKey).toBe("agradecimento");
  });

  it("contato novo sem mensagem gera recomendação de apresentação com lead", () => {
    const novo: Lead = { ...leadBase, status: "Novo contato", nextAction: "Enviar apresentação da Alves", nextDate: "2026-08-10", lastContact: undefined };
    const items = buildAiRecommendations([novo], today, counts);
    const rec = items.find((i) => i.id === "novos-contatos");
    expect(rec?.lead?.id).toBe("lead-1");
    expect(rec?.messageKey).toBe("apresentacao");
  });

  it("sem leads, as recomendações não oferecem ação vinculada", () => {
    const items = buildAiRecommendations([], today, counts);
    expect(items.every((i) => i.lead === undefined)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });

  it("viagens do dia geram recomendação de confirmação", () => {
    const items = buildAiRecommendations([], today, { ...counts, trips: 2 });
    expect(items.some((i) => i.id === "viagens-hoje")).toBe(true);
  });
});

describe("Marketing — rotação e conclusão por dia", () => {
  it("a ordem rotaciona conforme o dia", () => {
    const day0 = getMarketingRotation(MARKETING_SUGGESTIONS, 0).map((s) => s.id);
    const day1 = getMarketingRotation(MARKETING_SUGGESTIONS, 1).map((s) => s.id);
    expect(day0).not.toEqual(day1);
    expect(day0).toHaveLength(MARKETING_SUGGESTIONS.length);
    expect([...day0].sort()).toEqual([...day1].sort());
  });

  it("item concluído hoje desaparece da lista do dia", () => {
    const visible = buildVisibleSuggestions(MARKETING_SUGGESTIONS, 3, ["story-aeroporto"]);
    expect(visible.some((s) => s.id === "story-aeroporto")).toBe(false);
    expect(visible.length).toBe(MARKETING_SUGGESTIONS.length - 1);
  });

  it("recarregar no mesmo dia mantém o item oculto", () => {
    const day = 3;
    const first = buildVisibleSuggestions(MARKETING_SUGGESTIONS, day, ["feed-bh"]);
    const reloaded = buildVisibleSuggestions(MARKETING_SUGGESTIONS, day, ["feed-bh"]);
    expect(first.map((s) => s.id)).toEqual(reloaded.map((s) => s.id));
    expect(first.some((s) => s.id === "feed-bh")).toBe(false);
  });

  it("o item volta em outro dia, reposicionado pela rotação", () => {
    const dayA = 3;
    const dayB = 4;
    const visibleA = buildVisibleSuggestions(MARKETING_SUGGESTIONS, dayA, ["conteudo-educativo"]);
    const visibleB = buildVisibleSuggestions(MARKETING_SUGGESTIONS, dayB, []);
    expect(visibleA.some((s) => s.id === "conteudo-educativo")).toBe(false);
    expect(visibleB.some((s) => s.id === "conteudo-educativo")).toBe(true);
    const posA = getMarketingRotation(MARKETING_SUGGESTIONS, dayA).findIndex((s) => s.id === "conteudo-educativo");
    const posB = getMarketingRotation(MARKETING_SUGGESTIONS, dayB).findIndex((s) => s.id === "conteudo-educativo");
    expect(posB).not.toBe(posA);
  });
});
