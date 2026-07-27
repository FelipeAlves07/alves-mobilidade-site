import { parseSpokenRoute } from "@/lib/voice";
import { estimateRouteValue } from "@/app/admin/constants";

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
