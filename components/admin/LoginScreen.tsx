"use client";

import { Sparkles } from "lucide-react";

type Props = {
  password: string;
  setPassword: (value: string) => void;
  onLogin: () => void;
};

export default function LoginScreen({ password, setPassword, onLogin }: Props) {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-5 py-10">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <div className="rounded-xl border border-[var(--accent-20)] bg-[var(--bg-card)] p-8" style={{ boxShadow: "0 0 80px rgba(0,0,0,.35)" }}>
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-15)] text-[var(--accent)]">
              <Sparkles />
            </div>

            <div>
              <h1 className="text-2xl font-black">AME Control</h1>
              <p className="text-sm text-zinc-400">
                Central da Alves Mobilidade Executiva
              </p>
            </div>
          </div>

          <label className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Senha de acesso
          </label>

          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onLogin()}
            type="password"
            placeholder="Digite a senha"
            className="input-admin mt-3"
          />

          <button
            type="button"
            onClick={onLogin}
            className="mt-5 w-full cursor-pointer rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-6 py-4 text-sm font-bold uppercase tracking-wide text-white transition hover:-translate-y-0.5 active:translate-y-0"
          >
            Entrar no painel
          </button>

          <p className="mt-5 text-center text-xs text-zinc-500">
            Senha inicial: alves2026
          </p>
        </div>
      </div>
    </main>
  );
}