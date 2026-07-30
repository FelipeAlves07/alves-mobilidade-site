"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3, Bot, Briefcase, Car, ChevronRight, ClipboardList, DollarSign, Download, Gift,
  LogOut, Megaphone, MessageCircle, Mic, Monitor, Plane, Sparkles, Target, Users,
} from "lucide-react";
import Sidebar from "@/components/admin/Sidebar";
import MobileNav from "@/components/admin/MobileNav";

import type { Lead } from "@/domain/lead/types";
import type { Trip } from "@/domain/trip/types";
import type { Referral } from "@/domain/referral/types";
import type { FinanceEntry } from "@/domain/finance/types";
import type { Proposal } from "@/domain/proposal/types";
import type { QuoteResult } from "@/domain/trip/types";
import type { MessageKey } from "@/domain/marketing/types";
import { startVoiceCapture, normalizeSpokenAddress, parseSpokenRoute } from "@/lib/voice";
import { cleanPhone, openWhatsApp } from "@/lib/whatsapp";
import { money } from "@/lib/quotes";
import { openGoogleMapsRoute, openWazeRoute } from "@/lib/maps";
import { addDaysISO } from "@/lib/format";
import { useData } from "@/hooks/useData";
import { uid } from "@/utils/helpers";
import { today, leadTypes, messages, buildQuoteMessage } from "./constants";
import { parseVoiceNumbers, calculateQuoteValue } from "@/modules/viagens/services/viagens.service";
import { proposalValidityISO, buildPremiumProposalMessage, downloadPremiumProposalImage as downloadImage, downloadPremiumProposalPdf as downloadPdf } from "@/modules/propostas/services/propostas.service";
import { parseImportText, completeActionData, sendLeadMessageData } from "@/modules/clientes/services/clientes.service";

import DashboardView from "@/modules/dashboard/components/DashboardView";
import ClientesView from "@/modules/clientes/components/ClientesView";
import WhatsAppView from "@/modules/whatsapp/components/WhatsAppView";
import PropostasView from "@/modules/propostas/components/PropostasView";
import ViagensView from "@/modules/viagens/components/ViagensView";
import IndicacoesView from "@/modules/indicacoes/components/IndicacoesView";
import MarketingView from "@/modules/marketing/components/MarketingView";
import FinanceiroView from "@/modules/financeiro/components/FinanceiroView";
import AIView from "@/modules/ai/components/AIView";
import VozView from "@/modules/voz/components/VozView";
import AMEVisionPanel from "@/components/admin/AMEVisionPanel";
import MotoristasView from "@/modules/motoristas/components/MotoristasView";
import VeiculosView from "@/modules/veiculos/components/VeiculosView";

const WHATSAPP_QR_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAWcAAAFpCAYAAABAsun9AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAACPlSURBVHhe7d0LcFTl+fjxF8FAwAsKiFHABESpohLxAgQQScdLp7YdpzKdWOSisaLVqVoHVCygCE6r1kurFQzBS6AoaKmOAxoMGbl4R2stNlSCBJSL4AWMoAF+++48v/9/XJ/z7nv62928ge9n5hnPc2bfc86e3X2WifPs02pfggEABOUg+S8AICAUZwAIEMUZAAJEcQaAAFGcASBAFGcACBDFGQACRHEGgABRnAEgQBRnAAgQxRkAAkRxBoAAUZwBIEAUZwAIEMUZAAJEcQaAAFGcASBAFGcACBDFGQACRHEGgABRnAEgQBRnAAgQxRkAAkRxBoAAtdqXINtZt337dtmCy5FHHilbmbN161bZSq9Lly6y5RbnmG3atDFHHHGEZNG++uor09jYKFl6vtfqa9u2bWbv3r2SuX3++eemY8eOkrll+jqz5euvv04G0svG5/Q7bHHOhcSb3n4JEB7R1NQkdy1zysrK1HOlRl5enqxIb8aMGeoxNFi2bJmscqurq1PXazF16lRZlTnV1dXqubQoKSlR96dG69at5ejhq6mpUZ8D8d0YNGiQ3LHs4c8aABAgijMABIjiDAABojgDQIAozgAQIIozAASI4gwAAaI4A0CAKM4AEKCctW/b1u1OnTpJ5jZ69GhzzjnnSLZ/qK2tNbNnz5bMrampybRu3VqyzHjqqadky82ee+HChZK52VbnK6+8UjK3Y4891pSUlEgWbc2aNWbVqlWSuc2bNy/ZFu7jnnvuMd26dZMs2t13322eeeYZydw++ugjc9xxx0nmtmLFCtlymzVrllm8eLFkbtdcc40ZOnSoZJmxdOlSc+6550rmNnnyZO/n31I89thjyXuQzqBBg8zy5csly5Jkn2AOxGnfrqyslFX7j8QbWX2uWmSjfdvX7t271WvSory8XFY1j4kTJ6rXpUVDQ4Oscmvu9u2Kigr1GFokvvBlVebEad+ur6+XVfuPYcOGqc81NWjfBoADFMUZAAJEcQaAAFGcASBAFGcACBDFGQACRHEGgABRnAEgQC26OP/vMMrmjOakXY8rfHzzzTcmPz/fK3bv3q2eJyp8aOuiwnYzatelxa5du9RjpIZ9Ttp6LewgWG1/auTl5cmz86MdQ4uWQrvPuY4WSZpRsi4bHYKNjY3q+lxFnz595ErSy0aH4KJFi9T1WlRVVckqtzgdgkOGDFH3a9HcA167deumHiM1SktLZUV6I0eOVI+RGvvrgFffDsHmHho7atQouZL06BAEADhRnAEgQBRnAAgQxRkAAkRxBoAAUZwBIEAUZwAIEMUZAAJEcQaAAAU54LWysjI55DUd25bZvn17yXKvT58+ZvXq1ZK5TZkyJTkQ04fvgFc7CNR3GKttXz7zzDMli2bP7fuc/vWvf5mTTjpJMjf7OvXq1UuyaPbc7777rmRuHTt29H7+V199tWy5bdiwwVx44YWSuS1YsMCccMIJkkWzH7FTTz1VsvTGjRsnW7kXZ8BrfX29KSwslCxanGNmw6hRo7yHK9vrZMCrI2jfzvyA17KyMvVcqZGXlycrMst3GGriw67u1+KOO+6Qo2dOnAGvjz/+uKxys6+ntl6LsWPHyqrmQfs27dsAAAeKMwAEiOIMAAGiOKPFatWqlWwB+x+KMwAEiOIMAAGiOANAgCjOABAgijMABIj27f+DENq3fY/Z2NiYnBbt47333pMtt5kzZ5pZs2ZJ5jZmzBivFubXX389eVwfdqq172RrO1Xc57H2fep7zIsvvjj5uqZjz92/f3/J3Gw79HPPPSdZ7tG+Tfu2M2jfzvz0bdtuqu1PjTjt2zNmzFCPoUU2pm/7...";

const menu = [
  { id: "dashboard", group: "Operação", label: "Dashboard", icon: BarChart3 },
  { id: "financeiro", group: "Operação", label: "Financeiro", icon: DollarSign },
  { id: "comercial", group: "Operação", label: "Comercial", icon: ClipboardList },
  { id: "trabalhar", group: "Operação", label: "Trabalhar Agora", icon: Sparkles },
  { id: "clientes", group: "Operação", label: "Clientes", icon: Users },
  { id: "motoristas", group: "Operação", label: "Motoristas", icon: ClipboardList },
  { id: "veiculos", group: "Operação", label: "Veículos", icon: Car },
  { id: "prospeccao", group: "Operação", label: "Prospecção", icon: Target },
  { id: "whatsapp", group: "Operação", label: "WhatsApp", icon: MessageCircle },
  { id: "viagens", group: "Operação", label: "Viagens e Agenda", icon: Plane },
  { id: "indicacoes", group: "Comercial", label: "Indicações", icon: Gift },
  { id: "empresas", group: "Comercial", label: "Empresas", icon: Briefcase },
  { id: "marketing", group: "Gestão", label: "Marketing", icon: Megaphone },
  { id: "ia", group: "Gestão", label: "IA da Alves", icon: Bot },
  { id: "ame-vision", group: "Gestão", label: "AME Vision", icon: Monitor },
];

export default function AdminPage() {
  const {
    logged, login: loginFn, logout: logoutFn,
    leads, setLeads, addLead: addLeadFn, updateLead: updateLeadFn, deleteLead: deleteLeadFn,
    trips, setTrips, addTrip: addTripFn, updateTrip: updateTripFn, deleteTrip: deleteTripFn,
    referrals, setReferrals, addReferral: addReferralFn, updateReferral: updateReferralFn, deleteReferral: deleteReferralFn,
    finance, setFinance, addFinance: addFinanceFn, deleteFinance: deleteFinanceFn,
    proposals, setProposals, addProposal: addProposalFn,
    motoristas, addMotorista, updateMotorista, deleteMotorista,
    veiculos, addVeiculo, updateVeiculo, deleteVeiculo,
    completedMarketing, completeMarketingTask, resetMarketingTasks,
    stats, today, migrationStatus, executarMigracao,
  } = useData();

  const [loginEmail, setLoginEmail] = useState("admin@alvesmobilidade.com.br");
  const [loginPassword, setLoginPassword] = useState("");
  const [active, setActive] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [importText, setImportText] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<MessageKey>("apresentacao");
  const [quoteOrigin, setQuoteOrigin] = useState("Belo Horizonte - MG");
  const [quoteDestination, setQuoteDestination] = useState("Aeroporto Internacional de Confins");
  const [quoteKm, setQuoteKm] = useState(0);
  const [quotePassengers, setQuotePassengers] = useState(1);
  const [quoteBags, setQuoteBags] = useState(0);
  const [quoteSpecialLuggage, setQuoteSpecialLuggage] = useState(false);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);
  const [quoteClient, setQuoteClient] = useState("");
  const [quotePhone, setQuotePhone] = useState("");
  const [quoteDate, setQuoteDate] = useState(today);
  const [quoteTime, setQuoteTime] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("");
  const [ameOpen, setAmeOpen] = useState(false);
  const [ameStep, setAmeStep] = useState<"inicio" | "origem" | "destino" | "passageiros" | "malas" | "km" | "resultado">("inicio");
  const [ameText, setAmeText] = useState("");

  const [leadForm, setLeadForm] = useState<Omit<Lead, "id" | "createdAt">>({
    name: "", phone: "", type: "Aeroporto", origin: "", status: "Novo contato", notes: "", nextAction: "Enviar apresentação da Alves", nextDate: today,
  });
  const [tripForm, setTripForm] = useState<Omit<Trip, "id">>({ client: "", phone: "", date: today, time: "", route: "BH → Confins", value: 150, status: "Agendada" });
  const [refForm, setRefForm] = useState<Omit<Referral, "id">>({ referrer: "", referred: "", status: "Indicado", credits: 0 });
  const [financeForm, setFinanceForm] = useState<Omit<FinanceEntry, "id">>({ description: "", value: 0, type: "Entrada", date: today });

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [active]);

  const currentTask = stats.pending[0];

  function setVoiceStatusTimed(msg: string, ms = 3000) {
    setVoiceStatus(msg);
    window.setTimeout(() => setVoiceStatus(""), ms);
  }

  function ameTalk(message: string) {
    setVoiceStatus(message);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = "pt-BR";
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }

  function ameTalkAndListen(message: string, delay = 400) {
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
  }

  function startAmeAssistant() {
    setAmeOpen(true);
    setAmeStep("inicio");
    setAmeText("");
    setActive("viagens");
    ameTalkAndListen("Olá. O que vamos fazer? Você pode dizer novo orçamento, cliente, financeiro ou WhatsApp.");
  }

  function closeAmeAssistant() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setAmeOpen(false);
    setAmeText("");
  }

  function processAmeAnswer(rawText: string) {
    const value = rawText.trim();
    if (!value) { ameTalkAndListen("Digite ou fale uma resposta para continuar."); return; }
    const lower = value.toLowerCase();
    if (ameStep === "inicio") {
      if (lower.includes("orçamento") || lower.includes("orcamento") || lower.includes("transfer") || lower.includes("viagem")) {
        setActive("viagens"); setAmeStep("origem"); setAmeText(""); ameTalkAndListen("Certo. Qual é o local de embarque?"); return;
      }
      if (lower.includes("financeiro")) { setActive("financeiro"); setAmeText(""); ameTalk("Abrindo financeiro."); closeAmeAssistant(); return; }
      if (lower.includes("cliente")) { setActive("clientes"); setAmeText(""); ameTalk("Abrindo clientes."); closeAmeAssistant(); return; }
      if (lower.includes("whatsapp")) { setActive("whatsapp"); setAmeText(""); ameTalk("Abrindo WhatsApp."); closeAmeAssistant(); return; }
      ameTalkAndListen("Por enquanto eu entendo melhor o comando novo orçamento. Digite ou fale novo orçamento."); return;
    }
    if (ameStep === "origem") { setQuoteOrigin(value); setQuoteResult(null); setAmeStep("destino"); setAmeText(""); ameTalkAndListen("Perfeito. Agora informe o destino."); return; }
    if (ameStep === "destino") {
      const normalizedDestination = normalizeSpokenAddress(value);
      setQuoteDestination(normalizedDestination); setQuoteResult(null); setAmeStep("passageiros"); setAmeText(""); ameTalkAndListen("Quantos passageiros?"); return;
    }
    if (ameStep === "passageiros") {
      const parsed = parseVoiceNumbers(`${value} passageiros`);
      const number = Number(value.replace(/\D/g, "")) || parsed.passengers || 1;
      setQuotePassengers(number); setQuoteResult(null); setAmeStep("malas"); setAmeText(""); ameTalkAndListen("Quantas malas ou bagagens?"); return;
    }
    if (ameStep === "malas") {
      const parsed = parseVoiceNumbers(`${value} malas`);
      const number = Number(value.replace(/\D/g, "")) || parsed.bags || 0;
      setQuoteBags(number); setQuoteResult(null); setAmeStep("km"); setAmeText(""); ameTalkAndListen("Agora informe a quilometragem da rota. Se precisar, toque em abrir rota no Maps para conferir."); return;
    }
    if (ameStep === "km") {
      const km = Number(value.replace(",", ".").replace(/[^\d.]/g, ""));
      if (!km || km <= 0) { ameTalkAndListen("Não entendi a quilometragem. Digite apenas o número, por exemplo, trinta e oito ou 38."); return; }
      setQuoteKm(km);
      const result = calculateQuote(quoteOrigin, quoteDestination, km);
      setAmeStep("resultado"); setAmeText("");
      ameTalkAndListen(`Orçamento calculado em ${result.value ? money(result.value) : "valor manual"}. Você pode copiar o orçamento, enviar pelo WhatsApp, ou iniciar um novo.`); return;
    }
    if (ameStep === "resultado") {
      if (lower.includes("copiar")) { const msg = quoteResult ? buildQuoteMessage(quoteOrigin, quoteDestination, quoteResult, quotePassengers, quoteBags) : ""; if (msg) navigator.clipboard.writeText(msg); ameTalk("Orçamento copiado."); return; }
      if (lower.includes("novo")) { setAmeStep("origem"); setAmeText(""); setQuoteResult(null); ameTalkAndListen("Vamos fazer um novo orçamento. Qual é o local de embarque?"); return; }
      ameTalkAndListen("Orçamento já calculado. Você pode copiar, enviar pelo WhatsApp, usar na viagem ou iniciar um novo orçamento.");
    }
  }

  function ameSpeak() {
    startVoiceCapture((text) => { setAmeText(text); processAmeAnswer(text); }, setVoiceStatus);
  }

  async function login() {
    try {
      const ok = await loginFn(loginEmail, loginPassword);
      if (!ok) alert("N�o foi poss�vel fazer login. Verifique email e senha.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao fazer login.";
      alert(msg + " Se o admin n�o existe, acesse /api/auth/setup primeiro.");
    }
  }

  function logout() { logoutFn(); }

  function addLead() {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) return alert("Preencha pelo menos nome e WhatsApp.");
    addLeadFn(leadForm);
    setLeadForm({ name: "", phone: "", type: "Aeroporto", origin: "", status: "Novo contato", notes: "", nextAction: "Enviar apresentação da Alves", nextDate: today });
  }

  function updateLead(id: string, patch: Partial<Lead>) { updateLeadFn(id, patch); }
  function deleteLead(id: string) { if (confirm("Remover esse contato?")) deleteLeadFn(id); }
  function completeAction(lead: Lead) { updateLead(lead.id, completeActionData(lead)); }
  function sendLeadMessage(lead: Lead, key: MessageKey) { openWhatsApp(lead.phone, messages[key]); updateLead(lead.id, sendLeadMessageData(lead)); }

  function importLeads() {
    const parsed = parseImportText(importText);
    if (!parsed.length) return alert("Cole pelo menos um contato.");
    for (const { name, phone } of parsed) {
      addLeadFn({ name, phone, type: "Aeroporto", origin: "Importado", status: "Novo contato", notes: "Contato importado em massa.", nextAction: "Enviar apresentação da Alves", nextDate: today });
    }
    setImportText("");
  }

  function addTrip() {
    if (!tripForm.client || !tripForm.date || !tripForm.time) return alert("Preencha cliente, data e horário.");
    addTripFn({ ...tripForm, value: Number(tripForm.value || 0) });
    setTripForm({ client: "", phone: "", date: today, time: "", route: "BH → Confins", value: 150, status: "Agendada" });
  }

  function finishTrip(trip: Trip) {
    updateTripFn(trip.id, { status: "Concluída" });
    addFinanceFn({ description: `Viagem ${trip.client} - ${trip.route}`, value: Number(trip.value || 0), type: "Entrada", date: trip.date });
    const existing = leads.find((lead) => cleanPhone(lead.phone) === cleanPhone(trip.phone) || lead.name.toLowerCase() === trip.client.toLowerCase());
    if (existing) updateLead(existing.id, { status: "Pós-atendimento", nextAction: "Agradecer e apresentar Programa de Indicação", nextDate: addDaysISO(2) });
  }

  function addReferral() {
    if (!refForm.referrer || !refForm.referred) return alert("Preencha quem indicou e quem foi indicado.");
    addReferralFn({ ...refForm, credits: Number(refForm.credits || 0) });
    setRefForm({ referrer: "", referred: "", status: "Indicado", credits: 0 });
  }

  function creditReferral(item: Referral) { updateReferralFn(item.id, { status: "Transfer creditado", credits: Number(item.credits || 0) + 1 }); }

  function addFinance() {
    if (!financeForm.description || !financeForm.value) return alert("Preencha descrição e valor.");
    addFinanceFn({ ...financeForm, value: Number(financeForm.value) });
    setFinanceForm({ description: "", value: 0, type: "Entrada", date: today });
  }

  function calculateQuote(origin = quoteOrigin, destination = quoteDestination, km = quoteKm) {
    const result = calculateQuoteValue(origin, destination, km, quotePassengers, quoteBags, quoteSpecialLuggage);
    setQuoteResult(result);
    setTripForm((current) => ({ ...current, route: `${origin} → ${destination}`, value: result.value || current.value }));
    return result;
  }

  function getCurrentProposal(status: Proposal["status"] = "Rascunho") {
    const result = quoteResult || calculateQuote();
    if (!result.value || result.manual) {
      setVoiceStatusTimed("Calcule um orçamento válido antes de gerar a proposta premium.", 3500);
      return null;
    }
    const proposal: Proposal = {
      id: uid(), client: quoteClient || "Cliente", phone: quotePhone,
      origin: quoteOrigin, destination: quoteDestination, date: quoteDate, time: quoteTime,
      km: Number(result.km || quoteKm || 0), passengers: quotePassengers, bags: quoteBags,
      value: result.value, status, createdAt: new Date().toISOString(),
      validUntil: proposalValidityISO(10), message: "",
    };
    proposal.message = buildPremiumProposalMessage(proposal);
    return proposal;
  }

  function saveCurrentProposal(status: Proposal["status"] = "Rascunho") {
    const proposal = getCurrentProposal(status);
    if (!proposal) return null;
    setProposals((current) => [proposal, ...current]);
    setVoiceStatusTimed("Proposta premium salva no histórico ✓", 2500);
    return proposal;
  }

  function convertProposalToTrip(proposal: Proposal) {
    const newTrip: Trip = { id: uid(), client: proposal.client, phone: proposal.phone, date: proposal.date || today, time: proposal.time || "", route: `${proposal.origin} → ${proposal.destination}`, value: proposal.value, status: "Agendada" };
    setTrips((current) => [newTrip, ...current]);
    setProposals((current) => current.map((item) => item.id === proposal.id ? { ...item, status: "Convertida" } : item));
    setActive("viagens");
    setVoiceStatusTimed("Proposta convertida em viagem ✓", 3000);
  }

  function convertCurrentProposalToTrip() {
    const proposal = saveCurrentProposal("Convertida");
    if (proposal) convertProposalToTrip(proposal);
  }

  function captureRouteByVoice() {
    setVoiceStatus("Ouvindo rota... fale origem e destino.");
    startVoiceCapture((text) => {
      const parsed = parseSpokenRoute(text);
      setQuoteOrigin(parsed.origin);
      setQuoteDestination(parsed.destination);
      setQuoteResult(null);
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
        setActive("viagens");
        setQuoteOrigin(parsed.origin);
        setQuoteDestination(parsed.destination);
        if (numbers.passengers) setQuotePassengers(numbers.passengers);
        if (numbers.bags !== null) setQuoteBags(numbers.bags);
        if (numbers.km) setQuoteKm(numbers.km);
        setQuoteResult(null);
        setVoiceStatusTimed(`Rota preenchida: ${parsed.origin} → ${parsed.destination}. ${numbers.km ? `KM identificado: ${numbers.km}. Agora clique em Calcular Orçamento.` : "Abra o Maps, confira o KM e depois clique em Calcular Orçamento."}`, 6500);
        return;
      }
      if (lower.includes("novo cliente") || lower.includes("cadastrar cliente")) {
        const name = text.replace(/novo cliente|cadastrar cliente/gi, "").trim();
        setActive("clientes");
        setLeadForm((current) => ({ ...current, name }));
        setVoiceStatusTimed(`Novo cliente iniciado: ${name || "informe o nome"}.`, 4500);
        return;
      }
      if (lower.includes("whatsapp")) { setActive("whatsapp"); setVoiceStatus("Abrindo tela de WhatsApp."); }
      else if (lower.includes("financeiro")) { setActive("financeiro"); setVoiceStatus("Abrindo financeiro."); }
      else if (lower.includes("marketing")) { setActive("marketing"); setVoiceStatus("Abrindo marketing."); }
      else if (lower.includes("prospec")) { setActive("prospeccao"); setVoiceStatus("Abrindo prospecção."); }
      else if (lower.includes("cliente")) { setActive("clientes"); setVoiceStatus("Abrindo clientes."); }
      else { setVoiceStatus(`Comando ouvido: ${text}`); }
      window.setTimeout(() => setVoiceStatus(""), 4500);
    }, setVoiceStatus);
  }

  function exportBackup() {
    const data = { leads, trips, referrals, finance, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `backup-ame-control-${today}.json`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!logged) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] px-5 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
          <div className="animate-enter-up rounded-2xl border border-[var(--accent-12)] bg-[var(--bg-card)] p-8" style={{ boxShadow: "0 0 80px rgba(0,0,0,0.40)" }}>
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-15)] text-[var(--accent)]"><Sparkles /></div>
              <div><h1 className="text-2xl font-black tracking-tight">AME Control</h1><p className="text-sm text-zinc-500">Central da Alves Mobilidade Executiva</p></div>
            </div>
            <label className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Email</label>
            <input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} type="email" placeholder="seu@email.com" className="input-admin mt-3" />
            <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Senha</label>
            <input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} type="password" placeholder="Digite a senha" className="input-admin mt-3" />
            <button onClick={login} className="mt-5 w-full rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-6 py-3.5 text-sm font-bold tracking-wide text-white transition hover:opacity-90"
              style={{ boxShadow: "0 4px 16px rgba(var(--secondary-rgb), 0.30)" }}
            >Entrar no painel</button>
          </div>
        </div>
      </main>
    );
  }

  function renderContent() {
    switch (active) {
      case "dashboard": case "trabalhar":
        return <DashboardView
          stats={stats} leads={leads} finance={finance} today={today} currentTask={currentTask}
          selectedMessage={selectedMessage}
          onCompleteAction={completeAction} onSendLeadMessage={sendLeadMessage}
          onFinishTrip={finishTrip} onUpdateLead={updateLead}
        />;
      case "clientes": case "prospeccao": case "empresas": {
        let list = leads;
        if (active === "prospeccao") list = leads.filter((l) => !["Fechou", "Arquivado"].includes(l.status));
        if (active === "empresas") list = leads.filter((l) => l.type === "Empresa");
        return <ClientesView
          leads={list} query={query} leadForm={leadForm} importText={importText}
          showImport={active === "prospeccao"}
          title={active === "clientes" ? "Clientes e prospects" : active === "prospeccao" ? "Fila de prospecção" : "Empresas"}
          leadTypes={leadTypes}
          onSetQuery={setQuery} onSetLeadForm={setLeadForm} onSetImportText={setImportText}
          onAddLead={addLead} onUpdateLead={updateLead} onDeleteLead={deleteLead}
          onCompleteAction={completeAction} onSendLeadMessage={(lead, key) => sendLeadMessage(lead, key as MessageKey)} onImportLeads={importLeads}
        />;
      }
      case "whatsapp":
        return <WhatsAppView
          messages={messages} selectedMessage={selectedMessage} leads={leads}
          onSetSelectedMessage={setSelectedMessage} onSendLeadMessage={(lead, key) => sendLeadMessage(lead, key as MessageKey)}
        />;
      case "comercial":
        return <PropostasView
          quoteResult={quoteResult} quoteClient={quoteClient} quotePhone={quotePhone}
          quoteDate={quoteDate} quoteTime={quoteTime} quoteOrigin={quoteOrigin}
          quoteDestination={quoteDestination} quoteKm={quoteKm} quotePassengers={quotePassengers}
          quoteBags={quoteBags} quoteSpecialLuggage={quoteSpecialLuggage}
          proposals={proposals} voiceStatus={voiceStatus}
          getCurrentProposal={getCurrentProposal} saveCurrentProposal={saveCurrentProposal}
          calculateQuote={calculateQuote}
          downloadPremiumProposalImage={(p) => downloadImage(p, WHATSAPP_QR_DATA_URL)}
          printProposal={(p) => downloadPdf(p, WHATSAPP_QR_DATA_URL)}
          convertCurrentProposalToTrip={convertCurrentProposalToTrip}
          convertProposalToTrip={convertProposalToTrip}
          onCaptureRouteByVoice={captureRouteByVoice} onDeleteProposal={(id) => setProposals((c) => c.filter((i) => i.id !== id))}
          onSetQuoteClient={setQuoteClient} onSetQuotePhone={setQuotePhone}
          onSetQuoteDate={setQuoteDate} onSetQuoteTime={setQuoteTime}
          onSetQuoteOrigin={setQuoteOrigin} onSetQuoteDestination={setQuoteDestination}
          onSetQuoteKm={setQuoteKm} onSetQuotePassengers={setQuotePassengers}
          onSetQuoteBags={setQuoteBags} onSetQuoteSpecialLuggage={setQuoteSpecialLuggage}
          onSetQuoteResult={setQuoteResult}
          onOpenGoogleMapsRoute={openGoogleMapsRoute} onOpenWazeRoute={openWazeRoute}
        />;
      case "viagens":
        return <ViagensView
          quoteResult={quoteResult} quoteOrigin={quoteOrigin} quoteDestination={quoteDestination}
          quoteKm={quoteKm} quotePassengers={quotePassengers} quoteBags={quoteBags}
          quoteSpecialLuggage={quoteSpecialLuggage}
          tripForm={tripForm} trips={trips} voiceStatus={voiceStatus}
          buildQuoteMessage={buildQuoteMessage} calculateQuote={calculateQuote}
          onCaptureRouteByVoice={captureRouteByVoice}
          onAddTrip={addTrip} onFinishTrip={finishTrip}
          onDeleteTrip={(id) => deleteTripFn(id)}
          onSetTripForm={setTripForm}
          onSetQuoteOrigin={setQuoteOrigin} onSetQuoteDestination={setQuoteDestination}
          onSetQuoteKm={setQuoteKm} onSetQuotePassengers={setQuotePassengers}
          onSetQuoteBags={setQuoteBags} onSetQuoteSpecialLuggage={setQuoteSpecialLuggage}
          onSetQuoteResult={setQuoteResult}
          onOpenGoogleMapsRoute={openGoogleMapsRoute} onOpenWazeRoute={openWazeRoute}
        />;
      case "motoristas":
        return <MotoristasView
          motoristas={motoristas}
          onAdd={addMotorista}
          onUpdate={updateMotorista}
          onDelete={deleteMotorista}
        />;
      case "veiculos":
        return <VeiculosView
          veiculos={veiculos}
          onAdd={addVeiculo}
          onUpdate={updateVeiculo}
          onDelete={deleteVeiculo}
        />;
      case "indicacoes":
        return <IndicacoesView
          refForm={refForm} referrals={referrals}
          onSetRefForm={setRefForm} onAddReferral={addReferral}
          onCreditReferral={creditReferral} onDeleteReferral={(id) => setReferrals((c) => c.filter((r) => r.id !== id))}
        />;
      case "marketing":
        return <MarketingView
          completedMarketing={completedMarketing}
          onCompleteTask={completeMarketingTask} onResetTasks={resetMarketingTasks}
        />;
      case "financeiro":
        return <FinanceiroView
          stats={stats} trips={trips} financeForm={financeForm} finance={finance}
          onSetFinanceForm={setFinanceForm} onAddFinance={addFinance}
        />;
      case "ia":
        return <AIView stats={stats} onExportBackup={exportBackup} />;
      case "ame-vision":
        return <AMEVisionPanel trips={trips} />;
      default:
        return null;
    }
  }

  const activeLabel = menu.find((item) => item.id === active)?.label ?? "Dashboard";

  return (
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <div className="flex min-h-screen">
        <Sidebar active={active} menu={menu} setActive={setActive} onLogout={logout} />
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-40 border-b border-[var(--accent-8)] bg-[var(--bg-primary)]/85 backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-2 px-3 py-2 md:px-6 md:py-3">
              <div className="flex items-center gap-2 min-w-0 md:gap-3">
                <MobileNav active={active} menu={menu} setActive={setActive} />
                <div className="min-w-0">
                  <p className="truncate text-[9px] font-bold uppercase tracking-[0.25em] text-[var(--accent)] md:text-[10px] md:tracking-[0.28em]">Sistema Operacional da Alves</p>
                  <h2 className="truncate text-sm font-black tracking-tight md:text-xl">{activeLabel}</h2>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 md:gap-2">
                <button onClick={exportBackup} className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/8 px-2 py-1.5 text-[11px] font-bold text-zinc-400 transition hover:border-white/15 hover:text-zinc-200 md:px-3.5 md:py-2"><Download size={13} className="md:mr-1.5" /><span className="hidden md:inline">Backup</span></button>
                <Link href="/" className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/8 px-2 py-1.5 text-[11px] font-bold text-zinc-400 transition hover:border-white/15 hover:text-zinc-200 md:px-3.5 md:py-2"><span className="hidden md:inline">Ver site </span><ChevronRight size={13} /></Link>
              </div>
            </div>
          </div>
          <div className="flex-1 px-3 pb-28 pt-4 md:px-6 md:pb-8 md:pt-6">
            <div key={active} className="animate-enter-up">{renderContent()}</div>
          </div>
        </section>
      </div>

      <button type="button" onClick={startAmeAssistant}
        className="fixed bottom-4 right-4 z-[80] flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-4 py-3.5 text-sm font-bold text-white shadow-lg md:bottom-5 md:right-5 md:px-5 md:py-4"
        title="Comando AME"
        style={{ boxShadow: "0 20px 70px rgba(var(--accent-rgb), 0.24)" }}
      ><Mic size={16} className="md:size-[18px]" /> <span className="hidden sm:inline">Comando AME</span></button>

      <VozView
        ameOpen={ameOpen} ameStep={ameStep} ameText={ameText}
        voiceStatus={voiceStatus} quoteOrigin={quoteOrigin} quoteDestination={quoteDestination}
        onSetAmeText={setAmeText} onCloseAmeAssistant={closeAmeAssistant}
        onProcessAmeAnswer={processAmeAnswer} onAmeSpeak={ameSpeak}
        onOpenGoogleMapsRoute={openGoogleMapsRoute}
      />

      {voiceStatus && !ameOpen && active !== "viagens" && (
        <div className="fixed bottom-6 right-20 z-[80] max-w-sm rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--accent)] shadow-2xl backdrop-blur-xl max-sm:bottom-20 max-sm:right-4">{voiceStatus}</div>
      )}
    </main>
  );
}
