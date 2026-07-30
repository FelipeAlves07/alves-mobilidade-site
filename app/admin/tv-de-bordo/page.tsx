"use client";

import { Maximize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { readAMEVisionState, type AMEVisionState } from "@/lib/ameVisionSync";
import { visionDocument } from "@/lib/ameVisionHTML";

export default function TVDebordoPage() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [online, setOnline] = useState(true);
  const lastStateRef = useRef<string>("");
  const lastSettingsRef = useRef<string>("");

  function post(msg: object) {
    frameRef.current?.contentWindow?.postMessage(msg, "*");
  }

  function sendSettings() {
    try {
      const raw = localStorage.getItem("ame-vision-settings-v6") || "{}";
      if (raw === lastSettingsRef.current) return;
      lastSettingsRef.current = raw;
      const p = JSON.parse(raw);
      post({
        type: "AME_VISION_SETTINGS",
        durations: p.durations,
        mode: p.longTripEnabled ? "long" : "short",
        longTripEnabled: p.longTripEnabled,
        restDuration: p.restDuration,
        gpsEnabled: p.gpsEnabled,
        routeEnabled: p.routeEnabled !== false,
        route: { origin: (p.routeOrigin || "").trim(), destination: (p.routeDestination || "").trim() }
      });
    } catch {}
  }

  async function pollState() {
    try {
      const state = await readAMEVisionState();
      const serialized = JSON.stringify(state);
      if (serialized !== lastStateRef.current) {
        lastStateRef.current = serialized;
        post({ type: "AME_VISION_SESSION", session: state });
      }
    } catch {}
  }

  async function enterFullscreen() {
    try {
      await screenRef.current?.requestFullscreen?.({ navigationUI: "hide" });
      try { await (screen.orientation as any)?.lock?.("landscape"); } catch {}
      setFullscreen(true);
      setShowPrompt(false);
    } catch {}
  }

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        setFullscreen(false);
        setShowPrompt(true);
        try { screen.orientation?.unlock?.(); } catch {}
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    function onReady() {
      setReady(true);
      pollState();
      sendSettings();
    }
    const listener = (event: MessageEvent) => {
      if (event.data?.type === "AME_VISION_READY") onReady();
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const timer = window.setInterval(() => { pollState(); sendSettings(); }, 3000);
    const onlineTimer = window.setInterval(() => setOnline(navigator.onLine), 2000);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      document.body.style.overflow = "";
      window.clearInterval(timer);
      window.clearInterval(onlineTimer);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <div
      ref={screenRef}
      className="fixed inset-0 flex flex-col bg-black"
    >
      {!ready && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-[var(--accent)]" />
          <p className="text-sm text-zinc-500">Carregando AME Vision…</p>
        </div>
      )}

      <iframe
        ref={frameRef}
        title="AME Vision"
        srcDoc={visionDocument}
        allow="fullscreen; geolocation"
        className={`h-full w-full border-0 ${ready ? "" : "invisible"}`}
      />

      <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${ready ? "bg-green-400" : "bg-zinc-600"}`} />
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{ready ? "Conectado" : "Conectando…"}</span>
        {!online && <span className="ml-1 text-[10px] font-bold text-red-400">Sinal perdido</span>}
      </div>

      {showPrompt && ready && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-black/80 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Alves Mobilidade Executiva</p>
            <h2 className="mt-2 text-3xl font-black text-white">AME Vision</h2>
            <p className="mt-1 text-sm text-zinc-500">TV de Bordo</p>
          </div>
          <button
            type="button"
            onClick={enterFullscreen}
            className="flex cursor-pointer items-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-8 py-4 text-base font-bold text-white shadow-2xl transition hover:scale-105 active:scale-95"
          >
            <Maximize2 size={20} />
            {fullscreen === false && !showPrompt ? "Reativar tela cheia" : "Entrar em tela cheia"}
          </button>
          <p className="text-xs text-zinc-600">Toque para entrar em modo paisagem</p>
        </div>
      )}

    </div>
  );
}
