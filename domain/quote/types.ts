export type QuoteTabType = "normal" | "disposal" | "long";

export interface QuoteConfig {
  fuelConsumptionKmL: number;
  fuelPricePerLiter: number;
  mealCostPerMeal: number;
  mealKmThreshold: number;
  pricePerKmNormal: number;
  pricePerKmDisposal: number;
  pricePerHourDisposal: number;
  pricePerKmLong: number;
  profitMarginPercent: number;
}

export const DEFAULT_QUOTE_CONFIG: QuoteConfig = {
  fuelConsumptionKmL: 10,
  fuelPricePerLiter: 6,
  mealCostPerMeal: 50,
  mealKmThreshold: 500,
  pricePerKmNormal: 2.8,
  pricePerKmDisposal: 2.8,
  pricePerHourDisposal: 60,
  pricePerKmLong: 3.4,
  profitMarginPercent: 0,
};

export interface NormalQuoteForm {
  origin: string;
  destination: string;
  distanceKm: number;
  durationSec: number;
  durationText: string;
  passengers: number;
}

export interface DisposalQuoteForm {
  origin: string;
  destination: string;
  distanceKm: number;
  durationSec: number;
  durationText: string;
  startHour: string;
  endHour: string;
  passengers: number;
}

export interface LongTripQuoteForm {
  origin: string;
  destination: string;
  distanceKm: number;
  durationSec: number;
  durationText: string;
  tollCost: number;
  tollPlazas: TollPlazaInfo[];
  passengers: number;
  roundTrip: boolean;
}

export interface TollPlazaInfo {
  name: string;
  highway: string;
  cost: number;
  state: string;
}

export interface CostBreakdown {
  fuelCost: number;
  tollCost: number;
  mealCost: number;
  totalCost: number;
  totalPrice: number;
  profit: number;
  profitPerKm: number;
  durationHours: number;
  mealsCount: number;
}

export interface QuoteResult2 {
  price: number;
  breakdown: CostBreakdown;
  form: NormalQuoteForm | DisposalQuoteForm | LongTripQuoteForm;
  type: QuoteTabType;
}
