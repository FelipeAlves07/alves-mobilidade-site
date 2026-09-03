"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity, BadgeCheck, BrainCircuit, Briefcase, Building2, Calendar, Camera, CircleAlert, CircleCheck,
  Copy, Crown, Database, FileText, Flame, Gauge, Globe, Handshake, Info, Layers, Lightbulb, Link2,
  LoaderCircle, Mail, MapPin, MessageSquareText, Pause, Phone, Play, Plus, Radar, RefreshCw, Rocket,
  Search, ShieldCheck, Sparkles, Square, Target, Timer, Trash2, TrendingUp, UserSearch, X,
} from "lucide-react";
import type {
  AutoProspectCampaign,
  AutoProspectCampaignForm,
  AutoProspectCampaignStatus,
  ProspectCompany,
  ProspectCompanyForm,
  ProspectDiscovery,
} from "@/domain/autoprospect/types";
import { findCompanyByName } from "@/domain/autoprospect/service";
import type { DiscoveryResult } from "@/domain/autoprospect/service";
import type {
  AutomaticDiscoveryResponse,
  AutomaticDiscoveryResultItem,
} from "@/domain/autoprospect/discovery";
import { PRIORITY_EMOJI, PRIORITY_LABEL } from "@/domain/autoprospect/intelligence";
import type { CompanyAnalysisResult } from "@/hooks/useAutoProspect";
import type { CompanyIntelligenceRow } from "@/lib/repository-mappers";
import {
  INTERACTION_CHANNELS,
  INTERACTION_RESULT_SUGGESTIONS,
  OPPORTUNITY_STATUSES,
  type OpportunityInteractionForm,
  type OpportunityStatus,
} from "@/domain/autoprospect/opportunity";
import type { OpportunityInteractionRow, OpportunityListItemRow } from "@/lib/repository-mappers";
import { batchProgress, estimateBatchEtaSeconds, type BatchRunDetail, type BatchRunListItem } from "@/domain/autoprospect/batch";
import { cleanPhone } from "@/lib/whatsapp";
import { formatDateBR } from "@/lib/format";

const campaignStatuses: AutoProspectCampaignStatus[] = ["Rascunho", "Ativa", "Pausada", "Encerrada"];

const segmentOptions = [
  "Empresas", "Hotéis", "Agências de eventos", "Agências de turismo",
  "Escritórios", "Clínicas", "Indústrias", "Faculdades",
];

const ufOptions = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const flowSteps = [
  "Pesquisar", "Encontrar", "Captar", "Salvar", "Analisar",
  "Qualificar", "Pontuar", "Contatos", "Personalizar", "Prospecção",
];

const roadmap = [
  { icon: Radar, title: "Discovery / Pesquisa", text: "Buscar empresas em fontes públicas e permitidas, sem burlar CAPTCHA, bloqueios ou rate limits." },
  { icon: Database, title: "Coleta e normalização", text: "Site, telefone, WhatsApp empresarial, e-mail, Instagram e LinkedIn públicos." },
  { icon: BadgeCheck, title: "Qualificação", text: "Sinais de oportunidade: recebe executivos, eventos, turismo, funcionários viajantes, relação com hotéis." },
  { icon: Gauge, title: "Lead Score", text: "Nota com explicação. Separando sempre FATO, INFERÊNCIA e RECOMENDAÇÃO." },
  { icon: Sparkles, title: "IA", text: "Resumos, sinais, necessidades, serviços relevantes e abordagens personalizadas por empresa." },
  { icon: UserSearch, title: "Contatos comerciais", text: "Responsáveis legitimamente públicos, com cargo e origem da informação." },
  { icon: MessageSquareText, title: "Abordagem", text: "Você decide o que enviar: visualizar, editar, copiar e abrir WhatsApp/e-mail." },
  { icon: TrendingUp, title: "Pipeline", text: "Encontrado → Analisado → Aprovado → Contatado → Negociação → Fechado ou Descartado." },
];

const statusBadge: Record<AutoProspectCampaignStatus, string> = {
  Rascunho: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
  Ativa: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  Pausada: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  Encerrada: "border-red-500/30 bg-red-500/10 text-red-400",
};

const potentialBadge: Record<string, string> = {
  "Muito alto": "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  Alto: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  Médio: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  Baixo: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  "Muito baixo": "border-red-500/30 bg-red-500/10 text-red-300",
};

const recommendationLabel: Record<string, string> = {
  abordar: "Abordar",
  investigar: "Investigar melhor",
  baixa_prioridade: "Baixa prioridade",
};

const priorityBadge: Record<number, string> = {
  1: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  2: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  3: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  4: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
};

const opportunityStatusBadge: Record<OpportunityStatus, string> = {
  "Nova": "border-zinc-500/30 bg-zinc-500/10 text-zinc-300",
  "Para abordar": "border-[var(--accent-25)] bg-[var(--accent-12)] text-[var(--accent)]",
  "Em contato": "border-sky-500/30 bg-sky-500/10 text-sky-300",
  "Respondeu": "border-amber-500/30 bg-amber-500/10 text-amber-300",
  "Interessado": "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "Sem interesse": "border-red-500/30 bg-red-500/10 text-red-300",
  "Convertido": "border-emerald-500/40 bg-emerald-500/20 text-emerald-200",
};

const batchRunStatusBadge: Record<string, string> = {
  pendente: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
  processando: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  pausado: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  concluido: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  cancelado: "border-red-500/30 bg-red-500/10 text-red-300",
};

const batchRunStatusLabel: Record<string, string> = {
  pendente: "Pendente",
  processando: "Processando",
  pausado: "Pausado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const batchCompanyStatusBadge: Record<string, string> = {
  pendente: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
  processando: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  concluida: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  sem_dados: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  falha: "border-red-500/30 bg-red-500/10 text-red-300",
  cancelada: "border-zinc-600/30 bg-zinc-600/10 text-zinc-500",
};

const batchCompanyStatusLabel: Record<string, string> = {
  pendente: "Pendente",
  processando: "Processando",
  concluida: "Concluída",
  sem_dados: "Sem dados",
  falha: "Falha",
  cancelada: "Cancelada",
};

const batchErrorCodeLabel: Record<string, string> = {
  sem_site: "Sem site",
  site_bloqueado: "Site bloqueado",
  site_inacessivel: "Site inacessível",
  http_429: "Limite de acesso (429)",
  http_5xx: "Erro do site (5xx)",
  http_4xx: "Erro do site (4xx)",
  timeout: "Tempo excedido",
  resposta_invalida: "Resposta inválida",
  banco: "Erro de banco",
  validacao: "Validação",
  desconhecido: "Erro inesperado",
};

function formatBatchDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatBatchDate(iso: string): string {
  return formatDateBR(iso.slice(0, 10));
}

interface Props {
  campaigns: AutoProspectCampaign[];
  companies: ProspectCompany[];
  discoveries: ProspectDiscovery[];
  analyses: Record<string, CompanyAnalysisResult>;
  intelligence: Record<string, CompanyIntelligenceRow>;
  onAddCampaign: (form: AutoProspectCampaignForm) => Promise<void> | void;
  onUpdateCampaign: (id: string, patch: Partial<AutoProspectCampaignForm>) => Promise<void> | void;
  onDeleteCampaign: (id: string) => Promise<void> | void;
  onDiscoverCompany: (form: ProspectCompanyForm, campaignId: string | null) => Promise<DiscoveryResult>;
  onDeleteCompany: (id: string) => Promise<void> | void;
  onRunDiscovery: (campaignId: string) => Promise<AutomaticDiscoveryResponse>;
  onAnalyzeCompany: (companyId: string) => Promise<CompanyAnalysisResult>;
  onReanalyzeIntelligence: (companyId: string) => Promise<CompanyIntelligenceRow>;
  opportunities: OpportunityListItemRow[];
  interactions: Record<string, OpportunityInteractionRow[]>;
  onCreateOpportunity: (companyId: string) => Promise<OpportunityListItemRow>;
  onUpdateOpportunityStatus: (opportunityId: string, status: OpportunityStatus) => Promise<void>;
  onLoadInteractions: (opportunityId: string) => Promise<OpportunityInteractionRow[]>;
  onAddInteraction: (opportunityId: string, form: OpportunityInteractionForm) => Promise<OpportunityInteractionRow>;
  batchRuns: BatchRunListItem[];
  batchDetail: BatchRunDetail | null;
  batchPolling: boolean;
  onCreateBatch: (campaignId: string, form?: { apenasSemInteligencia?: boolean; limiteMaximo?: number }) => Promise<BatchRunListItem>;
  onProcessBatch: (runId: string) => Promise<{ remaining: number }>;
  onPauseBatch: (runId: string) => Promise<void>;
  onResumeBatch: (runId: string) => Promise<void>;
  onCancelBatch: (runId: string) => Promise<void>;
  onRetryBatchFailures: (runId: string) => Promise<void>;
  onLoadBatchDetail: (runId: string) => Promise<BatchRunDetail | null>;
}

const emptyCampaignForm: AutoProspectCampaignForm = {
  name: "", location: "", segments: [], keyword: "", objective: "", targetCount: 0, status: "Rascunho",
};

const emptyCompanyForm: ProspectCompanyForm = {
  name: "", segment: "", city: "", state: "", address: "", website: "", phone: "",
  whatsapp: "", email: "", instagram: "", linkedin: "", notes: "", source: "",
};

type Feedback = { kind: "success" | "info" | "warn" | "error"; text: string } | null;

type DiscoveryUiState =
  | { status: "running" }
  | { status: "done"; counts: NonNullable<AutomaticDiscoveryResponse["counts"]>; results: AutomaticDiscoveryResultItem[] }
  | { status: "error"; message: string };

export default function AutoProspectView({
  campaigns, companies, discoveries, analyses, intelligence,
  onAddCampaign, onUpdateCampaign, onDeleteCampaign,
  onDiscoverCompany, onDeleteCompany, onRunDiscovery, onAnalyzeCompany, onReanalyzeIntelligence,
  opportunities, interactions, onCreateOpportunity, onUpdateOpportunityStatus,
  onLoadInteractions, onAddInteraction,
  batchRuns, batchDetail, batchPolling,
  onCreateBatch, onProcessBatch, onPauseBatch, onResumeBatch, onCancelBatch,
  onRetryBatchFailures, onLoadBatchDetail,
}: Props) {
  const [tab, setTab] = useState<"campanhas" | "empresas" | "oportunidades" | "lote">("campanhas");
  const [campaignForm, setCampaignForm] = useState<AutoProspectCampaignForm>(emptyCampaignForm);
  const [customSegment, setCustomSegment] = useState("");
  const [query, setQuery] = useState("");

  const [companyForm, setCompanyForm] = useState<ProspectCompanyForm>(emptyCompanyForm);
  const [companyCampaignId, setCompanyCampaignId] = useState("");
  const [companyQuery, setCompanyQuery] = useState("");
  const [customSegmentMode, setCustomSegmentMode] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);
  const [discoveryStates, setDiscoveryStates] = useState<Record<string, DiscoveryUiState>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({});
  const [intelligenceRunning, setIntelligenceRunning] = useState<Record<string, boolean>>({});
  const [sortMode, setSortMode] = useState<"prioridade" | "score" | "potencial" | "confianca">("prioridade");
  const [campaignFilter, setCampaignFilter] = useState("");

  // ─── Oportunidade comercial (Etapa 6) ──────────────────────────
  const [opQuery, setOpQuery] = useState("");
  const [opStatusFilter, setOpStatusFilter] = useState("");
  const [opPriorityFilter, setOpPriorityFilter] = useState("");
  const [opPotentialFilter, setOpPotentialFilter] = useState("");
  const [opCampaignFilter, setOpCampaignFilter] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [oppFeedback, setOppFeedback] = useState<Feedback>(null);
  const [creatingOpportunity, setCreatingOpportunity] = useState<Record<string, boolean>>({});
  const [statusSaving, setStatusSaving] = useState<Record<string, boolean>>({});
  const [interactionsLoading, setInteractionsLoading] = useState<Record<string, boolean>>({});
  const [interactionSaving, setInteractionSaving] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    channel: "WhatsApp",
    result: "",
    note: "",
    occurredAt: "",
  });

  // ─── Processamento em lote (Etapa 7) ──────────────────────────
  const [batchCampaignId, setBatchCampaignId] = useState("");
  const [batchNoIntel, setBatchNoIntel] = useState(true);
  const [batchLimite, setBatchLimite] = useState("");
  const [batchCreating, setBatchCreating] = useState(false);
  const [batchActionBusy, setBatchActionBusy] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<Feedback>(null);
  const batchProcessBusy = useRef(false);
  const batchAutoResumed = useRef(false);

  // Loop de processamento: enquanto um run está ativo, o cliente
  // (admin) mantém o ciclo de chunks; fechar o navegador apenas
  // interrompe o loop — o chunk em voo termina no servidor e o run
  // permanece retomável (GET + novo process).
  useEffect(() => {
    if (!batchDetail) return;
    const status = batchDetail.run.status;
    if (status !== "pendente" && status !== "processando") return;
    if (batchProcessBusy.current) return;
    batchProcessBusy.current = true;
    onProcessBatch(batchDetail.run.id)
      .then(() => {
        return onLoadBatchDetail(batchDetail.run.id).catch(() => null);
      }, (error) => {
        setBatchFeedback({
          kind: "error",
          text: error instanceof Error ? error.message : "Processamento não concluído.",
        });
      })
      .finally(() => {
        batchProcessBusy.current = false;
      });
  }, [batchDetail, onProcessBatch, onLoadBatchDetail]);

  // Retomada: ao abrir a tela com um run ativo, carrega o detalhe
  // automaticamente (o loop acima continua o processamento).
  useEffect(() => {
    if (batchAutoResumed.current) return;
    const activeRun = batchRuns.find(
      (run) => run.status === "pendente" || run.status === "processando" || run.status === "pausado",
    );
    if (!activeRun) return;
    batchAutoResumed.current = true;
    onLoadBatchDetail(activeRun.id).catch(() => undefined);
  }, [batchRuns, onLoadBatchDetail]);

  const activeBatchRun = useMemo(
    () => batchRuns.find((run) => ["pendente", "processando", "pausado"].includes(run.status)),
    [batchRuns],
  );

  const activeCampaigns = campaigns.filter((c) => c.status === "Ativa").length;
  const existingHint = companyForm.name.trim() ? findCompanyByName(companies, companyForm.name) : undefined;

  function toggleSegment(segment: string) {
    setCampaignForm((current) => ({
      ...current,
      segments: current.segments.includes(segment)
        ? current.segments.filter((s) => s !== segment)
        : [...current.segments, segment],
    }));
  }

  function addCustomSegment() {
    const value = customSegment.trim();
    if (!value) return;
    if (!campaignForm.segments.includes(value)) setCampaignForm((current) => ({ ...current, segments: [...current.segments, value] }));
    setCustomSegment("");
  }

  function handleAddCampaign() {
    if (!campaignForm.name.trim()) return;
    Promise.resolve(onAddCampaign(campaignForm))
      .then(() => setCampaignForm(emptyCampaignForm))
      .catch((error) => {
        setFeedback({ kind: "error", text: error instanceof Error ? error.message : "Campanha não criada." });
      });
  }

  function handleDeleteCampaign(campaign: AutoProspectCampaign) {
    if (!confirm(`Remover a campanha "${campaign.name}"?`)) return;
    Promise.resolve(onDeleteCampaign(campaign.id)).catch((error) => {
      const message = error instanceof Error ? error.message : "Campanha não removida.";
      setFeedback({
        kind: "error",
        text: /foreign key|referenced|violates/i.test(message)
          ? "Campanhas com histórico de lote não podem ser removidas. Encerre a campanha em vez disso."
          : message,
      });
    });
  }

  function handleDeleteCompany(company: ProspectCompany) {
    if (!confirm(`Remover a empresa "${company.name}" e suas descobertas?`)) return;
    Promise.resolve(onDeleteCompany(company.id)).catch((error) => {
      const message = error instanceof Error ? error.message : "Empresa não removida.";
      setFeedback({
        kind: "error",
        text: /foreign key|referenced|violates/i.test(message)
          ? "Empresas com histórico de lote não podem ser removidas. Preserve o registro para manter a auditoria."
          : message,
      });
    });
  }

  function discoveryCount(campaignId: string) {
    return discoveries.filter((d) => d.campaignId === campaignId).length;
  }

  function campaignName(campaignId: string | null) {
    return campaigns.find((c) => c.id === campaignId)?.name ?? "Campanha removida";
  }

  // ─── Inteligência comercial: ranking e visão por campanha ──────
  // Somente dados PERSISTIDOS (abrir/ordenar nunca executa IA).

  const rankedOpportunities = useMemo(() => {
    const rows: { company: ProspectCompany; intel: CompanyIntelligenceRow }[] = [];
    for (const company of companies) {
      const intel = intelligence[company.id];
      if (intel) rows.push({ company, intel });
    }
    rows.sort(
      (a, b) =>
        a.intel.priority - b.intel.priority ||
        b.intel.scoreSnapshot - a.intel.scoreSnapshot ||
        a.company.name.localeCompare(b.company.name),
    );
    return rows;
  }, [companies, intelligence]);

  function campaignCompanyIds(campaignId: string): string[] {
    return [...new Set(discoveries.filter((d) => d.campaignId === campaignId).map((d) => d.companyId))];
  }

  function campaignSummary(campaignId: string) {
    const ids = campaignCompanyIds(campaignId);
    const newCount = ids.filter((id) => discoveries.filter((d) => d.companyId === id).length === 1).length;
    const qualified = ids.filter((id) => analyses[id]?.qualification).length;
    const enriched = ids.filter((id) => analyses[id]?.qualification && (analyses[id].qualification.facts.some((f) => f.sourceUrl) || intelligence[id])).length;
    let alto = 0, medio = 0, baixo = 0;
    for (const id of ids) {
      const potential = analyses[id]?.qualification?.potential;
      if (potential === "Alto" || potential === "Muito alto") alto += 1;
      else if (potential === "Médio") medio += 1;
      else if (potential === "Baixo" || potential === "Muito baixo") baixo += 1;
    }
    const top = rankedOpportunities.find((row) => ids.includes(row.company.id))?.intel;
    return { ids, found: ids.length, newCount, enriched, qualified, alto, medio, baixo, top };
  }

  async function reanalyzeOpportunity(companyId: string) {
    setIntelligenceRunning((prev) => ({ ...prev, [companyId]: true }));
    setAnalysisErrors((prev) => {
      const next = { ...prev };
      delete next[companyId];
      return next;
    });
    try {
      await onReanalyzeIntelligence(companyId);
    } catch (error) {
      setAnalysisErrors((prev) => ({
        ...prev,
        [companyId]: error instanceof Error ? error.message : "Análise não concluída.",
      }));
    } finally {
      setIntelligenceRunning((prev) => {
        const next = { ...prev };
        delete next[companyId];
        return next;
      });
    }
  }

  function quickAddCompany(campaignId: string) {
    setCompanyCampaignId(campaignId);
    setTab("empresas");
  }

  async function handleCompanySubmit() {
    if (!companyForm.name.trim()) {
      setFeedback({ kind: "error", text: "Informe pelo menos o nome da empresa." });
      return;
    }
    setSaving(true);
    try {
      const result = await onDiscoverCompany(companyForm, companyCampaignId || null);
      const campaignLabel = companyCampaignId
        ? ` na campanha "${campaignName(companyCampaignId)}"`
        : " sem campanha vinculada";
      if (result.action === "created") {
        setFeedback({ kind: "success", text: `Empresa "${result.company.name}" adicionada à base e descoberta registrada${campaignLabel}.` });
      } else if (result.action === "linked") {
        setFeedback({ kind: "info", text: `Empresa "${result.company.name}" já existia na base — apenas nova descoberta registrada${campaignLabel}.` });
      } else {
        setFeedback({ kind: "warn", text: `Empresa "${result.company.name}" já estava vinculada${campaignLabel}. Nada foi duplicado.` });
      }
      setCompanyForm(emptyCompanyForm);
      setCustomSegmentMode(false);
    } catch {
      setFeedback({ kind: "error", text: "Não foi possível salvar a empresa. Tente novamente." });
    } finally {
      setSaving(false);
    }
  }

  async function runSearch(campaignId: string) {
    setDiscoveryStates((prev) => ({ ...prev, [campaignId]: { status: "running" } }));
    try {
      const payload = await onRunDiscovery(campaignId);
      setDiscoveryStates((prev) => ({
        ...prev,
        [campaignId]: {
          status: "done",
          counts: payload.counts ?? { found: 0, created: 0, linked: 0, alreadyLinked: 0, discarded: 0 },
          results: payload.results ?? [],
        },
      }));
    } catch (error) {
      setDiscoveryStates((prev) => ({
        ...prev,
        [campaignId]: {
          status: "error",
          message: error instanceof Error ? error.message : "Pesquisa não concluída.",
        },
      }));
    }
  }

  // ─── Oportunidade comercial: helpers ───────────────────────────

  function opportunityCampaignName(companyId: string): string {
    const discovery = discoveries.find((d) => d.companyId === companyId);
    return discovery?.campaignId ? campaignName(discovery.campaignId) : "Sem campanha";
  }

  function opportunityFor(companyId: string): OpportunityListItemRow | undefined {
    return opportunities.find((o) => o.companyId === companyId);
  }

  async function handleCreateOpportunity(companyId: string, companyName: string) {
    setCreatingOpportunity((prev) => ({ ...prev, [companyId]: true }));
    try {
      const created = await onCreateOpportunity(companyId);
      setOppFeedback({ kind: "success", text: `Oportunidade criada para "${created.companyName || companyName}".` });
    } catch (error) {
      setOppFeedback({ kind: "warn", text: error instanceof Error ? error.message : "Oportunidade não criada." });
    } finally {
      setCreatingOpportunity((prev) => {
        const next = { ...prev };
        delete next[companyId];
        return next;
      });
    }
  }

  async function handleChangeStatus(opportunity: OpportunityListItemRow, status: OpportunityStatus) {
    if (status === opportunity.status) return;
    setStatusSaving((prev) => ({ ...prev, [opportunity.id]: true }));
    try {
      await onUpdateOpportunityStatus(opportunity.id, status);
    } catch (error) {
      setOppFeedback({ kind: "error", text: error instanceof Error ? error.message : "Status não alterado." });
    } finally {
      setStatusSaving((prev) => {
        const next = { ...prev };
        delete next[opportunity.id];
        return next;
      });
    }
  }

  async function openOpportunity(opportunityId: string) {
    setSelectedOpportunityId(opportunityId);
    if (interactions[opportunityId]) return;
    setInteractionsLoading((prev) => ({ ...prev, [opportunityId]: true }));
    try {
      await onLoadInteractions(opportunityId);
    } catch {
      setOppFeedback({ kind: "error", text: "Não foi possível carregar o histórico da oportunidade." });
    } finally {
      setInteractionsLoading((prev) => {
        const next = { ...prev };
        delete next[opportunityId];
        return next;
      });
    }
  }

  async function handleRegisterInteraction(opportunityId: string) {
    if (!interactionForm.channel || !interactionForm.result.trim()) {
      setOppFeedback({ kind: "warn", text: "Informe o canal e o resultado da interação." });
      return;
    }
    setInteractionSaving(true);
    try {
      await onAddInteraction(opportunityId, {
        channel: interactionForm.channel as OpportunityInteractionForm["channel"],
        result: interactionForm.result,
        note: interactionForm.note,
        occurredAt: interactionForm.occurredAt || new Date().toISOString().slice(0, 16),
      });
      setInteractionForm({ channel: "WhatsApp", result: "", note: "", occurredAt: "" });
      setOppFeedback({ kind: "success", text: "Interação registrada no histórico." });
    } catch (error) {
      setOppFeedback({ kind: "error", text: error instanceof Error ? error.message : "Interação não registrada." });
    } finally {
      setInteractionSaving(false);
    }
  }

  function copyText(value: string, label: string) {
    if (!value) return;
    navigator.clipboard?.writeText(value)
      .then(() => setOppFeedback({ kind: "success", text: `${label} copiado.` }))
      .catch(() => setOppFeedback({ kind: "error", text: "Não foi possível copiar." }));
  }

  function DiscoverySummary({ state }: { state: DiscoveryUiState }) {
    if (state.status === "running") {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--accent-25)] bg-[var(--accent-12)] px-4 py-3">
          <LoaderCircle size={15} className="animate-spin text-[var(--accent)]" />
          <p className="text-xs font-bold text-[var(--accent)]">Pesquisando empresas... a fonte pode levar alguns segundos.</p>
        </div>
      );
    }
    if (state.status === "error") {
      return (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <CircleAlert size={15} className="mt-0.5 shrink-0 text-red-300" />
          <div>
            <p className="text-xs font-bold text-red-200">Pesquisa não concluída.</p>
            <p className="mt-0.5 text-xs leading-relaxed text-red-300/80">{state.message}</p>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-surface)] p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-12)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent)]">
            <CircleCheck size={12} /> Pesquisa concluída
          </span>
          <span className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-zinc-300">Encontradas: {state.counts.found}</span>
          <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300">Novas: {state.counts.created}</span>
          <span className="rounded-lg bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-300">Já existentes: {state.counts.linked}</span>
          <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300">Já vinculadas: {state.counts.alreadyLinked}</span>
          <span className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-zinc-500">Descartadas: {state.counts.discarded}</span>
        </div>
        {state.results.length > 0 && (
          <div className="mt-3 space-y-2">
            {state.results.map((item, index) => {
              const resultForm = item.form;
              const label =
                item.action === "created" ? { text: "Nova", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" }
                  : item.action === "linked" ? { text: "Já existente", cls: "border-sky-500/30 bg-sky-500/10 text-sky-300" }
                  : item.action === "already-linked" ? { text: "Já vinculada", cls: "border-amber-500/30 bg-amber-500/10 text-amber-300" }
                  : { text: "Descartada", cls: "border-white/10 bg-white/[0.04] text-zinc-500" };
              return (
                <div key={`${item.action}-${resultForm?.name ?? "x"}-${index}`} className="rounded-lg border border-white/8 bg-[var(--bg-card)] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-sm font-bold leading-tight">{resultForm?.name || "Resultado sem nome"}</p>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${label.cls}`}>{label.text}</span>
                  </div>
                  {resultForm && (
                    <div className="mt-1.5 space-y-0.5 text-[11px] text-zinc-500">
                      {resultForm.segment && <p>{resultForm.segment}</p>}
                      {(resultForm.city || resultForm.state) && (
                        <p className="flex items-center gap-1"><MapPin size={10} className="shrink-0" /> {[resultForm.city, resultForm.state].filter(Boolean).join(" - ")}</p>
                      )}
                      {resultForm.address && <p className="truncate">{resultForm.address}</p>}
                      {resultForm.phone && <p className="flex items-center gap-1"><Phone size={10} className="shrink-0" /> {resultForm.phone}</p>}
                      {resultForm.website && <p className="flex items-center gap-1 truncate"><Globe size={10} className="shrink-0 text-[var(--accent)]" /> {resultForm.website}</p>}
                      {resultForm.notes && <p className="line-clamp-2">{resultForm.notes}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function openCompanyAnalysis(companyId: string) {
    setSelectedCompanyId(companyId);
    setAnalysisErrors((prev) => {
      const next = { ...prev };
      delete next[companyId];
      return next;
    });
    setAnalyzing((prev) => ({ ...prev, [companyId]: true }));
    onAnalyzeCompany(companyId)
      .catch((error) => {
        setAnalysisErrors((prev) => ({
          ...prev,
          [companyId]: error instanceof Error ? error.message : "Análise não concluída.",
        }));
      })
      .finally(() => {
        setAnalyzing((prev) => {
          const next = { ...prev };
          delete next[companyId];
          return next;
        });
      });
  }

  function QualificationPanel({
    company,
    analysis,
    intel,
    running,
    intelRunning,
    error,
    opportunity,
    opportunityCreating,
    onAnalyze,
    onReanalyze,
    onCreateOpportunity,
    onClose,
  }: {
    company: ProspectCompany;
    analysis: CompanyAnalysisResult | undefined;
    intel: CompanyIntelligenceRow | undefined;
    running: boolean;
    intelRunning: boolean;
    error: string;
    opportunity: OpportunityListItemRow | undefined;
    opportunityCreating: boolean;
    onAnalyze: () => void;
    onReanalyze: () => void;
    onCreateOpportunity: () => void;
    onClose: () => void;
  }) {
    const qualification = analysis?.qualification;
    const enrichment = analysis?.enrichment ?? null;
    return (
      <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-12)] text-[var(--accent)]"><Activity size={18} /></div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Análise comercial</p>
              <h3 className="text-lg font-black md:text-xl">{company.name}</h3>
            </div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 cursor-pointer rounded-lg border border-white/10 px-2 py-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200" aria-label="Fechar análise"><X size={14} /></button>
        </div>

        {enrichment?.status === "unavailable" && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <CircleAlert size={15} className="mt-0.5 shrink-0 text-amber-300" />
            <p className="text-xs leading-relaxed text-amber-200">
              <span className="font-bold">Enriquecimento indisponível.</span> {enrichment.reason}
            </p>
          </div>
        )}

        {running && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--accent-25)] bg-[var(--accent-12)] px-4 py-3">
            <LoaderCircle size={15} className="animate-spin text-[var(--accent)]" />
            <p className="text-xs font-bold text-[var(--accent)]">Enriquecendo e qualificando a empresa... pode levar alguns segundos.</p>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <CircleAlert size={15} className="mt-0.5 shrink-0 text-red-300" />
            <div>
              <p className="text-xs font-bold text-red-200">Análise não concluída.</p>
              <p className="mt-0.5 text-xs leading-relaxed text-red-300/80">{error}</p>
            </div>
          </div>
        )}

        {!qualification && !running && !error && (
          <div className="mt-4 rounded-xl border border-dashed border-white/10 p-6 text-center">
            <Gauge size={26} className="mx-auto text-zinc-600" />
            <p className="mt-3 text-sm font-bold text-zinc-300">Enriquecer e qualificar</p>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-500">
              O sistema acessará o site oficial da empresa (se houver), coletará informações públicas,
              detectará sinais comerciais e calculará o Lead Score com explicação.
            </p>
            <button type="button" onClick={onAnalyze} className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90">
              <Sparkles size={14} /> Enriquecer e qualificar
            </button>
          </div>
        )}

        {qualification && (
          <div className="mt-5 space-y-5">
            {/* Score + prioridade */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4 md:gap-6 md:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] text-white md:h-20 md:w-20">
                  <span className="text-2xl font-black md:text-3xl">{qualification.score}</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest opacity-80">/100</span>
                </div>
                <div>
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${potentialBadge[qualification.potential] || ""}`}>
                    {qualification.potential} potencial
                  </span>
                  <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Lead Score</p>
                  {intel && (
                    <p className="mt-1.5 text-sm font-black leading-none">
                      {PRIORITY_EMOJI[intel.priority as 1 | 2 | 3 | 4]} Prioridade {intel.priority} —{" "}
                      <span className="text-[var(--accent)]">{intel.nextAction}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1 text-xs leading-relaxed text-zinc-400">
                <p className="flex items-center gap-1.5 font-bold text-zinc-200">
                  <ShieldCheck size={13} className="shrink-0 text-[var(--accent)]" />
                  Confiança da análise: {qualification.confidence}
                </p>
                <p className="mt-1 text-zinc-500">{qualification.confidenceReason}</p>
              </div>
            </div>

            {/* Resumo */}
            <div className="rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><FileText size={12} /> Resumo</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{qualification.summary}</p>
            </div>

            {/* Por que é uma oportunidade? */}
            <div className="rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><Lightbulb size={12} /> Por que é uma oportunidade?</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{qualification.opportunityReason}</p>
            </div>

            {/* Justificativa do score */}
            <div className="rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><Gauge size={12} /> Como o score foi calculado</p>
              <div className="mt-2 space-y-1.5">
                {qualification.breakdown.map((item) => (
                  <div key={item.label} className="flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-zinc-300">{item.points > 0 ? `+${item.points}` : item.points} · {item.label}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sinais encontrados */}
            <div className="rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><BadgeCheck size={12} /> Sinais encontrados</p>
              {qualification.facts.some((fact) => fact.sourceUrl) ? (
                <div className="mt-2 space-y-2">
                  {qualification.facts.filter((fact) => fact.sourceUrl).map((fact) => (
                    <div key={`${fact.label}-${fact.text.slice(0, 40)}`} className="flex items-start gap-2 text-xs">
                      <CircleCheck size={13} className="mt-0.5 shrink-0 text-emerald-400" />
                      <div className="min-w-0">
                        <p className="font-bold text-zinc-300">{fact.label}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">{fact.text}</p>
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-600"><Link2 size={9} /> {fact.sourceUrl}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">Nenhum sinal comercial encontrado nas fontes coletadas.</p>
              )}
            </div>

            {/* Possíveis serviços */}
            <div className="rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><Briefcase size={12} /> Possíveis serviços da AME</p>
              {qualification.possibleServices.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {qualification.possibleServices.map((service) => (
                    <span key={service} className="rounded-lg bg-[var(--accent-12)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent)]">{service}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-zinc-500">Necessidade não identificada com base nas informações disponíveis.</p>
              )}
            </div>

            {/* Inferências */}
            {qualification.inferences.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><BrainCircuit size={12} /> Inferências</p>
                <div className="mt-2 space-y-2">
                  {qualification.inferences.map((inference) => (
                    <div key={inference.text.slice(0, 60)} className="flex items-start gap-2 text-xs">
                      <Sparkles size={13} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                      <div className="min-w-0">
                        <p className="leading-relaxed text-zinc-300">{inference.text}</p>
                        <p className="mt-0.5 text-[10px] text-zinc-600">Baseado no sinal &quot;{inference.fromSignal}&quot; · {inference.sourceUrl}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recomendação */}
            <div className="rounded-xl border border-[var(--accent-25)] bg-[var(--accent-12)] p-4">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><Rocket size={12} /> Recomendação</p>
              <p className="mt-2 text-sm font-bold text-zinc-200">{recommendationLabel[qualification.recommendation] || qualification.recommendation}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">{qualification.recommendationText}</p>
            </div>

            {/* Inteligência comercial — prioridade e explicação */}
            {intel && (
              <>
                <div className="rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><TrendingUp size={12} /> Inteligência comercial — por quê?</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${priorityBadge[intel.priority] || ""}`}>
                      {PRIORITY_EMOJI[intel.priority as 1 | 2 | 3 | 4]} Prioridade {intel.priority} — {PRIORITY_LABEL[intel.priority as 1 | 2 | 3 | 4]}
                    </span>
                    <span className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-zinc-300">Próxima ação: {intel.nextAction}</span>
                    {intel.scoreSnapshot > 0 && (
                      <span className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-zinc-500">Score base {intel.scoreSnapshot}/100 · {intel.potentialSnapshot}</span>
                    )}
                  </div>
                  {intel.priorityReason && <p className="mt-2 text-xs leading-relaxed text-zinc-500">{intel.priorityReason}</p>}
                  <div className="mt-3 space-y-1.5">
                    {intel.reasons.map((reason) => (
                      <p key={reason} className="flex items-start gap-2 text-xs leading-relaxed text-zinc-300">
                        <CircleCheck size={13} className="mt-0.5 shrink-0 text-emerald-400" /> {reason}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Serviços recomendados com motivo */}
                {intel.recommendedServices.length > 0 && (
                  <div className="rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><Briefcase size={12} /> Serviços recomendados</p>
                    <div className="mt-2 space-y-2">
                      {intel.recommendedServices.map((item) => {
                        const service = (item as { service: string; reason: string }).service;
                        const reason = (item as { service: string; reason: string }).reason;
                        return (
                          <div key={service} className="rounded-lg border border-white/5 bg-[var(--bg-card)] p-3">
                            <p className="text-xs font-black text-[var(--accent)]">{service}</p>
                            {reason && <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{reason}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Interpretação da IA (nunca altera o score em silêncio) */}
                {(intel.aiResponse as { potential?: string; priority?: number } | null) && (
                  (() => {
                    const ai = intel.aiResponse as { potential?: string; priority?: number } | null;
                    const differs =
                      (ai?.potential && ai.potential !== intel.potentialSnapshot) ||
                      (typeof ai?.priority === "number" && ai.priority !== intel.priority);
                    if (!differs) return null;
                    return (
                      <div className="rounded-xl border border-[var(--accent-25)] bg-[var(--accent-12)] px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><Sparkles size={12} className="inline" /> Interpretação da IA (sugestão, não altera o score)</p>
                        <p className="mt-1 text-xs leading-relaxed text-zinc-300">
                          {ai?.priority && ai.priority !== intel.priority && `Prioridade sugerida: ${ai.priority}. `}
                          {ai?.potential && ai.potential !== intel.potentialSnapshot && `Potencial interpretado: ${ai.potential}. `}
                          Base determinística mantida.
                        </p>
                      </div>
                    );
                  })()
                )}
              </>
            )}

            {/* IA */}
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">
              {qualification.aiStatus === "ia" ? (
                <span className="flex items-center gap-1 rounded-lg bg-[var(--accent-12)] px-2 py-1 font-bold text-[var(--accent)]">
                  <Sparkles size={10} /> IA utilizada: {qualification.aiProvider} ({qualification.aiModel})
                </span>
              ) : qualification.aiStatus === "ia_falha" ? (
                <span className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 font-bold text-amber-300">
                  <CircleAlert size={10} /> IA indisponível — análise determinística mantida
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-1 font-bold text-zinc-400">
                  <Gauge size={10} /> Análise determinística (score por regras explícitas)
                </span>
              )}
              <span className="flex items-center gap-1 rounded-lg bg-white/[0.06] px-2 py-1 font-bold text-zinc-500"><Calendar size={10} /> Fatos e sinais coletados em fontes públicas</span>
            </div>

            <button type="button" onClick={onAnalyze} disabled={running} className="w-full cursor-pointer rounded-xl border border-[var(--accent-25)] px-4 py-2.5 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)] disabled:cursor-not-allowed disabled:opacity-50 md:w-auto">
              {running ? <LoaderCircle size={13} className="mr-1.5 inline animate-spin" /> : <RefreshCw size={13} className="mr-1.5 inline" />} Reanalisar empresa
            </button>

            {intel && (
              <button type="button" onClick={onReanalyze} disabled={intelRunning} className="w-full cursor-pointer rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto" title="Reanalisar a oportunidade usando os dados já coletados (sem recolher o site)">
                {intelRunning ? <LoaderCircle size={13} className="mr-1.5 inline animate-spin" /> : <Sparkles size={13} className="mr-1.5 inline" />} Reanalisar oportunidade
              </button>
            )}

            {!opportunity && intel && (
              <button type="button" onClick={onCreateOpportunity} disabled={opportunityCreating} className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto">
                {opportunityCreating ? <LoaderCircle size={13} className="mr-1.5 inline animate-spin" /> : <Handshake size={13} className="mr-1.5 inline" />} Criar oportunidade comercial
              </button>
            )}
            {opportunity && (
              <button type="button" onClick={() => { setSelectedOpportunityId(opportunity.id); openOpportunity(opportunity.id); }} className="w-full cursor-pointer rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20 md:w-auto">
                <Handshake size={13} className="mr-1.5 inline" /> Abrir oportunidade — {opportunity.status}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Painel da oportunidade comercial ──────────────────────────
  function OpportunityPanel({
    opportunity,
    interactions,
    loadingInteractions,
    statusSaving,
    interactionSaving,
    form,
    onFormChange,
    onStatusChange,
    onRegisterInteraction,
    onClose,
  }: {
    opportunity: OpportunityListItemRow;
    interactions: OpportunityInteractionRow[] | undefined;
    loadingInteractions: boolean;
    statusSaving: boolean;
    interactionSaving: boolean;
    form: { channel: string; result: string; note: string; occurredAt: string };
    onFormChange: (patch: Partial<typeof interactionForm>) => void;
    onStatusChange: (status: OpportunityStatus) => void;
    onRegisterInteraction: () => void;
    onClose: () => void;
  }) {
    const services = (opportunity.recommendedServices || []) as { service: string; reason: string }[];
    const contacts: { label: string; value: string; href: string; icon: ReactNode; copy?: boolean }[] = [];
    if (opportunity.companyWhatsapp) {
      contacts.push({
        label: "WhatsApp", value: opportunity.companyWhatsapp, href: `https://wa.me/${cleanPhone(opportunity.companyWhatsapp)}`, icon: <MessageSquareText size={14} className="text-emerald-400" />, copy: true,
      });
    }
    if (opportunity.companyPhone) {
      contacts.push({
        label: "Telefone", value: opportunity.companyPhone, href: `tel:${opportunity.companyPhone}`, icon: <Phone size={14} className="text-sky-400" />, copy: true,
      });
    }
    if (opportunity.companyEmail) {
      contacts.push({
        label: "E-mail", value: opportunity.companyEmail, href: `mailto:${opportunity.companyEmail}`, icon: <Mail size={14} className="text-amber-400" />, copy: true,
      });
    }
    if (opportunity.companyWebsite) {
      contacts.push({
        label: "Site", value: opportunity.companyWebsite, href: opportunity.companyWebsite, icon: <Globe size={14} className="text-[var(--accent)]" />,
      });
    }
    if (opportunity.companyInstagram) {
      const handle = opportunity.companyInstagram.replace(/^@/, "");
      contacts.push({
        label: "Instagram", value: opportunity.companyInstagram, href: `https://instagram.com/${handle}`, icon: <Camera size={14} className="text-pink-400" />,
      });
    }
    if (opportunity.companyLinkedin) {
      contacts.push({
        label: "LinkedIn", value: opportunity.companyLinkedin, href: opportunity.companyLinkedin.startsWith("http") ? opportunity.companyLinkedin : `https://${opportunity.companyLinkedin}`, icon: <Briefcase size={14} className="text-sky-400" />,
      });
    }

    return (
      <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] text-white"><Handshake size={18} /></div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Oportunidade comercial</p>
              <h3 className="text-lg font-black md:text-xl">{opportunity.companyName}</h3>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {[opportunity.companySegment, [opportunity.companyCity, opportunity.companyState].filter(Boolean).join(" - ")].filter(Boolean).join(" · ") || "Sem informações"} · {opportunityCampaignName(opportunity.companyId)}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 cursor-pointer rounded-lg border border-white/10 px-2 py-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200" aria-label="Fechar oportunidade"><X size={14} /></button>
        </div>

        {/* Resumo: quem é, por que interessa, como abordar */}
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${priorityBadge[opportunity.priority] || ""}`}>
              {PRIORITY_EMOJI[opportunity.priority as 1 | 2 | 3 | 4]} Prioridade {opportunity.priority} — {PRIORITY_LABEL[opportunity.priority as 1 | 2 | 3 | 4]}
            </span>
            <div className="mt-3 flex items-center gap-2.5">
              <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] text-white">
                <span className="text-lg font-black leading-none">{opportunity.score}</span>
                <span className="text-[7px] font-bold uppercase tracking-widest opacity-80">/100</span>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-200">{opportunity.potential} potencial</p>
                <p className="text-[11px] text-zinc-500">Confiança: {opportunity.confidence || "—"}</p>
              </div>
            </div>
            <p className="mt-2.5 text-xs font-bold text-zinc-300">Próxima ação: <span className="text-[var(--accent)]">{opportunity.nextAction || "—"}</span></p>
          </div>

          <div className="rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4 md:col-span-2">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><Lightbulb size={12} /> Por que foi priorizada</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{opportunity.priorityReason || "Sem justificativa registrada na análise."}</p>
          </div>
        </div>

        {/* Serviço sugerido */}
        <div className="mt-4 rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><Rocket size={12} /> Serviço sugerido</p>
          {services.length === 0 ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">Nenhum serviço com evidência foi recomendado na análise.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {services.map((service, index) => (
                <div key={`${service.service}-${index}`} className="rounded-lg border border-white/5 bg-[var(--bg-card)] px-3 py-2">
                  <p className="text-sm font-black text-[var(--accent)]">{service.service}</p>
                  {service.reason && <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{service.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contatos da empresa (dados públicos coletados) */}
        <div className="mt-4 rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><Link2 size={12} /> Contato</p>
          {contacts.length === 0 ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">Nenhum contato público registrado para esta empresa.</p>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {contacts.map((contact) => (
                <div key={contact.label} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-[var(--bg-card)] px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {contact.icon}
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{contact.label}</p>
                      <a href={contact.href} target={contact.href.startsWith("tel:") || contact.href.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer" className="block truncate text-xs font-bold text-zinc-200 transition hover:text-[var(--accent)]">{contact.value}</a>
                    </div>
                  </div>
                  {contact.copy && (
                    <button type="button" onClick={() => copyText(contact.value, contact.label)} className="shrink-0 cursor-pointer rounded-md border border-white/10 p-1.5 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200" aria-label={`Copiar ${contact.label}`}><Copy size={12} /></button>
                  )}
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">Contatos públicos coletados durante a descoberta/enriquecimento. Abordagem manual: o sistema não envia mensagens.</p>
        </div>

        {/* Alterar status */}
        <div className="mt-4 rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><TrendingUp size={12} /> Status da oportunidade</p>
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${opportunityStatusBadge[opportunity.status as OpportunityStatus] || ""}`}>{opportunity.status}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={opportunity.status}
              onChange={(e) => onStatusChange(e.target.value as OpportunityStatus)}
              disabled={statusSaving}
              className="input-admin flex-1 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {OPPORTUNITY_STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
            {statusSaving && <LoaderCircle size={15} className="animate-spin text-[var(--accent)]" />}
          </div>
        </div>

        {/* Registrar contato */}
        <div className="mt-4 rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><Plus size={12} /> Registrar contato</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Canal</label>
              <select value={form.channel} onChange={(e) => onFormChange({ channel: e.target.value })} className="input-admin mt-1.5 py-2 text-sm">
                {INTERACTION_CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Resultado</label>
              <input
                value={form.result}
                onChange={(e) => onFormChange({ result: e.target.value })}
                list="interaction-results"
                placeholder="Ex: Respondeu, Solicitou orçamento..."
                className="input-admin mt-1.5 py-2 text-sm"
              />
              <datalist id="interaction-results">
                {INTERACTION_RESULT_SUGGESTIONS.map((suggestion) => <option key={suggestion} value={suggestion} />)}
              </datalist>
            </div>
            <div className="md:col-span-2">
              <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Observação</label>
              <textarea value={form.note} onChange={(e) => onFormChange({ note: e.target.value })} placeholder="Ex: Solicitou orçamento para transfer aeroporto." className="input-admin mt-1.5 min-h-16 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Data e hora</label>
              <input type="datetime-local" value={form.occurredAt} onChange={(e) => onFormChange({ occurredAt: e.target.value })} className="input-admin mt-1.5 py-2 text-sm" />
            </div>
          </div>
          <button type="button" onClick={onRegisterInteraction} disabled={interactionSaving} className="mt-3 w-full cursor-pointer rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-5 py-2.5 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto">
            {interactionSaving ? <LoaderCircle size={13} className="mr-1.5 inline animate-spin" /> : <Plus size={13} className="mr-1.5 inline" />} Registrar interação
          </button>
        </div>

        {/* Histórico */}
        <div className="mt-4 rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><Calendar size={12} /> Histórico</p>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-[var(--bg-card)] px-3 py-2">
              <span className="mt-0.5 text-[10px] font-bold text-zinc-600">{formatDateBR(opportunity.createdAt)}</span>
              <p className="text-xs font-bold text-zinc-300">Oportunidade criada</p>
            </div>
            {loadingInteractions && (
              <div className="flex items-center gap-2 px-2 py-1.5"><LoaderCircle size={13} className="animate-spin text-[var(--accent)]" /><p className="text-xs text-zinc-500">Carregando histórico...</p></div>
            )}
            {!loadingInteractions && interactions?.map((interaction) => (
              <div key={interaction.id} className="flex items-start gap-2 rounded-lg border border-white/5 bg-[var(--bg-card)] px-3 py-2">
                <span className="mt-0.5 shrink-0 text-[10px] font-bold text-zinc-600">{formatDateBR(interaction.occurredAt)}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-200">{interaction.channel} <span className="text-[var(--accent)]">· {interaction.result}</span></p>
                  {interaction.note && <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">{interaction.note}</p>}
                </div>
              </div>
            ))}
            {!loadingInteractions && interactions?.length === 0 && (
              <p className="px-2 py-1 text-xs text-zinc-500">Nenhuma interação registrada ainda.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredCampaigns = campaigns.filter((c) =>
    `${c.name} ${c.location} ${c.segments.join(" ")}`.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCompanies = companies.filter((company) =>
    `${company.name} ${company.segment} ${company.city} ${company.state} ${company.website}`.toLowerCase().includes(companyQuery.toLowerCase())
  ).filter((company) => {
    if (!campaignFilter) return true;
    return discoveries.some((d) => d.companyId === company.id && d.campaignId === campaignFilter);
  });

  const orderedCompanies = useMemo(() => {
    const rows = [...filteredCompanies];
    const withIntel: ProspectCompany[] = [];
    const withoutIntel: ProspectCompany[] = [];
    for (const company of rows) {
      (intelligence[company.id] ? withIntel : withoutIntel).push(company);
    }
    if (sortMode === "prioridade") {
      withIntel.sort((a, b) =>
        intelligence[a.id].priority - intelligence[b.id].priority ||
        intelligence[b.id].scoreSnapshot - intelligence[a.id].scoreSnapshot ||
        a.name.localeCompare(b.name)
      );
    } else if (sortMode === "score") {
      withIntel.sort((a, b) => intelligence[b.id].scoreSnapshot - intelligence[a.id].scoreSnapshot);
    } else if (sortMode === "potencial") {
      const order: Record<string, number> = { "Muito alto": 0, Alto: 1, Médio: 2, Baixo: 3, "Muito baixo": 4 };
      withIntel.sort((a, b) =>
        (order[intelligence[a.id].potentialSnapshot] ?? 9) - (order[intelligence[b.id].potentialSnapshot] ?? 9) ||
        intelligence[b.id].scoreSnapshot - intelligence[a.id].scoreSnapshot
      );
    } else {
      const order: Record<string, number> = { Alta: 0, Média: 1, Baixa: 2 };
      withIntel.sort((a, b) =>
        (order[intelligence[a.id].confidenceSnapshot] ?? 9) - (order[intelligence[b.id].confidenceSnapshot] ?? 9) ||
        intelligence[b.id].scoreSnapshot - intelligence[a.id].scoreSnapshot
      );
    }
    withoutIntel.sort((a, b) => a.name.localeCompare(b.name));
    return [...withIntel, ...withoutIntel];
  }, [filteredCompanies, intelligence, sortMode]);

  const feedbackStyle: Record<NonNullable<Feedback>["kind"], string> = {
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    info: "border-[var(--accent-25)] bg-[var(--accent-12)] text-[var(--accent)]",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    error: "border-red-500/30 bg-red-500/10 text-red-300",
  };

  const filteredOpportunities = opportunities.filter((opp) => {
    const nameMatch = `${opp.companyName} ${opp.companySegment} ${opp.companyCity}`.toLowerCase().includes(opQuery.toLowerCase());
    if (!nameMatch) return false;
    if (opStatusFilter && opp.status !== opStatusFilter) return false;
    if (opPriorityFilter && String(opp.priority) !== opPriorityFilter) return false;
    if (opPotentialFilter && opp.potential !== opPotentialFilter) return false;
    if (opCampaignFilter && opportunityCampaignName(opp.companyId) !== opCampaignFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Hero — o que é o Auto Prospect */}
      <div className="overflow-hidden rounded-2xl border border-[var(--accent-15)] bg-gradient-to-br from-[var(--bg-card)] via-[var(--bg-card)] to-[var(--accent-12)] p-5 md:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] text-white md:h-14 md:w-14">
            <Radar size={22} className="md:size-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--accent)]">Novo mecanismo da Central</p>
            <h2 className="text-xl font-black tracking-tight md:text-2xl">Auto Prospect — prospector digital da AME</h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400 md:text-base">
          O Auto Prospect encontra automaticamente novas oportunidades comerciais: você define a campanha
          e o sistema pesquisa, coleta, organiza e prepara a prospecção. Diferente da aba{" "}
          <span className="font-bold text-zinc-200">Prospecção</span> (contatos já conhecidos ou adicionados
          manualmente), aqui o objetivo é <span className="font-bold text-zinc-200">descobrir</span> empresas
          que ainda não conhecemos.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          {flowSteps.map((step, index) => (
            <span key={step} className="flex items-center gap-1.5">
              <span className="rounded-lg border border-[var(--accent-20)] bg-[var(--bg-surface)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 md:text-[11px]">
                {step}
              </span>
              {index < flowSteps.length - 1 && <span className="text-[var(--accent)]">→</span>}
            </span>
          ))}
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-[var(--accent-12)] bg-[var(--bg-surface)]/60 px-4 py-3">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
          <p className="text-xs leading-relaxed text-zinc-500">
            LGPD e boas práticas desde o início: apenas informações comerciais públicas, sem coleta invasiva
            de dados pessoais, sem burlar CAPTCHA, bloqueios ou rate limits. Nenhum disparo automático de
            mensagens — <span className="text-zinc-300">você decide o que será enviado</span>.
          </p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {[
          { icon: Layers, label: "Campanhas", value: campaigns.length },
          { icon: Flame, label: "Ativas", value: activeCampaigns },
          { icon: Building2, label: "Empresas na base", value: companies.length },
          { icon: Radar, label: "Descobertas", value: discoveries.length },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-4 md:p-5">
            <metric.icon size={18} className="text-[var(--accent)]" />
            <p className="mt-2 text-2xl font-black tracking-tight md:text-3xl">{metric.value}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 md:text-[11px]">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div className="flex gap-2">
        {([
          { id: "campanhas", label: "Campanhas", icon: Target },
          { id: "empresas", label: "Base de empresas", icon: Database },
          { id: "oportunidades", label: "Oportunidades", icon: Handshake },
          { id: "lote", label: "Lote", icon: Layers },
        ] as const).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                tab === t.id
                  ? "bg-[var(--secondary)] text-white shadow-sm"
                  : "border border-white/8 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">
                {t.id === "campanhas" ? "Campanhas" : t.id === "empresas" ? "Empresas" : t.id === "oportunidades" ? "Oport." : "Lote"}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "campanhas" ? (
        <>
          {/* Nova campanha */}
          <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 md:p-6">
            <h3 className="text-lg font-black md:text-xl">Nova campanha</h3>
            <p className="mt-1 text-sm text-zinc-500">Defina o perfil de cliente que o Auto Prospect deve encontrar.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Nome da campanha</label>
                <input value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} placeholder="Ex: Empresas BH — Transporte Executivo" className="input-admin mt-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Localização</label>
                <input value={campaignForm.location} onChange={(e) => setCampaignForm({ ...campaignForm, location: e.target.value })} placeholder="Ex: Belo Horizonte / Grande BH" className="input-admin mt-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Palavra-chave (busca)</label>
                <input value={campaignForm.keyword} onChange={(e) => setCampaignForm({ ...campaignForm, keyword: e.target.value })} placeholder="Ex: buffet, transporte executivo..." className="input-admin mt-2" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Segmentos</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {segmentOptions.map((segment) => (
                    <button
                      key={segment}
                      type="button"
                      onClick={() => toggleSegment(segment)}
                      className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        campaignForm.segments.includes(segment)
                          ? "border-[var(--accent)] bg-[var(--accent-15)] text-[var(--accent)]"
                          : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                      }`}
                    >
                      {segment}
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <input
                      value={customSegment}
                      onChange={(e) => setCustomSegment(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSegment(); } }}
                      placeholder="Outro segmento..."
                      className="input-admin w-36 px-3 py-1.5 text-xs md:w-44"
                    />
                    <button type="button" onClick={addCustomSegment} className="cursor-pointer rounded-full border border-[var(--accent-25)] p-1.5 text-[var(--accent)] transition hover:bg-[var(--accent-10)]" aria-label="Adicionar segmento">
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                {campaignForm.segments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {campaignForm.segments.map((segment) => (
                      <span key={segment} className="flex items-center gap-1 rounded-lg bg-[var(--accent-12)] px-2 py-1 text-[11px] font-bold text-[var(--accent)]">
                        {segment}
                        <button type="button" onClick={() => toggleSegment(segment)} className="cursor-pointer hover:text-white" aria-label={`Remover ${segment}`}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Objetivo</label>
                <textarea value={campaignForm.objective} onChange={(e) => setCampaignForm({ ...campaignForm, objective: e.target.value })} placeholder="Ex: Encontrar potenciais clientes para transporte executivo e transfers." className="input-admin mt-2 min-h-20" />
              </div>
              <div className="md:col-span-2 md:flex md:items-end md:justify-between md:gap-4">
                <div className="md:w-56">
                  <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Quantidade desejada</label>
                  <input type="number" min={0} value={campaignForm.targetCount || ""} onChange={(e) => setCampaignForm({ ...campaignForm, targetCount: Number(e.target.value) })} placeholder="Ex: 100" className="input-admin mt-2" />
                </div>
                <button onClick={handleAddCampaign} className="mt-4 w-full cursor-pointer rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-6 py-3.5 text-sm font-bold text-white transition hover:opacity-90 md:mt-0 md:w-auto">
                  <Plus size={16} className="inline" /> Criar campanha
                </button>
              </div>
            </div>
          </div>

          {/* Lista de campanhas */}
          <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-black md:text-xl">Campanhas</h3>
              <div className="relative w-full md:w-64">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar campanha..." className="input-admin w-full py-2 pl-9 text-sm" />
              </div>
            </div>

            {/* Mobile: cards */}
            <div className="space-y-3 md:hidden">
              {filteredCampaigns.map((campaign) => (
                <div key={campaign.id} className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="min-w-0 text-base font-black leading-tight">{campaign.name}</h4>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusBadge[campaign.status]}`}>{campaign.status}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500"><MapPin size={12} className="shrink-0" /> {campaign.location || "Localização não informada"}</p>
                  {campaign.segments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {campaign.segments.map((segment) => (
                        <span key={segment} className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-400">{segment}</span>
                      ))}
                    </div>
                  )}
                  {campaign.objective && <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{campaign.objective}</p>}
                  <div className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1"><Radar size={12} className="text-[var(--accent)]" /> {discoveryCount(campaign.id)} descobertas</span>
                    <span className="flex items-center gap-1"><Target size={12} /> meta {campaign.targetCount || "—"}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> {campaign.createdAt.slice(0, 10)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button type="button" onClick={() => quickAddCompany(campaign.id)} className="flex-1 cursor-pointer rounded-xl bg-[var(--accent-12)] px-3 py-2.5 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-20)]">
                      <Plus size={14} className="inline" /> Adicionar empresa
                    </button>
                    <button type="button" onClick={() => runSearch(campaign.id)} disabled={discoveryStates[campaign.id]?.status === "running"} className="cursor-pointer rounded-xl border border-[var(--accent-25)] px-3 py-2 text-[var(--accent)] transition hover:bg-[var(--accent-10)] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Pesquisar empresas automaticamente" title="Pesquisar empresas automaticamente">
                      {discoveryStates[campaign.id]?.status === "running" ? <LoaderCircle size={14} className="animate-spin" /> : <Search size={14} />}
                    </button>
                    <button type="button" onClick={() => handleDeleteCampaign(campaign)} className="cursor-pointer rounded-xl border border-red-500/25 px-3 py-2 text-red-400 transition hover:bg-red-500/10" aria-label="Remover campanha"><Trash2 size={14} /></button>
                  </div>
                  <select
                    value={campaign.status}
                    onChange={(e) => onUpdateCampaign(campaign.id, { status: e.target.value as AutoProspectCampaignStatus })}
                    className="input-admin mt-2 py-2 text-xs"
                  >
                    {campaignStatuses.map((status) => <option key={status}>{status}</option>)}
                  </select>
                  {discoveryStates[campaign.id] && (
                    <div className="mt-3">
                      <DiscoverySummary state={discoveryStates[campaign.id]} />
                    </div>
                  )}
                </div>
              ))}
              {!filteredCampaigns.length && (
                <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
                  <Radar size={28} className="mx-auto text-zinc-600" />
                  <p className="mt-3 text-sm font-bold text-zinc-400">Nenhuma campanha ainda</p>
                  <p className="mt-1 text-xs text-zinc-500">Crie a primeira campanha para começar a prospectar automaticamente.</p>
                </div>
              )}
            </div>

            {/* Desktop: tabela */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    <th className="pb-3 pr-4">Campanha</th>
                    <th className="pb-3 pr-4">Localização</th>
                    <th className="pb-3 pr-4">Segmentos</th>
                    <th className="pb-3 pr-4 text-center">Descobertas</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-white/5 align-middle">
                      <td className="py-3.5 pr-4">
                        <p className="font-bold">{campaign.name}</p>
                        <p className="mt-0.5 max-w-xs truncate text-xs text-zinc-500">{campaign.objective || "Sem objetivo definido"}</p>
                      </td>
                      <td className="py-3.5 pr-4 text-zinc-400">{campaign.location || "—"}</td>
                      <td className="py-3.5 pr-4">
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {campaign.segments.map((segment) => (
                            <span key={segment} className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-400">{segment}</span>
                          ))}
                          {!campaign.segments.length && <span className="text-zinc-600">—</span>}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <span className="text-lg font-black text-[var(--accent)]">{discoveryCount(campaign.id)}</span>
                        <span className="block text-[10px] text-zinc-500">meta {campaign.targetCount || "—"}</span>
                      </td>
                      <td className="py-3.5 pr-4">
                        <select
                          value={campaign.status}
                          onChange={(e) => onUpdateCampaign(campaign.id, { status: e.target.value as AutoProspectCampaignStatus })}
                          className={`rounded-lg border bg-transparent px-2 py-1 text-xs font-bold ${statusBadge[campaign.status].split(" ").slice(0, 2).join(" ")}`}
                        >
                          {campaignStatuses.map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => quickAddCompany(campaign.id)} className="cursor-pointer rounded-lg border border-[var(--accent-25)] px-2.5 py-1.5 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">
                            <Plus size={13} className="inline" /> Empresa
                          </button>
                          <button type="button" onClick={() => runSearch(campaign.id)} disabled={discoveryStates[campaign.id]?.status === "running"} className="cursor-pointer rounded-lg border border-[var(--accent-25)] px-2.5 py-1.5 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)] disabled:cursor-not-allowed disabled:opacity-50" title="Pesquisar empresas automaticamente">
                            {discoveryStates[campaign.id]?.status === "running" ? <LoaderCircle size={13} className="animate-spin" /> : <Search size={13} className="inline" />} Pesquisar
                          </button>
                          <button type="button" onClick={() => handleDeleteCampaign(campaign)} className="cursor-pointer rounded-lg border border-red-500/25 px-2.5 py-1.5 text-red-400 transition hover:bg-red-500/10" aria-label="Remover campanha"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredCampaigns.length && (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-zinc-500">Nenhuma campanha encontrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Desktop: resultados das pesquisas */}
            <div className="mt-4 hidden space-y-4 md:block">
              {Object.entries(discoveryStates).map(([campaignId, state]) => (
                <div key={campaignId}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Resultados — {campaignName(campaignId)}</p>
                  <DiscoverySummary state={state} />
                </div>
              ))}
            </div>

            {/* Visão por campanha — inteligência comercial */}
            <div className="mt-6 border-t border-white/5 pt-5">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]"><Crown size={12} /> Visão por campanha</p>
              <div className="mt-3 space-y-3">
                {filteredCampaigns.map((campaign) => {
                  const summary = campaignSummary(campaign.id);
                  const topRows = rankedOpportunities.filter((row) => summary.ids.includes(row.company.id)).slice(0, 3);
                  return (
                    <div key={campaign.id} className="rounded-xl border border-white/8 bg-[var(--bg-surface)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black">{campaign.name}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold text-zinc-300">Encontradas: {summary.found}</span>
                          <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">Novas: {summary.newCount}</span>
                          <span className="rounded-lg bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold text-sky-300">Enriquecidas: {summary.enriched}</span>
                          <span className="rounded-lg bg-[var(--accent-12)] px-2.5 py-1 text-[10px] font-bold text-[var(--accent)]">Qualificadas: {summary.qualified}</span>
                          <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">Alto potencial: {summary.alto}</span>
                          <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-300">Médio: {summary.medio}</span>
                          <span className="rounded-lg bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-300">Baixo: {summary.baixo}</span>
                        </div>
                      </div>
                      {topRows.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {topRows.map((row, index) => (
                            <button
                              key={row.company.id}
                              type="button"
                              onClick={() => openCompanyAnalysis(row.company.id)}
                              className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-white/5 bg-[var(--bg-card)] px-3 py-2 text-left transition hover:border-[var(--accent-25)]"
                            >
                              <span className="text-xs font-black text-zinc-600">#{index + 1}</span>
                              <span className="min-w-0 flex-1 truncate text-xs font-bold">{row.company.name}</span>
                              <span className="text-xs font-black text-[var(--accent)]">{row.intel.scoreSnapshot}/100</span>
                              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${priorityBadge[row.intel.priority] || ""}`}>{row.intel.nextAction}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredCampaigns.length === 0 && (
                  <p className="text-xs text-zinc-500">Nenhuma campanha ainda.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : tab === "oportunidades" ? (
        <>
          {/* Oportunidades comerciais (Etapa 6) */}
          <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] text-white"><Handshake size={18} /></div>
              <div className="min-w-0">
                <h3 className="text-lg font-black md:text-xl">Oportunidades comerciais</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-zinc-500">
                  Empresas qualificadas transformadas em oportunidades que você pode trabalhar e acompanhar:
                  prioridade, contatos, serviço sugerido, status e histórico.
                  <span className="mt-0.5 block text-xs text-zinc-500"><span className="font-bold text-[var(--accent)]">Abordagem manual</span> — o sistema organiza e registra; nenhuma mensagem é enviada automaticamente.</span>
                </p>
              </div>
            </div>
          </div>

          {oppFeedback && (
            <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 ${feedbackStyle[oppFeedback.kind]}`}>
              {oppFeedback.kind === "success" ? <CircleCheck size={15} className="mt-0.5 shrink-0" />
                : oppFeedback.kind === "warn" ? <CircleAlert size={15} className="mt-0.5 shrink-0" />
                : <Info size={15} className="mt-0.5 shrink-0" />}
              <p className="text-xs leading-relaxed">{oppFeedback.text}</p>
            </div>
          )}

          {/* Filtros */}
          <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input value={opQuery} onChange={(e) => setOpQuery(e.target.value)} placeholder="Buscar empresa, segmento, cidade..." className="input-admin w-full py-2 pl-9 text-sm" />
              </div>
              <select value={opStatusFilter} onChange={(e) => setOpStatusFilter(e.target.value)} className="input-admin py-2 text-xs" aria-label="Filtrar por status">
                <option value="">Todos os status</option>
                {OPPORTUNITY_STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select value={opPriorityFilter} onChange={(e) => setOpPriorityFilter(e.target.value)} className="input-admin py-2 text-xs" aria-label="Filtrar por prioridade">
                <option value="">Todas as prioridades</option>
                {[1, 2, 3, 4].map((priority) => <option key={priority} value={priority}>{priority} — {PRIORITY_LABEL[priority as 1 | 2 | 3 | 4]}</option>)}
              </select>
              <select value={opPotentialFilter} onChange={(e) => setOpPotentialFilter(e.target.value)} className="input-admin py-2 text-xs" aria-label="Filtrar por potencial">
                <option value="">Todo potencial</option>
                {["Muito alto", "Alto", "Médio", "Baixo", "Muito baixo"].map((potential) => <option key={potential}>{potential}</option>)}
              </select>
              <select value={opCampaignFilter} onChange={(e) => setOpCampaignFilter(e.target.value)} className="input-admin py-2 text-xs" aria-label="Filtrar por campanha">
                <option value="">Todas as campanhas</option>
                {campaigns.map((campaign) => <option key={campaign.id} value={campaign.name}>{campaign.name}</option>)}
              </select>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">{filteredOpportunities.length} de {opportunities.length} oportunidade(s)</p>
          </div>

          {filteredOpportunities.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 p-6 text-center md:p-8">
              <Handshake size={28} className="mx-auto text-zinc-600" />
              <p className="mt-3 text-sm font-bold text-zinc-400">
                {opportunities.length === 0 ? "Ainda não há oportunidades" : "Nenhuma oportunidade encontrada"}
              </p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-500">
                Crie uma oportunidade a partir de uma empresa já qualificada: abra a análise da empresa na aba
                <span className="font-bold text-zinc-300"> Base de empresas</span> e toque em
                <span className="font-bold text-[var(--accent)]"> Criar oportunidade comercial</span>.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="space-y-3 md:hidden">
                {filteredOpportunities.map((opp) => (
                  <button
                    key={opp.id}
                    type="button"
                    onClick={() => openOpportunity(opp.id)}
                    className="w-full cursor-pointer rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-4 text-left transition hover:border-[var(--accent-25)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="min-w-0 text-base font-black leading-tight">{opp.companyName}</h4>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black ${priorityBadge[opp.priority] || ""}`}>
                        {PRIORITY_EMOJI[opp.priority as 1 | 2 | 3 | 4]} P{opp.priority}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {[opp.companySegment, [opp.companyCity, opp.companyState].filter(Boolean).join(" - ")].filter(Boolean).join(" · ") || "Sem informações"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${opportunityStatusBadge[opp.status as OpportunityStatus] || ""}`}>{opp.status}</span>
                      <span className="rounded-lg bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-300">{opp.score}/100 · {opp.potential}</span>
                      <span className="rounded-lg bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-500">{opportunityCampaignName(opp.companyId)}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Desktop: tabela densa */}
              <div className="hidden overflow-x-auto rounded-xl border border-white/8 bg-[var(--bg-card)] md:block">
                <table className="w-full min-w-[760px] text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                      <th className="px-4 py-3">Empresa</th>
                      <th className="px-4 py-3">Prioridade</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Potencial</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Campanha</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpportunities.map((opp) => (
                      <tr key={opp.id} className="border-b border-white/[0.04] transition hover:bg-[var(--accent-10)]">
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold text-zinc-200">{opp.companyName}</p>
                          <p className="mt-0.5 text-[11px] text-zinc-500">{opp.companySegment} · {[opp.companyCity, opp.companyState].filter(Boolean).join(" - ") || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${priorityBadge[opp.priority] || ""}`}>
                            {PRIORITY_EMOJI[opp.priority as 1 | 2 | 3 | 4]} {PRIORITY_LABEL[opp.priority as 1 | 2 | 3 | 4]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-black text-[var(--accent)]">{opp.score}/100</td>
                        <td className="px-4 py-3 text-xs font-bold text-zinc-300">{opp.potential}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${opportunityStatusBadge[opp.status as OpportunityStatus] || ""}`}>{opp.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{opportunityCampaignName(opp.companyId)}</td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => openOpportunity(opp.id)} className="cursor-pointer rounded-lg border border-[var(--accent-25)] px-2.5 py-1.5 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">Abrir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Painel da oportunidade selecionada */}
          {selectedOpportunityId && (() => {
            const selected = opportunities.find((o) => o.id === selectedOpportunityId);
            if (!selected) return null;
            return (
              <OpportunityPanel
                opportunity={selected}
                interactions={interactions[selected.id]}
                loadingInteractions={!!interactionsLoading[selected.id]}
                statusSaving={!!statusSaving[selected.id]}
                interactionSaving={interactionSaving}
                form={interactionForm}
                onFormChange={(patch) => setInteractionForm((current) => ({ ...current, ...patch }))}
                onStatusChange={(status) => handleChangeStatus(selected, status)}
                onRegisterInteraction={() => handleRegisterInteraction(selected.id)}
                onClose={() => setSelectedOpportunityId(null)}
              />
            );
          })()}
        </>
      ) : tab === "lote" ? (
        <>
          {/* Processamento em lote (Etapa 7) */}
          <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] text-white"><Layers size={18} /></div>
              <div className="min-w-0">
                <h3 className="text-lg font-black md:text-xl">Processamento em lote</h3>
                <p className="mt-0.5 text-sm leading-relaxed text-zinc-500">
                  Analise automaticamente as empresas de uma campanha pelo mesmo pipeline
                  (enriquecimento → qualificação → inteligência). O lote roda sozinho em blocos,
                  com progresso, pausa, retomada e retry — e{" "}
                  <span className="font-bold text-[var(--accent)]">não cria oportunidades</span>:
                  você decide o que vira oportunidade.
                </p>
              </div>
            </div>
          </div>

          {batchFeedback && (
            <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 ${feedbackStyle[batchFeedback.kind]}`}>
              {batchFeedback.kind === "success" ? <CircleCheck size={15} className="mt-0.5 shrink-0" />
                : batchFeedback.kind === "warn" ? <CircleAlert size={15} className="mt-0.5 shrink-0" />
                : <Info size={15} className="mt-0.5 shrink-0" />}
              <p className="text-xs leading-relaxed">{batchFeedback.text}</p>
            </div>
          )}

          {/* Iniciar lote */}
          <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 md:p-6">
            <h3 className="text-base font-black md:text-lg">Iniciar novo lote</h3>
            <p className="mt-1 text-xs text-zinc-500">A fila é persistida: você pode fechar a tela e retomar depois.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 md:items-end lg:grid-cols-[1fr_auto_auto_auto]">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Campanha</label>
                <select value={batchCampaignId} onChange={(e) => setBatchCampaignId(e.target.value)} className="input-admin mt-1.5" aria-label="Campanha do lote">
                  <option value="">Selecione a campanha...</option>
                  {campaigns.filter((c) => campaignCompanyIds(c.id).length > 0).map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name} ({campaignCompanyIds(campaign.id).length} {campaignCompanyIds(campaign.id).length === 1 ? "empresa" : "empresas"})
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-xs font-bold text-zinc-400 md:self-end">
                <input type="checkbox" checked={batchNoIntel} onChange={(e) => setBatchNoIntel(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                Só empresas sem inteligência
              </label>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Limite</label>
                <input type="number" min={1} max={500} value={batchLimite} onChange={(e) => setBatchLimite(e.target.value)} placeholder="500" className="input-admin mt-1.5 w-28" />
              </div>
              <button
                type="button"
                disabled={!batchCampaignId || batchCreating || !!activeBatchRun}
                onClick={async () => {
                  setBatchCreating(true);
                  setBatchFeedback(null);
                  try {
                    const run = await onCreateBatch(batchCampaignId, {
                      apenasSemInteligencia: batchNoIntel,
                      limiteMaximo: batchLimite ? Number(batchLimite) : undefined,
                    });
                    setBatchFeedback({
                      kind: "success",
                      text: `Lote criado com ${run.counters.total} empresa(s). O processamento começa automaticamente.`,
                    });
                    onProcessBatch(run.id).catch((error) => {
                      setBatchFeedback({
                        kind: "error",
                        text: error instanceof Error ? error.message : "Processamento não concluído.",
                      });
                    });
                  } catch (error) {
                    setBatchFeedback({ kind: "error", text: error instanceof Error ? error.message : "Lote não criado." });
                  } finally {
                    setBatchCreating(false);
                  }
                }}
                className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
              >
                {batchCreating ? <LoaderCircle size={15} className="inline animate-spin" /> : <Rocket size={15} className="inline" />} Iniciar lote
              </button>
            </div>
            {activeBatchRun && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-400">
                <Info size={13} />
                Já existe um processamento em andamento para esta campanha ({activeBatchRun.campaignName}).
                Só é permitido 1 lote ativo por campanha.
              </p>
            )}
          </div>

          {/* Painel do lote em exibição */}
          {batchDetail && (() => {
            const run = batchDetail.run;
            const counters = run.counters;
            const progress = batchProgress(counters);
            const startedAt = run.startedAt ? new Date(run.startedAt).getTime() : new Date(run.createdAt).getTime();
            const endAt = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
            const elapsedSeconds = Math.max(0, (endAt - startedAt) / 1000);
            const etaSeconds = estimateBatchEtaSeconds(counters, Math.max(1, elapsedSeconds) * 1000);
            const active = run.status === "pendente" || run.status === "processando";
            const paused = run.status === "pausado";
            const canCancel = active || paused;
            const canRetry = run.status === "concluido" && counters.failed > 0;
            const priorityEntries = Object.entries(batchDetail.priorityCounts).filter(([, count]) => count > 0);
            const aiEntries = Object.entries(batchDetail.aiStatusCounts).filter(([, count]) => count > 0);
            const aiLabel: Record<string, string> = {
              deterministico: "Determinístico",
              ia: "IA",
              ia_falha: "IA → determinístico",
            };
            return (
              <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{run.campaignName}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-500">Criado em {formatBatchDate(run.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {batchPolling && active && <LoaderCircle size={13} className="animate-spin text-sky-400" aria-label="Acompanhando o processamento" />}
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${batchRunStatusBadge[run.status] || ""}`}>
                      {batchRunStatusLabel[run.status] || run.status}
                    </span>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="mt-4">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{progress}% processado</span>
                    <span className="flex items-center gap-1">
                      <Timer size={11} /> {formatBatchDuration(elapsedSeconds)}
                      {active && etaSeconds !== null && etaSeconds > 0 && (
                        <span className="text-zinc-600">· ~{formatBatchDuration(etaSeconds)} restantes</span>
                      )}
                    </span>
                  </p>
                </div>

                {/* Contadores */}
                <div className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-7">
                  {[
                    { label: "Total", value: counters.total, color: "text-zinc-200" },
                    { label: "Pendentes", value: counters.pending, color: "text-zinc-400" },
                    { label: "Processando", value: counters.processing, color: "text-sky-300" },
                    { label: "Concluídas", value: counters.completed, color: "text-emerald-300" },
                    { label: "Falhas", value: counters.failed, color: "text-red-300" },
                    { label: "Sem dados", value: counters.withoutData, color: "text-amber-300" },
                    { label: "Canceladas", value: counters.cancelled, color: "text-zinc-500" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-white/[0.04] px-2 py-2 text-center">
                      <p className={`text-base font-black md:text-lg ${item.color}`}>{item.value}</p>
                      <p className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 md:text-[9px]">{item.label}</p>
                    </div>
                  ))}
                </div>

                {/* Prioridades 1-4 e uso de IA */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {priorityEntries.length > 0 && (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Prioridades:</span>
                      {([1, 2, 3, 4] as const).map((priority) => {
                        const count = batchDetail.priorityCounts[String(priority)] || 0;
                        if (count === 0) return null;
                        return (
                          <span key={priority} className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${priorityBadge[priority] || ""}`}>
                            {PRIORITY_EMOJI[priority]} P{priority} · {count}
                          </span>
                        );
                      })}
                    </>
                  )}
                  {aiEntries.length > 0 && (
                    <>
                      <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">IA:</span>
                      {aiEntries.map(([key, count]) => (
                        <span key={key} className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-400">
                          {aiLabel[key] || key}: {count}
                        </span>
                      ))}
                    </>
                  )}
                </div>

                {/* Controles */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {active && (
                    <button
                      type="button"
                      disabled={batchActionBusy}
                      onClick={async () => {
                        setBatchActionBusy(true);
                        setBatchFeedback(null);
                        try {
                          await onPauseBatch(run.id);
                          setBatchFeedback({ kind: "info", text: "Lote pausado. As empresas em processamento terminam; novas não são iniciadas." });
                        } catch (error) {
                          setBatchFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível pausar." });
                        } finally {
                          setBatchActionBusy(false);
                        }
                      }}
                      className="cursor-pointer rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pause size={13} className="inline" /> Pausar
                    </button>
                  )}
                  {paused && (
                    <button
                      type="button"
                      disabled={batchActionBusy}
                      onClick={async () => {
                        setBatchActionBusy(true);
                        setBatchFeedback(null);
                        try {
                          await onResumeBatch(run.id);
                          setBatchFeedback({ kind: "success", text: "Lote retomado. O processamento continua automaticamente." });
                        } catch (error) {
                          setBatchFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível retomar." });
                        } finally {
                          setBatchActionBusy(false);
                        }
                      }}
                      className="cursor-pointer rounded-lg border border-emerald-500/30 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Play size={13} className="inline" /> Retomar
                    </button>
                  )}
                  {active && (
                    <button
                      type="button"
                      disabled={batchActionBusy || batchProcessBusy.current}
                      onClick={() => {
                        onProcessBatch(run.id).catch((error) => {
                          setBatchFeedback({
                            kind: "error",
                            text: error instanceof Error ? error.message : "Processamento não concluído.",
                          });
                        });
                      }}
                      className="cursor-pointer rounded-lg border border-[var(--accent-25)] px-3 py-2 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Play size={13} className="inline" /> Processar agora
                    </button>
                  )}
                  {canCancel && (
                    <button
                      type="button"
                      disabled={batchActionBusy}
                      onClick={async () => {
                        if (!confirm("Cancelar este lote? As empresas pendentes serão marcadas como canceladas. Análises já concluídas são preservadas.")) return;
                        setBatchActionBusy(true);
                        setBatchFeedback(null);
                        try {
                          await onCancelBatch(run.id);
                          setBatchFeedback({ kind: "warn", text: "Lote cancelado. Pendentes foram marcadas como canceladas; o histórico de análises foi preservado." });
                        } catch (error) {
                          setBatchFeedback({ kind: "error", text: error instanceof Error ? error.message : "Não foi possível cancelar." });
                        } finally {
                          setBatchActionBusy(false);
                        }
                      }}
                      className="cursor-pointer rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Square size={13} className="inline" /> Cancelar
                    </button>
                  )}
                  {canRetry && (
                    <button
                      type="button"
                      disabled={batchActionBusy}
                      onClick={async () => {
                        setBatchActionBusy(true);
                        setBatchFeedback(null);
                        try {
                          await onRetryBatchFailures(run.id);
                          setBatchFeedback({ kind: "success", text: `Novo lote criado para reprocessar as ${counters.failed} empresa(s) com falha.` });
                        } catch (error) {
                          setBatchFeedback({ kind: "error", text: error instanceof Error ? error.message : "Falhas não reenfileiradas." });
                        } finally {
                          setBatchActionBusy(false);
                        }
                      }}
                      className="cursor-pointer rounded-lg border border-sky-500/30 px-3 py-2 text-xs font-bold text-sky-300 transition hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw size={13} className="inline" /> Reprocessar falhas ({counters.failed})
                    </button>
                  )}
                </div>

                {/* Resumo final */}
                {run.status === "concluido" && (
                  <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-xs leading-relaxed text-emerald-200">
                    Run concluído — {counters.completed} concluída(s), {counters.withoutData} sem dados, {counters.failed} falha(s)
                    {counters.failed > 0 && " (use \"Reprocessar falhas\" acima)"}, {counters.cancelled} cancelada(s).
                    Nenhuma oportunidade foi criada automaticamente.
                  </div>
                )}

                {/* Feed dos últimos itens */}
                <div className="mt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Últimas empresas ({batchDetail.items.length})</p>
                  <div className="mt-2 space-y-1.5">
                    {batchDetail.items.length === 0 && (
                      <p className="text-xs text-zinc-600">Ainda não há itens processados neste lote.</p>
                    )}
                    {batchDetail.items.map((item) => (
                      <div key={item.companyId} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-zinc-200">{item.companyName}</p>
                          {item.status === "falha" && (
                            <p className="mt-0.5 truncate text-[10px] text-red-300/80" title={item.errorMessage}>
                              {batchErrorCodeLabel[item.errorCode] || item.errorCode || "Falha"} {item.retryCount > 0 ? `· ${item.retryCount} retry` : ""}
                            </p>
                          )}
                          {item.status === "sem_dados" && (
                            <p className="mt-0.5 truncate text-[10px] text-amber-300/80" title={item.errorMessage}>
                              {batchErrorCodeLabel[item.errorCode] || "Sem dados coletáveis"}
                            </p>
                          )}
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${batchCompanyStatusBadge[item.status] || ""}`}>
                          {batchCompanyStatusLabel[item.status] || item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Histórico de lotes */}
          {batchRuns.length > 0 && (
            <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 md:p-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-black md:text-lg">Histórico de lotes</h3>
                <button
                  type="button"
                  onClick={() => onLoadBatchDetail(batchRuns[0].id).catch(() => undefined)}
                  className="cursor-pointer rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
                >
                  <RefreshCw size={11} className="inline" /> Atualizar
                </button>
              </div>
              <div className="space-y-2">
                {batchRuns.slice(0, 10).map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => {
                      setBatchFeedback(null);
                      onLoadBatchDetail(run.id).catch(() => undefined);
                    }}
                    className={`w-full cursor-pointer rounded-xl border px-3.5 py-3 text-left transition hover:bg-[var(--accent-10)] ${
                      batchDetail?.run.id === run.id ? "border-[var(--accent-40)] bg-[var(--accent-10)]" : "border-white/5 bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-xs font-black text-zinc-200">{run.campaignName}</p>
                      <div className="flex items-center gap-1.5">
                        {["pendente", "processando"].includes(run.status) && <LoaderCircle size={11} className="animate-spin text-sky-400" />}
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${batchRunStatusBadge[run.status] || ""}`}>
                          {batchRunStatusLabel[run.status] || run.status}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-500">
                      {formatBatchDate(run.createdAt)} · {run.counters.total} empresas
                      {run.counters.completed > 0 && <span className="text-emerald-400"> · {run.counters.completed} concluídas</span>}
                      {run.counters.failed > 0 && <span className="text-red-400"> · {run.counters.failed} falhas</span>}
                      {run.counters.withoutData > 0 && <span className="text-amber-400"> · {run.counters.withoutData} sem dados</span>}
                      {run.filters.apenasSemInteligencia && <span className="text-zinc-600"> · só sem inteligência</span>}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Entrada assistida de empresa */}
          <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-12)] text-[var(--accent)]"><Building2 size={18} /></div>
              <div className="min-w-0">
                <h3 className="text-lg font-black md:text-xl">Adicionar empresa encontrada</h3>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Entrada assistida — simula uma descoberta feita por uma fonte externa. Origem registrada:{" "}
                  <span className="font-bold text-zinc-300">Manual / Assisted Discovery</span>.
                </p>
              </div>
            </div>

            {companyCampaignId && (
              <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-[var(--accent-25)] bg-[var(--accent-12)] px-4 py-2.5">
                <p className="text-xs font-bold text-[var(--accent)]">
                  Adicionando à campanha: {campaignName(companyCampaignId)}
                </p>
                <button type="button" onClick={() => setCompanyCampaignId("")} className="cursor-pointer rounded-lg border border-[var(--accent-25)] px-2.5 py-1 text-[10px] font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)]">
                  Trocar
                </button>
              </div>
            )}

            {existingHint && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <CircleAlert size={15} className="mt-0.5 shrink-0 text-amber-300" />
                <p className="text-xs leading-relaxed text-amber-200">
                  Esta empresa já está na base ({existingHint.city || "cidade não informada"}).
                  Ao salvar, <span className="font-bold">não será duplicada</span> — apenas uma nova descoberta será registrada na campanha selecionada.
                </p>
              </div>
            )}

            {feedback && (
              <div className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 ${feedbackStyle[feedback.kind]}`}>
                {feedback.kind === "success" ? <CircleCheck size={15} className="mt-0.5 shrink-0" />
                  : feedback.kind === "warn" ? <CircleAlert size={15} className="mt-0.5 shrink-0" />
                  : <Info size={15} className="mt-0.5 shrink-0" />}
                <p className="text-xs leading-relaxed">{feedback.text}</p>
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Nome da empresa *</label>
                <input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} placeholder="Ex: Empresa XPTO LTDA" className="input-admin mt-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Segmento</label>
                <select
                  value={customSegmentMode ? "Outro" : companyForm.segment}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "Outro") {
                      setCustomSegmentMode(true);
                      setCompanyForm((current) => ({ ...current, segment: "" }));
                    } else {
                      setCustomSegmentMode(false);
                      setCompanyForm((current) => ({ ...current, segment: value }));
                    }
                  }}
                  className="input-admin mt-2"
                >
                  <option value="">Selecione...</option>
                  {segmentOptions.map((segment) => <option key={segment}>{segment}</option>)}
                  <option value="Outro">Outro...</option>
                </select>
                {customSegmentMode && (
                  <input
                    value={companyForm.segment}
                    onChange={(e) => setCompanyForm({ ...companyForm, segment: e.target.value })}
                    placeholder="Digite o segmento..."
                    className="input-admin mt-2"
                  />
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Cidade</label>
                <input value={companyForm.city} onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })} placeholder="Ex: Belo Horizonte" className="input-admin mt-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Estado</label>
                <select value={companyForm.state} onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })} className="input-admin mt-2">
                  <option value="">UF...</option>
                  {ufOptions.map((uf) => <option key={uf}>{uf}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 xl:col-span-1">
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Endereço</label>
                <input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} placeholder="Rua, número, bairro" className="input-admin mt-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Site</label>
                <input value={companyForm.website} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} placeholder="https://empresaxpto.com.br" inputMode="url" className="input-admin mt-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Telefone</label>
                <input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} placeholder="(31) 3000-0000" inputMode="tel" className="input-admin mt-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">WhatsApp comercial</label>
                <input value={companyForm.whatsapp} onChange={(e) => setCompanyForm({ ...companyForm, whatsapp: e.target.value })} placeholder="(31) 99999-0000" inputMode="tel" className="input-admin mt-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">E-mail comercial</label>
                <input value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} placeholder="contato@empresaxpto.com.br" inputMode="email" className="input-admin mt-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Instagram</label>
                <input value={companyForm.instagram} onChange={(e) => setCompanyForm({ ...companyForm, instagram: e.target.value })} placeholder="@empresaxpto" className="input-admin mt-2" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">LinkedIn</label>
                <input value={companyForm.linkedin} onChange={(e) => setCompanyForm({ ...companyForm, linkedin: e.target.value })} placeholder="linkedin.com/company/empresaxpto" className="input-admin mt-2" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Observação / contexto da descoberta</label>
                <textarea value={companyForm.notes} onChange={(e) => setCompanyForm({ ...companyForm, notes: e.target.value })} placeholder="Ex: encontrada em lista pública de empresas de eventos de BH; organiza eventos corporativos." className="input-admin mt-2 min-h-16" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent)]">Vincular à campanha</label>
                <select value={companyCampaignId} onChange={(e) => setCompanyCampaignId(e.target.value)} className="input-admin mt-2">
                  <option value="">Sem campanha</option>
                  {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={handleCompanySubmit} disabled={saving} className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-6 py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
                  <Plus size={16} className="inline" /> {saving ? "Salvando..." : "Salvar empresa encontrada"}
                </button>
              </div>
            </div>
          </div>

          {/* Melhores oportunidades — ranking por dados persistidos */}
          {rankedOpportunities.length > 0 && (
            <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 md:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--secondary)] text-white"><Crown size={18} /></div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black md:text-xl">Melhores oportunidades</h3>
                  <p className="mt-0.5 text-sm text-zinc-500">Quem merece atenção primeiro — ordenado por prioridade (dados persistidos, sem executar IA).</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {rankedOpportunities.slice(0, 10).map((row, index) => (
                  <button
                    key={row.company.id}
                    type="button"
                    onClick={() => openCompanyAnalysis(row.company.id)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-[var(--bg-surface)] p-3 text-left transition hover:border-[var(--accent-25)] hover:bg-[var(--accent-10)]"
                  >
                    <span className="w-6 shrink-0 text-center text-sm font-black text-zinc-600">#{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{row.company.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {[row.company.segment, [row.company.city, row.company.state].filter(Boolean).join(" - ")].filter(Boolean).join(" · ") || "Sem informações"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black text-[var(--accent)]">{row.intel.scoreSnapshot}/100</p>
                      <p className={`text-[9px] font-bold uppercase tracking-wider ${potentialBadge[row.intel.potentialSnapshot] || ""}`}>{row.intel.potentialSnapshot}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${priorityBadge[row.intel.priority] || ""}`}>
                      {PRIORITY_EMOJI[row.intel.priority as 1 | 2 | 3 | 4]} {row.intel.nextAction}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Análise da empresa selecionada */}
          {selectedCompanyId && (() => {
            const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
            if (!selectedCompany) return null;
            return (
              <QualificationPanel
                company={selectedCompany}
                analysis={analyses[selectedCompanyId]}
                intel={intelligence[selectedCompanyId]}
                running={!!analyzing[selectedCompanyId]}
                intelRunning={!!intelligenceRunning[selectedCompanyId]}
                error={analysisErrors[selectedCompanyId] || ""}
                opportunity={opportunityFor(selectedCompanyId)}
                opportunityCreating={!!creatingOpportunity[selectedCompanyId]}
                onAnalyze={() => openCompanyAnalysis(selectedCompanyId)}
                onReanalyze={() => reanalyzeOpportunity(selectedCompanyId)}
                onCreateOpportunity={() => handleCreateOpportunity(selectedCompanyId, selectedCompany.name)}
                onClose={() => setSelectedCompanyId(null)}
              />
            );
          })()}

          {/* Lista de empresas */}
          <div className="rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] p-5 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-black md:text-xl">Empresas na base</h3>
              <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
                <select value={campaignFilter} onChange={(e) => setCampaignFilter(e.target.value)} className="input-admin py-2 text-xs" aria-label="Filtrar por campanha">
                  <option value="">Todas as campanhas</option>
                  {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}
                </select>
                <select value={sortMode} onChange={(e) => setSortMode(e.target.value as typeof sortMode)} className="input-admin py-2 text-xs" aria-label="Ordenar por">
                  <option value="prioridade">Ordenar: prioridade</option>
                  <option value="score">Ordenar: score</option>
                  <option value="potencial">Ordenar: potencial</option>
                  <option value="confianca">Ordenar: confiança</option>
                </select>
                <div className="relative w-full md:w-64">
                  <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input value={companyQuery} onChange={(e) => setCompanyQuery(e.target.value)} placeholder="Buscar empresa..." className="input-admin w-full py-2 pl-9 text-sm" />
                </div>
              </div>
            </div>

            {filteredCompanies.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 p-6 text-center md:p-8">
                <Database size={28} className="mx-auto text-zinc-600" />
                <p className="mt-3 text-sm font-bold text-zinc-400">{companies.length === 0 ? "Ainda não há empresas na base" : "Nenhuma empresa encontrada"}</p>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-500">
                  Cada empresa é única na base: se a mesma empresa for encontrada em várias campanhas,
                  apenas novas descobertas são registradas — nunca duplicamos a empresa.
                </p>
                {companies.length === 0 && (
                  <div className="mt-5 grid gap-3 text-left md:grid-cols-2">
                    {roadmap.map((step, index) => (
                      <div key={step.title} className="flex items-start gap-3 rounded-xl border border-white/5 bg-[var(--bg-surface)] p-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-12)] text-[var(--accent)]"><step.icon size={16} /></div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-bold">
                            <span className="text-[10px] font-black text-zinc-600">0{index + 1}</span>
                            {step.title}
                            {index === 0 && <span className="flex items-center gap-1 rounded-full border border-[var(--accent-25)] px-2 py-0.5 text-[9px] font-bold text-[var(--accent)]"><Rocket size={10} /> próxima etapa</span>}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{step.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Mobile: cards */}
                <div className="space-y-3 md:hidden">
                  {orderedCompanies.map((company) => {
                    const companyDiscoveries = discoveries.filter((d) => d.companyId === company.id);
                    return (
                      <div key={company.id} className="rounded-xl border border-[var(--accent-10)] bg-[var(--bg-surface)] p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="min-w-0 text-base font-black leading-tight">{company.name}</h4>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button type="button" onClick={() => openCompanyAnalysis(company.id)} disabled={!!analyzing[company.id]} className="cursor-pointer rounded-lg border border-[var(--accent-25)] px-2 py-1.5 text-[var(--accent)] transition hover:bg-[var(--accent-10)] disabled:cursor-not-allowed disabled:opacity-50" aria-label="Analisar empresa" title="Enriquecer e qualificar">
                              {analyzing[company.id] ? <LoaderCircle size={13} className="animate-spin" /> : <Activity size={13} />}
                            </button>
                            <button type="button" onClick={() => handleDeleteCompany(company)} className="cursor-pointer rounded-lg border border-red-500/25 px-2 py-1.5 text-red-400 transition hover:bg-red-500/10" aria-label="Remover empresa"><Trash2 size={13} /></button>
                          </div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                          {company.segment && <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-400">{company.segment}</span>}
                          {(company.city || company.state) && (
                            <span className="flex items-center gap-1"><MapPin size={12} /> {[company.city, company.state].filter(Boolean).join(" - ")}</span>
                          )}
                          {analyses[company.id] && (
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${potentialBadge[analyses[company.id].qualification.potential] || ""}`}>
                              {analyses[company.id].qualification.score}/100
                            </span>
                          )}
                          {intelligence[company.id] && (
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${priorityBadge[intelligence[company.id].priority] || ""}`}>
                              {PRIORITY_EMOJI[intelligence[company.id].priority as 1 | 2 | 3 | 4]} P{intelligence[company.id].priority}
                            </span>
                          )}
                        </div>
                        {(company.whatsapp || company.phone || company.website || company.email) && (
                          <div className="mt-2 space-y-1 text-xs text-zinc-400">
                            {company.whatsapp && <p className="flex items-center gap-1.5"><Phone size={11} className="text-emerald-400" /> WhatsApp: {company.whatsapp}</p>}
                            {company.phone && <p className="flex items-center gap-1.5"><Phone size={11} /> {company.phone}</p>}
                            {company.website && <p className="flex items-center gap-1.5 truncate"><Globe size={11} className="text-[var(--accent)]" /> {company.website}</p>}
                            {company.email && <p className="flex items-center gap-1.5 truncate"><Mail size={11} /> {company.email}</p>}
                          </div>
                        )}
                        {company.notes && <p className="mt-2 line-clamp-2 text-xs text-zinc-500">{company.notes}</p>}
                        <div className="mt-3 border-t border-white/5 pt-3">
                          <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                            <Radar size={12} className="text-[var(--accent)]" /> {companyDiscoveries.length} {companyDiscoveries.length === 1 ? "descoberta" : "descobertas"}
                            {companyDiscoveries.length > 0 && (
                              <span className="ml-1 flex flex-wrap gap-1">
                                {companyDiscoveries.slice(0, 3).map((discovery) => (
                                  <span key={discovery.id} className="rounded-md bg-[var(--accent-12)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent)]">{campaignName(discovery.campaignId)}</span>
                                ))}
                                {companyDiscoveries.length > 3 && <span className="text-[9px] text-zinc-600">+{companyDiscoveries.length - 3}</span>}
                              </span>
                            )}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-600">
                            <Link2 size={10} /> {company.source || "Origem não informada"} · <Calendar size={10} /> {company.collectedAt.slice(0, 10)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop: tabela */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                        <th className="pb-3 pr-4">Empresa</th>
                        <th className="pb-3 pr-4">Segmento</th>
                        <th className="pb-3 pr-4">Cidade/UF</th>
                        <th className="pb-3 pr-4">Contatos</th>
                        <th className="pb-3 pr-4 text-center">Descobertas</th>
                        <th className="pb-3 pr-4">Campanhas</th>
                        <th className="pb-3 pr-4 text-center">Score</th>
                        <th className="pb-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {orderedCompanies.map((company) => {
                        const companyDiscoveries = discoveries.filter((d) => d.companyId === company.id);
                        return (
                          <tr key={company.id} className="border-b border-white/5 align-middle">
                            <td className="py-3.5 pr-4">
                              <p className="font-bold">{company.name}</p>
                              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-500">
                                <Link2 size={9} /> {company.source || "Origem não informada"} · {company.collectedAt.slice(0, 10)}
                              </p>
                            </td>
                            <td className="py-3.5 pr-4">{company.segment ? <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-400">{company.segment}</span> : <span className="text-zinc-600">—</span>}</td>
                            <td className="py-3.5 pr-4 text-zinc-400">{[company.city, company.state].filter(Boolean).join(" - ") || "—"}</td>
                            <td className="py-3.5 pr-4">
                              <div className="max-w-[220px] space-y-0.5 text-xs text-zinc-400">
                                {company.whatsapp && <p className="flex items-center gap-1.5 truncate"><Phone size={10} className="shrink-0 text-emerald-400" /> {company.whatsapp}</p>}
                                {company.phone && <p className="flex items-center gap-1.5 truncate"><Phone size={10} className="shrink-0" /> {company.phone}</p>}
                                {company.email && <p className="flex items-center gap-1.5 truncate"><Mail size={10} className="shrink-0" /> {company.email}</p>}
                                {company.website && <p className="flex items-center gap-1.5 truncate"><Globe size={10} className="shrink-0 text-[var(--accent)]" /> {company.website}</p>}
                                {!company.whatsapp && !company.phone && !company.email && !company.website && <span className="text-zinc-600">—</span>}
                              </div>
                            </td>
                            <td className="py-3.5 pr-4 text-center">
                              <span className="text-lg font-black text-[var(--accent)]">{companyDiscoveries.length}</span>
                            </td>
                            <td className="py-3.5 pr-4">
                              <div className="flex max-w-[200px] flex-wrap gap-1">
                                {companyDiscoveries.slice(0, 3).map((discovery) => (
                                  <span key={discovery.id} className="rounded-md bg-[var(--accent-12)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent)]">{campaignName(discovery.campaignId)}</span>
                                ))}
                                {companyDiscoveries.length > 3 && <span className="text-[10px] text-zinc-600">+{companyDiscoveries.length - 3}</span>}
                                {!companyDiscoveries.length && <span className="text-zinc-600">—</span>}
                              </div>
                            </td>
                            <td className="py-3.5 pr-4 text-center">
                              {analyses[company.id] ? (
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${potentialBadge[analyses[company.id].qualification.potential] || ""}`}>
                                  {analyses[company.id].qualification.score}/100
                                </span>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                              {intelligence[company.id] && (
                                <span className={`mt-1 block rounded-full border px-2 py-0.5 text-[9px] font-black ${priorityBadge[intelligence[company.id].priority] || ""}`}>
                                  {PRIORITY_EMOJI[intelligence[company.id].priority as 1 | 2 | 3 | 4]} Prioridade {intelligence[company.id].priority} · {intelligence[company.id].nextAction}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5">
                              <div className="flex items-center justify-end gap-2">
                                <button type="button" onClick={() => openCompanyAnalysis(company.id)} disabled={!!analyzing[company.id]} className="cursor-pointer rounded-lg border border-[var(--accent-25)] px-2.5 py-1.5 text-xs font-bold text-[var(--accent)] transition hover:bg-[var(--accent-10)] disabled:cursor-not-allowed disabled:opacity-50" title="Enriquecer e qualificar">
                                  {analyzing[company.id] ? <LoaderCircle size={13} className="inline animate-spin" /> : <Activity size={13} className="inline" />} Analisar
                                </button>
                                <button type="button" onClick={() => handleDeleteCompany(company)} className="cursor-pointer rounded-lg border border-red-500/25 px-2.5 py-1.5 text-red-400 transition hover:bg-red-500/10" aria-label="Remover empresa"><Trash2 size={13} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
