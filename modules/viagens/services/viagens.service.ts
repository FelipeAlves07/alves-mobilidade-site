import { parseSpokenRoute } from "@/lib/voice";
import { estimateRouteValue } from "@/app/admin/constants";
import { cleanPhone } from "@/lib/whatsapp";
import { addDaysISO } from "@/lib/format";
import type { Trip } from "@/domain/trip/types";
import type { Lead } from "@/domain/lead/types";
import type { Referral } from "@/domain/referral/types";
import type { FinanceEntry, FinanceEntryForm } from "@/domain/finance/types";

export function parseVoiceNumbers(text: string) {
  const lower = text.toLowerCase();

  const words: Record<string, number> = {
    um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3, quatro: 4,
    cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  };

  function findBefore(wordsToFind: string[]) {
    for (const word of wordsToFind) {
      const regexNumber = new RegExp(`(\\d+)\\s+${word}`, "i");
      const numberMatch = lower.match(regexNumber);
      if (numberMatch) return Number(numberMatch[1]);

      for (const [name, value] of Object.entries(words)) {
        if (lower.includes(`${name} ${word}`)) return value;
      }
    }
    return null;
  }

  const kmMatch = lower.match(/(\d+)\s*(km|quilometros|quilômetros)/i);

  return {
    passengers: findBefore(["pessoas", "passageiros", "passageiro"]),
    bags: findBefore(["malas", "bagagens", "bagagem"]),
    km: kmMatch ? Number(kmMatch[1]) : null,
  };
}

export function parseVoiceRoute(text: string) {
  return parseSpokenRoute(text);
}

export function calculateQuoteValue(
  origin: string,
  destination: string,
  km: number,
  passengers: number,
  bags: number,
  specialLuggage: boolean,
) {
  return estimateRouteValue(origin, destination, Number(km || 0), passengers, bags, specialLuggage);
}

export interface FinishTripContext {
  leads: Lead[];
  finance: FinanceEntry[];
  referrals: Referral[];
}

export interface FinishTripEffects {
  financeEntry?: FinanceEntryForm;
  leadId?: string;
  leadPatch?: Partial<Lead>;
  referralId?: string;
  referralPatch?: Partial<Referral>;
}

// Efeitos de concluir uma viagem, calculados de forma pura e idempotente:
// - Ganho AME só existe a partir da conclusão e NUNCA duplica (protegido
//   pelo tripId na lista de lançamentos);
// - lead do cliente vira Pós-atendimento;
// - indicação Pendente do indicado vira Convertida com +1 crédito, e uma
//   indicação já convertida nunca é creditada de novo.
export function buildFinishTripEffects(trip: Trip, ctx: FinishTripContext): FinishTripEffects {
  const effects: FinishTripEffects = {};

  if (trip.value > 0 && !ctx.finance.some((f) => f.tripId === trip.id)) {
    effects.financeEntry = {
      description: `Ganho AME — ${trip.client} (${trip.route})`,
      value: Number(trip.value || 0),
      type: "Entrada",
      date: trip.date,
      category: "ganhos_ame",
      tripId: trip.id,
    };
  }

  const existingLead = ctx.leads.find(
    (lead) => cleanPhone(lead.phone) === cleanPhone(trip.phone) || lead.name.toLowerCase() === trip.client.toLowerCase(),
  );
  if (existingLead) {
    effects.leadId = existingLead.id;
    effects.leadPatch = {
      status: "Pós-atendimento",
      nextAction: "Agradecer e apresentar Programa de Indicação",
      nextDate: addDaysISO(2),
    };
  }

  const pendingReferral = ctx.referrals.find(
    (r) =>
      r.status === "Pendente" &&
      (r.referredPhone
        ? cleanPhone(r.referredPhone) === cleanPhone(trip.phone)
        : r.referred.toLowerCase() === trip.client.toLowerCase()),
  );
  if (pendingReferral) {
    effects.referralId = pendingReferral.id;
    effects.referralPatch = {
      status: "Convertida",
      credits: Number(pendingReferral.credits || 0) + 1,
    };
  }

  return effects;
}
