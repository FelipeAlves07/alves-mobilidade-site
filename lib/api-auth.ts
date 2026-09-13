import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export interface ApiAuthResult {
  ok: true;
  userId: string;
  supabase: SupabaseClient;
}

const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
};

/** Headers for ALL admin API responses (error and success). */
export const adminHeaders = noStoreHeaders;

export function unauthorized(message = "Sessão inválida. Faça login novamente.") {
  return NextResponse.json({ error: message }, { status: 401, headers: noStoreHeaders });
}

export function forbidden(message = "Acesso negado. Você não tem permissão.") {
  return NextResponse.json({ error: message }, { status: 403, headers: noStoreHeaders });
}

/**
 * Validates the request has a valid Supabase session and the user is in admin_users.
 * Returns the userId + service-role Supabase client on success.
 */
export async function requireAdminAuth(request: Request): Promise<ApiAuthResult | NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Configuração incompleta." }, { status: 500 });
  }

  // Extract bearer token from Authorization header
  const authHeader = request.headers.get("authorization") || "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch?.[1]) {
    return unauthorized();
  }
  const token = tokenMatch[1];

  // Verify token against Supabase Auth using service-role client
  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) {
    return unauthorized();
  }

  // Check admin_users table
  const { data: adminRow, error: adminError } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (adminError || !adminRow) {
    return forbidden();
  }

  return { ok: true, userId: data.user.id, supabase: adminClient };
}
