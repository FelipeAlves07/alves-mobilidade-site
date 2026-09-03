import type { Lead, LeadForm } from "@/domain/lead/types";
import type { Trip, TripForm } from "@/domain/trip/types";
import type { FinanceEntry, FinanceEntryForm } from "@/domain/finance/types";
import type { Referral, ReferralForm } from "@/domain/referral/types";
import type { Proposal } from "@/domain/proposal/types";
import type {
  AutoProspectCampaign,
  AutoProspectCampaignForm,
  AutoProspectCampaignStatus,
  ProspectCompany,
  ProspectCompanyForm,
  ProspectDiscovery,
  ProspectDiscoveryForm,
} from "@/domain/autoprospect/types";
import type {
  BatchCompanyStatus,
  BatchRunStatus,
} from "@/domain/autoprospect/batch";
import {
  leadFromDatabase,
  leadFormToDatabase,
} from "@/domain/lead/mapper";
import {
  tripFromDatabase,
} from "@/domain/trip/mapper";
import {
  financeFromDatabase,
} from "@/domain/finance/mapper";
import {
  referralFromDatabase,
} from "@/domain/referral/mapper";
import {
  proposalFromDatabase,
} from "@/domain/proposal/mapper";
import { splitRoute } from "@/lib/maps";
import { mapKeysToSnake } from "./utils/string";

// ─── Lead ↔ contacts ───────────────────────────────────────────
// DB: lead_status | domain: status

export function leadFromSupabase(row: Record<string, unknown>): Lead {
  return leadFromDatabase({
    id: row.id as string,
    name: row.name as string,
    phone: row.phone as string,
    type: row.type as string,
    origin: row.origin as string,
    status: (row.lead_status as string) || "",
    notes: row.notes as string,
    next_action: (row.next_action as string) || "",
    next_date: (row.next_date as string) || "",
    created_at: row.created_at as string,
    last_contact: row.last_contact as string,
    address: (row.address as string) || "",
  });
}

export function leadFormToSupabase(form: LeadForm): Record<string, unknown> {
  const db = leadFormToDatabase(form);
  const { status, ...rest } = db;
  return { ...rest, lead_status: status };
}

export function leadPatchToSupabase(patch: Partial<LeadForm>): Record<string, unknown> {
  const result = mapKeysToSnake(patch as Record<string, unknown>);
  if ("status" in result) {
    result.lead_status = result.status;
    delete result.status;
  }
  return result;
}

// ─── Trip ↔ trips ──────────────────────────────────────────────
// DB: client_name, client_phone, origin, destination | domain: client, phone, route

export function tripFromSupabase(row: Record<string, unknown>): Trip {
  return tripFromDatabase({
    id: row.id as string,
    client: (row.client_name as string) || "",
    phone: (row.client_phone as string) || "",
    date: row.date as string,
    time: row.time as string,
    route: `${row.origin || ""} → ${row.destination || ""}`,
    value: Number(row.value || 0),
    status: row.status as string,
    created_at: row.created_at as string,
  });
}

export function tripFormToSupabase(form: TripForm & { id?: string }): Record<string, unknown> {
  const { origin, destination } = splitRoute(form.route);
  const record: Record<string, unknown> = {
    client_name: form.client,
    client_phone: form.phone,
    origin,
    destination,
    date: form.date,
    time: form.time,
    value: Number(form.value || 0),
    status: form.status,
  };
  if (form.id) record.id = form.id;
  return record;
}

export function tripPatchToSupabase(patch: Partial<TripForm>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (patch.client !== undefined) result.client_name = patch.client;
  if (patch.phone !== undefined) result.client_phone = patch.phone;
  if (patch.route !== undefined) {
    const { origin, destination } = splitRoute(patch.route);
    result.origin = origin;
    result.destination = destination;
  }
  if (patch.date !== undefined) result.date = patch.date;
  if (patch.time !== undefined) result.time = patch.time;
  if (patch.value !== undefined) result.value = Number(patch.value);
  if (patch.status !== undefined) result.status = patch.status;
  return result;
}

// ─── Finance ↔ finance_entries ──────────────────────────────────
// Same column names, auto snake_case works

export function financeFromSupabase(row: Record<string, unknown>): FinanceEntry {
  return financeFromDatabase({
    id: row.id as string,
    description: row.description as string,
    value: Number(row.value || 0),
    type: row.type as string,
    date: row.date as string,
    category: (row.category as string) || "",
    trip_id: row.trip_id as string,
  });
}

export function financeFormToSupabase(form: FinanceEntryForm): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    description: form.description,
    value: Number(form.value),
    type: form.type,
    date: form.date,
    category: form.category || "outros",
  };
  if (form.tripId) payload.trip_id = form.tripId;
  return payload;
}

// ─── Referral ↔ referrals ──────────────────────────────────────
// DB: referrer_name, referred_name | domain: referrer, referred

export function referralFromSupabase(row: Record<string, unknown>): Referral {
  return referralFromDatabase({
    id: row.id as string,
    referrer: (row.referrer_name as string) || "",
    referred: (row.referred_name as string) || "",
    status: row.status as string,
    credits: Number(row.credits || 0),
    referrer_phone: (row.referrer_phone as string) || "",
    referred_phone: (row.referred_phone as string) || "",
  });
}

export function referralFormToSupabase(form: ReferralForm): Record<string, unknown> {
  return {
    referrer_name: form.referrer,
    referred_name: form.referred,
    referrer_phone: form.referrerPhone || "",
    referred_phone: form.referredPhone || "",
    status: form.status,
    credits: Number(form.credits || 0),
  };
}

export function referralPatchToSupabase(patch: Partial<ReferralForm>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (patch.referrer !== undefined) result.referrer_name = patch.referrer;
  if (patch.referred !== undefined) result.referred_name = patch.referred;
  if (patch.referrerPhone !== undefined) result.referrer_phone = patch.referrerPhone;
  if (patch.referredPhone !== undefined) result.referred_phone = patch.referredPhone;
  if (patch.status !== undefined) result.status = patch.status;
  if (patch.credits !== undefined) result.credits = Number(patch.credits);
  return result;
}

// ─── Proposal ↔ proposals ──────────────────────────────────────
// DB: client_name, client_phone | domain: client, phone

export function proposalFromSupabase(row: Record<string, unknown>): Proposal {
  return proposalFromDatabase({
    id: row.id as string,
    client: (row.client_name as string) || "",
    phone: (row.client_phone as string) || "",
    origin: row.origin as string,
    destination: row.destination as string,
    date: row.date as string,
    time: row.time as string,
    km: Number(row.km || 0),
    passengers: Number(row.passengers || 0),
    bags: Number(row.bags || 0),
    value: Number(row.value || 0),
    status: row.status as string,
    created_at: row.created_at as string,
    valid_until: row.valid_until as string,
    message: row.message as string,
  });
}

export function proposalFormToSupabase(
  form: Omit<Proposal, "id" | "createdAt">,
): Record<string, unknown> {
  return {
    client_name: form.client,
    client_phone: form.phone,
    origin: form.origin,
    destination: form.destination,
    date: form.date,
    time: form.time,
    km: Number(form.km || 0),
    passengers: Number(form.passengers || 0),
    bags: Number(form.bags || 0),
    value: Number(form.value || 0),
    status: form.status,
    valid_until: form.validUntil,
    message: form.message || "",
  };
}

// ─── Auto Prospect ────────────────────────────────────────────
// Campaign ↔ ap_campaigns

export function apCampaignFromSupabase(row: Record<string, unknown>): AutoProspectCampaign {
  return {
    id: row.id as string,
    name: (row.name as string) || "",
    location: (row.location as string) || "",
    segments: Array.isArray(row.segments) ? (row.segments as string[]) : [],
    keyword: (row.keyword as string) || "",
    objective: (row.objective as string) || "",
    targetCount: Number(row.target_count || 0),
    status: (row.status as AutoProspectCampaignStatus) || "Rascunho",
    createdAt: row.created_at as string,
  };
}

export function apCampaignFormToSupabase(form: AutoProspectCampaignForm): Record<string, unknown> {
  const result: Record<string, unknown> = {
    name: form.name,
    location: form.location,
    segments: form.segments,
    objective: form.objective,
    target_count: Number(form.targetCount || 0),
    status: form.status,
  };
  if (form.keyword) result.keyword = form.keyword;
  return result;
}

export function apCampaignPatchToSupabase(
  patch: Partial<AutoProspectCampaignForm>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (patch.name !== undefined) result.name = patch.name;
  if (patch.location !== undefined) result.location = patch.location;
  if (patch.segments !== undefined) result.segments = patch.segments;
  if (patch.keyword !== undefined) result.keyword = patch.keyword;
  if (patch.objective !== undefined) result.objective = patch.objective;
  if (patch.targetCount !== undefined) result.target_count = Number(patch.targetCount);
  if (patch.status !== undefined) result.status = patch.status;
  return result;
}

// ─── Company ↔ ap_companies ───────────────────────────────────

export function apCompanyFromSupabase(row: Record<string, unknown>): ProspectCompany {
  return {
    id: row.id as string,
    name: (row.name as string) || "",
    segment: (row.segment as string) || "",
    city: (row.city as string) || "",
    state: (row.state as string) || "",
    address: (row.address as string) || "",
    website: (row.website as string) || "",
    phone: (row.phone as string) || "",
    whatsapp: (row.whatsapp as string) || "",
    email: (row.email as string) || "",
    instagram: (row.instagram as string) || "",
    linkedin: (row.linkedin as string) || "",
    notes: (row.notes as string) || "",
    source: (row.source as string) || "",
    collectedAt: (row.collected_at as string) || "",
    createdAt: row.created_at as string,
  };
}

export function apCompanyFormToSupabase(form: ProspectCompanyForm): Record<string, unknown> {
  return {
    name: form.name,
    segment: form.segment,
    city: form.city,
    state: form.state,
    address: form.address,
    website: form.website,
    phone: form.phone,
    whatsapp: form.whatsapp,
    email: form.email,
    instagram: form.instagram,
    linkedin: form.linkedin,
    notes: form.notes,
    source: form.source,
    collected_at: new Date().toISOString(),
  };
}

export function apCompanyPatchToSupabase(
  patch: Partial<ProspectCompanyForm>,
): Record<string, unknown> {
  return mapKeysToSnake(patch as Record<string, unknown>);
}

// ─── Discovery ↔ ap_discoveries ───────────────────────────────

export function apDiscoveryFromSupabase(row: Record<string, unknown>): ProspectDiscovery {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    campaignId: (row.campaign_id as string) || null,
    source: (row.source as string) || "",
    url: (row.url as string) || "",
    createdAt: row.created_at as string,
  };
}

export function apDiscoveryFormToSupabase(form: ProspectDiscoveryForm): Record<string, unknown> {
  return {
    company_id: form.companyId,
    campaign_id: form.campaignId,
    source: form.source,
    url: form.url,
  };
}

export function apDiscoveryPatchToSupabase(
  patch: Partial<ProspectDiscoveryForm>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (patch.companyId !== undefined) result.company_id = patch.companyId;
  if (patch.campaignId !== undefined) result.campaign_id = patch.campaignId;
  if (patch.source !== undefined) result.source = patch.source;
  if (patch.url !== undefined) result.url = patch.url;
  return result;
}

// ─── Enrichment ↔ ap_enrichments ───────────────────────────────

export interface CompanyEnrichmentRow {
  id: string;
  companyId: string;
  status: "Pendente" | "Concluido" | "Indisponivel" | "Erro";
  sourceUrl: string;
  fetchedPages: number;
  title: string;
  description: string;
  reason: string;
  collectedAt: string;
  createdAt: string;
}

export function apEnrichmentFromSupabase(row: Record<string, unknown>): CompanyEnrichmentRow {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    status: (row.status as CompanyEnrichmentRow["status"]) || "Pendente",
    sourceUrl: (row.source_url as string) || "",
    fetchedPages: Number(row.fetched_pages || 0),
    title: (row.title as string) || "",
    description: (row.description as string) || "",
    reason: (row.reason as string) || "",
    collectedAt: (row.collected_at as string) || "",
    createdAt: (row.created_at as string) || "",
  };
}

export function apEnrichmentToSupabase(
  row: Omit<CompanyEnrichmentRow, "id" | "createdAt" | "collectedAt">,
): Record<string, unknown> {
  return {
    company_id: row.companyId,
    status: row.status,
    source_url: row.sourceUrl,
    fetched_pages: row.fetchedPages,
    title: row.title,
    description: row.description,
    reason: row.reason,
    collected_at: new Date().toISOString(),
  };
}

// ─── Evidence ↔ ap_enrichment_evidences ────────────────────────

export interface EnrichmentEvidenceRow {
  id: string;
  enrichmentId: string;
  kind: "fato" | "sinal" | "inferencia";
  label: string;
  text: string;
  sourceUrl: string;
  collectedAt: string;
}

export function apEvidenceToSupabase(
  evidence: Omit<EnrichmentEvidenceRow, "id" | "collectedAt">,
): Record<string, unknown> {
  return {
    enrichment_id: evidence.enrichmentId,
    kind: evidence.kind,
    label: evidence.label,
    text: evidence.text,
    source_url: evidence.sourceUrl,
    collected_at: new Date().toISOString(),
  };
}

// ─── Qualification ↔ ap_qualifications ─────────────────────────

export interface CompanyQualificationRow {
  id: string;
  companyId: string;
  enrichmentId: string | null;
  score: number;
  potential: string;
  confidence: string;
  confidenceReason: string;
  summary: string;
  opportunityReason: string;
  recommendation: string;
  recommendationText: string;
  facts: unknown[];
  inferences: unknown[];
  possibleServices: string[];
  scoreBreakdown: unknown[];
  aiProvider: string;
  aiModel: string;
  aiStatus: string;
  createdAt: string;
}

export function apQualificationFromSupabase(row: Record<string, unknown>): CompanyQualificationRow {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    enrichmentId: (row.enrichment_id as string) || null,
    score: Number(row.score || 0),
    potential: (row.potential as string) || "",
    confidence: (row.confidence as string) || "",
    confidenceReason: (row.confidence_reason as string) || "",
    summary: (row.summary as string) || "",
    opportunityReason: (row.opportunity_reason as string) || "",
    recommendation: (row.recommendation as string) || "",
    recommendationText: (row.recommendation_text as string) || "",
    facts: Array.isArray(row.facts) ? (row.facts as unknown[]) : [],
    inferences: Array.isArray(row.inferences) ? (row.inferences as unknown[]) : [],
    possibleServices: Array.isArray(row.possible_services) ? (row.possible_services as string[]) : [],
    scoreBreakdown: Array.isArray(row.score_breakdown) ? (row.score_breakdown as unknown[]) : [],
    aiProvider: (row.ai_provider as string) || "",
    aiModel: (row.ai_model as string) || "",
    aiStatus: (row.ai_status as string) || "deterministico",
    createdAt: (row.created_at as string) || "",
  };
}

export function apQualificationToSupabase(
  row: Omit<CompanyQualificationRow, "id" | "createdAt">,
): Record<string, unknown> {
  return {
    company_id: row.companyId,
    enrichment_id: row.enrichmentId,
    score: row.score,
    potential: row.potential,
    confidence: row.confidence,
    confidence_reason: row.confidenceReason,
    summary: row.summary,
    opportunity_reason: row.opportunityReason,
    recommendation: row.recommendation,
    recommendation_text: row.recommendationText,
    facts: row.facts,
    inferences: row.inferences,
    possible_services: row.possibleServices,
    score_breakdown: row.scoreBreakdown,
    ai_provider: row.aiProvider,
    ai_model: row.aiModel,
    ai_status: row.aiStatus,
  };
}

// ─── Intelligence ↔ ap_intelligence ────────────────────────────

export interface CompanyIntelligenceRow {
  id: string;
  companyId: string;
  enrichmentId: string | null;
  qualificationId: string | null;
  provider: string;
  model: string;
  status: "Pendente" | "Concluido" | "Erro";
  error: string;
  priority: number;
  priorityReason: string;
  reasons: string[];
  nextAction: string;
  summary: string;
  recommendedServices: unknown[];
  aiConfidence: string;
  scoreSnapshot: number;
  potentialSnapshot: string;
  confidenceSnapshot: string;
  aiResponse: unknown | null;
  aiStatus: string;
  tokensIn: number;
  tokensOut: number;
  costEstimate: number;
  analysisVersion: string;
  createdAt: string;
}

export function apIntelligenceFromSupabase(row: Record<string, unknown>): CompanyIntelligenceRow {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    enrichmentId: (row.enrichment_id as string) || null,
    qualificationId: (row.qualification_id as string) || null,
    provider: (row.provider as string) || "",
    model: (row.model as string) || "",
    status: (row.status as CompanyIntelligenceRow["status"]) || "Concluido",
    error: (row.error as string) || "",
    priority: Number(row.priority || 4),
    priorityReason: (row.priority_reason as string) || "",
    reasons: Array.isArray(row.reasons) ? (row.reasons as string[]) : [],
    nextAction: (row.next_action as string) || "",
    summary: (row.summary as string) || "",
    recommendedServices: Array.isArray(row.recommended_services) ? (row.recommended_services as unknown[]) : [],
    aiConfidence: (row.ai_confidence as string) || "",
    scoreSnapshot: Number(row.score_snapshot || 0),
    potentialSnapshot: (row.potential_snapshot as string) || "",
    confidenceSnapshot: (row.confidence_snapshot as string) || "",
    aiResponse: row.ai_response ?? null,
    aiStatus: (row.ai_status as string) || "deterministico",
    tokensIn: Number(row.tokens_in || 0),
    tokensOut: Number(row.tokens_out || 0),
    costEstimate: Number(row.cost_estimate || 0),
    analysisVersion: (row.analysis_version as string) || "",
    createdAt: (row.created_at as string) || "",
  };
}

export function apIntelligenceToSupabase(
  row: Omit<CompanyIntelligenceRow, "id" | "createdAt">,
): Record<string, unknown> {
  return {
    company_id: row.companyId,
    enrichment_id: row.enrichmentId,
    qualification_id: row.qualificationId,
    provider: row.provider,
    model: row.model,
    status: row.status,
    error: row.error,
    priority: row.priority,
    priority_reason: row.priorityReason,
    reasons: row.reasons,
    next_action: row.nextAction,
    summary: row.summary,
    recommended_services: row.recommendedServices,
    ai_confidence: row.aiConfidence,
    score_snapshot: row.scoreSnapshot,
    potential_snapshot: row.potentialSnapshot,
    confidence_snapshot: row.confidenceSnapshot,
    ai_response: row.aiResponse,
    ai_status: row.aiStatus,
    tokens_in: row.tokensIn,
    tokens_out: row.tokensOut,
    cost_estimate: row.costEstimate,
    analysis_version: row.analysisVersion,
  };
}

// ─── Opportunity ↔ ap_opportunities (Etapa 6) ────────────────────

export interface OpportunityRow {
  id: string;
  companyId: string;
  intelligenceId: string | null;
  qualificationId: string | null;
  status: string;
  priority: number;
  score: number;
  potential: string;
  confidence: string;
  priorityReason: string;
  nextAction: string;
  recommendedServices: unknown[];
  createdAt: string;
  updatedAt: string;
}

export function apOpportunityFromSupabase(row: Record<string, unknown>): OpportunityRow {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    intelligenceId: (row.intelligence_id as string) || null,
    qualificationId: (row.qualification_id as string) || null,
    status: (row.status as string) || "Nova",
    priority: Number(row.priority || 4),
    score: Number(row.score || 0),
    potential: (row.potential as string) || "",
    confidence: (row.confidence as string) || "",
    priorityReason: (row.priority_reason as string) || "",
    nextAction: (row.next_action as string) || "",
    recommendedServices: Array.isArray(row.recommended_services)
      ? (row.recommended_services as unknown[])
      : [],
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
  };
}

export function apOpportunityToSupabase(
  row: Omit<OpportunityRow, "id" | "createdAt" | "updatedAt">,
): Record<string, unknown> {
  return {
    company_id: row.companyId,
    intelligence_id: row.intelligenceId,
    qualification_id: row.qualificationId,
    status: row.status,
    priority: row.priority,
    score: row.score,
    potential: row.potential,
    confidence: row.confidence,
    priority_reason: row.priorityReason,
    next_action: row.nextAction,
    recommended_services: row.recommendedServices,
  };
}

export function apOpportunityPatchToSupabase(
  patch: Partial<Pick<OpportunityRow, "status">>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.status === "string") out.status = patch.status;
  return out;
}

// Lista com dados da empresa (join) — usada na listagem de oportunidades

export interface OpportunityListItemRow extends OpportunityRow {
  companyName: string;
  companySegment: string;
  companyCity: string;
  companyState: string;
  companyPhone: string;
  companyWhatsapp: string;
  companyEmail: string;
  companyWebsite: string;
  companyInstagram: string;
  companyLinkedin: string;
}

export function apOpportunityListItemFromSupabase(
  row: Record<string, unknown>,
): OpportunityListItemRow {
  const company = (row.ap_companies ?? {}) as Record<string, unknown>;
  const base = apOpportunityFromSupabase(row);
  return {
    ...base,
    companyName: (company.name as string) || "",
    companySegment: (company.segment as string) || "",
    companyCity: (company.city as string) || "",
    companyState: (company.state as string) || "",
    companyPhone: (company.phone as string) || "",
    companyWhatsapp: (company.whatsapp as string) || "",
    companyEmail: (company.email as string) || "",
    companyWebsite: (company.website as string) || "",
    companyInstagram: (company.instagram as string) || "",
    companyLinkedin: (company.linkedin as string) || "",
  };
}

// ─── Opportunity interaction ↔ ap_opportunity_interactions ───────

export interface OpportunityInteractionRow {
  id: string;
  opportunityId: string;
  channel: string;
  result: string;
  note: string;
  occurredAt: string;
  createdAt: string;
}

export function apInteractionFromSupabase(row: Record<string, unknown>): OpportunityInteractionRow {
  return {
    id: row.id as string,
    opportunityId: row.opportunity_id as string,
    channel: (row.channel as string) || "Outro",
    result: (row.result as string) || "",
    note: (row.note as string) || "",
    occurredAt: (row.occurred_at as string) || "",
    createdAt: (row.created_at as string) || "",
  };
}

export function apInteractionToSupabase(
  row: Omit<OpportunityInteractionRow, "id" | "createdAt">,
): Record<string, unknown> {
  return {
    opportunity_id: row.opportunityId,
    channel: row.channel,
    result: row.result,
    note: row.note,
    occurred_at: row.occurredAt,
  };
}

// ─── Batch run ↔ ap_batch_runs (Etapa 7 — processamento em lote) ──

export interface BatchRunRow {
  id: string;
  campaignId: string;
  status: BatchRunStatus;
  filters: unknown;
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  withoutData: number;
  cancelled: number;
  errorSummary: unknown[];
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function apBatchRunFromSupabase(row: Record<string, unknown>): BatchRunRow {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    status: (row.status as BatchRunStatus) || "pendente",
    filters: Array.isArray(row.filters)
      ? (row.filters as unknown)
      : (row.filters ?? {}),
    total: Number(row.total || 0),
    pending: Number(row.pending || 0),
    processing: Number(row.processing || 0),
    completed: Number(row.completed || 0),
    failed: Number(row.failed || 0),
    withoutData: Number(row.without_data || 0),
    cancelled: Number(row.cancelled || 0),
    errorSummary: Array.isArray(row.error_summary) ? (row.error_summary as unknown[]) : [],
    startedAt: (row.started_at as string) || null,
    finishedAt: (row.finished_at as string) || null,
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
  };
}

export function apBatchRunToSupabase(
  row: Pick<
    BatchRunRow,
    "id" | "campaignId" | "status" | "filters" | "total" | "pending"
  >,
): Record<string, unknown> {
  return {
    id: row.id,
    campaign_id: row.campaignId,
    status: row.status,
    filters: row.filters,
    total: row.total,
    pending: row.pending,
  };
}

export function apBatchRunPatchToSupabase(
  patch: Partial<
    Pick<
      BatchRunRow,
      | "status"
      | "total"
      | "pending"
      | "processing"
      | "completed"
      | "failed"
      | "withoutData"
      | "cancelled"
      | "startedAt"
      | "finishedAt"
    >
  >,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.total !== undefined) out.total = patch.total;
  if (patch.pending !== undefined) out.pending = patch.pending;
  if (patch.processing !== undefined) out.processing = patch.processing;
  if (patch.completed !== undefined) out.completed = patch.completed;
  if (patch.failed !== undefined) out.failed = patch.failed;
  if (patch.withoutData !== undefined) out.without_data = patch.withoutData;
  if (patch.cancelled !== undefined) out.cancelled = patch.cancelled;
  if (patch.startedAt !== undefined) out.started_at = patch.startedAt;
  if (patch.finishedAt !== undefined) out.finished_at = patch.finishedAt;
  return out;
}

// ─── Batch company run ↔ ap_batch_company_runs ──────────────────

export interface BatchCompanyRunRow {
  batchRunId: string;
  companyId: string;
  status: BatchCompanyStatus;
  errorCode: string;
  errorMessage: string;
  retryCount: number;
  nextRetryAt: string | null;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function apBatchCompanyRunFromSupabase(
  row: Record<string, unknown>,
): BatchCompanyRunRow {
  return {
    batchRunId: row.batch_run_id as string,
    companyId: row.company_id as string,
    status: (row.status as BatchCompanyStatus) || "pendente",
    errorCode: (row.error_code as string) || "",
    errorMessage: (row.error_message as string) || "",
    retryCount: Number(row.retry_count || 0),
    nextRetryAt: (row.next_retry_at as string) || null,
    claimedAt: (row.claimed_at as string) || null,
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
  };
}

export function apBatchCompanyRunToSupabase(
  row: Pick<BatchCompanyRunRow, "batchRunId" | "companyId">,
): Record<string, unknown> {
  return {
    batch_run_id: row.batchRunId,
    company_id: row.companyId,
    status: "pendente",
  };
}

export function apBatchCompanyRunPatchToSupabase(
  patch: Partial<
    Pick<
      BatchCompanyRunRow,
      | "status"
      | "errorCode"
      | "errorMessage"
      | "retryCount"
      | "nextRetryAt"
      | "claimedAt"
    >
  >,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.errorCode !== undefined) out.error_code = patch.errorCode;
  if (patch.errorMessage !== undefined) out.error_message = patch.errorMessage;
  if (patch.retryCount !== undefined) out.retry_count = patch.retryCount;
  if (patch.nextRetryAt !== undefined) out.next_retry_at = patch.nextRetryAt;
  if (patch.claimedAt !== undefined) out.claimed_at = patch.claimedAt;
  return out;
}
