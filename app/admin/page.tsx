"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import {
  BarChart3,
  Bot,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Download,
  Gift,
  Import,
  LogOut,
  Megaphone,
  MessageCircle,
  Mic,
  Phone,
  Plane,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
} from "lucide-react";

type Status =
  | "Novo contato"
  | "Apresentação enviada"
  | "Respondeu"
  | "Orçamento enviado"
  | "Negociação"
  | "Fechou"
  | "Pós-atendimento"
  | "Arquivado";

type LeadType = "Aeroporto" | "Empresa" | "Hotel" | "Evento" | "Indicação" | "Cliente antigo" | "Outro";

type Lead = {
  id: string;
  name: string;
  phone: string;
  type: LeadType;
  origin: string;
  status: Status;
  notes: string;
  nextAction: string;
  nextDate: string;
  createdAt: string;
  lastContact?: string;
};

type Trip = {
  id: string;
  client: string;
  phone: string;
  date: string;
  time: string;
  route: string;
  value: number;
  status: "Agendada" | "Concluída" | "Cancelada";
};

type Referral = {
  id: string;
  referrer: string;
  referred: string;
  status: "Indicado" | "Transfer realizado" | "Transfer creditado";
  credits: number;
};

type FinanceEntry = {
  id: string;
  description: string;
  value: number;
  type: "Entrada" | "Saída";
  date: string;
};

type Proposal = {
  id: string;
  client: string;
  phone: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  km: number;
  passengers: number;
  bags: number;
  value: number;
  status: "Rascunho" | "Enviada" | "Aceita" | "Convertida" | "Recusada";
  createdAt: string;
  validUntil: string;
  message: string;
};

const adminPassword = "alves2026";
const today = new Date().toISOString().slice(0, 10);

const statuses: Status[] = ["Novo contato", "Apresentação enviada", "Respondeu", "Orçamento enviado", "Negociação", "Fechou", "Pós-atendimento", "Arquivado"];
const leadTypes: LeadType[] = ["Aeroporto", "Empresa", "Hotel", "Evento", "Indicação", "Cliente antigo", "Outro"];

const messages = {
  apresentacao:
    "Olá, tudo bem? Me chamo Felipe, sou da Alves Mobilidade Executiva. Atendemos em Belo Horizonte e Região Metropolitana com transporte executivo para aeroportos, empresas, eventos e viagens. Posso te enviar uma apresentação rápida dos nossos serviços?",
  indicacao:
    "Olá, tudo bem? Tenho uma novidade exclusiva para você! Criamos o Programa de Indicação da Alves Mobilidade Executiva. Indique novos clientes, acumule indicações e ganhe Transfers Executivos gratuitos para o Aeroporto de Confins. Posso te explicar rapidamente?",
  followup:
    "Olá, tudo bem? Passando para saber se ainda precisa de transporte executivo. Fico à disposição para aeroportos, empresas, eventos e viagens agendadas em BH e Região Metropolitana.",
  agradecimento:
    "Olá, tudo bem? Passando para agradecer pela confiança na Alves Mobilidade Executiva. Foi um prazer atender você. Sempre que precisar de transporte executivo, estarei à disposição.",
  orcamento:
    "Olá! Para eu preparar seu orçamento, me envie por favor: origem, destino, data, horário, quantidade de passageiros e quantidade de malas.",
  confirmacao:
    "Olá, tudo bem? Passando para confirmar nosso atendimento. Se puder, me confirme origem, destino, horário e quantidade de passageiros para deixarmos tudo organizado.",
};

const defaultLeads: Lead[] = [
  { id: "1", name: "Rayssa", phone: "31998458084", type: "Aeroporto", origin: "Cliente atual", status: "Pós-atendimento", notes: "Cliente com potencial para indicação.", nextAction: "Enviar Programa de Indicação", nextDate: today, createdAt: new Date().toISOString() },
  { id: "2", name: "Hotel Bourbon", phone: "3130000000", type: "Hotel", origin: "Google Maps", status: "Novo contato", notes: "Tentar falar com recepção ou gerente.", nextAction: "Fazer apresentação da Alves", nextDate: today, createdAt: new Date().toISOString() },
  { id: "3", name: "Empresa Vale", phone: "3131111111", type: "Empresa", origin: "Prospecção corporativa", status: "Orçamento enviado", notes: "Retornar perguntando sobre transporte executivo.", nextAction: "Follow-up de orçamento", nextDate: today, createdAt: new Date().toISOString() },
];

const defaultTrips: Trip[] = [
  { id: "1", client: "Rayssa", phone: "31998458084", date: today, time: "06:00", route: "BH → Confins", value: 150, status: "Agendada" },
  { id: "2", client: "Cliente Corporativo", phone: "31999999999", date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), time: "14:30", route: "Savassi → Vila da Serra", value: 120, status: "Agendada" },
];

const defaultReferrals: Referral[] = [{ id: "1", referrer: "Rayssa", referred: "Rafaela", status: "Transfer realizado", credits: 1 }];
const defaultFinance: FinanceEntry[] = [{ id: "1", description: "Transfer Rayssa - Confins", value: 150, type: "Entrada", date: today }];
const defaultProposals: Proposal[] = [];



const WHATSAPP_QR_DATA_URL = "data:image/png;base64,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";

const menu = [
  { id: "dashboard", group: "Operação", label: "Dashboard", icon: BarChart3 },
  { id: "financeiro", group: "Operação", label: "Financeiro", icon: DollarSign },
  { id: "comercial", group: "Operação", label: "Comercial", icon: ClipboardList },
  { id: "trabalhar", group: "Operação", label: "Trabalhar Agora", icon: Sparkles },
  { id: "clientes", group: "Operação", label: "Clientes", icon: Users },
  { id: "prospeccao", group: "Operação", label: "Prospecção", icon: Target },
  { id: "whatsapp", group: "Operação", label: "WhatsApp", icon: MessageCircle },
  { id: "viagens", group: "Operação", label: "Viagens e Agenda", icon: Plane },
  { id: "indicacoes", group: "Comercial", label: "Indicações", icon: Gift },
  { id: "empresas", group: "Comercial", label: "Empresas", icon: Briefcase },
  { id: "marketing", group: "Gestão", label: "Marketing", icon: Megaphone },
  { id: "ia", group: "Gestão", label: "IA da Alves", icon: Bot },
];

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function openWhatsApp(phone: string, message: string) {
  const number = cleanPhone(phone);
  if (!number) return alert("Esse contato não tem telefone cadastrado.");
  const finalNumber = number.startsWith("55") ? number : `55${number}`;
  window.open(`https://wa.me/${finalNumber}?text=${encodeURIComponent(message)}`, "_blank");
}

function splitRoute(route: string) {
  const parts = route.split(/→|->| até | para /i).map((part) => part.trim()).filter(Boolean);
  return { origin: parts[0] || "Belo Horizonte - MG", destination: parts[1] || route || "Aeroporto Internacional de Confins" };
}

function openGoogleMapsRoute(origin: string, destination: string) {
  window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`, "_blank");
}

function openWazeRoute(destination: string) {
  window.open(`https://www.waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`, "_blank");
}

type QuoteResult = {
  value: number;
  rule: string;
  km: number;
  type: "Transfer Confins" | "Corrida agendada" | "Viagem rodoviária" | "Manual";
  region?: string;
  manual?: boolean;
  notes?: string[];
};

const priceRules = {
  pricePerKm: 3,
  roundTo: 10,
};

const confinsPricingTable = [
  { region: "Belo Horizonte - Centro/Centro-Sul", value: 150, keywords: ["centro", "centro-sul", "centro sul", "savassi", "lourdes", "funcionários", "funcionarios", "sion", "santo agostinho", "santo antônio", "santo antonio", "serra", "anchieta", "belvedere", "mangabeiras", "cidade jardim", "luxemburgo", "cruzeiro", "buritis", "estóril", "estoril", "gutierrez", "barro preto", "tamoios", "afonso pena"] },
  { region: "Belo Horizonte - Leste / Nordeste", value: 130, keywords: ["leste", "nordeste", "sagrada família", "sagrada familia", "cidade nova", "floresta", "santa tereza", "horto", "santa inês", "santa ines", "união", "uniao", "ipiranga", "goiânia", "goiania"] },
  { region: "Belo Horizonte - Noroeste", value: 140, keywords: ["noroeste", "caiçara", "caicara", "padre eustáquio", "padre eustaquio", "carlos prates", "dom bosco", "glória", "gloria", "alípio de melo", "alipio de melo"] },
  { region: "Belo Horizonte - Pampulha", value: 110, keywords: ["pampulha", "castelo", "ouro preto", "jaraguá", "jaragua", "são luiz", "sao luiz", "bandeirantes", "braúnas", "braunas", "mineirão", "mineirao", "ufmg"] },
  { region: "Belo Horizonte - Oeste", value: 150, keywords: ["oeste", "nova suíssa", "nova suissa", "calafate", "prado", "grajaú", "grajau", "salão do encontro", "salgado filho"] },
  { region: "Belo Horizonte - Barreiro", value: 160, keywords: ["barreiro", "diamante", "tirol", "milionários", "milionarios", "flávio marques", "flavio marques"] },
  { region: "Belo Horizonte - Norte", value: 100, keywords: ["norte", "planalto", "guarani", "tupi", "floramar", "são bernardo", "sao bernardo", "primeiro de maio"] },
  { region: "Belo Horizonte - Venda Nova", value: 110, keywords: ["venda nova", "letícia", "leticia", "mantiqueira", "justinópolis", "justinopolis", "cenáculo", "cenaculo"] },
  { region: "Contagem - Regional Eldorado", value: 140, keywords: ["eldorado"] },
  { region: "Contagem - Regional Riacho", value: 150, keywords: ["riacho", "riacho das pedras"] },
  { region: "Contagem - Regional Industrial", value: 140, keywords: ["industrial", "cinco", "5", "contagem industrial"] },
  { region: "Contagem - Nacional / Petrolândia / Ressaca / Sede / Vargem das Flores", value: 180, keywords: ["nacional", "petrolândia", "petrolandia", "ressaca", "sede contagem", "vargem das flores"] },
  { region: "Betim (Centro, Alterosas, Teresópolis e região central)", value: 210, keywords: ["betim", "alterosas", "teresópolis", "teresopolis"] },
  { region: "Sabará (zona urbana)", value: 150, keywords: ["sabará", "sabara"] },
  { region: "Santa Luzia (zona urbana)", value: 130, keywords: ["santa luzia"] },
  { region: "São José da Lapa", value: 100, keywords: ["são josé da lapa", "sao jose da lapa"] },
  { region: "Pedro Leopoldo", value: 100, keywords: ["pedro leopoldo"] },
  { region: "Matozinhos", value: 100, keywords: ["matozinhos"] },
  { region: "Capim Branco", value: 110, keywords: ["capim branco"] },
  { region: "Sete Lagoas (zona urbana)", value: 180, keywords: ["sete lagoas"] },
  { region: "Ribeirão das Neves (zona urbana)", value: 160, keywords: ["ribeirão das neves", "ribeirao das neves", "neves"] },
  { region: "Nova Lima (cidade)", value: 180, keywords: ["nova lima"] },
  { region: "Vila da Serra", value: 180, keywords: ["vila da serra", "vale do sereno", "oscár niemeyer", "oscar niemeyer"] },
  { region: "Jardim Canadá / Alphaville (Nova Lima)", value: 210, keywords: ["jardim canadá", "jardim canada", "alphaville"] },
];

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizeText(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findConfinsRegion(origin: string, destination: string) {
  const routeText = normalizeText(`${origin} ${destination}`);
  return confinsPricingTable.find((item) => item.keywords.some((keyword) => routeText.includes(normalizeText(keyword))));
}

function isConfinsRoute(origin: string, destination: string) {
  const routeText = normalizeText(`${origin} ${destination}`);
  return routeText.includes("confins") || routeText.includes("cnf") || routeText.includes("aeroporto internacional");
}

function roundUpTo(value: number, step = priceRules.roundTo) {
  return Math.ceil(value / step) * step;
}

function estimateRouteValue(origin: string, destination: string, distanceKm: number, passengers = 1, bags = 0, specialLuggage = false): QuoteResult {
  const notes: string[] = [];

  if (passengers > 4 || specialLuggage || bags > 4) {
    notes.push("Orçamento manual recomendado: mais de 4 passageiros, excesso de bagagens ou necessidade de veículo maior.");
    return { value: 0, rule: "Orçamento manual", km: distanceKm || 0, type: "Manual", manual: true, notes };
  }

  if (!distanceKm || distanceKm <= 0) {
    notes.push("Informe o KM da rota para calcular. Use o botão Maps para conferir a distância ou digite manualmente.");
    return { value: 0, rule: "Aguardando KM da rota", km: 0, type: isConfinsRoute(origin, destination) ? "Transfer Confins" : "Corrida agendada", manual: true, notes };
  }

  const rawValue = distanceKm * priceRules.pricePerKm;
  const roundedValue = roundUpTo(rawValue);
  const type: QuoteResult["type"] = distanceKm >= 100 ? "Viagem rodoviária" : isConfinsRoute(origin, destination) ? "Transfer Confins" : "Corrida agendada";

  return {
    value: roundedValue,
    rule: `R$ ${priceRules.pricePerKm.toFixed(2).replace(".", ",")}/km com arredondamento sempre para cima de ${priceRules.roundTo} em ${priceRules.roundTo}`,
    km: distanceKm,
    type,
    notes,
  };
}

function quoteValidityDate(days = 10) {
  return new Date(Date.now() + days * 86400000).toLocaleDateString("pt-BR");
}

function buildQuoteMessage(origin: string, destination: string, result: QuoteResult, passengers: number, bags: number) {
  const valueText = result.value ? money(result.value) : "orçamento manual";
  const kmText = result.km ? `${result.km} km` : "a confirmar";

  return `🚘 ALVES MOBILIDADE EXECUTIVA

ORÇAMENTO DE TRANSPORTE EXECUTIVO

📍 Embarque: ${origin}
📍 Destino: ${destination}

👥 Passageiros: ${passengers}
🧳 Bagagens: ${bags}
📏 Distância estimada: ${kmText}
🚘 Tipo: ${result.type}

💰 Valor do atendimento: ${valueText}
📅 Validade do orçamento: 10 dias, até ${quoteValidityDate(10)}

${result.manual ? "Observação: este atendimento precisa de confirmação manual antes do agendamento.\n\n" : ""}Alves Mobilidade Executiva
Conforto, segurança e pontualidade em cada trajeto.`;
}


function startVoiceCapture(
  onText: (text: string) => void,
  onStatus?: (message: string) => void
) {
  if (typeof window === "undefined") return;

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert("Seu navegador não suporta reconhecimento de voz. Use o Google Chrome.");
    return;
  }

  try {
    const recognition = new SpeechRecognition();

    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      if (onStatus) onStatus("🎤 Microfone ativado. Pode falar agora...");
    };

    recognition.onresult = (event: any) => {
      const text = event?.results?.[0]?.[0]?.transcript ?? "";

      if (text) {
        onText(text);
      } else if (onStatus) {
        onStatus("Não consegui entender. Tente novamente.");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Erro no reconhecimento de voz:", event);

      if (event.error === "not-allowed") {
        if (onStatus) onStatus("Permissão do microfone bloqueada.");
        alert("O microfone está bloqueado. Clique no cadeado do navegador e permita o microfone.");
        return;
      }

      if (event.error === "no-speech") {
        if (onStatus) onStatus("Não ouvi nada. Clique novamente e fale perto do microfone.");
        return;
      }

      if (onStatus) onStatus("Erro ao acessar o microfone. Tente novamente pelo Google Chrome.");
    };

    recognition.start();
  } catch (error) {
    console.error("Erro ao iniciar microfone:", error);
    alert("Não foi possível iniciar o microfone. Use Google Chrome e permita o acesso.");
  }
}

function normalizeSpokenAddress(text: string) {
  return text
    .replace(/^viagem\s+(da|de|do)\s+/i, "")
    .replace(/^corrida\s+(da|de|do)\s+/i, "")
    .replace(/^transfer\s+(da|de|do)\s+/i, "")
    .replace(/\b(bh|belo horizonte)\b/gi, "Belo Horizonte - MG")
    .replace(/\bconfins\b/gi, "Aeroporto Internacional de Confins")
    .trim();
}

function parseSpokenRoute(text: string) {
  const cleaned = normalizeSpokenAddress(text);
  const parts = cleaned.split(/\s+(?:para|pra|até)\s+/i).map((part) => part.trim()).filter(Boolean);
  return {
    origin: parts[0] || "Belo Horizonte - MG",
    destination: parts[1] || "Aeroporto Internacional de Confins",
  };
}


function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try { return JSON.parse(saved) as T; } catch { return fallback; }
}

function saveLocal<T>(key: string, value: T) {
  if (typeof window !== "undefined") localStorage.setItem(key, JSON.stringify(value));
}

function nextActionText(status: Status) {
  const map: Record<Status, string> = {
    "Novo contato": "Enviar apresentação da Alves",
    "Apresentação enviada": "Aguardar resposta ou enviar follow-up",
    "Respondeu": "Enviar orçamento ou coletar dados da viagem",
    "Orçamento enviado": "Fazer follow-up do orçamento",
    "Negociação": "Tentar fechar a viagem",
    "Fechou": "Agendar viagem e confirmar pagamento",
    "Pós-atendimento": "Agradecer e apresentar Programa de Indicação",
    "Arquivado": "Sem ação no momento",
  };
  return map[status];
}

function nextStatus(status: Status): Status {
  const order: Status[] = ["Novo contato", "Apresentação enviada", "Respondeu", "Orçamento enviado", "Negociação", "Fechou", "Pós-atendimento"];
  const index = order.indexOf(status);
  return index >= 0 && index < order.length - 1 ? order[index + 1] : "Pós-atendimento";
}

function tomorrow(days = 1) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export default function AdminPage() {
  const [logged, setLogged] = useState(false);
  const [password, setPassword] = useState("");
  const [active, setActive] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>(defaultLeads);
  const [trips, setTrips] = useState<Trip[]>(defaultTrips);
  const [referrals, setReferrals] = useState<Referral[]>(defaultReferrals);
  const [finance, setFinance] = useState<FinanceEntry[]>(defaultFinance);
  const [proposals, setProposals] = useState<Proposal[]>(defaultProposals);
  const [importText, setImportText] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<keyof typeof messages>("apresentacao");
  const [completedMarketing, setCompletedMarketing] = useState<string[]>([]);
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

  useEffect(() => {
    setLogged(localStorage.getItem("ame-admin-auth") === "true");
    setLeads(loadLocal("ame-leads-v2", defaultLeads));
    setTrips(loadLocal("ame-trips-v2", defaultTrips));
    setReferrals(loadLocal("ame-referrals-v2", defaultReferrals));
    setFinance(loadLocal("ame-finance-v2", defaultFinance));
    setProposals(loadLocal("ame-proposals-v1", defaultProposals));
    setCompletedMarketing(loadLocal("ame-marketing-done-v3", []));
  }, []);

  useEffect(() => saveLocal("ame-leads-v2", leads), [leads]);
  useEffect(() => saveLocal("ame-trips-v2", trips), [trips]);
  useEffect(() => saveLocal("ame-referrals-v2", referrals), [referrals]);
  useEffect(() => saveLocal("ame-finance-v2", finance), [finance]);
  useEffect(() => saveLocal("ame-proposals-v1", proposals), [proposals]);
  useEffect(() => saveLocal("ame-marketing-done-v3", completedMarketing), [completedMarketing]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [active]);

  const stats = useMemo(() => {
    const pending = leads.filter((lead) => lead.nextDate <= today && !["Arquivado", "Fechou"].includes(lead.status));
    const openLeads = leads.filter((lead) => !["Arquivado", "Fechou"].includes(lead.status));
    const closed = leads.filter((lead) => lead.status === "Fechou").length;
    const revenueTrips = trips.filter((trip) => trip.status !== "Cancelada").reduce((sum, trip) => sum + Number(trip.value || 0), 0);
    const revenueFinance = finance.reduce((sum, item) => sum + (item.type === "Entrada" ? Number(item.value || 0) : -Number(item.value || 0)), 0);
    const credits = referrals.reduce((sum, item) => sum + Number(item.credits || 0), 0);
    const todayTrips = trips.filter((trip) => trip.date === today && trip.status === "Agendada");
    const conversion = leads.length ? Math.round((closed / leads.length) * 100) : 0;
    return { pending, openLeads, closed, revenueTrips, revenueFinance, credits, todayTrips, conversion };
  }, [leads, trips, referrals, finance]);

  const filteredLeads = leads.filter((lead) => `${lead.name} ${lead.phone} ${lead.type} ${lead.status} ${lead.origin}`.toLowerCase().includes(query.toLowerCase()));
  const currentTask = stats.pending[0];

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

  function startAmeAssistant() {
    setAmeOpen(true);
    setAmeStep("inicio");
    setAmeText("");
    setActive("viagens");
    ameTalk("Olá Felipe. O que vamos fazer agora? Você pode dizer ou digitar novo orçamento.");
  }

  function closeAmeAssistant() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setAmeOpen(false);
    setAmeText("");
  }

  function processAmeAnswer(rawText: string) {
    const value = rawText.trim();
    if (!value) {
      ameTalk("Digite ou fale uma resposta para continuar.");
      return;
    }

    const lower = value.toLowerCase();

    if (ameStep === "inicio") {
      if (lower.includes("orçamento") || lower.includes("orcamento") || lower.includes("transfer") || lower.includes("viagem")) {
        setActive("viagens");
        setAmeStep("origem");
        setAmeText("");
        ameTalk("Certo. Qual é o local de embarque?");
        return;
      }

      if (lower.includes("financeiro")) {
        setActive("financeiro");
        setAmeText("");
        ameTalk("Abrindo financeiro.");
        return;
      }

      if (lower.includes("cliente")) {
        setActive("clientes");
        setAmeText("");
        ameTalk("Abrindo clientes.");
        return;
      }

      if (lower.includes("whatsapp")) {
        setActive("whatsapp");
        setAmeText("");
        ameTalk("Abrindo WhatsApp.");
        return;
      }

      ameTalk("Por enquanto eu entendo melhor o comando novo orçamento. Digite ou fale novo orçamento.");
      return;
    }

    if (ameStep === "origem") {
      setQuoteOrigin(value);
      setQuoteResult(null);
      setAmeStep("destino");
      setAmeText("");
      ameTalk("Perfeito. Agora informe o destino.");
      return;
    }

    if (ameStep === "destino") {
      const normalizedDestination = normalizeSpokenAddress(value);
      setQuoteDestination(normalizedDestination);
      setQuoteResult(null);
      setAmeStep("passageiros");
      setAmeText("");
      ameTalk("Quantos passageiros?");
      return;
    }

    if (ameStep === "passageiros") {
      const parsed = parseVoiceNumbers(`${value} passageiros`);
      const number = Number(value.replace(/\D/g, "")) || parsed.passengers || 1;
      setQuotePassengers(number);
      setQuoteResult(null);
      setAmeStep("malas");
      setAmeText("");
      ameTalk("Quantas malas ou bagagens?");
      return;
    }

    if (ameStep === "malas") {
      const parsed = parseVoiceNumbers(`${value} malas`);
      const number = Number(value.replace(/\D/g, "")) || parsed.bags || 0;
      setQuoteBags(number);
      setQuoteResult(null);
      setAmeStep("km");
      setAmeText("");
      ameTalk("Agora informe a quilometragem da rota. Se precisar, toque em abrir rota no Maps para conferir.");
      return;
    }

    if (ameStep === "km") {
      const km = Number(value.replace(",", ".").replace(/[^\d.]/g, ""));

      if (!km || km <= 0) {
        ameTalk("Não entendi a quilometragem. Digite apenas o número, por exemplo, trinta e oito ou 38.");
        return;
      }

      setQuoteKm(km);
      const result = calculateQuote(quoteOrigin, quoteDestination, km);
      setAmeStep("resultado");
      setAmeText("");
      ameTalk(`Orçamento calculado em ${result.value ? money(result.value) : "valor manual"}. Você pode copiar o orçamento digital ou enviar pelo WhatsApp.`);
      return;
    }

    if (ameStep === "resultado") {
      if (lower.includes("copiar")) {
        const message = quoteResult ? buildQuoteMessage(quoteOrigin, quoteDestination, quoteResult, quotePassengers, quoteBags) : "";
        if (message) navigator.clipboard.writeText(message);
        ameTalk("Orçamento copiado.");
        return;
      }

      if (lower.includes("novo")) {
        setAmeStep("origem");
        setAmeText("");
        setQuoteResult(null);
        ameTalk("Vamos fazer um novo orçamento. Qual é o local de embarque?");
        return;
      }

      ameTalk("Orçamento já calculado. Você pode copiar, enviar pelo WhatsApp, usar na viagem ou iniciar um novo orçamento.");
    }
  }

  function ameSpeak() {
    startVoiceCapture((text) => {
      setAmeText(text);
      processAmeAnswer(text);
    }, setVoiceStatus);
  }

  function login() {
    if (password === adminPassword) {
      localStorage.setItem("ame-admin-auth", "true");
      setLogged(true);
    } else alert("Senha incorreta. Senha inicial: alves2026");
  }

  function logout() {
    localStorage.removeItem("ame-admin-auth");
    setLogged(false);
  }

  function addLead() {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) return alert("Preencha pelo menos nome e WhatsApp.");
    setLeads((current) => [{ id: uid(), createdAt: new Date().toISOString(), ...leadForm }, ...current]);
    setLeadForm({ name: "", phone: "", type: "Aeroporto", origin: "", status: "Novo contato", notes: "", nextAction: "Enviar apresentação da Alves", nextDate: today });
  }

  function updateLead(id: string, patch: Partial<Lead>) {
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
  }

  function deleteLead(id: string) {
    if (confirm("Remover esse contato?")) setLeads((current) => current.filter((lead) => lead.id !== id));
  }

  function completeAction(lead: Lead) {
    const status = nextStatus(lead.status);
    updateLead(lead.id, { status, nextAction: nextActionText(status), nextDate: status === "Pós-atendimento" ? tomorrow(2) : tomorrow(1), lastContact: new Date().toISOString() });
  }

  function sendLeadMessage(lead: Lead, key: keyof typeof messages) {
    openWhatsApp(lead.phone, messages[key]);
    const status = lead.status === "Novo contato" ? "Apresentação enviada" : lead.status;
    updateLead(lead.id, { status, nextAction: nextActionText(status), nextDate: tomorrow(1), lastContact: new Date().toISOString() });
  }

  function importLeads() {
    const lines = importText.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return alert("Cole pelo menos um contato.");
    const imported: Lead[] = lines.map((line) => {
      const parts = line.split(/[;,]/).map((part) => part.trim());
      const name = parts[0] || "Novo contato";
      const phone = parts[1] || "";
      return { id: uid(), name, phone, type: "Aeroporto", origin: "Importado", status: "Novo contato", notes: "Contato importado em massa.", nextAction: "Enviar apresentação da Alves", nextDate: today, createdAt: new Date().toISOString() };
    });
    setLeads((current) => [...imported, ...current]);
    setImportText("");
  }

  function addTrip() {
    if (!tripForm.client || !tripForm.date || !tripForm.time) return alert("Preencha cliente, data e horário.");
    setTrips((current) => [{ id: uid(), ...tripForm, value: Number(tripForm.value || 0) }, ...current]);
    setTripForm({ client: "", phone: "", date: today, time: "", route: "BH → Confins", value: 150, status: "Agendada" });
  }

  function finishTrip(trip: Trip) {
    setTrips((current) => current.map((item) => (item.id === trip.id ? { ...item, status: "Concluída" } : item)));
    setFinance((current) => [{ id: uid(), description: `Viagem ${trip.client} - ${trip.route}`, value: Number(trip.value || 0), type: "Entrada", date: trip.date }, ...current]);
    const existing = leads.find((lead) => cleanPhone(lead.phone) === cleanPhone(trip.phone) || lead.name.toLowerCase() === trip.client.toLowerCase());
    if (existing) updateLead(existing.id, { status: "Pós-atendimento", nextAction: "Agradecer e apresentar Programa de Indicação", nextDate: tomorrow(2) });
  }

  function addReferral() {
    if (!refForm.referrer || !refForm.referred) return alert("Preencha quem indicou e quem foi indicado.");
    setReferrals((current) => [{ id: uid(), ...refForm, credits: Number(refForm.credits || 0) }, ...current]);
    setRefForm({ referrer: "", referred: "", status: "Indicado", credits: 0 });
  }

  function creditReferral(item: Referral) {
    setReferrals((current) => current.map((ref) => (ref.id === item.id ? { ...ref, status: "Transfer creditado", credits: Number(ref.credits || 0) + 1 } : ref)));
  }

  function addFinance() {
    if (!financeForm.description || !financeForm.value) return alert("Preencha descrição e valor.");
    setFinance((current) => [{ id: uid(), ...financeForm, value: Number(financeForm.value) }, ...current]);
    setFinanceForm({ description: "", value: 0, type: "Entrada", date: today });
  }

  function completeMarketingTask(id: string) {
    setCompletedMarketing((current) => current.includes(id) ? current : [...current, id]);
  }

  function resetMarketingTasks() {
    setCompletedMarketing([]);
  }

  function calculateQuote(origin = quoteOrigin, destination = quoteDestination, km = quoteKm) {
    const result = estimateRouteValue(origin, destination, Number(km || 0), quotePassengers, quoteBags, quoteSpecialLuggage);
    setQuoteResult(result);
    setTripForm((current) => ({
      ...current,
      route: `${origin} → ${destination}`,
      value: result.value || current.value,
    }));
    return result;
  }

  function proposalValidityISO(days = 10) {
    return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  }

  function buildPremiumProposalMessage(proposal: Proposal) {
    return `🚘 ALVES MOBILIDADE EXECUTIVA

PROPOSTA COMERCIAL PREMIUM

Cliente: ${proposal.client || "Cliente"}
Embarque: ${proposal.origin}
Destino: ${proposal.destination}
Data: ${proposal.date || "A combinar"}
Horário: ${proposal.time || "A combinar"}
Passageiros: ${proposal.passengers}
Bagagens: ${proposal.bags}
Distância estimada: ${proposal.km || "a confirmar"} km

Valor do atendimento executivo: ${money(proposal.value)}
Validade: 10 dias, até ${new Date(proposal.validUntil + "T00:00:00").toLocaleDateString("pt-BR")}

Incluso no atendimento:
• Motorista executivo
• Veículo confortável
• Pontualidade
• Atendimento personalizado
• Suporte pelo WhatsApp

Alves Mobilidade Executiva
Mais do que transporte. Uma experiência em mobilidade.`;
  }

  function getCurrentProposal(status: Proposal["status"] = "Rascunho") {
    const result = quoteResult || calculateQuote();

    if (!result.value || result.manual) {
      setVoiceStatus("Calcule um orçamento válido antes de gerar a proposta premium.");
      window.setTimeout(() => setVoiceStatus(""), 3500);
      return null;
    }

    const proposal: Proposal = {
      id: uid(),
      client: quoteClient || "Cliente",
      phone: quotePhone,
      origin: quoteOrigin,
      destination: quoteDestination,
      date: quoteDate,
      time: quoteTime,
      km: Number(result.km || quoteKm || 0),
      passengers: quotePassengers,
      bags: quoteBags,
      value: result.value,
      status,
      createdAt: new Date().toISOString(),
      validUntil: proposalValidityISO(10),
      message: "",
    };

    proposal.message = buildPremiumProposalMessage(proposal);
    return proposal;
  }

  function saveCurrentProposal(status: Proposal["status"] = "Rascunho") {
    const proposal = getCurrentProposal(status);
    if (!proposal) return null;

    setProposals((current) => [proposal, ...current]);
    setVoiceStatus("Proposta premium salva no histórico ✓");
    window.setTimeout(() => setVoiceStatus(""), 2500);
    return proposal;
  }

  function convertProposalToTrip(proposal: Proposal) {
    const newTrip: Trip = {
      id: uid(),
      client: proposal.client,
      phone: proposal.phone,
      date: proposal.date || today,
      time: proposal.time || "",
      route: `${proposal.origin} → ${proposal.destination}`,
      value: proposal.value,
      status: "Agendada",
    };

    setTrips((current) => [newTrip, ...current]);
    setProposals((current) => current.map((item) => item.id === proposal.id ? { ...item, status: "Convertida" } : item));
    setActive("viagens");
    setVoiceStatus("Proposta convertida em viagem ✓");
    window.setTimeout(() => setVoiceStatus(""), 3000);
  }

  function convertCurrentProposalToTrip() {
    const proposal = saveCurrentProposal("Convertida");
    if (proposal) convertProposalToTrip(proposal);
  }

  function proposalCode(proposal: Proposal) {
    const date = new Date(proposal.createdAt || new Date().toISOString());
    const year = date.getFullYear();
    const shortId = proposal.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase() || "000001";
    return `AME-${year}-${shortId}`;
  }

  function svgEscape(value: string) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function wrapSvgText(value: string, maxChars = 28) {
    const words = String(value || "").split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";

    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });

    if (current) lines.push(current);
    return lines.slice(0, 3);
  }

  function svgMultiline(value: string, x: number, y: number, options?: { maxChars?: number; size?: number; weight?: number; fill?: string; lineHeight?: number }) {
    const maxChars = options?.maxChars ?? 28;
    const size = options?.size ?? 24;
    const weight = options?.weight ?? 800;
    const fill = options?.fill ?? "#f5f0e8";
    const lineHeight = options?.lineHeight ?? size + 8;
    const lines = wrapSvgText(value, maxChars);

    return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="Arial, Helvetica, sans-serif">${lines
      .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}">${svgEscape(line)}</tspan>`)
      .join("")}</text>`;
  }

  function buildPremiumProposalSvg(proposal: Proposal) {
    const validUntil = new Date(proposal.validUntil + "T00:00:00").toLocaleDateString("pt-BR");
    const createdAt = new Date(proposal.createdAt).toLocaleDateString("pt-BR");
    const code = proposalCode(proposal);
    const phone = proposal.phone ? proposal.phone : "(31) 99845-8084";
    const dateTime = `${proposal.date || "A combinar"}${proposal.time ? ` às ${proposal.time}` : ""}`;
    const passengersBags = `${proposal.passengers} passageiro(s) • ${proposal.bags} mala(s)`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123" viewBox="0 0 794 1123">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#161616"/>
      <stop offset="56%" stop-color="#080808"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#f6daa1"/>
      <stop offset="45%" stop-color="#d6a85f"/>
      <stop offset="100%" stop-color="#9b6b2d"/>
    </linearGradient>
    <radialGradient id="shine" cx="82%" cy="8%" r="72%">
      <stop offset="0%" stop-color="#d6a85f" stop-opacity="0.18"/>
      <stop offset="55%" stop-color="#d6a85f" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#d6a85f" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="794" height="1123" fill="url(#bg)"/>
  <rect width="794" height="1123" fill="url(#shine)"/>
  <rect x="44" y="44" width="706" height="1035" rx="34" fill="none" stroke="#d6a85f" stroke-opacity="0.38" stroke-width="1.5"/>

  <text x="84" y="102" fill="#d6a85f" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">AME • ALVES MOBILIDADE EXECUTIVA</text>
  <text x="710" y="102" fill="#9f9f9f" font-size="11" text-anchor="end" font-family="Arial, Helvetica, sans-serif">${svgEscape(createdAt)}</text>
  <text x="710" y="122" fill="#9f9f9f" font-size="11" text-anchor="end" font-family="Arial, Helvetica, sans-serif">${svgEscape(code)}</text>
  <text x="84" y="166" fill="#ffffff" font-size="42" font-weight="900" font-family="Arial, Helvetica, sans-serif">Proposta Executiva</text>
  <text x="84" y="198" fill="#cfcfcf" font-size="17" font-family="Arial, Helvetica, sans-serif">Transfer executivo premium com conforto, segurança e pontualidade.</text>

  <rect x="84" y="246" width="626" height="142" rx="24" fill="#241c14" stroke="#d6a85f" stroke-opacity="0.34"/>
  <text x="108" y="294" fill="#d6a85f" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">EMBARQUE</text>
  ${svgMultiline(proposal.origin, 108, 330, { maxChars: 23, size: 21, weight: 900, lineHeight: 25 })}
  <text x="397" y="336" fill="#d6a85f" font-size="30" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">→</text>
  <text x="456" y="294" fill="#d6a85f" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">DESTINO</text>
  ${svgMultiline(proposal.destination, 456, 330, { maxChars: 21, size: 21, weight: 900, lineHeight: 25 })}

  <rect x="84" y="430" width="286" height="90" rx="18" fill="#141414" stroke="#ffffff" stroke-opacity="0.11"/>
  <text x="108" y="466" fill="#d6a85f" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">CLIENTE</text>
  ${svgMultiline(proposal.client || "Cliente", 108, 496, { maxChars: 22, size: 21, weight: 900, lineHeight: 24 })}

  <rect x="424" y="430" width="286" height="90" rx="18" fill="#141414" stroke="#ffffff" stroke-opacity="0.11"/>
  <text x="448" y="466" fill="#d6a85f" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">DATA E HORÁRIO</text>
  ${svgMultiline(dateTime, 448, 496, { maxChars: 20, size: 20, weight: 900, lineHeight: 23 })}

  <rect x="84" y="548" width="286" height="90" rx="18" fill="#141414" stroke="#ffffff" stroke-opacity="0.11"/>
  <text x="108" y="584" fill="#d6a85f" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">DISTÂNCIA</text>
  <text x="108" y="614" fill="#ffffff" font-size="21" font-weight="900" font-family="Arial, Helvetica, sans-serif">${svgEscape(String(proposal.km || "a confirmar"))} km</text>

  <rect x="424" y="548" width="286" height="90" rx="18" fill="#141414" stroke="#ffffff" stroke-opacity="0.11"/>
  <text x="448" y="584" fill="#d6a85f" font-size="11" font-weight="900" letter-spacing="3" font-family="Arial, Helvetica, sans-serif">PASSAGEIROS / BAGAGENS</text>
  ${svgMultiline(passengersBags, 448, 614, { maxChars: 22, size: 19, weight: 900, lineHeight: 22 })}

  <rect x="84" y="670" width="626" height="124" rx="22" fill="#111111" stroke="#d6a85f" stroke-opacity="0.24"/>
  <text x="108" y="710" fill="#d6a85f" font-size="12" font-weight="900" letter-spacing="4" font-family="Arial, Helvetica, sans-serif">VALOR DO ATENDIMENTO EXECUTIVO</text>
  <text x="108" y="762" fill="url(#gold)" font-size="52" font-weight="900" font-family="Arial, Helvetica, sans-serif">${svgEscape(money(proposal.value))}</text>
  <text x="108" y="786" fill="#d8d8d8" font-size="15" font-family="Arial, Helvetica, sans-serif">Validade: 10 dias, até ${svgEscape(validUntil)}</text>

  <rect x="84" y="830" width="292" height="48" rx="16" fill="#151515"/>
  <text x="108" y="860" fill="#ffffff" font-size="16" font-family="Arial, Helvetica, sans-serif">✓ Motorista executivo</text>
  <rect x="418" y="830" width="292" height="48" rx="16" fill="#151515"/>
  <text x="442" y="860" fill="#ffffff" font-size="16" font-family="Arial, Helvetica, sans-serif">✓ Veículo confortável</text>
  <rect x="84" y="894" width="292" height="48" rx="16" fill="#151515"/>
  <text x="108" y="924" fill="#ffffff" font-size="16" font-family="Arial, Helvetica, sans-serif">✓ Pontualidade</text>
  <rect x="418" y="894" width="292" height="48" rx="16" fill="#151515"/>
  <text x="442" y="924" fill="#ffffff" font-size="16" font-family="Arial, Helvetica, sans-serif">✓ Atendimento personalizado</text>

  <line x1="84" y1="982" x2="438" y2="982" stroke="#d6a85f" stroke-opacity="0.28"/>
  <text x="84" y="1012" fill="#ffffff" font-size="16" font-weight="900" font-family="Arial, Helvetica, sans-serif">Alves Mobilidade Executiva</text>
  <text x="84" y="1035" fill="#bdbdbd" font-size="12" font-family="Arial, Helvetica, sans-serif">Mais do que transporte. Uma experiência em mobilidade.</text>
  <text x="84" y="1056" fill="#bdbdbd" font-size="12" font-family="Arial, Helvetica, sans-serif">WhatsApp: ${svgEscape(phone)} • alvesmobilidade.com.br</text>

  <rect x="602" y="948" width="108" height="108" rx="18" fill="#ffffff" stroke="#d6a85f" stroke-opacity="0.42"/>
  <image x="612" y="958" width="88" height="88" href="${WHATSAPP_QR_DATA_URL}" preserveAspectRatio="xMidYMid meet"/>
  <text x="656" y="1072" fill="#d6a85f" font-size="10" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">WhatsApp</text>
</svg>`;
  }

  function dataUrlToBytes(dataUrl: string) {
    const base64 = dataUrl.split(",")[1] || "";
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  function concatBytes(chunks: Uint8Array[]) {
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(length);
    let offset = 0;
    chunks.forEach((chunk) => {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    return result;
  }

  function buildImagePdf(jpegBytes: Uint8Array, imageWidth: number, imageHeight: number) {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const offsets: number[] = [0];
    let position = 0;

    function pushText(text: string) {
      const bytes = encoder.encode(text);
      chunks.push(bytes);
      position += bytes.length;
    }

    function pushBytes(bytes: Uint8Array) {
      chunks.push(bytes);
      position += bytes.length;
    }

    function beginObject(number: number) {
      offsets[number] = position;
      pushText(`${number} 0 obj\n`);
    }

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ`;
    const contentBytes = encoder.encode(content);

    pushText("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");

    beginObject(1);
    pushText("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    beginObject(2);
    pushText("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

    beginObject(3);
    pushText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);

    beginObject(4);
    pushText(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
    pushBytes(jpegBytes);
    pushText("\nendstream\nendobj\n");

    beginObject(5);
    pushText(`<< /Length ${contentBytes.length} >>\nstream\n`);
    pushBytes(contentBytes);
    pushText("\nendstream\nendobj\n");

    const xrefPosition = position;
    pushText("xref\n0 6\n0000000000 65535 f \n");
    for (let index = 1; index <= 5; index += 1) {
      pushText(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
    }
    pushText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`);

    return new Blob([concatBytes(chunks)], { type: "application/pdf" });
  }

  async function renderPremiumProposalCanvas(proposal: Proposal) {
    const svg = buildPremiumProposalSvg(proposal);
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Não foi possível gerar a imagem da proposta."));
      image.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = 794;
    canvas.height = 1123;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponível no navegador.");

    context.fillStyle = "#050505";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(svgUrl);

    return canvas;
  }

  function safeProposalFilename(proposal: Proposal, extension: "pdf" | "png") {
    return `${proposalCode(proposal)}-${proposal.client || "proposta"}.${extension}`.replace(/[^a-zA-Z0-9_.-]/g, "-");
  }

  async function downloadPremiumProposalImage(proposal: Proposal) {
    try {
      setVoiceStatus("Gerando imagem premium...");
      const canvas = await renderPremiumProposalCanvas(proposal);
      const pngDataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngDataUrl;
      link.download = safeProposalFilename(proposal, "png");
      document.body.appendChild(link);
      link.click();
      link.remove();
      setVoiceStatus("Imagem premium baixada ✓");
      window.setTimeout(() => setVoiceStatus(""), 3000);
    } catch (error) {
      console.error(error);
      setVoiceStatus("Não consegui gerar a imagem premium. Tente novamente.");
    }
  }

  async function downloadPremiumProposalPdf(proposal: Proposal) {
    try {
      setVoiceStatus("Gerando PDF premium...");
      const canvas = await renderPremiumProposalCanvas(proposal);
      const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.96);
      const jpegBytes = dataUrlToBytes(jpegDataUrl);
      const pdfBlob = buildImagePdf(jpegBytes, canvas.width, canvas.height);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = safeProposalFilename(proposal, "pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(pdfUrl);
      setVoiceStatus("PDF premium baixado ✓");
      window.setTimeout(() => setVoiceStatus(""), 3000);
    } catch (error) {
      console.error(error);
      setVoiceStatus("Não consegui gerar o PDF premium. Tente novamente.");
    }
  }

  function printProposal(proposal: Proposal) {
    downloadPremiumProposalPdf(proposal);
  }

  function captureRouteByVoice() {
    setVoiceStatus("Ouvindo rota... fale origem e destino.");
    startVoiceCapture((text) => {
      const parsed = parseSpokenRoute(text);
      setQuoteOrigin(parsed.origin);
      setQuoteDestination(parsed.destination);
      setQuoteResult(null);
      setVoiceStatus(`Entendi: ${parsed.origin} → ${parsed.destination}. Agora informe o KM e clique em Calcular Orçamento.`);
      window.setTimeout(() => setVoiceStatus(""), 5500);
    }, setVoiceStatus);
  }

  function parseVoiceNumbers(text: string) {
  const lower = text.toLowerCase();

  const words: Record<string, number> = {
    um: 1,
    uma: 1,
    dois: 2,
    duas: 2,
    tres: 3,
    três: 3,
    quatro: 4,
    cinco: 5,
    seis: 6,
    sete: 7,
    oito: 8,
    nove: 9,
    dez: 10,
  };

  function findBefore(wordsToFind: string[]) {
    for (const word of wordsToFind) {
      const regexNumber = new RegExp(`(\\d+)\\s+${word}`, "i");
      const numberMatch = lower.match(regexNumber);
      if (numberMatch) return Number(numberMatch[1]);

      for (const [name, value] of Object.entries(words)) {
        if (lower.includes(`${name} ${word}`)) return value;
      }
    }

    return null;
  }

  const kmMatch = lower.match(/(\d+)\s*(km|quilometros|quilômetros)/i);

  return {
    passengers: findBefore(["pessoas", "passageiros", "passageiro"]),
    bags: findBefore(["malas", "bagagens", "bagagem"]),
    km: kmMatch ? Number(kmMatch[1]) : null,
  };
}

  function captureGlobalVoiceCommand() {
  setVoiceStatus("Comando AME ouvindo...");

  startVoiceCapture((text) => {
    const lower = text.toLowerCase();
    const numbers = parseVoiceNumbers(text);

    if (
      lower.includes("orçamento") ||
      lower.includes("orcamento") ||
      lower.includes("rota") ||
      lower.includes("viagem") ||
      lower.includes("transfer")
    ) {
      const parsed = parseSpokenRoute(text);

      setActive("viagens");
      setQuoteOrigin(parsed.origin);
      setQuoteDestination(parsed.destination);

      if (numbers.passengers) setQuotePassengers(numbers.passengers);
      if (numbers.bags !== null) setQuoteBags(numbers.bags);
      if (numbers.km) setQuoteKm(numbers.km);

      setQuoteResult(null);

      setVoiceStatus(
        `Rota preenchida: ${parsed.origin} → ${parsed.destination}. ${
          numbers.km
            ? `KM identificado: ${numbers.km}. Agora clique em Calcular Orçamento.`
            : "Abra o Maps, confira o KM e depois clique em Calcular Orçamento."
        }`
      );

      window.setTimeout(() => setVoiceStatus(""), 6500);
      return;
    }

    if (lower.includes("novo cliente") || lower.includes("cadastrar cliente")) {
      const name = text.replace(/novo cliente|cadastrar cliente/gi, "").trim();

      setActive("clientes");
      setLeadForm((current) => ({ ...current, name }));

      setVoiceStatus(`Novo cliente iniciado: ${name || "informe o nome"}.`);
      window.setTimeout(() => setVoiceStatus(""), 4500);
      return;
    }

    if (lower.includes("whatsapp")) {
      setActive("whatsapp");
      setVoiceStatus("Abrindo tela de WhatsApp.");
    } else if (lower.includes("financeiro")) {
      setActive("financeiro");
      setVoiceStatus("Abrindo financeiro.");
    } else if (lower.includes("marketing")) {
      setActive("marketing");
      setVoiceStatus("Abrindo marketing.");
    } else if (lower.includes("prospec")) {
      setActive("prospeccao");
      setVoiceStatus("Abrindo prospecção.");
    } else if (lower.includes("cliente")) {
      setActive("clientes");
      setVoiceStatus("Abrindo clientes.");
    } else {
      setVoiceStatus(`Comando ouvido: ${text}`);
    }

    window.setTimeout(() => setVoiceStatus(""), 4500);
  }, setVoiceStatus);
}

  function exportBackup() {
    const data = { leads, trips, referrals, finance, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-ame-control-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!logged) {
    return (
      <main className="min-h-screen bg-[#0f0f0f] px-5 py-10 text-[#f5f0e8]">
        <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center">
          <div className="rounded-[2rem] border border-[#d6a85f]/20 bg-[#171717] p-8 shadow-[0_0_80px_rgba(0,0,0,.35)]">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d6a85f]/15 text-[#f1d28b]"><Sparkles /></div>
              <div><h1 className="text-2xl font-black">AME Control</h1><p className="text-sm text-zinc-400">Central da Alves Mobilidade Executiva</p></div>
            </div>
            <label className="text-xs font-black uppercase tracking-[0.2em] text-[#d6a85f]">Senha de acesso</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} type="password" placeholder="Digite a senha" className="input-admin mt-3" />
            <button onClick={login} className="mt-5 w-full rounded-full bg-gradient-to-r from-[#f1d28b] to-[#b8863b] px-6 py-4 text-sm font-black uppercase tracking-wide text-black">Entrar no painel</button>
            <p className="mt-5 text-center text-xs text-zinc-500">Senha inicial: alves2026</p>
          </div>
        </div>
      </main>
    );
  }

  function renderDashboard() {
    const progress = Math.min(100, Math.round(((leads.length - stats.pending.length) / Math.max(leads.length, 1)) * 100));
    return (
      <div className="space-y-8">
        <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-gradient-to-br from-[#191919] to-[#101010] p-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-[#d6a85f]">Bom dia, Felipe</p>
          <h2 className="mt-3 text-4xl font-black">Hoje faça exatamente isso:</h2>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-[#262626]"><div className="h-full rounded-full bg-gradient-to-r from-[#f1d28b] to-[#b8863b]" style={{ width: `${progress}%` }} /></div>
          <p className="mt-2 text-sm text-zinc-400">Seu dia está {progress}% encaminhado.</p>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stats.pending.slice(0, 6).map((lead) => <ActionCard key={lead.id} title={lead.name} text={lead.nextAction} onDone={() => completeAction(lead)} onSend={() => sendLeadMessage(lead, selectedMessage)} />)}
            {stats.pending.length === 0 && <p className="text-zinc-400">Nenhum follow-up pendente para hoje. Excelente!</p>}
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Metric title="Clientes" value={String(leads.length)} icon={Users} />
          <Metric title="Follow-ups hoje" value={String(stats.pending.length)} icon={ClipboardList} />
          <Metric title="Transfers acumulados" value={String(stats.credits)} icon={Gift} />
          <Metric title="Faturamento previsto" value={`R$ ${stats.revenueTrips.toLocaleString("pt-BR")}`} icon={DollarSign} />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Próximas viagens de hoje"><TripList trips={stats.todayTrips} onFinish={finishTrip} /></Panel>
          <Panel title="Inteligência rápida"><AISuggestions pending={stats.pending.length} trips={stats.todayTrips.length} credits={stats.credits} /></Panel>
        </div>
      </div>
    );
  }

  function renderTrabalharAgora() {
    if (!currentTask) return <Panel title="Trabalhar Agora"><p className="text-zinc-400">Sem tarefas pendentes. Cadastre novos contatos ou agende follow-ups.</p></Panel>;
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-[#d6a85f]/20 bg-gradient-to-br from-[#1d1d1d] to-[#101010] p-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d6a85f]">Próxima ação</p>
          <h2 className="mt-4 text-4xl font-black">{currentTask.name}</h2>
          <p className="mt-4 text-xl text-zinc-300">{currentTask.nextAction}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={() => sendLeadMessage(currentTask, selectedMessage)} className="rounded-full bg-[#25D366] px-7 py-4 font-black text-white"><WhatsAppIcon className="inline h-[18px] w-[18px]" /> Abrir WhatsApp</button>
            <button onClick={() => completeAction(currentTask)} className="rounded-full bg-[#d6a85f] px-7 py-4 font-black text-black"><CheckCircle2 className="inline" size={18} /> Concluir</button>
            <button onClick={() => updateLead(currentTask.id, { nextDate: tomorrow(1) })} className="rounded-full border border-[#d6a85f]/20 px-7 py-4 font-black text-[#f1d28b]">Amanhã</button>
          </div>
        </div>
      </div>
    );
  }

  function renderLeadForm() {
    return (
      <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-[#171717] p-6">
        <h3 className="text-xl font-black">Novo contato</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <VoiceInput value={leadForm.name} onValue={(value) => setLeadForm({ ...leadForm, name: value })} placeholder="Nome" />
          <VoiceInput value={leadForm.phone} onValue={(value) => setLeadForm({ ...leadForm, phone: value })} placeholder="WhatsApp" />
          <select value={leadForm.type} onChange={(e) => setLeadForm({ ...leadForm, type: e.target.value as LeadType })} className="input-admin">{leadTypes.map((type) => <option key={type}>{type}</option>)}</select>
          <VoiceInput value={leadForm.origin} onValue={(value) => setLeadForm({ ...leadForm, origin: value })} placeholder="Origem do contato" />
          <VoiceInput value={leadForm.nextAction} onValue={(value) => setLeadForm({ ...leadForm, nextAction: value })} placeholder="Próxima ação" className="md:col-span-2" />
          <input type="date" value={leadForm.nextDate} onChange={(e) => setLeadForm({ ...leadForm, nextDate: e.target.value })} className="input-admin" />
          <button onClick={addLead} className="rounded-2xl bg-[#d6a85f] px-5 py-4 font-black text-black"><Plus className="inline" size={18} /> Adicionar</button>
          <VoiceTextarea value={leadForm.notes} onValue={(value) => setLeadForm({ ...leadForm, notes: value })} placeholder="Observações" className="md:col-span-2 xl:col-span-4" />
        </div>
      </div>
    );
  }

  function renderImport() {
    return (
      <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-[#171717] p-6">
        <h3 className="text-xl font-black">Importar contatos em massa</h3>
        <p className="mt-2 text-sm text-zinc-400">Cole um por linha no formato: Nome, telefone</p>
        <VoiceTextarea value={importText} onValue={setImportText} placeholder={"João, 31999999999\nMaria, 31988888888"} className="mt-4 min-h-32" />
        <button onClick={importLeads} className="mt-4 rounded-full bg-[#d6a85f] px-6 py-3 font-black text-black"><Import className="inline" size={18} /> Importar</button>
      </div>
    );
  }

  function renderLeads(title = "Clientes e prospects", filter?: (lead: Lead) => boolean) {
    const list = filter ? leads.filter(filter) : filteredLeads;
    return (
      <div className="space-y-6">
        {renderLeadForm()}
        {active === "prospeccao" && renderImport()}
        <div className="flex items-center gap-3 rounded-2xl border border-[#d6a85f]/15 bg-[#171717] px-4 py-3"><Search size={18} className="text-[#d6a85f]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, telefone, tipo ou status" className="w-full bg-transparent outline-none" /></div>
        <Panel title={title}><div className="grid gap-4">{list.map((lead) => <LeadCard key={lead.id} lead={lead} updateLead={updateLead} deleteLead={deleteLead} completeAction={completeAction} sendLeadMessage={sendLeadMessage} />)}</div></Panel>
      </div>
    );
  }

  function renderWhatsApp() {
    return (
      <div className="space-y-6">
        <Panel title="Mensagens prontas"><div className="grid gap-5 md:grid-cols-2">{Object.entries(messages).map(([key, text]) => <InfoCard key={key} title={key} text={text} onCopy={() => navigator.clipboard.writeText(text)} />)}</div></Panel>
        <Panel title="Enviar mensagem para um cliente"><div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"> <select value={selectedMessage} onChange={(e) => setSelectedMessage(e.target.value as keyof typeof messages)} className="input-admin">{Object.keys(messages).map((key) => <option key={key}>{key}</option>)}</select><select onChange={(e) => { const lead = leads.find((item) => item.id === e.target.value); if (lead) sendLeadMessage(lead, selectedMessage); }} className="input-admin"><option>Escolha o cliente para abrir WhatsApp</option>{leads.map((lead) => <option value={lead.id} key={lead.id}>{lead.name} - {lead.phone}</option>)}</select></div></Panel>
      </div>
    );
  }

  function renderComercial() {
    const activeQuote = quoteResult;
    const currentProposal = activeQuote && activeQuote.value && !activeQuote.manual
      ? getCurrentProposal("Rascunho")
      : null;

    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-gradient-to-br from-[#1b1b1b] to-[#0f0f0f] p-5 md:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d6a85f]">Módulo Comercial</p>
              <h2 className="mt-2 text-3xl font-black md:text-4xl">Proposta Premium</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400 md:text-base">
                Gere uma proposta comercial premium com PDF escuro preservado, pronta para WhatsApp, histórico e conversão em viagem.
              </p>
            </div>
            <button onClick={captureRouteByVoice} className="cursor-pointer rounded-2xl border border-[#d6a85f]/25 px-5 py-4 font-black text-[#f1d28b] transition hover:bg-[#d6a85f]/10">
              <Mic className="inline" size={18} /> Falar rota
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <VoiceInput value={quoteClient} onValue={setQuoteClient} placeholder="Cliente" />
            <VoiceInput value={quotePhone} onValue={setQuotePhone} placeholder="WhatsApp do cliente" />
            <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className="input-admin" />
            <input type="time" value={quoteTime} onChange={(e) => setQuoteTime(e.target.value)} className="input-admin" />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_.35fr_.35fr_.35fr]">
            <VoiceInput value={quoteOrigin} onValue={(value) => { setQuoteOrigin(value); setQuoteResult(null); }} placeholder="Local de embarque" />
            <VoiceInput value={quoteDestination} onValue={(value) => { setQuoteDestination(value); setQuoteResult(null); }} placeholder="Destino" />
            <input type="number" value={quoteKm} onChange={(e) => { setQuoteKm(Number(e.target.value)); setQuoteResult(null); }} placeholder="KM" className="input-admin" />
            <input type="number" value={quotePassengers} min={1} onChange={(e) => { setQuotePassengers(Number(e.target.value)); setQuoteResult(null); }} placeholder="Passageiros" className="input-admin" />
            <input type="number" value={quoteBags} min={0} onChange={(e) => { setQuoteBags(Number(e.target.value)); setQuoteResult(null); }} placeholder="Malas" className="input-admin" />
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-[#d6a85f]/10 bg-[#202020] px-4 py-3 text-sm text-zinc-300">
            <input type="checkbox" checked={quoteSpecialLuggage} onChange={(e) => { setQuoteSpecialLuggage(e.target.checked); setQuoteResult(null); }} />
            Excesso de bagagens, bagagem especial ou necessidade de veículo maior
          </label>

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => openGoogleMapsRoute(quoteOrigin, quoteDestination)} className="cursor-pointer rounded-full border border-[#d6a85f]/25 px-5 py-3 text-sm font-black text-[#f1d28b] transition hover:bg-[#d6a85f]/10">Abrir Maps</button>
            <button onClick={() => openWazeRoute(quoteDestination)} className="cursor-pointer rounded-full border border-[#d6a85f]/25 px-5 py-3 text-sm font-black text-[#f1d28b] transition hover:bg-[#d6a85f]/10">Abrir Waze</button>
            <button onClick={() => calculateQuote()} className="cursor-pointer rounded-full bg-[#d6a85f] px-6 py-3 text-sm font-black text-black transition hover:scale-[1.02]"><DollarSign className="inline" size={18} /> Calcular</button>
          </div>

          {activeQuote ? (
            <div className="mt-6 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
              <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-[#202020] p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d6a85f]">Valor sugerido</p>
                <h3 className="mt-2 text-4xl font-black text-[#f1d28b]">{activeQuote.value ? money(activeQuote.value) : "Manual"}</h3>
                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <p><strong>Tipo:</strong> {activeQuote.type}</p>
                  <p><strong>Distância:</strong> {activeQuote.km || "a confirmar"} km</p>
                  <p><strong>Validade:</strong> 10 dias</p>
                  <p className="text-xs text-zinc-500">{activeQuote.rule}</p>
                </div>
                {activeQuote.notes?.map((note) => <p key={note} className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">{note}</p>)}
              </div>

              {currentProposal && (
                <div className="overflow-hidden rounded-[2rem] border border-[#d6a85f]/20 bg-black shadow-[0_25px_90px_rgba(0,0,0,.35)]">
                  <div className="bg-gradient-to-r from-[#d6a85f] to-[#8d6428] p-4 text-black">
                    <p className="text-xs font-black uppercase tracking-[0.28em]">AME • Alves Mobilidade Executiva</p>
                    <h3 className="mt-1 text-2xl font-black">Proposta Comercial</h3>
                  </div>
                  <div className="p-5">
                    <div className="rounded-2xl border border-[#d6a85f]/15 bg-[#151515] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d6a85f]">Cliente</p>
                      <h4 className="mt-1 text-xl font-black">{currentProposal.client}</h4>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-[#d6a85f]">Embarque</p><strong>{currentProposal.origin}</strong></div>
                      <div className="text-center text-2xl text-[#d6a85f]">→</div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-[#d6a85f]">Destino</p><strong>{currentProposal.destination}</strong></div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-zinc-500">Data/Hora</p><strong>{currentProposal.date || "A combinar"} {currentProposal.time}</strong></div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-xs text-zinc-500">Distância</p><strong>{currentProposal.km} km</strong></div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-[#d6a85f]/20 bg-[#d6a85f]/10 p-5">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d6a85f]">Valor</p>
                      <strong className="text-4xl text-[#f1d28b]">{money(currentProposal.value)}</strong>
                      <p className="mt-2 text-sm text-zinc-400">Validade de 10 dias • Atendimento executivo premium</p>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button onClick={() => saveCurrentProposal("Rascunho")} className="cursor-pointer rounded-full bg-[#d6a85f] px-5 py-3 text-xs font-black text-black">Salvar proposta</button>
                      <button onClick={() => downloadPremiumProposalImage(currentProposal)} className="cursor-pointer rounded-full border border-[#d6a85f]/25 px-5 py-3 text-xs font-black text-[#f1d28b]">Baixar PNG</button>
                      <button onClick={() => printProposal(currentProposal)} className="cursor-pointer rounded-full border border-[#d6a85f]/25 px-5 py-3 text-xs font-black text-[#f1d28b]">Baixar PDF</button>
                      <button onClick={() => { navigator.clipboard.writeText(currentProposal.message); setVoiceStatus("Proposta copiada ✓"); window.setTimeout(() => setVoiceStatus(""), 2500); }} className="cursor-pointer rounded-full border border-[#d6a85f]/25 px-5 py-3 text-xs font-black text-[#f1d28b]">Copiar</button>
                      <a href={`https://wa.me/${quotePhone ? (cleanPhone(quotePhone).startsWith("55") ? cleanPhone(quotePhone) : `55${cleanPhone(quotePhone)}`) : ""}?text=${encodeURIComponent(currentProposal.message)}`} target="_blank" className="cursor-pointer rounded-full border border-[#25D366]/40 px-5 py-3 text-xs font-black text-[#25D366]">WhatsApp</a>
                      <button onClick={convertCurrentProposalToTrip} className="cursor-pointer rounded-full border border-[#d6a85f]/25 px-5 py-3 text-xs font-black text-[#f1d28b]">Converter em viagem</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-[#d6a85f]/10 bg-[#202020] p-5 text-sm leading-7 text-zinc-400">
              Preencha os dados, informe o KM e clique em <strong>Calcular</strong> para gerar a proposta premium.
            </div>
          )}

          {voiceStatus && <p className="mt-4 rounded-2xl border border-[#d6a85f]/10 bg-[#202020] px-4 py-3 text-sm text-[#f1d28b]">{voiceStatus}</p>}
        </div>

        <Panel title="Histórico de propostas">
          {!proposals.length ? (
            <p className="text-zinc-400">Nenhuma proposta salva ainda.</p>
          ) : (
            <div className="grid gap-4">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="rounded-2xl border border-[#d6a85f]/10 bg-[#202020] p-5">
                  <div className="grid gap-3 lg:grid-cols-[1fr_.7fr_.55fr_auto] lg:items-center">
                    <div>
                      <h3 className="text-xl font-black">{proposal.client}</h3>
                      <p className="text-sm text-zinc-400">{proposal.origin} → {proposal.destination}</p>
                      <p className="mt-1 text-xs text-zinc-500">Criada em {new Date(proposal.createdAt).toLocaleDateString("pt-BR")} • Validade até {new Date(proposal.validUntil + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                    </div>
                    <strong className="text-2xl text-[#f1d28b]">{money(proposal.value)}</strong>
                    <span className="rounded-full border border-[#d6a85f]/20 px-3 py-2 text-center text-xs font-black text-[#f1d28b]">{proposal.status}</span>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => downloadPremiumProposalImage(proposal)} className="rounded-full border border-[#d6a85f]/25 px-4 py-2 text-xs font-black text-[#f1d28b]">PNG</button>
                      <button onClick={() => printProposal(proposal)} className="rounded-full border border-[#d6a85f]/25 px-4 py-2 text-xs font-black text-[#f1d28b]">PDF</button>
                      <a href={`https://wa.me/${proposal.phone ? (cleanPhone(proposal.phone).startsWith("55") ? cleanPhone(proposal.phone) : `55${cleanPhone(proposal.phone)}`) : ""}?text=${encodeURIComponent(proposal.message)}`} target="_blank" className="rounded-full border border-[#25D366]/40 px-4 py-2 text-xs font-black text-[#25D366]">WhatsApp</a>
                      <button onClick={() => convertProposalToTrip(proposal)} className="rounded-full bg-[#d6a85f] px-4 py-2 text-xs font-black text-black">Virar viagem</button>
                      <button onClick={() => setProposals((current) => current.filter((item) => item.id !== proposal.id))} className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-black text-red-300">Excluir</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    );
  }

  function renderTrips() {
    const activeQuote = quoteResult;
    const quoteMessage = activeQuote ? buildQuoteMessage(quoteOrigin, quoteDestination, activeQuote, quotePassengers, quoteBags) : "";

    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-[#171717] p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#d6a85f]">Central de Orçamentos</p>
              <h3 className="mt-2 text-2xl font-black">Novo orçamento inteligente</h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-400">
                Preencha a rota, confira o KM no Maps ou digite manualmente, e clique em <strong>Calcular Orçamento</strong>. O sistema cobra R$ 3,00/km e arredonda sempre para cima de 10 em 10.
              </p>
            </div>
            <button onClick={captureRouteByVoice} className="cursor-pointer rounded-2xl border border-[#d6a85f]/25 px-5 py-4 font-black text-[#f1d28b] transition hover:bg-[#d6a85f]/10">
              <Mic className="inline" size={18} /> Falar rota
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_.35fr_.35fr_.35fr]">
            <VoiceInput value={quoteOrigin} onValue={(value) => { setQuoteOrigin(value); setQuoteResult(null); }} placeholder="Local de embarque" />
            <VoiceInput value={quoteDestination} onValue={(value) => { setQuoteDestination(value); setQuoteResult(null); }} placeholder="Destino" />
            <input type="number" value={quoteKm} onChange={(e) => { setQuoteKm(Number(e.target.value)); setQuoteResult(null); }} placeholder="KM" className="input-admin" />
            <input type="number" value={quotePassengers} min={1} onChange={(e) => { setQuotePassengers(Number(e.target.value)); setQuoteResult(null); }} placeholder="Passageiros" className="input-admin" />
            <input type="number" value={quoteBags} min={0} onChange={(e) => { setQuoteBags(Number(e.target.value)); setQuoteResult(null); }} placeholder="Malas" className="input-admin" />
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-[#d6a85f]/10 bg-[#202020] px-4 py-3 text-sm text-zinc-300">
            <input type="checkbox" checked={quoteSpecialLuggage} onChange={(e) => { setQuoteSpecialLuggage(e.target.checked); setQuoteResult(null); }} />
            Excesso de bagagens, bagagem especial ou necessidade de veículo maior
          </label>

          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => openGoogleMapsRoute(quoteOrigin, quoteDestination)} className="cursor-pointer rounded-full border border-[#d6a85f]/25 px-5 py-3 text-sm font-black text-[#f1d28b] transition hover:bg-[#d6a85f]/10">Abrir rota no Maps</button>
            <button onClick={() => openWazeRoute(quoteDestination)} className="cursor-pointer rounded-full border border-[#d6a85f]/25 px-5 py-3 text-sm font-black text-[#f1d28b] transition hover:bg-[#d6a85f]/10">Abrir destino no Waze</button>
            <button onClick={() => calculateQuote()} className="cursor-pointer rounded-full bg-[#d6a85f] px-6 py-3 text-sm font-black text-black transition hover:scale-[1.02]"><DollarSign className="inline" size={18} /> Calcular Orçamento</button>
          </div>

          {!activeQuote ? (
            <div className="mt-5 rounded-2xl border border-[#d6a85f]/10 bg-[#202020] p-5 text-sm leading-7 text-zinc-400">
              Nenhum orçamento calculado ainda. Informe o KM da rota e clique em <strong>Calcular Orçamento</strong> para gerar o valor sugerido.
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-[#d6a85f]/15 bg-[#202020] p-5 text-sm text-zinc-300">
              <div className="grid gap-5 lg:grid-cols-[1fr_.75fr] lg:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d6a85f]">{activeQuote.type}</p>
                  <h4 className="mt-2 text-3xl font-black text-[#f1d28b]">{activeQuote.value ? money(activeQuote.value) : "Orçamento manual"}</h4>
                  <div className="mt-4 grid gap-3 text-sm text-zinc-300 md:grid-cols-2">
                    <p><strong>Embarque:</strong><br />{quoteOrigin}</p>
                    <p><strong>Destino:</strong><br />{quoteDestination}</p>
                    <p><strong>Distância:</strong><br />{activeQuote.km ? `${activeQuote.km} km` : "a confirmar"}</p>
                    <p><strong>Validade:</strong><br />10 dias, até {quoteValidityDate(10)}</p>
                  </div>
                  <p className="mt-4 text-xs text-zinc-500">Regra usada: {activeQuote.rule}</p>
                  {activeQuote.notes?.map((note) => <p key={note} className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">{note}</p>)}
                </div>

                <div className="rounded-2xl border border-[#d6a85f]/10 bg-[#151515] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#d6a85f]">Orçamento digital</p>
                  <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-6 text-zinc-300">{quoteMessage}</pre>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button onClick={() => setTripForm({ ...tripForm, route: `${quoteOrigin} → ${quoteDestination}`, value: activeQuote.value || tripForm.value })} className="cursor-pointer rounded-full bg-[#d6a85f] px-5 py-3 text-xs font-black text-black">Usar na viagem</button>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(quoteMessage);
                    setVoiceStatus("Orçamento digital copiado ✓");
                    window.setTimeout(() => setVoiceStatus(""), 2500);
                  }}
                  className="cursor-pointer rounded-full border border-[#d6a85f]/25 px-5 py-3 text-xs font-black text-[#f1d28b]"
                >
                  Copiar orçamento digital
                </button>
                <a href={`https://wa.me/?text=${encodeURIComponent(quoteMessage)}`} target="_blank" className="cursor-pointer rounded-full border border-[#d6a85f]/25 px-5 py-3 text-xs font-black text-[#f1d28b]">Enviar WhatsApp</a>
              </div>
            </div>
          )}

          {voiceStatus && <p className="mt-3 rounded-2xl border border-[#d6a85f]/10 bg-[#202020] px-4 py-3 text-sm text-[#f1d28b]">{voiceStatus}</p>}
        </div>

        <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-[#171717] p-6">
          <h3 className="text-xl font-black">Nova viagem</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <VoiceInput value={tripForm.client} onValue={(value) => setTripForm({ ...tripForm, client: value })} placeholder="Cliente" />
            <VoiceInput value={tripForm.phone} onValue={(value) => setTripForm({ ...tripForm, phone: value })} placeholder="WhatsApp" />
            <input type="date" value={tripForm.date} onChange={(e) => setTripForm({ ...tripForm, date: e.target.value })} className="input-admin" />
            <input type="time" value={tripForm.time} onChange={(e) => setTripForm({ ...tripForm, time: e.target.value })} className="input-admin" />
            <VoiceInput value={tripForm.route} onValue={(value) => setTripForm({ ...tripForm, route: value })} placeholder="Origem → Destino" />
            <input type="number" value={tripForm.value} onChange={(e) => setTripForm({ ...tripForm, value: Number(e.target.value) })} placeholder="Valor" className="input-admin" />
            <button onClick={addTrip} className="cursor-pointer rounded-2xl bg-[#d6a85f] px-5 py-4 font-black text-black xl:col-span-6"><Plus className="inline" size={18} /> Adicionar viagem</button>
          </div>
        </div>
        <Panel title="Viagens e agenda"><TripList trips={trips} onFinish={finishTrip} onDelete={(id) => setTrips((current) => current.filter((trip) => trip.id !== id))} /></Panel>
      </div>
    );
  }

  function renderReferrals() {
    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-[#171717] p-6">
          <h3 className="text-xl font-black">Nova indicação</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <VoiceInput value={refForm.referrer} onValue={(value) => setRefForm({ ...refForm, referrer: value })} placeholder="Quem indicou" />
            <VoiceInput value={refForm.referred} onValue={(value) => setRefForm({ ...refForm, referred: value })} placeholder="Indicado" />
            <select value={refForm.status} onChange={(e) => setRefForm({ ...refForm, status: e.target.value as Referral["status"] })} className="input-admin"><option>Indicado</option><option>Transfer realizado</option><option>Transfer creditado</option></select>
            <button onClick={addReferral} className="rounded-2xl bg-[#d6a85f] px-5 py-4 font-black text-black"><Plus className="inline" size={18} /> Adicionar</button>
          </div>
        </div>
        <Panel title="Programa de Indicação"><div className="grid gap-4">{referrals.map((item) => <div key={item.id} className="rounded-2xl border border-[#d6a85f]/10 bg-[#202020] p-5"><p><strong>{item.referrer}</strong> indicou <strong>{item.referred}</strong></p><p className="mt-2 text-sm text-zinc-400">Status: {item.status}</p><p className="mt-2 text-[#f1d28b]">Créditos acumulados: {item.credits}</p><div className="mt-4 flex gap-2"><button onClick={() => creditReferral(item)} className="rounded-full bg-[#d6a85f] px-4 py-2 text-xs font-black text-black">Creditar transfer</button><button onClick={() => setReferrals((current) => current.filter((ref) => ref.id !== item.id))} className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-black text-red-300">Remover</button></div></div>)}</div></Panel>
      </div>
    );
  }

  function renderMarketing() {
    const day = new Date().getDay();
    const suggestions = [
      { id: "story-aeroporto", title: "Story sobre aeroporto", text: "Poste uma imagem limpa do veículo e fale: vai para Confins? Agende seu transfer executivo.", url: "https://www.instagram.com/" },
      { id: "feed-bh", title: "Post no feed com imagem de BH", text: "Use uma imagem com Belo Horizonte ao fundo e destaque conforto, segurança e pontualidade.", url: "https://www.instagram.com/" },
      { id: "indicacao", title: "Programa de Indicação", text: "Envie a arte do Programa de Indicação para clientes que já viajaram com você.", url: "https://web.whatsapp.com/" },
      { id: "empresas", title: "Prospecção de empresas", text: "Faça contato com empresas de BH oferecendo transporte para diretoria, clientes e eventos.", url: "https://www.google.com/maps/search/empresas+em+Belo+Horizonte" },
      { id: "hoteis-prospeccao", title: "Buscar hotéis para prospecção", text: "Abra uma lista de hotéis de BH no Google Maps e cadastre os contatos bons na aba Prospecção.", url: "https://www.google.com/maps/search/hot%C3%A9is+em+Belo+Horizonte" },
      { id: "conteudo-educativo", title: "Conteúdo educativo", text: "Explique quanto tempo antes sair de BH para pegar voo em Confins.", url: "https://www.instagram.com/" },
    ];
    const ordered = [...suggestions.slice(day % suggestions.length), ...suggestions.slice(0, day % suggestions.length)];
    return (
      <div className="space-y-6">
        <Panel title="Sugestões inteligentes de marketing">
          <p className="mb-5 text-sm text-zinc-400">As sugestões mudam conforme o dia. Clique em abrir, execute a ação e marque como concluída.</p>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {ordered.map((item) => {
              const done = completedMarketing.includes(item.id);
              return <div key={item.id} className={`rounded-[2rem] border p-6 ${done ? "border-emerald-400/25 bg-emerald-400/5" : "border-[#d6a85f]/15 bg-[#171717]"}`}>
                <h3 className="text-xl font-black">{item.title}</h3>
                <p className="mt-4 leading-7 text-zinc-400">{item.text}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button onClick={() => window.open(item.url, "_blank")} className="rounded-full bg-[#d6a85f] px-5 py-3 text-sm font-black text-black">Abrir caminho</button>
                  <button onClick={() => completeMarketingTask(item.id)} className="rounded-full border border-[#d6a85f]/25 px-5 py-3 text-sm font-black text-[#f1d28b]">{done ? "Concluído ✓" : "Marcar feito"}</button>
                </div>
              </div>;
            })}
          </div>
          <button onClick={resetMarketingTasks} className="mt-5 rounded-full border border-[#d6a85f]/20 px-5 py-3 text-sm font-black text-[#f1d28b]">Limpar concluídos</button>
        </Panel>
      </div>
    );
  }

  function renderFinanceiro() {
    return (
      <div className="space-y-6">
        <div className="grid gap-5 md:grid-cols-3"><Metric title="Saldo previsto" value={`R$ ${stats.revenueFinance.toLocaleString("pt-BR")}`} icon={DollarSign} /><Metric title="Viagens" value={String(trips.length)} icon={Plane} /><Metric title="Conversão" value={`${stats.conversion}%`} icon={BarChart3} /></div>
        <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-[#171717] p-6"><h3 className="text-xl font-black">Lançamento financeiro</h3><div className="mt-5 grid gap-4 md:grid-cols-5"><VoiceInput value={financeForm.description} onValue={(value) => setFinanceForm({ ...financeForm, description: value })} placeholder="Descrição" className="md:col-span-2" /><input type="number" value={financeForm.value} onChange={(e) => setFinanceForm({ ...financeForm, value: Number(e.target.value) })} placeholder="Valor" className="input-admin" /><select value={financeForm.type} onChange={(e) => setFinanceForm({ ...financeForm, type: e.target.value as FinanceEntry["type"] })} className="input-admin"><option>Entrada</option><option>Saída</option></select><button onClick={addFinance} className="rounded-2xl bg-[#d6a85f] px-5 py-4 font-black text-black">Adicionar</button></div></div>
        <Panel title="Histórico financeiro"><div className="grid gap-3">{finance.map((item) => <div key={item.id} className="flex items-center justify-between rounded-2xl border border-[#d6a85f]/10 bg-[#202020] p-4"><div><strong>{item.description}</strong><p className="text-sm text-zinc-400">{item.date} • {item.type}</p></div><strong className={item.type === "Entrada" ? "text-emerald-300" : "text-red-300"}>{item.type === "Entrada" ? "+" : "-"} R$ {item.value}</strong></div>)}</div></Panel>
      </div>
    );
  }

  function renderIA() {
    return <Panel title="IA da Alves"><AISuggestions pending={stats.pending.length} trips={stats.todayTrips.length} credits={stats.credits} /><button onClick={exportBackup} className="mt-6 rounded-full border border-[#d6a85f]/20 px-5 py-3 text-sm font-black text-[#f1d28b]"><Download className="inline" size={18} /> Baixar backup dos dados</button></Panel>;
  }

  function renderContent() {
    if (active === "dashboard") return renderDashboard();
    if (active === "trabalhar") return renderTrabalharAgora();
    if (active === "clientes") return renderLeads("Clientes e prospects");
    if (active === "prospeccao") return renderLeads("Fila de prospecção", (lead) => !["Fechou", "Arquivado"].includes(lead.status));
    if (active === "whatsapp") return renderWhatsApp();
    if (active === "comercial") return renderComercial();
    if (active === "viagens") return renderTrips();
    if (active === "indicacoes") return renderReferrals();
    if (active === "empresas") return renderLeads("Empresas", (lead) => lead.type === "Empresa");
    if (active === "marketing") return renderMarketing();
    if (active === "financeiro") return renderFinanceiro();
    if (active === "ia") return renderIA();
    return renderDashboard();
  }

  const activeLabel = menu.find((item) => item.id === active)?.label ?? "Dashboard";
  const groups = [...new Set(menu.map((item) => item.group))];

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-[#f5f0e8]">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 overflow-y-auto border-r border-[#d6a85f]/10 bg-[#111111] p-5 xl:block">
          <div className="mb-5 rounded-[1.6rem] border border-[#d6a85f]/15 bg-[#191919] p-5"><p className="text-xs font-black uppercase tracking-[0.24em] text-[#d6a85f]">AME Control</p><h1 className="mt-2 text-xl font-black">Central Alves</h1></div>
          <button onClick={() => setActive("trabalhar")} className="mb-5 w-full rounded-2xl bg-gradient-to-r from-[#f1d28b] to-[#b8863b] px-4 py-4 text-sm font-black text-black">🚀 Trabalhar Agora</button>
          <nav className="space-y-5">
            {groups.map((group) => <div key={group}><p className="mb-2 px-4 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">{group}</p><div className="space-y-2">{menu.filter((item) => item.group === group).map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setActive(item.id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${active === item.id ? "bg-[#d6a85f] text-black" : "text-zinc-300 hover:bg-[#1d1d1d] hover:text-[#f1d28b]"}`}><Icon size={18} /> {item.label}</button>; })}</div></div>)}
          </nav>
          <button onClick={logout} className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-[#d6a85f]/15 px-4 py-3 text-sm font-bold text-zinc-300"><LogOut size={18} /> Sair</button>
        </aside>
        <section className="flex-1 p-5 md:p-8">
          <div className="mb-7 flex flex-col gap-4 rounded-[2rem] border border-[#d6a85f]/10 bg-[#151515] p-5 md:flex-row md:items-center md:justify-between">
            <div><p className="text-xs font-black uppercase tracking-[0.25em] text-[#d6a85f]">Sistema Operacional da Alves</p><h2 className="mt-2 text-3xl font-black">{activeLabel}</h2></div>
            <div className="flex flex-wrap gap-2 xl:hidden">{menu.slice(0, 8).map((item) => <button key={item.id} onClick={() => setActive(item.id)} className={`rounded-full px-4 py-2 text-xs font-black ${active === item.id ? "bg-[#d6a85f] text-black" : "bg-[#202020] text-[#f1d28b]"}`}>{item.label}</button>)}</div>
            <div className="flex gap-2"><button onClick={exportBackup} className="inline-flex items-center gap-2 rounded-full border border-[#d6a85f]/20 px-5 py-3 text-sm font-black text-[#f1d28b]"><Download size={16} /> Backup</button><Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#d6a85f]/20 px-5 py-3 text-sm font-black text-[#f1d28b]">Ver site <ChevronRight size={16} /></Link></div>
          </div>
          {renderContent()}
        </section>
      </div>
      <button
        type="button"
        onClick={startAmeAssistant}
        className="fixed bottom-5 right-5 z-[80] flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-[#f1d28b] to-[#b8863b] px-5 py-4 text-sm font-black text-black shadow-[0_20px_70px_rgba(214,168,95,.24)] max-sm:bottom-4 max-sm:right-4 max-sm:px-4"
        title="Comando AME"
      >
        <Mic size={18} /> Comando AME
      </button>

      {ameOpen && (
        <div className="fixed inset-x-3 bottom-4 z-[90] max-h-[82vh] overflow-y-auto rounded-[2rem] border border-[#d6a85f]/20 bg-[#171717] p-5 text-[#f5f0e8] shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[92vw] sm:max-w-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#d6a85f]">Assistente AME</p>
              <h3 className="mt-2 text-xl font-black">
                {ameStep === "inicio" && "O que vamos fazer?"}
                {ameStep === "origem" && "Local de embarque"}
                {ameStep === "destino" && "Destino"}
                {ameStep === "passageiros" && "Passageiros"}
                {ameStep === "malas" && "Bagagens"}
                {ameStep === "km" && "KM da rota"}
                {ameStep === "resultado" && "Orçamento calculado"}
              </h3>
            </div>

            <button
              type="button"
              onClick={closeAmeAssistant}
              className="cursor-pointer rounded-full border border-[#d6a85f]/20 px-3 py-2 text-sm text-[#f1d28b]"
            >
              Fechar
            </button>
          </div>

          <p className="mt-4 text-sm leading-7 text-zinc-400">
            {ameStep === "inicio" && "Digite ou fale: novo orçamento."}
            {ameStep === "origem" && "Exemplo: Rua Tamoios, Centro, Belo Horizonte."}
            {ameStep === "destino" && "Exemplo: Aeroporto Internacional de Confins."}
            {ameStep === "passageiros" && "Exemplo: 2 passageiros."}
            {ameStep === "malas" && "Exemplo: 3 malas."}
            {ameStep === "km" && "Digite o KM da rota. Exemplo: 38."}
            {ameStep === "resultado" && "Agora você pode copiar o orçamento, enviar pelo WhatsApp ou usar na viagem."}
          </p>

          <div className="mt-5 flex gap-2">
            <input
              value={ameText}
              onChange={(e) => setAmeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") processAmeAnswer(ameText);
              }}
              placeholder="Digite aqui..."
              className="input-admin"
            />

            <button
              type="button"
              onClick={ameSpeak}
              className="flex cursor-pointer items-center justify-center rounded-2xl bg-[#d6a85f] px-4 text-black"
              title="Falar resposta"
            >
              <Mic size={18} />
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => processAmeAnswer(ameText)}
              className="w-full cursor-pointer rounded-full bg-gradient-to-r from-[#f1d28b] to-[#b8863b] px-5 py-3 text-sm font-black text-black"
            >
              Continuar
            </button>

            <button
              type="button"
              onClick={() => openGoogleMapsRoute(quoteOrigin, quoteDestination)}
              className="w-full cursor-pointer rounded-full border border-[#d6a85f]/25 px-5 py-3 text-sm font-black text-[#f1d28b]"
            >
              Abrir Maps
            </button>
          </div>

          {voiceStatus && (
            <p className="mt-4 rounded-2xl border border-[#d6a85f]/10 bg-[#202020] px-4 py-3 text-sm text-[#f1d28b]">
              {voiceStatus}
            </p>
          )}
        </div>
      )}

      {voiceStatus && !ameOpen && active !== "viagens" && (
        <div className="fixed bottom-24 right-5 z-[80] max-w-sm rounded-2xl border border-[#d6a85f]/20 bg-[#171717] p-4 text-sm text-[#f1d28b] shadow-2xl">
          {voiceStatus}
        </div>
      )}
    </main>
  );
}


function VoiceInput({ value, onValue, placeholder = "", className = "", type = "text" }: { value: string; onValue: (value: string) => void; placeholder?: string; className?: string; type?: string }) {
  return (
    <div className={`relative ${className}`}>
      <input value={value} onChange={(e) => onValue(e.target.value)} type={type} placeholder={placeholder} className="input-admin pr-12" />
      <button type="button" onClick={() => startVoiceCapture((text) => onValue(value ? `${value} ${text}` : text))} title="Falar e preencher" className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#d6a85f]/20 bg-[#202020] text-[#f1d28b] hover:bg-[#d6a85f] hover:text-black">
        <Mic size={16} />
      </button>
    </div>
  );
}

function VoiceTextarea({ value, onValue, placeholder = "", className = "" }: { value: string; onValue: (value: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <textarea value={value} onChange={(e) => onValue(e.target.value)} placeholder={placeholder} className="input-admin min-h-24 pr-12" />
      <button type="button" onClick={() => startVoiceCapture((text) => onValue(value ? `${value} ${text}` : text))} title="Falar e preencher" className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#d6a85f]/20 bg-[#202020] text-[#f1d28b] hover:bg-[#d6a85f] hover:text-black">
        <Mic size={16} />
      </button>
    </div>
  );
}

function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.04 3C8.86 3 3.02 8.82 3.02 15.98c0 2.29.6 4.53 1.74 6.5L3 29l6.7-1.73a13.02 13.02 0 0 0 6.34 1.62c7.18 0 13.02-5.82 13.02-12.98C29.06 8.82 23.22 3 16.04 3Zm0 23.65c-2 0-3.95-.54-5.65-1.55l-.4-.24-3.98 1.03 1.06-3.86-.26-.41a10.63 10.63 0 0 1-1.62-5.64c0-5.93 4.86-10.75 10.85-10.75 5.99 0 10.85 4.82 10.85 10.75S22.03 26.65 16.04 26.65Zm5.95-8.06c-.33-.16-1.94-.95-2.24-1.06-.3-.11-.52-.16-.74.16-.22.33-.85 1.06-1.04 1.27-.19.22-.38.24-.71.08-.33-.16-1.39-.51-2.65-1.62-.98-.87-1.64-1.94-1.83-2.27-.19-.33-.02-.51.14-.67.14-.14.33-.38.49-.57.16-.19.22-.33.33-.54.11-.22.05-.41-.03-.57-.08-.16-.74-1.78-1.01-2.44-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71 0 1.6 1.17 3.15 1.33 3.36.16.22 2.3 3.51 5.57 4.92.78.33 1.39.53 1.86.68.78.25 1.49.21 2.05.13.63-.09 1.94-.79 2.21-1.55.27-.76.27-1.41.19-1.55-.08-.14-.3-.22-.63-.38Z" />
    </svg>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-[#151515] p-6"><h2 className="mb-5 text-2xl font-black">{title}</h2>{children}</div>;
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: ElementType }) {
  return <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-[#171717] p-6"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d6a85f]/10 text-[#f1d28b]"><Icon size={24} /></div><p className="text-sm text-zinc-400">{title}</p><h3 className="mt-2 text-3xl font-black">{value}</h3></div>;
}

function InfoCard({ title, text, onCopy }: { title: string; text: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    onCopy?.();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }
  return <div className="rounded-[2rem] border border-[#d6a85f]/15 bg-[#171717] p-6"><h3 className="text-xl font-black capitalize">{title}</h3><p className="mt-4 leading-7 text-zinc-400">{text}</p>{onCopy && <button onClick={handleCopy} className={`mt-5 rounded-full px-5 py-3 text-sm font-black ${copied ? "bg-emerald-400 text-black" : "border border-[#d6a85f]/30 text-[#f1d28b]"}`}>{copied ? "Copiado ✓" : "Copiar mensagem"}</button>}</div>;
}

function ActionCard({ title, text, onDone, onSend }: { title: string; text: string; onDone: () => void; onSend?: () => void }) {
  return <div className="rounded-2xl border border-[#d6a85f]/10 bg-[#202020] p-5"><h3 className="font-black">{title}</h3><p className="mt-2 text-sm text-zinc-400">{text}</p><div className="mt-4 flex gap-2">{onSend && <button onClick={onSend} className="rounded-full bg-[#25D366] px-4 py-2 text-xs font-black uppercase text-white">WhatsApp</button>}<button onClick={onDone} className="rounded-full bg-[#d6a85f] px-4 py-2 text-xs font-black uppercase text-black">Concluir</button></div></div>;
}

function LeadCard({ lead, updateLead, deleteLead, completeAction, sendLeadMessage }: { lead: Lead; updateLead: (id: string, patch: Partial<Lead>) => void; deleteLead: (id: string) => void; completeAction: (lead: Lead) => void; sendLeadMessage: (lead: Lead, key: keyof typeof messages) => void }) {
  return (
    <div className="rounded-2xl border border-[#d6a85f]/10 bg-[#202020] p-5">
      <div className="grid gap-4 xl:grid-cols-[1fr_.8fr_.8fr_1fr_auto] xl:items-center">
        <div><h3 className="text-xl font-black">{lead.name}</h3><p className="text-sm text-zinc-400">{lead.phone} • {lead.type} • {lead.origin || "Sem origem"}</p></div>
        <select value={lead.status} onChange={(e) => updateLead(lead.id, { status: e.target.value as Status, nextAction: nextActionText(e.target.value as Status) })} className="input-admin">{statuses.map((status) => <option key={status}>{status}</option>)}</select>
        <input type="date" value={lead.nextDate} onChange={(e) => updateLead(lead.id, { nextDate: e.target.value })} className="input-admin" />
        <VoiceInput value={lead.nextAction} onValue={(value) => updateLead(lead.id, { nextAction: value })} />
        <div className="flex flex-wrap gap-2"><button onClick={() => sendLeadMessage(lead, "apresentacao")} title="Apresentação" className="rounded-full bg-[#25D366] p-3 text-white"><WhatsAppIcon className="h-[18px] w-[18px]" /></button><button onClick={() => completeAction(lead)} title="Concluir etapa" className="rounded-full bg-[#d6a85f] p-3 text-black"><CheckCircle2 size={18} /></button><button onClick={() => deleteLead(lead.id)} title="Remover" className="rounded-full border border-red-500/30 p-3 text-red-300"><Trash2 size={18} /></button></div>
      </div>
      <VoiceTextarea value={lead.notes} onValue={(value) => updateLead(lead.id, { notes: value })} placeholder="Observações" className="mt-4 min-h-20" />
    </div>
  );
}

function TripList({ trips, onFinish, onDelete }: { trips: Trip[]; onFinish: (trip: Trip) => void; onDelete?: (id: string) => void }) {
  if (!trips.length) return <p className="text-zinc-400">Nenhuma viagem cadastrada.</p>;
  return <div className="grid gap-4">{trips.map((trip) => {
    const route = splitRoute(trip.route);
    return <div key={trip.id} className="grid gap-3 rounded-2xl border border-[#d6a85f]/10 bg-[#202020] p-5 md:grid-cols-[1fr_.8fr_.8fr_.6fr_auto] md:items-center">
      <div><strong>{trip.client}</strong><p className="text-sm text-zinc-400">{trip.phone || "Sem telefone"}</p></div>
      <span>{trip.date} às {trip.time}</span>
      <button onClick={() => openGoogleMapsRoute(route.origin, route.destination)} title="Abrir rota no Google Maps" className="text-left font-bold text-[#f1d28b] underline-offset-4 hover:underline">{trip.route}</button>
      <span className="text-[#f1d28b]">R$ {trip.value}</span>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => openWhatsApp(trip.phone, messages.confirmacao)} title="Confirmar no WhatsApp" className="rounded-full bg-[#25D366] p-3 text-white"><WhatsAppIcon className="h-[18px] w-[18px]" /></button>
        <button onClick={() => openGoogleMapsRoute(route.origin, route.destination)} title="Google Maps" className="rounded-full border border-[#d6a85f]/30 px-3 py-2 text-xs font-black text-[#f1d28b]">Maps</button>
        <button onClick={() => openWazeRoute(route.destination)} title="Waze" className="rounded-full border border-[#d6a85f]/30 px-3 py-2 text-xs font-black text-[#f1d28b]">Waze</button>
        {trip.status !== "Concluída" && <button onClick={() => onFinish(trip)} className="rounded-full bg-[#d6a85f] p-3 text-black"><CheckCircle2 size={18} /></button>}
        {onDelete && <button onClick={() => onDelete(trip.id)} className="rounded-full border border-red-500/30 p-3 text-red-300"><Trash2 size={18} /></button>}
      </div>
    </div>;
  })}</div>;
}

function AISuggestions({ pending, trips, credits }: { pending: number; trips: number; credits: number }) {
  const items = [
    pending > 0 ? `Você tem ${pending} follow-up(s) pendente(s). Prioridade: resolver a fila hoje.` : "Sem follow-ups pendentes. Bom momento para prospectar novos contatos.",
    trips > 0 ? `Você tem ${trips} viagem(ns) hoje. Confirme horários e dados dos clientes.` : "Nenhuma viagem hoje. Foque em prospecção e parcerias.",
    credits > 0 ? `Existem ${credits} transfer(s) acumulado(s) no Programa de Indicação.` : "Apresente o Programa de Indicação para clientes satisfeitos.",
    "Meta diária sugerida: 10 novos contatos, 3 follow-ups e 1 contato com hotel ou empresa.",
  ];
  return <div className="grid gap-4">{items.map((item) => <div key={item} className="flex gap-3 rounded-2xl border border-[#d6a85f]/10 bg-[#202020] p-5"><CheckCircle2 className="shrink-0 text-[#d6a85f]" /><span>{item}</span></div>)}</div>;
}
