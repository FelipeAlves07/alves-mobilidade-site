import { supabase } from "@/lib/supabase";
import type { Trip, TripForm, TripStatus } from "@/domain/trip/types";

function toCamelCase(row: any): Trip {
  return {
    id: row.id,
    client: row.client,
    phone: row.phone,
    date: row.date,
    time: row.time,
    route: row.route,
    value: Number(row.value),
    status: row.status as TripStatus,
  };
}

function toSnakeCase(trip: TripForm) {
  return {
    client: trip.client,
    phone: trip.phone,
    date: trip.date,
    time: trip.time,
    route: trip.route,
    value: trip.value,
    status: trip.status,
  };
}

export async function listarTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toCamelCase);
}

export async function criarTrip(trip: TripForm): Promise<Trip> {
  const { data, error } = await supabase
    .from("trips")
    .insert(toSnakeCase(trip))
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function editarTrip(id: string, patch: Partial<TripForm>): Promise<Trip> {
  const { data, error } = await supabase
    .from("trips")
    .update(toSnakeCase(patch as TripForm))
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return toCamelCase(data);
}

export async function excluirTrip(id: string): Promise<void> {
  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) throw error;
}
