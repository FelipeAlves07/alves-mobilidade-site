"use client";

import { Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { readAMEVisionState } from "@/lib/ameVisionSync";
import { visionDocument } from "@/lib/ameVisionHTML";

export default function TVDebordoPage() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  function sendSettings() {
    try {
      const stored = localStorage.getItem("ame-vision-settings-v6");
      if (stored) {
        const parsed = JSON.parse(stored);
        frameRef.current?.contentWindow?.postMessage({
          type: "AME_VISION_SETTINGS",
          durations: parsed.durations,
          mode: parsed.longTripEnabled ? "long" : "short",
          longTripEnabled: parsed.longTripEnabled,
          restDuration: parsed.restDuration,
          gpsEnabled: parsed.gpsEnabled,
          route: { origin: parsed.routeOrigin?.trim() || "", destination: parsed.routeDestination?.trim() || "" }
        }, "*");
      }
    } catch {}
  }

  function enterFullscreen() {
    document.documentElement.requestFullscreen?.({ navigationUI: "hide" })?.catch?.();
    try { (screen.orientation as any)?.lock?.("landscape")?.catch?.(); } catch {}
    setFullscreen(true);
  }

  function exitFullscreenMode() {
    if (document.fullscreenElement) document.exitFullscreen();
    try { screen.orientation?.unlock?.(); } catch {}
    setFullscreen(false);
  }

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const listener = async (event: MessageEvent) => {
      if (event.data?.type === "AME_VISION_READY") {
        sendSettings();
        try {
          const state = await readAMEVisionState();
          frameRef.current?.contentWindow?.postMessage({ type: "AME_VISION_SESSION", session: state }, "*");
        } catch {}
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      <iframe
        ref={frameRef}
        title="AME Vision"
        srcDoc={visionDocument}
        allow="fullscreen; geolocation"
        className="h-full w-full border-0"
      />

      {!fullscreen && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-sm">
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
            Entrar em tela cheia
          </button>
        </div>
      )}

      {fullscreen && (
        <button
          type="button"
          onClick={exitFullscreenMode}
          className="fixed right-4 top-4 z-20 flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-black/50 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/10"
        >
          <X size={14} /> Sair
        </button>
      )}
    </div>
  );
}
