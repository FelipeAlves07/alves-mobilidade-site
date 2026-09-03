"use client";

import { useState, useCallback } from "react";
import { Car, Clock, Map, Mic, DollarSign, Navigation, Fuel, Settings, ArrowRightLeft, Route } from "lucide-react";
import VoiceInput from "@/components/admin/VoiceInput";
import CostBreakdown from "@/components/admin/CostBreakdown";
import { money } from "@/lib/quotes";
import { fetchRoute } from "@/lib/route-service";
import { fetchTolls } from "@/lib/toll-service";
import { calculateNormalQuote, calculateDisposalQuote, calculateLongTripQuote } from "@/lib/quote-engine";
import type { QuoteTabType, QuoteConfig, QuoteResult2, NormalQuoteForm, DisposalQuoteForm, LongTripQuoteForm } from "@/domain/quote/types";
import { DEFAULT_QUOTE_CONFIG } from "@/domain/quote/types";

interface OrcamentoViewProps {
  onCaptureRouteByVoice: () => void;
  onOpenGoogleMapsRoute: (origin: string, destination: string) => void;
  onOpenWazeRoute: (destination: string) => void;
}

const TABS: { id: QuoteTabType; label: string; icon: typeof Car; desc: string }[] = [
  { id: "normal", label: "Corrida Normal", icon: Car, desc: "BH → Aeroporto, point-to-point" },
  { id: "disposal", label: "A Disposição", icon: Clock, desc: "Horas + Km, disponibilidade" },
  { id: "long", label: "Viagem Longa", icon: Route, desc: "BH → RJ, pedágios + alimentação" },
];

export default function OrcamentoView({
  onCaptureRouteByVoice,
  onOpenGoogleMapsRoute,
  onOpenWazeRoute,
}: OrcamentoViewProps) {
  const [activeTab, setActiveTab] = useState<QuoteTabType>("normal");
  const [config, setConfig] = useState<QuoteConfig>(DEFAULT_QUOTE_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuoteResult2 | null>(null);

  const [normalForm, setNormalForm] = useState<NormalQuoteForm>({
    origin: "", destination: "", distanceKm: 0, durationSec: 0, durationText: "", passengers: 1,
  });
  const [disposalForm, setDisposalForm] = useState<DisposalQuoteForm>({
    origin: "", destination: "", distanceKm: 0, durationSec: 0, durationText: "",
    startHour: "17:00", endHour: "00:00", passengers: 1,
  });
  const [longForm, setLongForm] = useState<LongTripQuoteForm>({
    origin: "", destination: "", distanceKm: 0, durationSec: 0, durationText: "",
    tollCost: 0, tollPlazas: [], passengers: 1, roundTrip: false,
  });

  const currentOrigin = activeTab === "normal" ? normalForm.origin : activeTab === "disposal" ? disposalForm.origin : longForm.origin;
  const currentDestination = activeTab === "normal" ? normalForm.destination : activeTab === "disposal" ? disposalForm.destination : longForm.destination;

  const setOrigin = useCallback((v: string) => {
    setResult(null);
    if (activeTab === "normal") setNormalForm((f) => ({ ...f, origin: v }));
    else if (activeTab === "disposal") setDisposalForm((f) => ({ ...f, origin: v }));
    else setLongForm((f) => ({ ...f, origin: v }));
  }, [activeTab]);

  const setDestination = useCallback((v: string) => {
    setResult(null);
    if (activeTab === "normal") setNormalForm((f) => ({ ...f, destination: v }));
    else if (activeTab === "disposal") setDisposalForm((f) => ({ ...f, destination: v }));
    else setLongForm((f) => ({ ...f, destination: v }));
  }, [activeTab]);

  async function autoFetchRoute() {
    if (!currentOrigin || !currentDestination) return;
    setLoading(true);
    try {
      const route = await fetchRoute(currentOrigin, currentDestination);
      if (route) {
        if (activeTab === "normal") {
          setNormalForm((f) => ({ ...f, distanceKm: route.distanceKm, durationSec: route.durationSec, durationText: route.durationText }));
        } else if (activeTab === "disposal") {
          setDisposalForm((f) => ({ ...f, distanceKm: route.distanceKm, durationSec: route.durationSec, durationText: route.durationText }));
        } else {
          const tolls = await fetchTolls(currentOrigin, currentDestination);
          setLongForm((f) => ({ ...f, distanceKm: route.distanceKm, durationSec: route.durationSec, durationText: route.durationText, tollCost: tolls.totalCost, tollPlazas: tolls.plazas }));
        }
      } else {
        onOpenGoogleMapsRoute(currentOrigin, currentDestination);
      }
    } catch {
      onOpenGoogleMapsRoute(currentOrigin, currentDestination);
    }
    setLoading(false);
  }

  function handleCalculate() {
    let r: QuoteResult2;
    if (activeTab === "normal") {
      r = calculateNormalQuote(normalForm, config);
    } else if (activeTab === "disposal") {
      r = calculateDisposalQuote(disposalForm, config);
    } else {
      r = calculateLongTripQuote(longForm, config);
    }
    setResult(r);
  }

  function handleClear() {
    setResult(null);
    if (activeTab === "normal") setNormalForm({ origin: "", destination: "", distanceKm: 0, durationSec: 0, durationText: "", passengers: 1 });
    else if (activeTab === "disposal") setDisposalForm({ origin: "", destination: "", distanceKm: 0, durationSec: 0, durationText: "", startHour: "17:00", endHour: "00:00", passengers: 1 });
    else setLongForm({ origin: "", destination: "", distanceKm: 0, durationSec: 0, durationText: "", tollCost: 0, tollPlazas: [], passengers: 1, roundTrip: false });
  }

  function buildMessage(): string {
    if (!result) return "";
    const b = result.breakdown;
    const lines = ["🚘 ALVES MOBILIDADE EXECUTIVA", "", "ORÇAMENTO DE TRANSPORTE EXECUTIVO", ""];

    if (activeTab === "normal") {
      lines.push(`📍 Embarque: ${normalForm.origin}`);
      lines.push(`📍 Destino: ${normalForm.destination}`);
      lines.push(`👥 Passageiros: ${normalForm.passengers}`);
      lines.push(`📏 Distância: ${normalForm.distanceKm} km`);
      if (normalForm.durationText) lines.push(`⏱ Duração: ${normalForm.durationText}`);
    } else if (activeTab === "disposal") {
      lines.push(`📍 Embarque: ${disposalForm.origin}`);
      lines.push(`📍 Destino: ${disposalForm.destination}`);
      lines.push(`👥 Passageiros: ${disposalForm.passengers}`);
      lines.push(`📏 Distância: ${disposalForm.distanceKm} km`);
      lines.push(`🕐 Disponível: ${disposalForm.startHour} às ${disposalForm.endHour}`);
      lines.push(`⏱ Duração: ${b.durationHours}h`);
    } else {
      lines.push(`📍 Embarque: ${longForm.origin}`);
      lines.push(`📍 Destino: ${longForm.destination}`);
      lines.push(`👥 Passageiros: ${longForm.passengers}`);
      lines.push(`📏 Distância: ${longForm.distanceKm} km${longForm.roundTrip ? " (ida e volta)" : ""}`);
      lines.push(`⏱ Duração: ${b.durationHours}h`);
      if (b.tollCost > 0) lines.push(`🛣 Pedágios: ${money(b.tollCost)}`);
      if (b.mealCost > 0) lines.push(`🍽 Alimentação: ${money(b.mealCost)} (${b.mealsCount} refeições)`);
    }

    lines.push("");
    lines.push(`💰 Valor do atendimento: ${money(result.price)}`);
    lines.push(`📅 Validade: 10 dias`);
    lines.push("");
    lines.push(`Combustível: ${money(b.fuelCost)} | Lucro: ${money(b.profit)}`);
    lines.push("");
    lines.push("Alves Mobilidade Executiva");
    lines.push("Conforto, segurança e pontualidade em cada trajeto.");
    return lines.join("\n");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-card)] p-6" style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Central de Orçamentos</p>
            <h3 className="mt-1.5 text-xl font-black tracking-tight">Novo orçamento inteligente</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              Selecione o tipo de orçamento, preencha a rota e clique em <strong>Buscar Rota</strong> para preencher KM e tempo automaticamente.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={onCaptureRouteByVoice} className="cursor-pointer rounded-xl border border-[var(--accent-20)] px-4 py-3.5 font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)] hover:bg-[var(--accent-10)]">
              <Mic className="inline" size={18} /> Falar rota
            </button>
            <button onClick={() => setShowConfig(!showConfig)} className="cursor-pointer rounded-xl border border-[var(--accent-20)] px-4 py-3.5 font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)] hover:bg-[var(--accent-10)]">
              <Settings className="inline" size={18} /> Config
            </button>
          </div>
        </div>

        {showConfig && (
          <div className="mt-5 rounded-xl border border-[var(--accent-15)] bg-[var(--bg-surface)] p-5 animate-enter-up">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Configurações de Cálculo</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Consumo (km/L)</span>
                <input type="number" value={config.fuelConsumptionKmL} onChange={(e) => setConfig((c) => ({ ...c, fuelConsumptionKmL: Number(e.target.value) }))} className="input-admin" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Preço Combustível (R$/L)</span>
                <input type="number" step="0.1" value={config.fuelPricePerLiter} onChange={(e) => setConfig((c) => ({ ...c, fuelPricePerLiter: Number(e.target.value) }))} className="input-admin" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Refeição por 500km (R$)</span>
                <input type="number" value={config.mealCostPerMeal} onChange={(e) => setConfig((c) => ({ ...c, mealCostPerMeal: Number(e.target.value) }))} className="input-admin" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Preço Normal (R$/km)</span>
                <input type="number" step="0.1" value={config.pricePerKmNormal} onChange={(e) => setConfig((c) => ({ ...c, pricePerKmNormal: Number(e.target.value) }))} className="input-admin" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Preço Disposição (R$/km)</span>
                <input type="number" step="0.1" value={config.pricePerKmDisposal} onChange={(e) => setConfig((c) => ({ ...c, pricePerKmDisposal: Number(e.target.value) }))} className="input-admin" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Hora Parada Disposição (R$/h)</span>
                <input type="number" value={config.pricePerHourDisposal} onChange={(e) => setConfig((c) => ({ ...c, pricePerHourDisposal: Number(e.target.value) }))} className="input-admin" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Preço Viagem Longa (R$/km)</span>
                <input type="number" step="0.1" value={config.pricePerKmLong} onChange={(e) => setConfig((c) => ({ ...c, pricePerKmLong: Number(e.target.value) }))} className="input-admin" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Intervalo Alimentação (km)</span>
                <input type="number" value={config.mealKmThreshold} onChange={(e) => setConfig((c) => ({ ...c, mealKmThreshold: Number(e.target.value) }))} className="input-admin" />
              </label>
            </div>
          </div>
        )}

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setResult(null); }}
              className={`cursor-pointer flex items-center gap-2 whitespace-nowrap rounded-xl px-5 py-3 text-sm font-bold transition ${
                activeTab === tab.id
                  ? "bg-[var(--accent)] text-white"
                  : "border border-[var(--accent-15)] text-zinc-400 hover:border-[var(--accent-25)] hover:text-[var(--accent)]"
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-2 text-xs text-zinc-500">{TABS.find((t) => t.id === activeTab)?.desc}</div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <VoiceInput value={currentOrigin} onValue={setOrigin} placeholder="Local de embarque (ex: Belo Horizonte)" />
          <VoiceInput value={currentDestination} onValue={setDestination} placeholder="Destino (ex: Aeroporto Confins)" />
        </div>

        {activeTab === "normal" && (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">KM</span>
              <input type="number" value={normalForm.distanceKm || ""} onChange={(e) => setNormalForm((f) => ({ ...f, distanceKm: Number(e.target.value) }))} placeholder="Ex.: 38" className="input-admin" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Pessoas</span>
              <input type="number" value={normalForm.passengers} min={1} onChange={(e) => setNormalForm((f) => ({ ...f, passengers: Number(e.target.value) }))} className="input-admin" />
            </label>
            {normalForm.durationText && (
              <div className="flex items-end">
                <span className="text-sm text-zinc-400">⏱ {normalForm.durationText}</span>
              </div>
            )}
          </div>
        )}

        {activeTab === "disposal" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">KM</span>
              <input type="number" value={disposalForm.distanceKm || ""} onChange={(e) => setDisposalForm((f) => ({ ...f, distanceKm: Number(e.target.value) }))} placeholder="Ex.: 115" className="input-admin" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Início</span>
              <input type="time" value={disposalForm.startHour} onChange={(e) => setDisposalForm((f) => ({ ...f, startHour: e.target.value }))} className="input-admin" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Fim</span>
              <input type="time" value={disposalForm.endHour} onChange={(e) => setDisposalForm((f) => ({ ...f, endHour: e.target.value }))} className="input-admin" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Pessoas</span>
              <input type="number" value={disposalForm.passengers} min={1} onChange={(e) => setDisposalForm((f) => ({ ...f, passengers: Number(e.target.value) }))} className="input-admin" />
            </label>
          </div>
        )}

        {activeTab === "long" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">KM</span>
              <input type="number" value={longForm.distanceKm || ""} onChange={(e) => setLongForm((f) => ({ ...f, distanceKm: Number(e.target.value) }))} placeholder="Ex.: 580" className="input-admin" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Pedágios (R$)</span>
              <input type="number" value={longForm.tollCost || ""} onChange={(e) => setLongForm((f) => ({ ...f, tollCost: Number(e.target.value) }))} placeholder="R$" className="input-admin" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Pessoas</span>
              <input type="number" value={longForm.passengers} min={1} onChange={(e) => setLongForm((f) => ({ ...f, passengers: Number(e.target.value) }))} className="input-admin" />
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-zinc-300 transition hover:border-[var(--accent-20)]">
              <input type="checkbox" checked={longForm.roundTrip} onChange={(e) => setLongForm((f) => ({ ...f, roundTrip: e.target.checked }))} />
              Ida e volta
            </label>
          </div>
        )}

        {activeTab === "long" && longForm.tollPlazas.length > 0 && (
          <div className="mt-4 rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">Pedágios da Rota</p>
            <div className="mt-2 space-y-1">
              {longForm.tollPlazas.map((toll, i) => (
                <div key={i} className="flex justify-between text-xs text-zinc-400">
                  <span>{toll.name} ({toll.highway})</span>
                  <span className="font-bold text-zinc-200">{money(toll.cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={autoFetchRoute} disabled={loading || !currentOrigin || !currentDestination} className="cursor-pointer rounded-xl border border-[var(--accent-25)] px-5 py-3 text-sm font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)] disabled:opacity-50">
            <Navigation className="inline" size={16} /> {loading ? "Buscando..." : "Buscar Rota"}
          </button>
          <button onClick={() => onOpenGoogleMapsRoute(currentOrigin, currentDestination)} className="cursor-pointer rounded-xl border border-[var(--accent-20)] px-4 py-2.5 text-xs font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)] hover:bg-[var(--accent-10)]">
            Maps
          </button>
          <button onClick={() => onOpenWazeRoute(currentDestination)} className="cursor-pointer rounded-xl border border-[var(--accent-20)] px-4 py-2.5 text-xs font-bold text-[var(--accent)] transition hover:border-[var(--accent-35)] hover:bg-[var(--accent-10)]">
            Waze
          </button>
          <button onClick={handleCalculate} className="cursor-pointer rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.98]">
            <DollarSign className="inline" size={16} /> Calcular Orçamento
          </button>
          {result && (
            <button onClick={handleClear} className="cursor-pointer rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-400 transition hover:text-white">
              Limpar
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className="animate-enter-up grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
          <div className="space-y-5">
            <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-surface)] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent)]">
                {activeTab === "normal" ? "Corrida Normal" : activeTab === "disposal" ? "A Disposição" : "Viagem Longa"}
              </p>
              <h3 className="mt-2 text-4xl font-black text-[var(--accent)]">{money(result.price)}</h3>
              <div className="mt-4 space-y-2 text-sm text-zinc-300">
                <p><strong>Embarque:</strong> {currentOrigin}</p>
                <p><strong>Destino:</strong> {currentDestination}</p>
                <p><strong>Distância:</strong> {result.breakdown.durationHours > 0 ? `${normalForm.distanceKm || disposalForm.distanceKm || longForm.distanceKm} km` : "—"}</p>
                <p><strong>Duração:</strong> {result.breakdown.durationHours}h</p>
                <p className="text-xs text-zinc-500">Validade: 10 dias</p>
              </div>
            </div>

            <CostBreakdown breakdown={result.breakdown} />
          </div>

          <div className="rounded-xl border border-[var(--accent-20)] bg-black p-5" style={{ boxShadow: "0 25px 90px rgba(0,0,0,.35)" }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">Mensagem do Orçamento</p>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-6 text-zinc-300">{buildMessage()}</pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={async () => { await navigator.clipboard.writeText(buildMessage()); }}
                className="cursor-pointer rounded-xl border border-[var(--accent-25)] px-5 py-2.5 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]"
              >
                Copiar
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(buildMessage())}`}
                target="_blank"
                rel="noreferrer"
                className="cursor-pointer rounded-xl border border-[#25D366]/40 px-5 py-2.5 text-xs font-bold text-[#25D366]"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
