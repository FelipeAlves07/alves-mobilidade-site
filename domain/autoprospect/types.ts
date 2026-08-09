export type AutoProspectCampaignStatus =
  | "Rascunho"
  | "Ativa"
  | "Pausada"
  | "Encerrada";

export interface AutoProspectCampaign {
  id: string;
  name: string;
  location: string;
  segments: string[];
  keyword: string;
  objective: string;
  targetCount: number;
  status: AutoProspectCampaignStatus;
  createdAt: string;
}

export interface AutoProspectCampaignForm
  extends Omit<AutoProspectCampaign, "id" | "createdAt"> {}

export interface ProspectCompany {
  id: string;
  name: string;
  segment: string;
  city: string;
  state: string;
  address: string;
  website: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  linkedin: string;
  notes: string;
  source: string;
  collectedAt: string;
  createdAt: string;
}

export interface ProspectCompanyForm
  extends Omit<ProspectCompany, "id" | "createdAt" | "collectedAt"> {}

export interface ProspectDiscovery {
  id: string;
  companyId: string;
  campaignId: string | null;
  source: string;
  url: string;
  createdAt: string;
}

export interface ProspectDiscoveryForm
  extends Omit<ProspectDiscovery, "id" | "createdAt"> {}
