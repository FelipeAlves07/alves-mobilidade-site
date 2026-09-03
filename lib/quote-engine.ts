import type {
  QuoteConfig,
  NormalQuoteForm,
  DisposalQuoteForm,
  LongTripQuoteForm,
  CostBreakdown,
  QuoteResult2,
} from "@/domain/quote/types";
import { money } from "./quotes";

function roundUpTo10(value: number): number {
  return Math.ceil(value / 10) * 10;
}

function calcMealsByKm(distanceKm: number, config: QuoteConfig): { cost: number; count: number } {
  const count = Math.floor(distanceKm / config.mealKmThreshold);
  return { cost: count * config.mealCostPerMeal, count };
}

function calcDurationHours(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let hours = eh - sh + (em - sm) / 60;
  if (hours < 0) hours += 24;
  return hours;
}

export function calculateNormalQuote(
  form: NormalQuoteForm,
  config: QuoteConfig
): QuoteResult2 {
  const rawPrice = form.distanceKm * config.pricePerKmNormal;
  const price = roundUpTo10(rawPrice);

  const breakdown: CostBreakdown = {
    fuelCost: 0,
    tollCost: 0,
    mealCost: 0,
    totalCost: 0,
    totalPrice: price,
    profit: price,
    profitPerKm: form.distanceKm > 0 ? Math.round((price / form.distanceKm) * 100) / 100 : 0,
    durationHours: form.durationSec > 0 ? Math.round((form.durationSec / 3600) * 10) / 10 : 0,
    mealsCount: 0,
  };

  return { price, breakdown, form, type: "normal" };
}

export function calculateDisposalQuote(
  form: DisposalQuoteForm,
  config: QuoteConfig
): QuoteResult2 {
  const durationHours = calcDurationHours(form.startHour, form.endHour);
  const distanceKm = form.distanceKm || 0;

  const kmPrice = distanceKm * config.pricePerKmDisposal;
  const hourPrice = durationHours * config.pricePerHourDisposal;
  const rawPrice = kmPrice + hourPrice;
  const price = roundUpTo10(rawPrice);

  const breakdown: CostBreakdown = {
    fuelCost: 0,
    tollCost: 0,
    mealCost: 0,
    totalCost: 0,
    totalPrice: price,
    profit: price,
    profitPerKm: distanceKm > 0 ? Math.round((price / distanceKm) * 100) / 100 : 0,
    durationHours: Math.round(durationHours * 10) / 10,
    mealsCount: 0,
  };

  return { price, breakdown, form, type: "disposal" };
}

export function calculateLongTripQuote(
  form: LongTripQuoteForm,
  config: QuoteConfig
): QuoteResult2 {
  const effectiveDistance = form.roundTrip ? form.distanceKm * 2 : form.distanceKm;
  const tollCost = form.roundTrip ? form.tollCost * 2 : form.tollCost;
  const meals = calcMealsByKm(effectiveDistance, config);

  const kmPrice = effectiveDistance * config.pricePerKmLong;
  const rawPrice = kmPrice + tollCost + meals.cost;
  const price = Math.round(rawPrice);

  const totalCost = tollCost + meals.cost;
  const profit = price - totalCost;

  const breakdown: CostBreakdown = {
    fuelCost: 0,
    tollCost: Math.round(tollCost * 100) / 100,
    mealCost: Math.round(meals.cost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    totalPrice: price,
    profit: Math.round(profit * 100) / 100,
    profitPerKm: effectiveDistance > 0 ? Math.round((profit / effectiveDistance) * 100) / 100 : 0,
    durationHours: form.durationSec > 0 ? Math.round((form.durationSec / 3600) * 10) / 10 : 0,
    mealsCount: meals.count,
  };

  return { price, breakdown, form, type: "long" };
}
