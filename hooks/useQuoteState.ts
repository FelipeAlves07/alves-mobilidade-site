"use client";

import { useState, useCallback } from "react";
import type { QuoteResult } from "@/domain/trip/types";
import { calculateQuoteValue } from "@/modules/viagens/services/viagens.service";
import { today } from "@/app/admin/constants";

type QuoteState = {
  origin: string;
  destination: string;
  km: number;
  passengers: number;
  bags: number;
  specialLuggage: boolean;
  result: QuoteResult | null;
  client: string;
  phone: string;
  date: string;
  time: string;
};

const initialState: QuoteState = {
  origin: "Belo Horizonte - MG",
  destination: "Aeroporto Internacional de Confins",
  km: 0,
  passengers: 1,
  bags: 0,
  specialLuggage: false,
  result: null,
  client: "",
  phone: "",
  date: today,
  time: "",
};

export function useQuoteState() {
  const [state, setState] = useState<QuoteState>(initialState);

  const setOrigin = useCallback((origin: string) => {
    setState((prev) => ({ ...prev, origin, result: null }));
  }, []);

  const setDestination = useCallback((destination: string) => {
    setState((prev) => ({ ...prev, destination, result: null }));
  }, []);

  const setKm = useCallback((km: number) => {
    setState((prev) => ({ ...prev, km, result: null }));
  }, []);

  const setPassengers = useCallback((passengers: number) => {
    setState((prev) => ({ ...prev, passengers, result: null }));
  }, []);

  const setBags = useCallback((bags: number) => {
    setState((prev) => ({ ...prev, bags, result: null }));
  }, []);

  const setSpecialLuggage = useCallback((specialLuggage: boolean) => {
    setState((prev) => ({ ...prev, specialLuggage, result: null }));
  }, []);

  const setResult = useCallback((result: QuoteResult | null) => {
    setState((prev) => ({ ...prev, result }));
  }, []);

  const setClient = useCallback((client: string) => {
    setState((prev) => ({ ...prev, client }));
  }, []);

  const setPhone = useCallback((phone: string) => {
    setState((prev) => ({ ...prev, phone }));
  }, []);

  const setDate = useCallback((date: string) => {
    setState((prev) => ({ ...prev, date }));
  }, []);

  const setTime = useCallback((time: string) => {
    setState((prev) => ({ ...prev, time }));
  }, []);

  const calculateQuote = useCallback(() => {
    const result = calculateQuoteValue(
      state.origin,
      state.destination,
      state.km,
      state.passengers,
      state.bags,
      state.specialLuggage
    );
    setState((prev) => ({ ...prev, result }));
    return result;
  }, [state.origin, state.destination, state.km, state.passengers, state.bags, state.specialLuggage]);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    setOrigin,
    setDestination,
    setKm,
    setPassengers,
    setBags,
    setSpecialLuggage,
    setResult,
    setClient,
    setPhone,
    setDate,
    setTime,
    calculateQuote,
    reset,
  };
}
