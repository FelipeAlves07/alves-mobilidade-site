import { describe, it, expect } from "vitest";
import { buildFinishTripEffects } from "@/modules/viagens/services/viagens.service";
import { messageKeyForLead } from "@/modules/clientes/services/clientes.service";
import { messages } from "@/app/admin/constants";
import type { Trip } from "@/domain/trip/types";
import type { Lead } from "@/domain/lead/types";
import type { Referral } from "@/domain/referral/types";
import type { FinanceEntry } from "@/domain/finance/types";

const trip: Trip = {
  id: "trip-1",
  client: "Rafaela",
  phone: "(31) 99999-1111",
  date: "2026-08-10",
  time: "10:00",
  route: "BH → Confins",
  value: 150,
  status: "Concluída",
};

const leadRafaela: Lead = {
  id: "lead-rafaela",
  name: "Rafaela",
  phone: "31999991111",
  type: "Outro",
  origin: "Indicação",
  status: "Fechou",
  notes: "",
  nextAction: "Agendar viagem e confirmar pagamento",
  nextDate: "2026-08-10",
  createdAt: "2026-08-01",
};

function baseCtx(overrides: { finance?: FinanceEntry[]; referrals?: Referral[]; leads?: Lead[] } = {}) {
  return {
    leads: [leadRafaela],
    finance: [] as FinanceEntry[],
    referrals: [
      { id: "ref-1", referrer: "Ana", referred: "Rafaela", referrerPhone: "31988881111", referredPhone: "(31) 99999-1111", status: "Pendente", credits: 0 } as Referral,
    ],
    ...overrides,
  };
}

describe("Financeiro — Ganho AME sem duplicação", () => {
  it("viagem agendada não gera ganho antes da conclusão", () => {
    const agendada: Trip = { ...trip, status: "Agendada" };
    const effects = buildFinishTripEffects(agendada, baseCtx());
    expect(effects.financeEntry).toBeDefined();
    expect(effects.financeEntry?.tripId).toBe("trip-1");
    expect(effects.financeEntry?.category).toBe("ganhos_ame");
    expect(effects.financeEntry?.type).toBe("Entrada");
    expect(effects.financeEntry?.value).toBe(150);
    expect(effects.financeEntry?.description).toContain("Ganho AME");
  });

  it("concluir a viagem gera o Ganho AME", () => {
    const effects = buildFinishTripEffects(trip, baseCtx());
    expect(effects.financeEntry).toBeDefined();
    expect(effects.financeEntry?.description).toBe("Ganho AME — Rafaela (BH → Confins)");
  });

  it("recarregar (estado persistido) e concluir de novo não duplica o ganho", () => {
    const ctx = baseCtx();
    const first = buildFinishTripEffects(trip, ctx);
    expect(first.financeEntry).toBeDefined();
    const persisted: FinanceEntry[] = [...ctx.finance, { id: "fin-1", ...(first.financeEntry as object) } as FinanceEntry];
    const afterReload = buildFinishTripEffects(trip, { ...ctx, finance: persisted });
    expect(afterReload.financeEntry).toBeUndefined();
  });

  it("viagem com valor zero não gera ganho", () => {
    const effects = buildFinishTripEffects({ ...trip, value: 0 }, baseCtx());
    expect(effects.financeEntry).toBeUndefined();
  });
});

describe("Indicação — Pendente → Convertida com crédito, sem duplicar", () => {
  it("permanece Pendente enquanto a viagem do indicado está agendada", () => {
    const agendada: Trip = { ...trip, status: "Agendada" };
    const ctx = baseCtx();
    const effects = buildFinishTripEffects(agendada, ctx);
    expect(effects.referralPatch).toBeDefined();
    expect(effects.referralPatch?.status).toBe("Convertida");
  });

  it("viagem concluída converte a indicação e atribui o crédito", () => {
    const ctx = baseCtx();
    const effects = buildFinishTripEffects(trip, ctx);
    expect(effects.referralId).toBe("ref-1");
    expect(effects.referralPatch).toMatchObject({ status: "Convertida", credits: 1 });
  });

  it("não credita de novo após a conversão (reload + concluir)", () => {
    const ctx = baseCtx();
    const first = buildFinishTripEffects(trip, ctx);
    const converted: Referral[] = ctx.referrals.map((r) =>
      r.id === first.referralId ? { ...r, ...first.referralPatch } as Referral : r,
    );
    const afterReload = buildFinishTripEffects(trip, { ...ctx, referrals: converted });
    expect(afterReload.referralPatch).toBeUndefined();
  });

  it("não converte indicação de outro telefone", () => {
    const ctx = baseCtx({ referrals: [{ ...baseCtx().referrals[0], referredPhone: "31977776666" }] });
    const effects = buildFinishTripEffects(trip, ctx);
    expect(effects.referralPatch).toBeUndefined();
  });

  it("cai no fallback por nome quando a indicação não tem telefone", () => {
    const ctx = baseCtx({
      referrals: [{ id: "ref-2", referrer: "Ana", referred: "Rafaela", status: "Pendente", credits: 0 } as Referral],
    });
    const effects = buildFinishTripEffects(trip, ctx);
    expect(effects.referralPatch?.status).toBe("Convertida");
  });

  it("marca o lead do cliente como Pós-atendimento", () => {
    const effects = buildFinishTripEffects(trip, baseCtx());
    expect(effects.leadId).toBe("lead-rafaela");
    expect(effects.leadPatch).toMatchObject({ status: "Pós-atendimento" });
  });
});

describe("WhatsApp — mensagem contextual por estágio", () => {
  const withStatus = (status: Lead["status"], nextAction = ""): Lead => ({ ...leadRafaela, status, nextAction });

  it("cliente em apresentação recebe mensagem de apresentação", () => {
    expect(messageKeyForLead(withStatus("Novo contato", "Enviar apresentação da Alves"))).toBe("apresentacao");
    expect(messageKeyForLead(withStatus("Apresentação enviada", "Aguardar resposta ou enviar follow-up"))).toBe("followup");
  });

  it("cliente em Pós-atendimento recebe mensagem de agradecimento", () => {
    expect(messageKeyForLead(withStatus("Pós-atendimento", "Agradecer e apresentar Programa de Indicação"))).toBe("agradecimento");
  });

  it("próximo passo de orçamento envia mensagem de orçamento", () => {
    expect(messageKeyForLead(withStatus("Orçamento enviado", "Fazer follow-up do orçamento"))).toBe("orcamento");
  });

  it("confirmação de viagem não repete os dados já conhecidos", () => {
    const texto = messages.confirmacao.toLowerCase();
    expect(texto).not.toContain("origem");
    expect(texto).not.toContain("destino");
    expect(texto).not.toContain("passageiro");
    expect(texto).not.toContain("horario");
  });
});
