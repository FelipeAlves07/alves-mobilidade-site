import { describe, expect, it } from "vitest";
import { validateLeadForm } from "@/domain/lead/validators";
import { messageKeyForLead, parseImportText, sendLeadMessageData } from "./clientes.service";
import type { Lead } from "@/domain/lead/types";

const lead: Lead = { id: "lead-1", name: "Helena", phone: "31999999999", type: "Aeroporto", origin: "Indicação", status: "Novo contato", notes: "", nextAction: "Enviar apresentação da Alves", nextDate: "2026-09-09", createdAt: "2026-09-01" };

describe("Clientes S3", () => {
  it("valida nome e WhatsApp obrigatórios antes da criação", () => {
    expect(validateLeadForm({ ...lead, name: "" })).toBe("Nome é obrigatório");
    expect(validateLeadForm({ ...lead, phone: "" })).toBe("WhatsApp é obrigatório");
    expect(validateLeadForm(lead)).toBeNull();
  });

  it("importa contatos nos formatos suportados", () => {
    expect(parseImportText("Nome: Helena, Contato: 31999999999\nRafael; 31988888888")).toEqual([
      { name: "Helena", phone: "31999999999" },
      { name: "Rafael", phone: "31988888888" },
    ]);
  });

  it("preserva o envio contextual de WhatsApp e o avanço de status", () => {
    expect(messageKeyForLead({ ...lead, status: "Pós-atendimento" })).toBe("agradecimento");
    expect(sendLeadMessageData(lead)).toMatchObject({ status: "Apresentação enviada" });
  });
});
