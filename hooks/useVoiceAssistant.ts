"use client";

import { useState, useCallback } from "react";
import { startVoiceCapture, normalizeSpokenAddress, parseSpokenRoute } from "@/lib/voice";
import { money, buildQuoteMessage } from "@/lib/quotes";
import { parseVoiceNumbers, calculateQuoteValue } from "@/modules/viagens/services/viagens.service";

type Step = "inicio" | "origem" | "destino" | "passageiros" | "malas" | "km" | "resultado";

type QuoteState = {
  origin: string;
  destination: string;
  km: number;
  passengers: number;
  bags: number;
  specialLuggage: boolean;
};

type UseVoiceAssistantProps = {
  onSetActive: (id: string) => void;
  onQuoteChange: (quote: Partial<QuoteState>) => void;
  onCalculateQuote: () => void;
};

export function useVoiceAssistant({ onSetActive, onQuoteChange, onCalculateQuote }: UseVoiceAssistantProps) {
  const [voiceStatus, setVoiceStatus] = useState("");
  const [ameOpen, setAmeOpen] = useState(false);
  const [ameStep, setAmeStep] = useState<Step>("inicio");
  const [ameText, setAmeText] = useState("");
  const [quoteState, setQuoteState] = useState<QuoteState>({
    origin: "Belo Horizonte - MG",
    destination: "Aeroporto Internacional de Confins",
    km: 0,
    passengers: 1,
    bags: 0,
    specialLuggage: false,
  });

  const setVoiceStatusTimed = useCallback((msg: string, ms = 3000) => {
    setVoiceStatus(msg);
    window.setTimeout(() => setVoiceStatus(""), ms);
  }, []);

  const ameTalk = useCallback((message: string) => {
    setVoiceStatus(message);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "pt-BR";
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const ameSpeak = useCallback(() => {
    startVoiceCapture(
      (text) => {
        setAmeText(text);
        processAmeAnswer(text);
      },
      setVoiceStatus
    );
  }, [quoteState, ameStep]);

  const ameTalkAndListen = useCallback((message: string, delay = 400) => {
    setVoiceStatus(message);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "pt-BR";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onend = () => window.setTimeout(() => ameSpeak(), delay);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => ameSpeak(), delay);
    }
  }, [ameSpeak]);

  function processAmeAnswer(rawText: string) {
    const value = rawText.trim();
    if (!value) {
      ameTalkAndListen("Digite ou fale uma resposta para continuar.");
      return;
    }
    const lower = value.toLowerCase();

    if (ameStep === "inicio") {
      if (lower.includes("orçamento") || lower.includes("orcamento") || lower.includes("transfer") || lower.includes("viagem")) {
        onSetActive("orcamento");
        setAmeStep("origem");
        setAmeText("");
        ameTalkAndListen("Certo. Qual é o local de embarque?");
        return;
      }
      if (lower.includes("financeiro")) {
        onSetActive("financeiro");
        setAmeText("");
        ameTalk("Abrindo financeiro.");
        closeAmeAssistant();
        return;
      }
      if (lower.includes("cliente")) {
        onSetActive("clientes");
        setAmeText("");
        ameTalk("Abrindo clientes.");
        closeAmeAssistant();
        return;
      }
      if (lower.includes("whatsapp")) {
        onSetActive("whatsapp");
        setAmeText("");
        ameTalk("Abrindo WhatsApp.");
        closeAmeAssistant();
        return;
      }
      ameTalkAndListen("Por enquanto eu entendo melhor o comando novo orçamento. Digite ou fale novo orçamento.");
      return;
    }

    if (ameStep === "origem") {
      setQuoteState((prev) => ({ ...prev, origin: value }));
      onQuoteChange({ origin: value });
      setAmeStep("destino");
      setAmeText("");
      ameTalkAndListen("Perfeito. Agora informe o destino.");
      return;
    }

    if (ameStep === "destino") {
      const normalizedDestination = normalizeSpokenAddress(value);
      setQuoteState((prev) => ({ ...prev, destination: normalizedDestination }));
      onQuoteChange({ destination: normalizedDestination });
      setAmeStep("passageiros");
      setAmeText("");
      ameTalkAndListen("Quantos passageiros?");
      return;
    }

    if (ameStep === "passageiros") {
      const parsed = parseVoiceNumbers(`${value} passageiros`);
      const number = Number(value.replace(/\D/g, "")) || parsed.passengers || 1;
      setQuoteState((prev) => ({ ...prev, passengers: number }));
      onQuoteChange({ passengers: number });
      setAmeStep("malas");
      setAmeText("");
      ameTalkAndListen("Quantas malas ou bagagens?");
      return;
    }

    if (ameStep === "malas") {
      const parsed = parseVoiceNumbers(`${value} malas`);
      const number = Number(value.replace(/\D/g, "")) || parsed.bags || 0;
      setQuoteState((prev) => ({ ...prev, bags: number }));
      onQuoteChange({ bags: number });
      setAmeStep("km");
      setAmeText("");
      ameTalkAndListen("Agora informe a quilometragem da rota. Se precisar, toque em abrir rota no Maps para conferir.");
      return;
    }

    if (ameStep === "km") {
      const km = Number(value.replace(",", ".").replace(/[^\d.]/g, ""));
      if (!km || km <= 0) {
        ameTalkAndListen("Não entendi a quilometragem. Digite apenas o número, por exemplo, trinta e oito ou 38.");
        return;
      }
      setQuoteState((prev) => ({ ...prev, km }));
      onQuoteChange({ km });
      onCalculateQuote();
      setAmeStep("resultado");
      setAmeText("");
      ameTalkAndListen("Orçamento calculado. Você pode copiar o orçamento, enviar pelo WhatsApp, ou iniciar um novo.");
      return;
    }

    if (ameStep === "resultado") {
      if (lower.includes("copiar")) {
        const result = calculateQuoteValue(quoteState.origin, quoteState.destination, quoteState.km, quoteState.passengers, quoteState.bags, quoteState.specialLuggage);
        const msg = buildQuoteMessage({ origin: quoteState.origin, destination: quoteState.destination, result, passengers: quoteState.passengers, bags: quoteState.bags });
        navigator.clipboard.writeText(msg).then(() => {
          ameTalk("Orçamento copiado para a área de transferência.");
        }).catch(() => {
          ameTalk("Erro ao copiar orçamento.");
        });
        return;
      }
      if (lower.includes("novo")) {
        setAmeStep("origem");
        setAmeText("");
        ameTalkAndListen("Vamos fazer um novo orçamento. Qual é o local de embarque?");
        return;
      }
      ameTalkAndListen("Orçamento já calculado. Você pode copiar, enviar pelo WhatsApp, usar na viagem ou iniciar um novo orçamento.");
    }
  }

  function startAmeAssistant() {
    setAmeOpen(true);
    setAmeStep("inicio");
    setAmeText("");
    onSetActive("orcamento");
    ameTalkAndListen("Olá. O que vamos fazer? Você pode dizer novo orçamento, cliente, financeiro ou WhatsApp.");
  }

  function closeAmeAssistant() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setAmeOpen(false);
    setAmeText("");
  }

  function captureRouteByVoice() {
    setVoiceStatus("Ouvindo rota... fale origem e destino.");
    startVoiceCapture((text) => {
      const parsed = parseSpokenRoute(text);
      setQuoteState((prev) => ({ ...prev, origin: parsed.origin, destination: parsed.destination }));
      onQuoteChange({ origin: parsed.origin, destination: parsed.destination });
      setVoiceStatusTimed(`Entendi: ${parsed.origin} → ${parsed.destination}. Agora informe o KM e clique em Calcular Orçamento.`, 5500);
    }, setVoiceStatus);
  }

  function captureGlobalVoiceCommand() {
    setVoiceStatus("Comando AME ouvindo...");
    startVoiceCapture((text) => {
      const lower = text.toLowerCase();
      const numbers = parseVoiceNumbers(text);
      if (lower.includes("orçamento") || lower.includes("orcamento") || lower.includes("rota") || lower.includes("viagem") || lower.includes("transfer")) {
        const parsed = parseSpokenRoute(text);
        onSetActive("orcamento");
        setQuoteState((prev) => ({
          ...prev,
          origin: parsed.origin,
          destination: parsed.destination,
          passengers: numbers.passengers || prev.passengers,
          bags: numbers.bags !== null ? numbers.bags : prev.bags,
          km: numbers.km || prev.km,
        }));
        onQuoteChange({
          origin: parsed.origin,
          destination: parsed.destination,
          passengers: numbers.passengers ?? undefined,
          bags: numbers.bags ?? undefined,
          km: numbers.km ?? undefined,
        });
        setVoiceStatusTimed(`Rota preenchida: ${parsed.origin} → ${parsed.destination}. ${numbers.km ? `KM identificado: ${numbers.km}. Agora clique em Calcular Orçamento.` : "Abra o Maps, confira o KM e depois clique em Calcular Orçamento."}`, 6500);
        return;
      }
      if (lower.includes("novo cliente") || lower.includes("cadastrar cliente")) {
        const name = text.replace(/novo cliente|cadastrar cliente/gi, "").trim();
        onSetActive("clientes");
        setVoiceStatusTimed(`Novo cliente iniciado: ${name || "informe o nome"}.`, 4500);
        return;
      }
      if (lower.includes("whatsapp")) {
        onSetActive("whatsapp");
        setVoiceStatus("Abrindo tela de WhatsApp.");
      } else if (lower.includes("financeiro")) {
        onSetActive("financeiro");
        setVoiceStatus("Abrindo financeiro.");
      } else if (lower.includes("marketing")) {
        onSetActive("marketing");
        setVoiceStatus("Abrindo marketing.");
      } else if (lower.includes("prospec")) {
        onSetActive("auto-prospect");
        setVoiceStatus("Abrindo prospecção.");
      } else if (lower.includes("cliente")) {
        onSetActive("clientes");
        setVoiceStatus("Abrindo clientes.");
      } else {
        setVoiceStatus(`Comando ouvido: ${text}`);
      }
      window.setTimeout(() => setVoiceStatus(""), 4500);
    }, setVoiceStatus);
  }

  return {
    voiceStatus,
    ameOpen,
    ameStep,
    ameText,
    quoteState,
    setQuoteState,
    setAmeText,
    startAmeAssistant,
    closeAmeAssistant,
    processAmeAnswer,
    ameSpeak,
    captureRouteByVoice,
    captureGlobalVoiceCommand,
    setVoiceStatusTimed,
  };
}
