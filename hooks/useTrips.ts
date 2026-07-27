"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Trip, TripForm } from "@/domain/trip/types";
import { createRepository } from "@/lib/repository-factory";
import {
  tripFromSupabase,
  tripFormToSupabase,
  tripPatchToSupabase,
} from "@/lib/repository-mappers";

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);

  const repo = useMemo(
    () =>
      createRepository<Trip, TripForm>(
        "trips",
        "ame-trips-v2",
        (form, id) => ({ ...form, id, value: Number(form.value || 0) }),
        {
          fromDb: tripFromSupabase,
          toDb: tripFormToSupabase,
          toDbPatch: tripPatchToSupabase,
        },
      ),
    [],
  );

  useEffect(() => {
    repo.findAll().then(setTrips).catch(() => {});
  }, [repo]);

  const addTrip = useCallback(
    async (form: TripForm) => {
      if (!form.client || !form.date || !form.time) return;
      const nova = await repo.create(form);
      setTrips((prev) => [nova, ...prev]);
    },
    [repo],
  );

  const updateTrip = useCallback(
    async (id: string, patch: Partial<TripForm>) => {
      await repo.update(id, patch);
      setTrips((prev) =>
        prev.map((trip) => (trip.id === id ? { ...trip, ...patch } : trip)),
      );
    },
    [repo],
  );

  const deleteTrip = useCallback(
    async (id: string) => {
      await repo.delete(id);
      setTrips((prev) => prev.filter((trip) => trip.id !== id));
    },
    [repo],
  );

  return { trips, setTrips, addTrip, updateTrip, deleteTrip };
}
