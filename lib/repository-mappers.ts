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

export function tripFormToSupabase(form: TripForm): Record<string, unknown> {
  const { origin, destination } = splitRoute(form.route);
  return {
    client_name: form.client,
    client_phone: form.phone,
    origin,
    destination,
    date: form.date,
    time: form.time,
    value: Number(form.value || 0),
    status: form.status,
  };
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
  });
}

export function financeFormToSupabase(form: FinanceEntryForm): Record<string, unknown> {
  return {
    description: form.description,
    value: Number(form.value),
    type: form.type,
    date: form.date,
  };
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
  });
}

export function referralFormToSupabase(form: ReferralForm): Record<string, unknown> {
  return {
    referrer_name: form.referrer,
    referred_name: form.referred,
    status: form.status,
    credits: Number(form.credits || 0),
  };
}

export function referralPatchToSupabase(patch: Partial<ReferralForm>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (patch.referrer !== undefined) result.referrer_name = patch.referrer;
  if (patch.referred !== undefined) result.referred_name = patch.referred;
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
