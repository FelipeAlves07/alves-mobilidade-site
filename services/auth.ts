import { supabase } from "@/lib/supabase";
import type { AuthState } from "@/domain/auth/types";

async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) return false;
  return data === true;
}

export async function signIn(email: string, password: string): Promise<AuthState> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
      throw new Error("Email ou senha incorretos.");
    }
    if (msg.includes("user not found") || msg.includes("no user found")) {
      throw new Error("Este email não está cadastrado. Solicite o provisionamento a um administrador.");
    }
    if (msg.includes("email not confirmed") || msg.includes("email_confirm")) {
      throw new Error("Email não confirmado. Solicite a confirmação a um administrador.");
    }
    throw error;
  }

  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    await supabase.auth.signOut();
    throw new Error("Acesso não autorizado. Apenas administradores podem acessar o painel.");
  }

  return {
    logged: true,
    user: {
      id: data.user.id,
      email: data.user.email ?? "",
      name: data.user.user_metadata?.name ?? "Admin",
    },
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function restoreSession(): Promise<AuthState | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    await supabase.auth.signOut();
    return null;
  }

  return {
    logged: true,
    user: {
      id: data.session.user.id,
      email: data.session.user.email ?? "",
      name: data.session.user.user_metadata?.name ?? "Admin",
    },
  };
}
