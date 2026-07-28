"use client";

import { CheckCircle2, MapPin, Maximize2, Navigation, Play, RotateCcw, Save, Settings2, Square, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_VISION_STATE, readAMEVisionState, writeAMEVisionState, type AMEVisionState } from "@/lib/ameVisionSync";

const visionDocument = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#050505">
  <base href="/ame-vision/">
  <title>AME Vision</title>
  <link rel="stylesheet" href="assets/css/ame-vision.css">
  <style>html,body{background:#000}</style>
</head>
<body>
  <div id="system-warning" class="system-warning" hidden></div>
  <div class="vision-shell">
    <header class="vision-header">
      <div class="brand">
        <img src="assets/images/logo/ame-logo-header.png" alt="Alves Mobilidade Executiva">
        <div class="brand-copy">
          <strong>ALVES MOBILIDADE EXECUTIVA</strong>
          <span>CONFORTO · SEGURANÇA · PONTUALIDADE</span>
        </div>
      </div>
      <div class="clock">
        <strong id="clock">00:00</strong>
        <span id="date"></span>
      </div>
      <nav id="navigation" class="top-navigation" aria-label="Áreas do AME Vision"></nav>
    </header>
    <main id="viewport" class="viewport" aria-live="polite"></main>
    <footer class="vision-footer">
      <div class="footer-brand">AME VISION</div>
      <div class="progress-track"><div id="progress-fill" class="progress-fill"></div></div>
      <div class="footer-right"><span id="screen-status" class="screen-status">Iniciando</span></div>
    </footer>
  </div>
  <script type="module" src="assets/js/main.js"></script>
</body>
</html>`;

type DurationMap = Record<string, number>;

const screenOptions = [
  { id: "welcome", label: "Início / Boas-vindas", seconds: 18, group: "AME" },
  { id: "trip", label: "Informações da viagem", seconds: 26, group: "Informação" },
  { id: "live-map", label: "Mapa e rota ao vivo", seconds: 600, group: "Descanso / informação" },
  { id: "weather", label: "Clima", seconds: 24, group: "Informação" },
  { id: "news", label: "Notícias (10 matérias)", seconds: 100, group: "Entretenimento" },
  { id: "comfort", label: "A bordo", seconds: 24, group: "Informação" },
  { id: "pause-one", label: "Pausa visual 1", seconds: 20, group: "Entretenimento" },
  { id: "fleet", label: "Todos os carros", seconds: 45, group: "AME" },
  { id: "destinations", label: "Todas as cidades", seconds: 60, group: "Entretenimento" },
  { id: "referral", label: "Programa de indicação", seconds: 32, group: "AME" },
  { id: "reviews", label: "Avaliações", seconds: 28, group: "AME" },
  { id: "contact", label: "Contato", seconds: 32, group: "AME" },
  { id: "pause-two", label: "Pausa visual 2", seconds: 22, group: "Entretenimento" },
];

const defaults = Object.fromEntries(screenOptions.map(item => [item.id, item.seconds]));
const STORAGE_KEY = "ame-vision-settings-v6";

type AdminTrip = { id: string; client: string; phone: string; date: string; time: string; route: string; status: string };

function parseRoute(route: string) {
  const parts = route.split(/→|->| até | para /i).map(part => part.trim()).filter(Boolean);
  return { origin: parts[0] || "Belo Horizonte - MG", destination: parts[1] || route || "Aeroporto Internacional de Confins" };
}

export default function AMEVisionPanel({ trips = [] }: { trips?: AdminTrip[] }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [durations, setDurations] = useState<DurationMap>(defaults);
  const [saved, setSaved] = useState(false);
  const [longTripEnabled, setLongTripEnabled] = useState(true);
  const [restDuration, setRestDuration] = useState(600);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState("");
  const [routeDestination, setRouteDestination] = useState("");
  const [remoteState, setRemoteState] = useState<AMEVisionState>(DEFAULT_VISION_STATE);
  const [syncMessage, setSyncMessage] = useState("");
  const [selectedTripId, setSelectedTripId] = useState("");
  const [universalMode, setUniversalMode] = useState(false);
  const [driverName, setDriverName] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [tripMessage, setTripMessage] = useState("");
  const [fullViewport, setFullViewport] = useState(false);

  const upcomingTrips = useMemo(() => trips
    .filter(trip => trip.status === "Agendada")
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)), [trips]);

  useEffect(() => {
    if (!selectedTripId && upcomingTrips[0]) setSelectedTripId(upcomingTrips[0].id);
  }, [selectedTripId, upcomingTrips]);

  useEffect(() => {
    setDriverName("");
    setVehicleModel("");
    if (selectedTripId) {
      const messages = [
        "Relaxe e aproveite cada minuto da sua jornada! 🚗",
        "Seu conforto é a nossa prioridade. Boa viagem! ✨",
        "Prontos para tornar seu trajeto especial! 🌟",
        "A estrada fica mais leve com tranquilidade. Aproveite! 🛣️",
        "Bem-vindo a bordo! Desejamos uma viagem incrível! 🙌",
        "Sente-se, relaxe e deixe o resto conosco! 😊",
        "Sua viagem começa com um sorriso. Tenha um ótimo dia! ☀️",
        "Sua satisfação é a nossa maior recompensa! 🏆",
        "Aqui é lugar de conforto e segurança. Boa viagem! 🚙",
        "Prepare-se para uma experiência premium! 🎯",
      ];
      setTripMessage(messages[Math.floor(Math.random() * messages.length)]);
    } else {
      setTripMessage("");
    }
  }, [selectedTripId, upcomingTrips]);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try { const state = await readAMEVisionState(); if (alive) setRemoteState(state); }
      catch { if (alive) setSyncMessage("Crie a tabela ame_vision_state no Supabase para ativar o controle remoto."); }
    };
    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => { alive = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) { const parsed = JSON.parse(stored); setDurations({ ...defaults, ...(parsed.durations || parsed) }); setLongTripEnabled(parsed.longTripEnabled ?? parsed.mode !== "short"); setRestDuration(Number(parsed.restDuration) || 600); setGpsEnabled(Boolean(parsed.gpsEnabled)); setRouteOrigin(String(parsed.routeOrigin || "")); setRouteDestination(String(parsed.routeDestination || "")); }
    } catch {}
  }, []);

  const totalMinutes = useMemo(() => {
    const schedule = ["news","weather","destinations","pause-one","welcome","news","comfort","trip","fleet","weather","pause-two","destinations","news","reviews","weather","pause-one","referral","news","contact","fleet"];
    const seconds = schedule.reduce((sum, id) => sum + (durations[id] || defaults[id] || 24), 0);
    return Math.round(seconds / 60);
  }, [durations]);

  function sendSettings(next = durations, nextLong = longTripEnabled, nextRest = restDuration, nextGps = gpsEnabled, nextOrigin = routeOrigin, nextDestination = routeDestination) {
    frameRef.current?.contentWindow?.postMessage({
      type: "AME_VISION_SETTINGS",
      durations: next,
      mode: nextLong ? "long" : "short",
      longTripEnabled: nextLong,
      restDuration: nextRest,
      gpsEnabled: nextGps,
      route: { origin: nextOrigin.trim(), destination: nextDestination.trim() }
    }, "*");
  }

  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage({ type: "AME_VISION_SESSION", session: remoteState }, "*");
  }, [remoteState]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.data?.type === "AME_VISION_READY") {
        sendSettings();
        frameRef.current?.contentWindow?.postMessage({ type: "AME_VISION_SESSION", session: remoteState }, "*");
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  });

  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        setFullViewport(false);
        try { screen.orientation?.unlock?.(); } catch {}
      }
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  function openFullViewport() {
    setFullViewport(true);
    try {
      frameRef.current?.requestFullscreen?.({ navigationUI: "hide" })?.catch?.();
    } catch {}
    try { (screen.orientation as any)?.lock?.("landscape")?.catch?.(); } catch {}
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ durations, longTripEnabled, restDuration, gpsEnabled, routeOrigin, routeDestination }));
    sendSettings(durations, longTripEnabled, restDuration, gpsEnabled, routeOrigin, routeDestination);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function resetSettings() {
    setDurations(defaults);
    setLongTripEnabled(true);
    setRestDuration(600);
    setGpsEnabled(false);
    setRouteOrigin("");
    setRouteDestination("");
    localStorage.removeItem(STORAGE_KEY);
    sendSettings(defaults, true, 600, false, "", "");
  }

  function startRoute() {
    const enabled = true;
    setGpsEnabled(enabled);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ durations, longTripEnabled, restDuration, gpsEnabled: enabled, routeOrigin, routeDestination }));
    sendSettings(durations, longTripEnabled, restDuration, enabled, routeOrigin, routeDestination);
    window.setTimeout(() => frameRef.current?.contentWindow?.postMessage({ type: "AME_VISION_OPEN_SCREEN", screenId: "live-map" }, "*"), 250);
    setSettingsOpen(false);
  }

  async function setJourneyStatus(status: "prepared" | "running" | "completed" | "idle") {
    try {
      const selected = upcomingTrips.find(trip => trip.id === selectedTripId);
      let currentTrip = status === "idle" ? null : (selected || (remoteState.trip ? {
        id: remoteState.trip.id, client: remoteState.trip.client, phone: remoteState.trip.phone || "", date: remoteState.trip.date, time: remoteState.trip.time,
        route: `${remoteState.trip.origin} → ${remoteState.trip.destination}`, status: "Agendada"
      } : undefined));
      if (universalMode && !currentTrip && status !== "idle") {
        currentTrip = { id: "universal", client: "Passageiro(a)", phone: "", date: "", time: "", route: "Origem → Destino", status: "Agendada" };
      }
      if (!currentTrip && status !== "idle") { setSyncMessage("Selecione uma viagem ou ative o Modo Universal."); return; }
      const clientName = universalMode ? "Passageiro(a)" : (currentTrip?.client || "Passageiro");
      const route = currentTrip ? parseRoute(currentTrip.route) : { origin: "", destination: "" };
      const next = await writeAMEVisionState({
        status,
        trip: currentTrip ? { id: currentTrip.id, client: clientName, phone: currentTrip.phone || "", date: currentTrip.date || "", time: currentTrip.time || "", ...route, driver: driverName || undefined, vehicle: vehicleModel || undefined, message: (universalMode ? "Tenha uma ótima viagem!" : tripMessage) || undefined } : null,
        started_at: status === "running" ? new Date().toISOString() : (status === "prepared" ? null : remoteState.started_at)
      });
      setRemoteState(next);
      setSyncMessage(status === "prepared" ? "Viagem preparada no tablet." : status === "running" ? "Ciclo iniciado no tablet." : status === "completed" ? "Tela de despedida enviada." : "AME Vision voltou ao modo de espera.");
      if (currentTrip) {
        setRouteOrigin(route.origin); setRouteDestination(route.destination); setGpsEnabled(true);
        sendSettings(durations, longTripEnabled, restDuration, true, route.origin, route.destination);
      }
    } catch {
      setSyncMessage("Não foi possível sincronizar. Crie a tabela ame_vision_state no Supabase.");
    }
  }

  return (
    <>
      <div className={fullViewport ? "hidden" : "space-y-8"}>
        <div className="flex flex-col gap-6 rounded-2xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6 md:p-8 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Sistema de bordo</p>
            <h3 className="mt-2 text-2xl font-black md:text-3xl">AME Vision</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Reprodução automática com menu interativo para o passageiro. Programação equilibrada em aproximadamente 70% informação e entretenimento e 30% conteúdo AME.
            </p>
            <p className="mt-3 text-xs font-bold text-zinc-500">Ciclo estimado atual: cerca de {totalMinutes} minutos.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setSettingsOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--accent-25)] px-5 py-3 text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">
              <Settings2 size={17} /> Configurar tempos
            </button>
            <button type="button" onClick={openFullViewport} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5">
              <Maximize2 size={17} /> Abrir em tela cheia
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-6 md:p-8">
          <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-end">
            <div className="flex flex-wrap items-end gap-4">
              <label className="block flex-1 min-w-[200px]">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Próxima viagem da agenda</span>
                <select value={selectedTripId} onChange={event => setSelectedTripId(event.target.value)} className="input-admin w-full">
                  {!upcomingTrips.length && <option value="">Nenhuma viagem agendada</option>}
                  {upcomingTrips.map(trip => <option key={trip.id} value={trip.id}>{trip.date} · {trip.time} · {trip.client} · {trip.route}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-[var(--accent-15)] bg-[var(--accent-10)] px-4 py-3 cursor-pointer transition hover:border-[var(--accent-30)]">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white leading-tight">Modo Universal</span>
                  <span className="text-[10px] text-zinc-500">Sem passageiro específico</span>
                </div>
                <button type="button" role="switch" aria-checked={universalMode} onClick={() => setUniversalMode(v => !v)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${universalMode ? "bg-[var(--accent)]" : "bg-zinc-700"}`}>
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${universalMode ? "left-5.5" : "left-0.5"}`} />
                </button>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setJourneyStatus("prepared")} disabled={!selectedTripId} className="inline-flex items-center gap-2 rounded-xl border border-[var(--accent-25)] px-4 py-3 text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)] disabled:opacity-40"><CheckCircle2 size={16}/> Preparar</button>
              <button type="button" onClick={() => setJourneyStatus("running")} disabled={!selectedTripId} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-40"><Play size={16}/> Iniciar</button>
              <button type="button" onClick={() => setJourneyStatus("completed")} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/5"><Square size={16}/> Finalizar</button>
            </div>
          </div>
          {selectedTripId && (
            <div className="mt-6 grid gap-4 rounded-xl border border-[var(--accent-15)] bg-[var(--accent-10)] p-5 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Motorista</span>
                <input value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Nome do motorista" className="input-admin w-full" />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Veículo</span>
                <input value={vehicleModel} onChange={e => setVehicleModel(e.target.value)} placeholder="Modelo do veículo" className="input-admin w-full" />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Mensagem <span className="text-[9px] text-zinc-600 font-normal normal-case">(gerada automaticamente)</span></span>
                <div className="w-full rounded-xl border border-[var(--accent-15)] bg-[var(--accent-10)] px-4 py-3 text-sm leading-6 text-zinc-200">{tripMessage || "Mensagem será gerada ao selecionar uma viagem."}</div>
              </label>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
            <span>Status do tablet: <strong className="text-[var(--accent)]">{remoteState.status}</strong>{remoteState.trip ? ` · ${remoteState.trip.client}` : ""}{universalMode ? <span className="ml-2 text-[var(--accent)] font-bold">[Modo Universal]</span> : ""}</span>
            {syncMessage && <span>{syncMessage}</span>}
          </div>
        </div>
      </div>

      <div className={fullViewport ? "fixed inset-0 z-[60] flex flex-col bg-black" : ""}>
        {fullViewport && (
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            <button
              type="button"
              onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); try { screen.orientation?.unlock?.(); } catch {} setFullViewport(false); }}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/20 bg-black/50 px-4 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/10"
            >
              <X size={14} /> Sair
            </button>
          </div>
        )}
        <div className={fullViewport ? "flex flex-1" : "overflow-hidden rounded-2xl border border-[var(--accent-15)] bg-black shadow-2xl"}>
          <iframe
            ref={frameRef}
            onLoad={() => window.setTimeout(() => { sendSettings(); frameRef.current?.contentWindow?.postMessage({ type: "AME_VISION_SESSION", session: remoteState }, "*"); }, 350)}
            title="AME Vision"
            srcDoc={visionDocument}
            allow="fullscreen; geolocation"
            className={fullViewport ? "h-full w-full border-0 bg-black" : "block aspect-video min-h-[300px] w-full border-0 bg-black sm:min-h-[450px] lg:min-h-[700px]"}
          />
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--accent-25)] bg-[var(--bg-primary)] shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Configuração do AME Vision</p>
                <h3 className="mt-2 text-2xl font-black">Tempo de cada aba</h3>
                <p className="mt-1 text-sm text-zinc-400">Escolha o modo da viagem, o período de descanso e o tempo de cada conteúdo.</p>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-xl border border-white/10 p-2 text-zinc-400 transition hover:text-white"><X size={20} /></button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-6">
              <div className="mb-6 grid gap-4 rounded-xl border border-[var(--accent-20)] bg-[var(--accent-10)] p-5 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-black/40 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div><span className="block text-sm font-bold text-white">Ativar viagem longa</span><small className="mt-1 block text-xs text-zinc-400">Quando desligado, o sistema entende que a viagem é curta e não mostra descanso.</small></div>
                    <button type="button" role="switch" aria-checked={longTripEnabled} onClick={() => setLongTripEnabled(value => !value)} className={`relative h-8 w-14 rounded-full transition ${longTripEnabled ? "bg-[var(--accent)]" : "bg-zinc-700"}`}><span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${longTripEnabled ? "left-7" : "left-1"}`} /></button>
                  </div>
                  <div className={`mt-4 flex items-center gap-2 ${longTripEnabled ? "" : "opacity-40"}`}><input disabled={!longTripEnabled} type="number" min={1} max={20} value={Math.round(restDuration / 60)} onChange={(event) => setRestDuration(Math.max(60, Number(event.target.value || 10) * 60))} className="w-24 rounded-xl border border-white/10 bg-black px-4 py-3 text-center font-bold text-white outline-none focus:border-[var(--accent)] disabled:cursor-not-allowed"/><span className="text-sm text-zinc-400">minutos de descanso</span></div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/40 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div><span className="block text-sm font-bold text-white">GPS e rota ao vivo</span><small className="mt-1 block text-xs text-zinc-400">Cole os endereços abaixo. Na viagem longa, o mapa funciona como uma pausa informativa. Ao ser aberto pelo menu, permanece por 10 minutos.</small></div>
                    <button type="button" role="switch" aria-checked={gpsEnabled} onClick={() => setGpsEnabled(value => !value)} className={`relative h-8 w-14 rounded-full transition ${gpsEnabled ? "bg-[var(--accent)]" : "bg-zinc-700"}`}><span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${gpsEnabled ? "left-7" : "left-1"}`} /></button>
                  </div>
                  <div className="mt-4 space-y-3">
                    <label className="block">
                      <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400"><MapPin size={14}/> Origem</span>
                      <input value={routeOrigin} onChange={(event) => setRouteOrigin(event.target.value)} placeholder="Deixe vazio para usar a localização atual" className="input-admin w-full" />
                    </label>
                    <label className="block">
                      <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400"><Navigation size={14}/> Destino</span>
                      <input value={routeDestination} onChange={(event) => setRouteDestination(event.target.value)} placeholder="Ex.: Aeroporto de Confins, MG" className="input-admin w-full" />
                    </label>
                    <button type="button" disabled={!routeDestination.trim()} onClick={startRoute} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"><Navigation size={16}/> Salvar e iniciar rota</button>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {screenOptions.map(item => (
                  <label key={item.id} className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.025] p-4">
                    <span>
                      <strong className="block text-sm text-white">{item.label}</strong>
                      <small className="mt-1 block text-xs font-bold uppercase tracking-wider text-[var(--accent)]">{item.group}</small>
                    </span>
                    <span className="flex items-center gap-2">
                      <input
                        type="number"
                        min={5}
                        max={item.id === "live-map" ? 1200 : 300}
                        value={durations[item.id] ?? item.seconds}
                        onChange={(event) => setDurations(current => ({ ...current, [item.id]: Math.max(5, Number(event.target.value) || 5) }))}
                        className="w-20 rounded-xl border border-white/10 bg-black px-3 py-2 text-center font-bold text-white outline-none focus:border-[var(--accent)]"
                      />
                      <span className="text-xs text-zinc-500">seg</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 p-6 sm:flex-row sm:justify-between">
              <button type="button" onClick={resetSettings} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-zinc-300 transition hover:bg-white/5"><RotateCcw size={16} /> Restaurar padrão</button>
              <button type="button" onClick={saveSettings} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"><Save size={16} /> {saved ? "Configuração salva" : "Salvar e aplicar"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
