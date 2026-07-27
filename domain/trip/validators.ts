import type { Trip, TripForm } from "./types";

export function validateTripForm(form: TripForm): string | null {
  if (!form.client.trim()) return "Cliente é obrigatório";
  if (!form.date) return "Data é obrigatória";
  if (!form.time) return "Horário é obrigatório";
  return null;
}

export function validateTrip(trip: Trip): string | null {
  return validateTripForm(trip);
}
