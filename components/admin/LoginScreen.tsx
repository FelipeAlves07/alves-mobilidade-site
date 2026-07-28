"use client";

import { Sparkles } from "lucide-react";

type Props = {
  password: string;
  setPassword: (value: string) => void;
  onLogin: () => void;
};

export default function LoginScreen({ password, setPassword, onLogin }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-5">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[var(--accent-15)] bg-gradient-to-b from-[var(--bg-card)] to-[var(--bg-surface)] p-8 shadow-2xl"
          style={{ boxShadow: "0 0 80px rgba(0,0,0,.35)" }}>
          <div className="mb-8 flex flex-col items-center text-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black">AME Control</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Central da Alves Mobilidade Executiva
              </p>
            </div>
          </div>

          <label className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
            Senha de acesso
          </label>

          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onLogin()}
            type="password"
            placeholder="Digite a senha"
            className="input-admin mt-2"
          />

          <button
            type="button"
            onClick={onLogin}
            className="btn-primary mt-5 w-full flex items-center justify-center"
          >
            Entrar no painel
          </button>

          <p className="mt-6 text-center text-xs text-zinc-600">
            Senha inicial: <span className="font-mono text-zinc-400">alves2026</span>
          </p>
        </div>
      </div>
    </main>
  );
}