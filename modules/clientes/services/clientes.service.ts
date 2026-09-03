import type { Lead, Status } from "@/domain/lead/types";
import type { MessageKey } from "@/domain/marketing/types";
import { nextActionText, nextStatus } from "@/app/admin/constants";
import { addDaysISO } from "@/lib/format";

export function parseImportText(text: string) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const nomeMatch = line.match(/Nome:\s*(.+?)(?:[,;]\s*Contato:|Contato:)/i);
    if (nomeMatch) {
      const contatoMatch = line.match(/Contato:\s*(.+)/i);
      return {
        name: nomeMatch[1].trim().replace(/,\s*$/, "") || "Novo contato",
        phone: contatoMatch ? contatoMatch[1].trim() : "",
      };
    }
    const parts = line.split(/[;,]/).map((part) => part.trim());
    return {
      name: parts[0] || "Novo contato",
      phone: parts[1] || "",
    };
  });
}

export function completeActionData(lead: Lead) {
  const newStatus = nextStatus(lead.status);
  const nextDate = newStatus === "Pós-atendimento" ? addDaysISO(2) : addDaysISO(1);
  return {
    status: newStatus,
    nextAction: nextActionText(newStatus),
    nextDate,
    lastContact: new Date().toISOString(),
  } satisfies Partial<Lead>;
}

export function sendLeadMessageData(lead: Lead) {
  const newStatus = lead.status === "Novo contato" ? "Apresentação enviada" : lead.status;
  return {
    status: newStatus as Status,
    nextAction: nextActionText(newStatus as Status),
    nextDate: addDaysISO(1),
    lastContact: new Date().toISOString(),
  } satisfies Partial<Lead>;
}

// Mensagem de WhatsApp contextual: respeita o próximo passo/categoria
// atual do cliente em vez de usar sempre o template de apresentação.
export function messageKeyForLead(lead: Lead): MessageKey {
  const text = `${lead.status} ${lead.nextAction}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (text.includes("pos-atendimento") || text.includes("agradecer") || text.includes("indique para ganhar")) return "agradecimento";
  if (text.includes("indicacao") || text.includes("indique") || text.includes("programa de indicacao")) return "indicacao";
  if (text.includes("orcamento") || text.includes("fechar") || text.includes("confirmar pagamento")) return "orcamento";
  if (text.includes("agendar viagem") || text.includes("confirmar pagamento")) return "confirmacao";
  if (text.includes("follow-up") || text.includes("aguardar resposta") || text.includes("respondeu") || text.includes("fazer follow")) return "followup";
  return "apresentacao";
}
