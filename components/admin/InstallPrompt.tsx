"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("ame-install-dismissed");
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    function handler(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setTimeout(() => setShow(true), 2000);
    }

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferred(null);
  }, [deferred]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem("ame-install-dismissed", "true");
  }, []);

  if (dismissed || !show || !deferred) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--accent-20)] bg-[var(--bg-card)] p-6 shadow-2xl animate-enter-up">
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-3 cursor-pointer rounded-lg p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)]">
            <Smartphone size={32} className="text-white" />
          </div>

          <h3 className="mt-4 text-lg font-black text-white">Instalar AME Control</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Instale o app no seu celular ou computador para acesso rápido, tela cheia e funcionamento offline.
          </p>

          <button
            onClick={handleInstall}
            className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-6 py-3.5 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.98]"
          >
            <Download size={18} /> Instalar App
          </button>

          <button
            onClick={handleDismiss}
            className="mt-3 cursor-pointer text-xs text-zinc-500 hover:text-zinc-300"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
