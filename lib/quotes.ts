import type { QuoteResult } from "@/types/admin";

export const quoteRules = {
  pricePerKm: 3,
  roundTo: 10,
  validityDays: 10,
};

export function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function roundUpTo(value: number, step = quoteRules.roundTo) {
  return Math.ceil(value / step) * step;
}

export function calculateQuoteByKm(params: {
  km: number;
  passengers?: number;
  bags?: number;
  specialLuggage?: boolean;
}): QuoteResult {
  const km = Number(params.km || 0);
  const passengers = Number(params.passengers || 1);
  const bags = Number(params.bags || 0);
  const specialLuggage = Boolean(params.specialLuggage);

  const notes: string[] = [];

  if (passengers > 4 || bags > 4 || specialLuggage) {
    notes.push(
      "Orçamento manual recomendado: mais de 4 passageiros, excesso de bagagens ou necessidade de veículo maior."
    );

    return {
      value: 0,
      rule: "Orçamento manual",
      km,
      type: "Manual",
      manual: true,
      notes,
    };
  }

  if (!km || km <= 0) {
    notes.push("Informe a quilometragem da rota para calcular o orçamento.");

    return {
      value: 0,
      rule: "Aguardando KM da rota",
      km: 0,
      type: "Manual",
      manual: true,
      notes,
    };
  }

  const rawValue = km * quoteRules.pricePerKm;
  const roundedValue = roundUpTo(rawValue, quoteRules.roundTo);

  let type: QuoteResult["type"] = "Corrida agendada";

  if (km >= 100) {
    type = "Viagem rodoviária";
  }

  return {
    value: roundedValue,
    rule: `R$ ${quoteRules.pricePerKm.toFixed(2).replace(".", ",")}/km com arredondamento sempre para cima de ${quoteRules.roundTo} em ${quoteRules.roundTo}`,
    km,
    type,
    manual: false,
    notes,
  };
}

export function quoteValidityDate(days = quoteRules.validityDays) {
  return new Date(Date.now() + days * 86400000).toLocaleDateString("pt-BR");
}

export function buildQuoteMessage(params: {
  client?: string;
  origin: string;
  destination: string;
  result: QuoteResult;
  passengers: number;
  bags: number;
}) {
  const valueText = params.result.value
    ? money(params.result.value)
    : "orçamento manual";

  const kmText = params.result.km ? `${params.result.km} km` : "a confirmar";

  return `🚘 ALVES MOBILIDADE EXECUTIVA

ORÇAMENTO DE TRANSPORTE EXECUTIVO

${params.client ? `Cliente: ${params.client}\n` : ""}📍 Embarque: ${params.origin}
📍 Destino: ${params.destination}

👥 Passageiros: ${params.passengers}
🧳 Bagagens: ${params.bags}
📏 Distância estimada: ${kmText}
🚘 Tipo: ${params.result.type}

💰 Valor do atendimento: ${valueText}
📅 Validade do orçamento: 10 dias, até ${quoteValidityDate(10)}

${params.result.manual ? "Observação: este atendimento precisa de confirmação manual antes do agendamento.\n\n" : ""}Alves Mobilidade Executiva
Conforto, segurança e pontualidade em cada trajeto.`;
}