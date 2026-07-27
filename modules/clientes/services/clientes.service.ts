import type { Lead, Status } from "@/domain/lead/types";
import { nextActionText, nextStatus } from "@/app/admin/constants";
import { addDaysISO } from "@/lib/format";

export function parseImportText(text: string) {
  return text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
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
