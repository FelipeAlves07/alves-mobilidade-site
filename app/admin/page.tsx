"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3, Bot, Briefcase, CalendarDays, Calculator, ChevronRight, ClipboardList, DollarSign, Download, Gift,
  LogOut, Megaphone, MessageCircle, Mic, Monitor, Radar, Receipt, Sparkles, Users,
} from "lucide-react";
import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import BottomTabBar from "@/components/admin/BottomTabBar";

import type { Lead } from "@/domain/lead/types";
import type { Trip } from "@/domain/trip/types";
import type { Referral } from "@/domain/referral/types";
import type { FinanceEntry } from "@/domain/finance/types";
import type { QuoteResult } from "@/domain/trip/types";
import type { MessageKey } from "@/domain/marketing/types";
import { openWhatsApp } from "@/lib/whatsapp";
import { openGoogleMapsRoute, openWazeRoute } from "@/lib/maps";
import { createRepository } from "@/lib/repository-factory";
import { leadFromSupabase, leadFormToSupabase, leadPatchToSupabase } from "@/lib/repository-mappers";
import { useData } from "@/hooks/useData";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { useQuoteState } from "@/hooks/useQuoteState";
import { uid } from "@/utils/helpers";
import { today, leadTypes, messages, buildQuoteMessage } from "./constants";
import { calculateQuoteValue, buildFinishTripEffects } from "@/modules/viagens/services/viagens.service";
import { parseImportText, completeActionData, sendLeadMessageData, messageKeyForLead } from "@/modules/clientes/services/clientes.service";

import DashboardView from "@/modules/dashboard/components/DashboardView";
import ClientesView from "@/modules/clientes/components/ClientesView";
import WhatsAppView from "@/modules/whatsapp/components/WhatsAppView";
import OrcamentoView from "@/modules/orcamento/components/OrcamentoView";
import AgendaView from "@/modules/agenda/components/AgendaView";
import IndicacoesView from "@/modules/indicacoes/components/IndicacoesView";
import MarketingView from "@/modules/marketing/components/MarketingView";
import FinanceiroView from "@/modules/financeiro/components/FinanceiroView";
import AIView from "@/modules/ai/components/AIView";
import VozView from "@/modules/voz/components/VozView";
import AMEVisionPanel from "@/components/admin/AMEVisionPanel";
import MotoristasView from "@/modules/motoristas/components/MotoristasView";
import VeiculosView from "@/modules/veiculos/components/VeiculosView";
import AutoProspectView from "@/modules/autoprospect/components/AutoProspectView";
import RecibosView from "@/modules/recibos/components/RecibosView";

const WHATSAPP_QR_DATA_URL = "/branding/qr-whatsapp-alves.png";

const menu = [
  { id: "dashboard", group: "VISÃO GERAL", label: "Dashboard", icon: BarChart3 },
  { id: "financeiro", group: "VISÃO GERAL", label: "Financeiro", icon: DollarSign },

  { id: "clientes", group: "OPERAÇÃO", label: "Clientes", icon: Users },
  { id: "agenda", group: "OPERAÇÃO", label: "Agenda", icon: CalendarDays },
  { id: "orcamento", group: "OPERAÇÃO", label: "Orçamentos", icon: Calculator },
  { id: "recibos", group: "OPERAÇÃO", label: "Recibos", icon: Receipt },

  { id: "indicacoes", group: "CRESCIMENTO", label: "Indicações", icon: Gift },
  { id: "empresas", group: "CRESCIMENTO", label: "Empresas", icon: Briefcase },
  { id: "auto-prospect", group: "CRESCIMENTO", label: "Auto Prospect", icon: Radar },

  { id: "whatsapp", group: "FERRAMENTAS", label: "WhatsApp", icon: MessageCircle },
  { id: "marketing", group: "FERRAMENTAS", label: "Marketing", icon: Megaphone },
  { id: "ia", group: "FERRAMENTAS", label: "IA da Alves", icon: Bot },
  { id: "ame-vision", group: "FERRAMENTAS", label: "AME Vision", icon: Monitor },
];

export default function AdminPage() {
  const {
    logged, login: loginFn, logout: logoutFn,
    leads, setLeads, addLead: addLeadFn, updateLead: updateLeadFn, deleteLead: deleteLeadFn,
    trips, setTrips, addTrip: addTripFn, updateTrip: updateTripFn, deleteTrip: deleteTripFn,
    referrals, setReferrals, addReferral: addReferralFn, updateReferral: updateReferralFn, deleteReferral: deleteReferralFn,
    finance, setFinance, addFinance: addFinanceFn, deleteFinance: deleteFinanceFn, updateFinance: updateFinanceFn,
    proposals, addProposal: addProposalFn, updateProposal: updateProposalFn, deleteProposal: deleteProposalFn,
    motoristas, addMotorista, updateMotorista, deleteMotorista,
    veiculos, addVeiculo, updateVeiculo, deleteVeiculo,
    campaigns, addCampaign, updateCampaign, deleteCampaign,
    companies, discoveries, discoverCompany, deleteCompany, runCampaignDiscovery,
    analyses, intelligence, analyzeCompany, reanalyzeIntelligence,
    opportunities, interactions, createOpportunity, updateOpportunityStatus, loadInteractions, addInteraction,
    batchRuns, batchDetail, batchPolling, createBatch, processBatch,
    pauseBatch, resumeBatch, cancelBatch, retryBatchFailures, loadBatchDetail,
    completedMarketing, completeMarketingTask, resetMarketingTasks,
    receipts, loading: receiptsLoading, error: receiptsError,
    createReceipt, updateReceipt, deleteReceipt, getNextNumber,
    stats, today, migrationStatus, executarMigracao,
  } = useData();

  const [loginEmail, setLoginEmail] = useState("admin@alvesmobilidade.com.br");
  const [loginPassword, setLoginPassword] = useState("");
  const [active, setActive] = useState("dashboard");
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [importText, setImportText] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<MessageKey>("apresentacao");
  const [receiptInitialForm, setReceiptInitialForm] = useState<Partial<{
    clientName: string; clientPhone: string; serviceDate: string;
    value: number; observations: string; tripId: string;
  }> | null>(null);
  const quoteState = useQuoteState();

  const [leadForm, setLeadForm] = useState<Omit<Lead, "id" | "createdAt">>({
    name: "", phone: "", type: "Aeroporto", origin: "", status: "Novo contato", notes: "", nextAction: "Enviar apresentação da Alves", nextDate: today,
  });
  const [tripForm, setTripForm] = useState<Omit<Trip, "id">>({ client: "", phone: "", date: today, time: "", route: "BH → Confins", value: 150, status: "Agendada" });
  const [refForm, setRefForm] = useState<Omit<Referral, "id">>({ referrer: "", referred: "", status: "Pendente", credits: 0 });
  const [financeForm, setFinanceForm] = useState<Omit<FinanceEntry, "id">>({ description: "", value: 0, type: "Entrada", date: today, category: "outros" });

  const {
    voiceStatus,
    ameOpen,
    ameStep,
    ameText,
    setAmeText,
    startAmeAssistant: startAmeAssistantFn,
    closeAmeAssistant,
    processAmeAnswer,
    ameSpeak,
    captureRouteByVoice: captureRouteByVoiceFn,
    captureGlobalVoiceCommand: captureGlobalVoiceCommandFn,
    setVoiceStatusTimed,
  } = useVoiceAssistant({
    onSetActive: setActive,
    onQuoteChange: (quote) => {
      if (quote.origin !== undefined) quoteState.setOrigin(quote.origin);
      if (quote.destination !== undefined) quoteState.setDestination(quote.destination);
      if (quote.km !== undefined) quoteState.setKm(quote.km);
      if (quote.passengers !== undefined) quoteState.setPassengers(quote.passengers);
      if (quote.bags !== undefined) quoteState.setBags(quote.bags);
      if (quote.specialLuggage !== undefined) quoteState.setSpecialLuggage(quote.specialLuggage);
    },
    onCalculateQuote: () => calculateQuote(),
  });

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [active]);

  const currentTask = stats.pending[0];

  function startAmeAssistant() {
    startAmeAssistantFn();
    setActive("orcamento");
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
  function sendLeadMessage(lead: Lead, key: MessageKey) {
    const actualKey = key !== "apresentacao" ? key : messageKeyForLead(lead);
    openWhatsApp(lead.phone, messages[actualKey]);
    updateLead(lead.id, sendLeadMessageData(lead));
  }

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
    const effects = buildFinishTripEffects(trip, { leads, finance, referrals });
    if (effects.financeEntry) addFinanceFn(effects.financeEntry);
    if (effects.leadId && effects.leadPatch) updateLead(effects.leadId, effects.leadPatch);
    if (effects.referralId && effects.referralPatch) updateReferralFn(effects.referralId, effects.referralPatch);
  }

  function addReferral() {
    if (!refForm.referrer || !refForm.referred) return alert("Preencha quem indicou e quem foi indicado.");
    addReferralFn({ ...refForm, credits: Number(refForm.credits || 0) });
    setRefForm({ referrer: "", referred: "", status: "Pendente", credits: 0 });
  }

  function creditReferral(item: Referral) { updateReferralFn(item.id, { status: "Convertida", credits: Number(item.credits || 0) + 1 }); }

  function addFinance() {
    if (!financeForm.description || !financeForm.value) return alert("Preencha descrição e valor.");
    addFinanceFn({ ...financeForm, value: Number(financeForm.value) });
    setFinanceForm({ description: "", value: 0, type: "Entrada", date: today, category: "outros" });
  }

  function calculateQuote(origin = quoteState.origin, destination = quoteState.destination, km = quoteState.km) {
    const result = calculateQuoteValue(origin, destination, km, quoteState.passengers, quoteState.bags, quoteState.specialLuggage);
    quoteState.setResult(result);
    setTripForm((current) => ({ ...current, route: `${origin} → ${destination}`, value: result.value || current.value }));
    return result;
  }

  async function convertProposalToTrip(proposal: import("@/domain/proposal/types").Proposal) {
    const newTrip = { client: proposal.client, phone: proposal.phone, date: proposal.date || today, time: proposal.time, route: `${proposal.origin} → ${proposal.destination}`, value: proposal.value, status: "Agendada" as const };
    try {
      await addTripFn({ ...newTrip, value: Number(newTrip.value || 0) });
    } catch (err) {
      console.error("Erro ao converter proposta:", err);
      alert("Erro ao converter proposta em viagem.");
      return;
    }

    try {
      await updateProposalFn(proposal.id, { status: "Convertida" });
    } catch (err) {
      // The scheduled trip is already persisted; do not create a second one on retry.
      console.error("Viagem criada, mas não foi possível atualizar a proposta:", err);
    }
    setActive("agenda");
    setVoiceStatusTimed("Proposta convertida em viagem ✓", 3000);
  }

  function captureRouteByVoice() {
    captureRouteByVoiceFn();
  }

  function captureGlobalVoiceCommand() {
    captureGlobalVoiceCommandFn();
  }

  function refreshLeads() {
    const repo = createRepository("contacts", "ame-leads-v2", (form: any, id: string, now: string) => ({ ...form, id, createdAt: now }), {
      fromDb: leadFromSupabase,
      toDb: leadFormToSupabase,
      toDbPatch: leadPatchToSupabase,
    });
    repo.findAll().then(setLeads).catch(() => {});
  }

  function handleGenerateReceipt(trip: Trip) {
    const [origin = "", destination = ""] = trip.route.includes(" → ") ? trip.route.split(" → ") : [trip.route, trip.route];
    const dateBR = trip.date ? (() => { const [y, m, d] = trip.date.split("-"); return `${d}/${m}/${y}`; })() : "";
    setReceiptInitialForm({
      clientName: trip.client,
      clientPhone: trip.phone || "",
      serviceDate: trip.date,
      value: trip.value,
      tripId: trip.id,
      observations: `Viagem de ${trip.client}, partindo de ${origin}, com destino a ${destination}, realizada na data de ${dateBR}.`,
    });
    setActive("recibos");
  }

  function exportBackup() {
    const data = { leads, trips, referrals, finance, proposals, motoristas, veiculos, campaigns, exportedAt: new Date().toISOString() };
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
      case "dashboard":
        return <DashboardView
          stats={stats} leads={leads} finance={finance} trips={trips} today={today} currentTask={currentTask}
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
          onRefreshLeads={refreshLeads}
        />;
      case "agenda":
        return <AgendaView
          trips={trips}
          onFinishTrip={finishTrip} onDeleteTrip={(id) => deleteTripFn(id)}
          onAddTrip={async (trip) => {
            try {
              await addTripFn({ ...trip, value: Number(trip.value || 0) });
            } catch (err) {
              alert("Erro ao salvar viagem. Verifique os dados e tente novamente.");
              console.error(err);
            }
          }}
          onOpenGoogleMapsRoute={openGoogleMapsRoute} onOpenWazeRoute={openWazeRoute}
          onGenerateReceipt={handleGenerateReceipt}
        />;
      case "orcamento":
        return <OrcamentoView
          onCaptureRouteByVoice={captureRouteByVoice}
          onOpenGoogleMapsRoute={openGoogleMapsRoute} onOpenWazeRoute={openWazeRoute}
          leads={leads} proposals={proposals}
          onAddProposal={addProposalFn} onUpdateProposal={updateProposalFn} onDeleteProposal={deleteProposalFn}
          onConvertProposal={convertProposalToTrip} proposalQrDataUrl={WHATSAPP_QR_DATA_URL}
        />;
      case "recibos":
        return <RecibosView
          receipts={receipts} loading={receiptsLoading} error={receiptsError}
          createReceipt={createReceipt} updateReceipt={updateReceipt}
          deleteReceipt={deleteReceipt} getNextNumber={getNextNumber}
          initialForm={receiptInitialForm} onClearInitialForm={() => setReceiptInitialForm(null)}
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
          leads={leads}
          refForm={refForm} referrals={referrals}
          onSetRefForm={setRefForm} onAddReferral={addReferral}
          onCreditReferral={creditReferral} onDeleteReferral={(id) => deleteReferralFn(id)}
        />;
      case "marketing":
        return <MarketingView
          completedMarketing={completedMarketing}
          onCompleteTask={completeMarketingTask} onResetTasks={resetMarketingTasks}
        />;
case "financeiro":
        return <FinanceiroView
          trips={trips} financeForm={financeForm} finance={finance}
          today={today}
          onSetFinanceForm={setFinanceForm} onAddFinance={addFinanceFn} onDeleteFinance={deleteFinanceFn} onUpdateFinance={updateFinanceFn}
        />;
      case "ia":
        return <AIView stats={stats} leads={leads} today={today} onExportBackup={exportBackup} onSendLeadMessage={(lead, key) => sendLeadMessage(lead, key as MessageKey)} onCompleteAction={completeAction} />;
      case "ame-vision":
        return <AMEVisionPanel trips={trips} />;
      case "auto-prospect":
        return <AutoProspectView
          campaigns={campaigns} companies={companies} discoveries={discoveries}
          analyses={analyses} intelligence={intelligence}
          onAddCampaign={addCampaign} onUpdateCampaign={updateCampaign} onDeleteCampaign={deleteCampaign}
          onDiscoverCompany={discoverCompany} onDeleteCompany={deleteCompany}
          onRunDiscovery={runCampaignDiscovery} onAnalyzeCompany={analyzeCompany}
          onReanalyzeIntelligence={reanalyzeIntelligence}
          opportunities={opportunities} interactions={interactions}
          onCreateOpportunity={createOpportunity} onUpdateOpportunityStatus={updateOpportunityStatus}
          onLoadInteractions={loadInteractions} onAddInteraction={addInteraction}
          batchRuns={batchRuns} batchDetail={batchDetail} batchPolling={batchPolling}
          onCreateBatch={createBatch} onProcessBatch={processBatch}
          onPauseBatch={pauseBatch} onResumeBatch={resumeBatch} onCancelBatch={cancelBatch}
          onRetryBatchFailures={retryBatchFailures} onLoadBatchDetail={loadBatchDetail}
        />;
      default:
        return null;
    }
  }

  const activeLabel = menu.find((item) => item.id === active)?.label ?? "Dashboard";

  const moreMenuItems = menu.filter((item) => !["dashboard", "financeiro", "agenda", "orcamento", "whatsapp"].includes(item.id));

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg-primary)]">
      <div className="flex min-h-0 flex-1">
        <Sidebar active={active} menu={menu} setActive={setActive} onLogout={logout} />
        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <Topbar active={active} title={activeLabel} menu={menu} setActive={setActive} onBackup={exportBackup} />
          <div className="mobile-content flex-1 px-3 pb-28 pt-4 md:px-6 md:pb-8 md:pt-6">
            <div key={active} className="animate-enter-up">{renderContent()}</div>
          </div>
        </section>
      </div>

      <BottomTabBar active={active} onSelect={setActive} onOpenMore={() => setShowMoreMenu(true)} />

      {showMoreMenu && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center lg:hidden" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-t-2xl bg-[var(--bg-card)] p-4 pb-8 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-600" />
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Mais opções</p>
            <div className="grid grid-cols-3 gap-2">
              {moreMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActive(item.id); setShowMoreMenu(false); }}
                  className={`flex flex-col items-center gap-2 rounded-xl p-3 transition ${
                    active === item.id ? "bg-[var(--accent-15)] text-[var(--accent)]" : "text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  <item.icon size={22} />
                  <span className="text-[10px] font-bold leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
            <button onClick={logout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/10">
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>
      )}

      <button type="button" onClick={startAmeAssistant}
        className="fixed bottom-20 right-4 z-[80] flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-4 py-3.5 text-sm font-bold text-white shadow-lg md:bottom-5 md:right-5 md:px-5 md:py-4 lg:hidden"
        title="Comando AME"
        style={{ boxShadow: "0 20px 70px rgba(var(--accent-rgb), 0.24)" }}
      ><Mic size={16} /></button>

      <button type="button" onClick={startAmeAssistant}
        className="fixed bottom-5 right-5 z-[80] hidden cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--secondary)] px-5 py-4 text-sm font-bold text-white shadow-lg lg:flex"
        title="Comando AME"
        style={{ boxShadow: "0 20px 70px rgba(var(--accent-rgb), 0.24)" }}
      ><Mic size={18} /> <span>Comando AME</span></button>

      <VozView
        ameOpen={ameOpen} ameStep={ameStep} ameText={ameText}
        voiceStatus={voiceStatus} quoteOrigin={quoteState.origin} quoteDestination={quoteState.destination}
        onSetAmeText={setAmeText} onCloseAmeAssistant={closeAmeAssistant}
        onProcessAmeAnswer={processAmeAnswer} onAmeSpeak={ameSpeak}
        onOpenGoogleMapsRoute={openGoogleMapsRoute}
      />

      {voiceStatus && !ameOpen && active !== "viagens" && (
        <div className="fixed bottom-24 right-4 z-[80] max-w-sm rounded-xl border border-[var(--accent-15)] bg-[var(--bg-card)] px-4 py-3 text-sm text-[var(--accent)] shadow-2xl backdrop-blur-xl lg:bottom-6 lg:right-20">{voiceStatus}</div>
      )}
    </div>
  );
}
