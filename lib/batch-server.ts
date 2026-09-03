import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  BatchConfigurationError,
  BatchForbiddenError,
  BatchUnauthorizedError,
} from "@/domain/autoprospect/batch";

function createBatchServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new BatchConfigurationError(
      "Processamento em lote indisponível: credencial de servidor não configurada.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    throw new BatchUnauthorizedError("Faça login para executar ações de lote.");
  }
  return match[1];
}

function batchOperatorIds(): Set<string> {
  const configured = (process.env.BATCH_OPERATOR_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (configured.length === 0) {
    throw new BatchConfigurationError(
      "Processamento em lote indisponível: operadores do servidor não configurados.",
    );
  }
  return new Set(configured);
}

/** Autentica e autoriza o operador antes de expor o cliente service-role. */
export async function requireBatchServerClient(request: Request): Promise<SupabaseClient> {
  const client = createBatchServerClient();
  const { data, error } = await client.auth.getUser(bearerToken(request));
  if (error || !data.user) {
    throw new BatchUnauthorizedError("Sua sessão não é válida para executar ações de lote.");
  }
  if (!batchOperatorIds().has(data.user.id)) {
    throw new BatchForbiddenError("Sua conta não tem permissão para executar ações de lote.");
  }
  return client;
}
