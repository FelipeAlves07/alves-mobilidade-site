import type { WebSocketLikeConstructor } from "@supabase/supabase-js";
import WebSocket from "ws";

// `ws` possui uma sobrecarga adicional para servidor que não faz parte do
// contrato cliente do Supabase; em runtime, o construtor cliente é compatível.
export const nodeWebSocketTransport =
  WebSocket as unknown as WebSocketLikeConstructor;
