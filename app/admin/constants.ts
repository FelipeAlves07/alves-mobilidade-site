import type { Status, LeadType, Lead } from "@/domain/lead/types";
import type { Trip } from "@/domain/trip/types";
import type { Referral } from "@/domain/referral/types";
import type { FinanceEntry } from "@/domain/finance/types";
import type { Proposal } from "@/domain/proposal/types";
import type { QuoteResult } from "@/domain/trip/types";
import { roundUpTo, money, quoteValidityDate } from "@/lib/quotes";

export const adminPassword = "alves2026";
export const today = new Date().toISOString().slice(0, 10);

export const statuses: Status[] = ["Novo contato", "Apresentação enviada", "Respondeu", "Orçamento enviado", "Negociação", "Fechou", "Pós-atendimento", "Arquivado"];
export const leadTypes: LeadType[] = ["Aeroporto", "Empresa", "Hotel", "Evento", "Indicação", "Cliente antigo", "Outro"];

export const priceRules = {
  pricePerKm: 3,
  roundTo: 10,
};

export const messages = {
  apresentacao:
    "Olá, tudo bem? Me chamo Felipe, sou da Alves Mobilidade Executiva. Atendemos em Belo Horizonte e Região Metropolitana com transporte executivo para aeroportos, empresas, eventos e viagens. Posso te enviar uma apresentação rápida dos nossos serviços?",
  indicacao:
    "Olá, tudo bem? Tenho uma novidade exclusiva para você! Criamos o Programa de Indicação da Alves Mobilidade Executiva. Indique novos clientes, acumule indicações e ganhe Transfers Executivos gratuitos para o Aeroporto de Confins. Posso te explicar rapidamente?",
  followup:
    "Olá, tudo bem? Passando para saber se ainda precisa de transporte executivo. Fico à disposição para aeroportos, empresas, eventos e viagens agendadas em BH e Região Metropolitana.",
  agradecimento:
    "Olá, tudo bem? Passando para agradecer pela confiança na Alves Mobilidade Executiva. Foi um prazer atender você. Sempre que precisar de transporte executivo, estarei à disposição.",
  orcamento:
    "Olá! Para eu preparar seu orçamento, me envie por favor: origem, destino, data, horário, quantidade de passageiros e quantidade de malas.",
  confirmacao:
    "Olá, tudo bem? Passando para confirmar nosso atendimento. Se puder, me confirme origem, destino, horário e quantidade de passageiros para deixarmos tudo organizado.",
};

export const defaultLeads: Lead[] = [
  { id: "1", name: "Rayssa", phone: "31998458084", type: "Aeroporto", origin: "Cliente atual", status: "Pós-atendimento", notes: "Cliente com potencial para indicação.", nextAction: "Enviar Programa de Indicação", nextDate: today, createdAt: new Date().toISOString() },
  { id: "2", name: "Hotel Bourbon", phone: "3130000000", type: "Hotel", origin: "Google Maps", status: "Novo contato", notes: "Tentar falar com recepção ou gerente.", nextAction: "Fazer apresentação da Alves", nextDate: today, createdAt: new Date().toISOString() },
  { id: "3", name: "Empresa Vale", phone: "3131111111", type: "Empresa", origin: "Prospecção corporativa", status: "Orçamento enviado", notes: "Retornar perguntando sobre transporte executivo.", nextAction: "Follow-up de orçamento", nextDate: today, createdAt: new Date().toISOString() },
];

export const defaultTrips: Trip[] = [
  { id: "1", client: "Rayssa", phone: "31998458084", date: today, time: "06:00", route: "BH → Confins", value: 150, status: "Agendada" },
  { id: "2", client: "Cliente Corporativo", phone: "31999999999", date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: "14:30", route: "Savassi → Vila da Serra", value: 120, status: "Agendada" },
];

export const defaultReferrals: Referral[] = [{ id: "1", referrer: "Rayssa", referred: "Rafaela", status: "Transfer realizado", credits: 1 }];
export const defaultFinance: FinanceEntry[] = [{ id: "1", description: "Transfer Rayssa - Confins", value: 150, type: "Entrada", date: today }];
export const defaultProposals: Proposal[] = [];

export function isConfinsRoute(origin: string, destination: string) {
  const routeText = `${origin} ${destination}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return routeText.includes("confins") || routeText.includes("cnf") || routeText.includes("aeroporto internacional");
}

export function estimateRouteValue(origin: string, destination: string, distanceKm: number, passengers = 1, bags = 0, specialLuggage = false): QuoteResult {
  const notes: string[] = [];

  if (passengers > 4 || specialLuggage || bags > 4) {
    notes.push("Orçamento manual recomendado: mais de 4 passageiros, excesso de bagagens ou necessidade de veículo maior.");
    return { value: 0, rule: "Orçamento manual", km: distanceKm || 0, type: "Manual", manual: true, notes };
  }

  if (!distanceKm || distanceKm <= 0) {
    notes.push("Informe o KM da rota para calcular. Use o botão Maps para conferir a distância ou digite manualmente.");
    return { value: 0, rule: "Aguardando KM da rota", km: 0, type: isConfinsRoute(origin, destination) ? "Transfer Confins" : "Corrida agendada", manual: true, notes };
  }

  const rawValue = distanceKm * priceRules.pricePerKm;
  const roundedValue = roundUpTo(rawValue, priceRules.roundTo);
  const type: QuoteResult["type"] = distanceKm >= 100 ? "Viagem rodoviária" : isConfinsRoute(origin, destination) ? "Transfer Confins" : "Corrida agendada";

  return {
    value: roundedValue,
    rule: `R$ ${priceRules.pricePerKm.toFixed(2).replace(".", ",")}/km com arredondamento sempre para cima de ${priceRules.roundTo} em ${priceRules.roundTo}`,
    km: distanceKm,
    type,
    notes,
  };
}

export function buildQuoteMessage(origin: string, destination: string, result: QuoteResult, passengers: number, bags: number) {
  const valueText = result.value ? money(result.value) : "orçamento manual";
  const kmText = result.km ? `${result.km} km` : "a confirmar";

  return `🚘 ALVES MOBILIDADE EXECUTIVA

ORÇAMENTO DE TRANSPORTE EXECUTIVO

📍 Embarque: ${origin}
📍 Destino: ${destination}

👥 Passageiros: ${passengers}
🧳 Bagagens: ${bags}
📏 Distância estimada: ${kmText}
🚘 Tipo: ${result.type}

💰 Valor do atendimento: ${valueText}
📅 Validade do orçamento: 10 dias, até ${quoteValidityDate(10)}

${result.manual ? "Observação: este atendimento precisa de confirmação manual antes do agendamento.\n\n" : ""}Alves Mobilidade Executiva
Conforto, segurança e pontualidade em cada trajeto.`;
}

export function nextActionText(status: Status) {
  const map: Record<Status, string> = {
    "Novo contato": "Enviar apresentação da Alves",
    "Apresentação enviada": "Aguardar resposta ou enviar follow-up",
    "Respondeu": "Enviar orçamento ou coletar dados da viagem",
    "Orçamento enviado": "Fazer follow-up do orçamento",
    "Negociação": "Tentar fechar a viagem",
    "Fechou": "Agendar viagem e confirmar pagamento",
    "Pós-atendimento": "Agradecer e apresentar Programa de Indicação",
    "Arquivado": "Sem ação no momento",
  };
  return map[status];
}

export function nextStatus(status: Status): Status {
  const order: Status[] = ["Novo contato", "Apresentação enviada", "Respondeu", "Orçamento enviado", "Negociação", "Fechou", "Pós-atendimento"];
  const index = order.indexOf(status);
  return index >= 0 && index < order.length - 1 ? order[index + 1] : "Pós-atendimento";
}
