"use client";

import { Sparkles } from "lucide-react";

type Props = {
  password: string;
  setPassword: (value: string) => void;
  onLogin: () => void;
};

export default function LoginScreen({ password, setPassword, onLogin }: Props) {
  return (
    <main className="min-h-screen bg-[#0f0f0f] px-5 py-10 text-[#f5f0e8]">
      <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
        <div className="rounded-[2rem] border border-[#d6a85f]/20 bg-[#171717] p-8 shadow-[0_0_80px_rgba(0,0,0,.35)]">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d6a85f]/15 text-[#f1d28b]">
              <Sparkles />
            </div>

            <div>
              <h1 className="text-2xl font-black">AME Control</h1>
              <p className="text-sm text-zinc-400">
                Central da Alves Mobilidade Executiva
              </p>
            </div>
          </div>

          <label className="text-xs font-black uppercase tracking-[0.2em] text-[#d6a85f]">
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
            className="mt-5 w-full cursor-pointer rounded-full bg-gradient-to-r from-[#f1d28b] to-[#b8863b] px-6 py-4 text-sm font-black uppercase tracking-wide text-black"
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