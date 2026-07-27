import { supabase } from "@/lib/supabase";

export type AMEVisionTrip = {
  id: string;
  client: string;
  phone?: string;
  date: string;
  time: string;
  origin: string;
  destination: string;
  driver?: string;
  vehicle?: string;
  message?: string;
};

export type AMEVisionState = {
  id: string;
  status: "idle" | "prepared" | "running" | "completed";
  trip: AMEVisionTrip | null;
  started_at: string | null;
  updated_at: string;
};

export const DEFAULT_VISION_STATE: AMEVisionState = {
  id: "main",
  status: "idle",
  trip: null,
  started_at: null,
  updated_at: new Date(0).toISOString(),
};

export async function readAMEVisionState(): Promise<AMEVisionState> {
  const { data, error } = await supabase
    .from("ame_vision_state")
    .select("id,status,trip,started_at,updated_at")
    .eq("id", "main")
    .maybeSingle();
  if (error) throw error;
  return data ? { ...DEFAULT_VISION_STATE, ...data } as AMEVisionState : DEFAULT_VISION_STATE;
}

export async function writeAMEVisionState(patch: Partial<AMEVisionState>) {
  const payload = {
    id: "main",
    ...patch,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("ame_vision_state")
    .upsert(payload, { onConflict: "id" })
    .select("id,status,trip,started_at,updated_at")
    .single();
  if (error) throw error;
  return data as AMEVisionState;
}
