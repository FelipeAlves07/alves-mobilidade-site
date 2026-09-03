import type { Lead } from "@/domain/lead/types";
import type { MessageKey } from "@/domain/marketing/types";
import { messageKeyForLead } from "@/modules/clientes/services/clientes.service";

export interface AiRecommendation {
  id: string;
  text: string;
  lead?: Lead;
  messageKey?: MessageKey;
}

export interface AiRecommendationCounts {
  pending: number;
  trips: number;
  credits: number;
}

// "IA da Alves": recomendações calculadas a partir dos dados reais do
// painel. Cada item que exige ação carrega o lead vinculado, permitindo
// à interface oferecer um botão real de WhatsApp/Concluir em vez de um
// texto vago.
export function buildAiRecommendations(
  leads: Lead[],
  today: string,
  counts: AiRecommendationCounts,
): AiRecommendation[] {
  const active = (l: Lead) => l.status !== "Arquivado" && l.status !== "Fechou";

  const lateFollowUps = leads
    .filter((l) => active(l) && l.nextDate && l.nextDate <= today && l.nextAction)
    .sort((a, b) => (a.nextDate || "").localeCompare(b.nextDate || ""));

  const newContacts = leads.filter((l) => l.status === "Novo contato" && !l.lastContact);

  const prospects = leads.filter((l) => (l.type === "Empresa" || l.type === "Hotel") && active(l));

  const items: AiRecommendation[] = [];

  if (lateFollowUps.length > 0) {
    const first = lateFollowUps[0];
    const rest = lateFollowUps.length - 1;
    items.push({
      id: `followup-${first.id}`,
      text: `Fazer follow-up com ${first.name} hoje: ${first.nextAction}.${rest > 0 ? ` E com mais ${rest} cliente(s) com a mesma prioridade.` : ""}`,
      lead: first,
      messageKey: messageKeyForLead(first),
    });
  } else {
    items.push({ id: "sem-followup", text: "Nenhum follow-up atrasado. Bom momento para prospectar novos contatos." });
  }

  if (newContacts.length > 0) {
    items.push({
      id: "novos-contatos",
      text: `${newContacts.length} contato(s) novo(s) ainda sem mensagem inicial: enviar a apresentação da Alves.`,
      lead: newContacts[0],
      messageKey: "apresentacao",
    });
  }

  if (counts.trips > 0) {
    items.push({ id: "viagens-hoje", text: `${counts.trips} viagem(ns) hoje: confirmar horários e dados dos clientes pela manhã.` });
  } else {
    items.push({ id: "sem-viagens", text: "Nenhuma viagem hoje: aproveite para fechar novos orçamentos." });
  }

  if (prospects.length > 0) {
    items.push({
      id: `prospeccao-${prospects[0].id}`,
      text: `${prospects.length} contato(s) de empresa ou hotel em atendimento: priorizar retorno comercial.`,
      lead: prospects[0],
      messageKey: messageKeyForLead(prospects[0]),
    });
  }

  if (counts.credits > 0) {
    items.push({ id: "indicacao", text: `Programa de Indicação: ${counts.credits} transfer(s) acumulado(s). Lembre que 3 indicações viram 1 transfer.` });
  } else {
    items.push({ id: "indicacao-zero", text: "Apresente o Programa de Indicação para clientes satisfeitos e acumule transfers." });
  }

  return items;
}
