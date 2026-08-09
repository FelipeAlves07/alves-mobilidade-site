import type {
  ProspectCompany,
  ProspectCompanyForm,
  ProspectDiscovery,
  ProspectDiscoveryForm,
} from "./types";

export const ASSISTED_DISCOVERY_SOURCE = "Manual / Assisted Discovery";

export function normalizeCompanyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function findCompanyByName(
  companies: ProspectCompany[],
  name: string,
): ProspectCompany | undefined {
  const normalized = normalizeCompanyName(name);
  return companies.find((company) => normalizeCompanyName(company.name) === normalized);
}

export type DiscoveryResult =
  | { action: "created"; company: ProspectCompany; discovery: ProspectDiscovery }
  | { action: "linked"; company: ProspectCompany; discovery: ProspectDiscovery }
  | { action: "already-linked"; company: ProspectCompany };

export interface DiscoveryDeps {
  createCompany: (form: ProspectCompanyForm) => Promise<ProspectCompany>;
  createDiscovery: (form: ProspectDiscoveryForm) => Promise<ProspectDiscovery>;
}

export async function runDiscovery(
  companies: ProspectCompany[],
  discoveries: ProspectDiscovery[],
  form: ProspectCompanyForm,
  campaignId: string | null,
  deps: DiscoveryDeps,
  url = "",
): Promise<DiscoveryResult> {
  const source = form.source.trim() || ASSISTED_DISCOVERY_SOURCE;
  const existing = findCompanyByName(companies, form.name);

  if (existing) {
    const alreadyLinked = discoveries.some(
      (discovery) =>
        discovery.companyId === existing.id && discovery.campaignId === campaignId,
    );
    if (alreadyLinked) return { action: "already-linked", company: existing };

    const discovery = await deps.createDiscovery({
      companyId: existing.id,
      campaignId,
      source,
      url,
    });
    return { action: "linked", company: existing, discovery };
  }

  const company = await deps.createCompany({ ...form, source });
  const discovery = await deps.createDiscovery({
    companyId: company.id,
    campaignId,
    source,
    url,
  });
  return { action: "created", company, discovery };
}
