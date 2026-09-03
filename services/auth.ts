import { supabase } from "@/lib/supabase";
import type { AuthState } from "@/domain/auth/types";

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
  localStorage.setItem("ame-admin-auth", "true");
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
  localStorage.removeItem("ame-admin-auth");
  await supabase.auth.signOut();
}

export async function restoreSession(): Promise<AuthState | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  localStorage.setItem("ame-admin-auth", "true");
  return {
    logged: true,
    user: {
      id: data.session.user.id,
      email: data.session.user.email ?? "",
      name: data.session.user.user_metadata?.name ?? "Admin",
    },
  };
}

export function checkLocalAuth(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("ame-admin-auth") === "true";
}
