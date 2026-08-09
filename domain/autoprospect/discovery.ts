import type {
  AutoProspectCampaign,
  ProspectCompany,
  ProspectCompanyForm,
  ProspectDiscovery,
} from "./types";
import { normalizeCompanyName, runDiscovery, type DiscoveryDeps } from "./service";

// ─── Constantes ──────────────────────────────────────────────────

export const AUTOMATIC_DISCOVERY_SOURCE = "Automatic Discovery";
export const DEFAULT_PROVIDER_NAME = "OpenStreetMap";

export function buildSourceLabel(providerName = DEFAULT_PROVIDER_NAME): string {
  return `${AUTOMATIC_DISCOVERY_SOURCE} · ${providerName}`;
}

// ─── Tipos ───────────────────────────────────────────────────────

export interface DiscoveryCriteria {
  keyword: string;
  city: string;
  state: string;
  segments: string[];
  targetCount: number;
}

export interface RawCompanyResult {
  externalId: string;
  name: string;
  segment: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  whatsapp: string;
  website: string;
  email: string;
  instagram: string;
  notes: string;
  url: string;
}

export interface DiscoveryProvider {
  readonly name: string;
  search(criteria: DiscoveryCriteria): Promise<RawCompanyResult[]>;
}

export class DiscoveryProviderError extends Error {}

export interface AutomaticDiscoveryResultItem {
  action: "created" | "linked" | "already-linked" | "discarded";
  form: ProspectCompanyForm | null;
  company?: ProspectCompany;
}

export interface AutomaticDiscoveryCounts {
  found: number;
  created: number;
  linked: number;
  alreadyLinked: number;
  discarded: number;
}

export interface AutomaticDiscoveryOutcome {
  counts: AutomaticDiscoveryCounts;
  results: AutomaticDiscoveryResultItem[];
}

export interface AutomaticDiscoveryResponse {
  ok: boolean;
  counts?: AutomaticDiscoveryCounts;
  results?: AutomaticDiscoveryResultItem[];
  error?: string;
  detail?: string;
}

// ─── Normalização ────────────────────────────────────────────────

const UF_BY_STATE_NAME: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA", ceara: "CE",
  "distrito federal": "DF", "espirito santo": "ES", goias: "GO", maranhao: "MA",
  "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG", para: "PA",
  paraiba: "PB", parana: "PR", pernambuco: "PE", piaui: "PI", "rio de janeiro": "RJ",
  "rio grande do norte": "RN", "rio grande do sul": "RS", rondonia: "RO", roraima: "RR",
  "santa catarina": "SC", "sao paulo": "SP", sergipe: "SE", tocantins: "TO",
};

export function stateNameToUf(value: string): string {
  const cleaned = value.trim();
  if (!cleaned) return "";
  if (/^[A-Z]{2}$/i.test(cleaned)) return cleaned.toUpperCase();
  const normalized = cleaned
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return UF_BY_STATE_NAME[normalized] || "";
}

export function normalizePhone(value: string): string {
  let digits = (value || "").replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 8 || digits.length === 9) return digits;
  return "";
}

export function normalizeWebsite(value: string): string {
  const cleaned = (value || "").trim().replace(/[.,;:)]+$/, "");
  if (!cleaned) return "";
  if (!/^https?:\/\//i.test(cleaned)) return `https://${cleaned}`;
  return cleaned;
}

export function normalizeAutomaticResult(raw: RawCompanyResult): ProspectCompanyForm | null {
  const name = (raw.name || "").replace(/\s+/g, " ").trim();
  if (!name) return null;

  let instagram = (raw.instagram || "").trim();
  if (instagram && !instagram.startsWith("@")) instagram = `@${instagram}`;

  return {
    name,
    segment: (raw.segment || "").trim(),
    city: (raw.city || "").trim(),
    state: stateNameToUf(raw.state),
    address: (raw.address || "").replace(/\s+/g, " ").trim(),
    website: normalizeWebsite(raw.website),
    phone: normalizePhone(raw.phone),
    whatsapp: normalizePhone(raw.whatsapp),
    email: (raw.email || "").trim().toLowerCase(),
    instagram,
    linkedin: "",
    notes: (raw.notes || "").trim(),
    source: "",
  };
}

// ─── Orquestrador: reutiliza runDiscovery (dedup única) ──────────

export async function runAutomaticDiscovery(
  companies: ProspectCompany[],
  discoveries: ProspectDiscovery[],
  rawResults: RawCompanyResult[],
  campaignId: string | null,
  criteria: DiscoveryCriteria,
  deps: DiscoveryDeps,
  providerName = DEFAULT_PROVIDER_NAME,
): Promise<AutomaticDiscoveryOutcome> {
  const target = criteria.targetCount > 0 ? criteria.targetCount : Number.POSITIVE_INFINITY;
  const counts: AutomaticDiscoveryCounts = {
    found: rawResults.length,
    created: 0,
    linked: 0,
    alreadyLinked: 0,
    discarded: 0,
  };
  const results: AutomaticDiscoveryResultItem[] = [];
  const seen = new Set<string>();
  const source = buildSourceLabel(providerName);

  for (const raw of rawResults) {
    const form = normalizeAutomaticResult(raw);
    if (!form) {
      counts.discarded++;
      results.push({ action: "discarded", form: null });
      continue;
    }

    const batchKey = raw.externalId || normalizeCompanyName(form.name);
    if (seen.has(batchKey)) {
      counts.discarded++;
      results.push({ action: "discarded", form });
      continue;
    }
    seen.add(batchKey);

    if (counts.created + counts.linked >= target) {
      counts.discarded++;
      results.push({ action: "discarded", form });
      continue;
    }

    const outcome = await runDiscovery(
      companies,
      discoveries,
      { ...form, source },
      campaignId,
      deps,
      raw.url,
    );

    if (outcome.action === "created") {
      counts.created++;
      companies.push(outcome.company);
      discoveries.push(outcome.discovery);
    } else if (outcome.action === "linked") {
      counts.linked++;
      discoveries.push(outcome.discovery);
    } else {
      counts.alreadyLinked++;
    }
    results.push({ action: outcome.action, form, company: outcome.company });
  }

  return { counts, results };
}

// ─── Critérios a partir da campanha ──────────────────────────────

const UF_PATTERN =
  /\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/;

export function parseCriteriaFromCampaign(campaign: AutoProspectCampaign): DiscoveryCriteria {
  const raw = (campaign.location || "").trim();
  const firstPart = raw.split(/[/,–-]/)[0].trim();
  const city = firstPart.replace(/\s+-\s*[A-Z]{2}$/i, "").trim();
  const stateMatch = raw.toUpperCase().match(UF_PATTERN);
  return {
    keyword: (campaign.keyword || "").trim(),
    city,
    state: stateMatch?.[1] ?? "",
    segments: campaign.segments || [],
    targetCount: Number(campaign.targetCount || 0),
  };
}

// ─── Provider: OpenStreetMap (Overpass API) ──────────────────────

const SEGMENT_TO_OSM_RULES: Record<string, Array<{ k: string; v?: string }>> = {
  "Hotéis": [
    { k: "tourism", v: "hotel" },
    { k: "tourism", v: "guest_house" },
    { k: "tourism", v: "motel" },
    { k: "tourism", v: "hostel" },
  ],
  "Agências de turismo": [
    { k: "shop", v: "travel_agency" },
    { k: "office", v: "travel_agent" },
  ],
  "Agências de eventos": [
    { k: "amenity", v: "events_venue" },
    { k: "amenity", v: "conference_centre" },
  ],
  "Clínicas": [
    { k: "amenity", v: "clinic" },
    { k: "healthcare", v: "clinic" },
  ],
  "Faculdades": [
    { k: "amenity", v: "university" },
    { k: "amenity", v: "college" },
  ],
  "Escritórios": [{ k: "office" }],
  "Indústrias": [{ k: "industrial" }],
  "Empresas": [{ k: "office", v: "company" }],
};

export function segmentToOsmRules(segments: string[]): Array<{ k: string; v?: string }> {
  const rules: Array<{ k: string; v?: string }> = [];
  for (const segment of segments) {
    const mapped = SEGMENT_TO_OSM_RULES[segment.trim()] || [];
    for (const rule of mapped) {
      if (!rules.some((r) => r.k === rule.k && r.v === rule.v)) rules.push(rule);
    }
  }
  return rules;
}

export function escapeOverpassRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\"]/g, "\\$&");
}

export function buildOverpassQuery(
  criteria: DiscoveryCriteria,
  options: { maxResults?: number; relaxArea?: boolean } = {},
): string {
  const city = escapeOverpassRegex(criteria.city.trim());
  const areaFilter = options.relaxArea
    ? `area["name"="${city}"]["boundary"="administrative"]`
    : `area["name"="${city}"]["boundary"="administrative"]["admin_level"="8"]`;
  const members: string[] = [];

  for (const rule of segmentToOsmRules(criteria.segments)) {
    members.push(rule.v ? `nwr["${rule.k}"="${rule.v}"](area.a);` : `nwr["${rule.k}"](area.a);`);
  }

  const keyword = criteria.keyword.trim().replace(/\s+/g, " ");
  if (keyword) {
    const pattern = escapeOverpassRegex(keyword).replace(/ /g, ".*");
    members.push(`nwr[~"^(name)$"~"${pattern}",i](area.a);`);
  }

  const limit = options.maxResults ?? 60;
  return `[out:json][timeout:25][maxsize:33554432];${areaFilter}->.a;(\n  ${members.join(
    "\n  ",
  )}\n);out center tags ${limit};`;
}

const TAG_TO_SEGMENT_LABEL: Record<string, string> = {
  restaurant: "Restaurante", cafe: "Café", bar: "Bar", pub: "Pub", fast_food: "Fast food",
  hotel: "Hotel", guest_house: "Pousada", hostel: "Hostel", motel: "Motel",
  clinic: "Clínica", hospital: "Hospital", dentist: "Dentista", pharmacy: "Farmácia",
  university: "Universidade", college: "Faculdade", school: "Escola",
  travel_agency: "Agência de turismo", travel_agent: "Agência de turismo",
  events_venue: "Espaço de eventos", conference_centre: "Centro de eventos",
  company: "Empresa", events: "Agência de eventos", industrial: "Indústria",
  warehouse: "Depósito", supermarket: "Supermercado", gym: "Academia",
  hairdresser: "Salão de beleza", bakery: "Padaria", car_repair: "Oficina mecânica",
};

function tagToSegmentLabel(tags: Record<string, string>): string {
  const candidates: Array<[string, string]> = [
    ["shop", "Comércio"], ["office", "Escritório"], ["craft", "Artesanato"],
    ["tourism", "Turismo"], ["leisure", "Lazer"], ["amenity", "Serviço"],
    ["healthcare", "Saúde"], ["industrial", "Indústria"], ["man_made", "Estrutura"],
  ];
  for (const [key, prefix] of candidates) {
    const value = tags[key];
    if (!value) continue;
    const label = TAG_TO_SEGMENT_LABEL[value] || `${prefix} (${value})`;
    return label;
  }
  return "";
}

export interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
}

export function mapOsmElement(element: OverpassElement, fallbackCity: string): RawCompanyResult | null {
  const tags = element.tags || {};
  const name = (tags.name || "").replace(/\s+/g, " ").trim();
  if (!name) return null;

  const street = tags["addr:street"] || "";
  const housenumber = tags["addr:housenumber"] || "";
  const suburb = tags["addr:suburb"] || tags["addr:district"] || "";
  const postcode = tags["addr:postcode"] || "";
  const address = [street, housenumber, suburb, postcode].filter(Boolean).join(", ");

  const phone = normalizePhone(tags.phone || tags["contact:phone"] || tags["phone:mobile"] || "");
  const whatsapp = normalizePhone(tags["contact:whatsapp"] || "");
  const website = normalizeWebsite(tags.website || tags["contact:website"] || tags["contact:url"] || "");
  const email = (tags.email || tags["contact:email"] || "").trim().toLowerCase();

  let instagram = (tags["contact:instagram"] || tags.instagram || "").trim();
  if (instagram && !instagram.startsWith("@")) instagram = `@${instagram}`;

  const tagSummary = Object.entries(tags)
    .filter(([key]) => key !== "name")
    .slice(0, 12)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");

  const externalId = `${element.type}/${element.id}`;
  const notes = `Origem: OpenStreetMap (OSM ${externalId}).${tagSummary ? ` Tags: ${tagSummary}.` : ""}`;

  return {
    externalId,
    name,
    segment: tagToSegmentLabel(tags),
    city: (tags["addr:city"] || fallbackCity || "").trim(),
    state: stateNameToUf(tags["addr:state"] || ""),
    address,
    phone,
    whatsapp,
    website,
    email,
    instagram,
    notes,
    url: `https://www.openstreetmap.org/${externalId}`,
  };
}

export interface OverpassProviderOptions {
  primaryUrl?: string;
  fallbackUrl?: string;
  timeoutMs?: number;
  maxResults?: number;
}

export class OverpassProvider implements DiscoveryProvider {
  readonly name = DEFAULT_PROVIDER_NAME;

  constructor(private readonly options: OverpassProviderOptions = {}) {}

  async search(criteria: DiscoveryCriteria): Promise<RawCompanyResult[]> {
    if (!criteria.city.trim()) return [];
    if (!criteria.keyword.trim() && criteria.segments.length === 0) return [];

    const urls: string[] = [
      this.options.primaryUrl || "https://overpass-api.de/api/interpreter",
    ];
    const fallbackUrl = this.options.fallbackUrl || "https://overpass.kumi.systems/api/interpreter";
    if (!urls.includes(fallbackUrl)) urls.push(fallbackUrl);

    const timeoutMs = this.options.timeoutMs || 30000;
    const maxResults = this.options.maxResults || 60;

    const strict = await this.queryInstances(buildOverpassQuery(criteria, { maxResults }), urls, timeoutMs);
    if (strict.length > 0) return this.mapElements(strict, criteria.city);

    const relaxed = await this.queryInstances(
      buildOverpassQuery(criteria, { maxResults, relaxArea: true }),
      urls,
      timeoutMs,
    );
    return this.mapElements(relaxed, criteria.city);
  }

  private mapElements(elements: OverpassElement[], city: string): RawCompanyResult[] {
    return elements
      .map((element) => mapOsmElement(element, city))
      .filter((result): result is RawCompanyResult => result !== null);
  }

  private async queryInstances(
    query: string,
    urls: string[],
    timeoutMs: number,
  ): Promise<OverpassElement[]> {
    let lastError: Error | null = null;
    for (const url of urls) {
      try {
        return await this.fetchElements(url, query, timeoutMs);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    throw lastError ?? new DiscoveryProviderError("Não foi possível consultar a fonte de dados.");
  }

  private async fetchElements(url: string, query: string, timeoutMs: number): Promise<OverpassElement[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "AME-Control-AutoProspect/1.0 (alves-mobilidade)",
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
        cache: "no-store",
      });
    } catch {
      if (controller.signal.aborted) {
        throw new DiscoveryProviderError(
          "A pesquisa demorou mais que o limite e foi interrompida. Tente novamente com uma busca menor.",
        );
      }
      throw new DiscoveryProviderError(
        "Não foi possível acessar a fonte de dados. Tente novamente em instantes.",
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new DiscoveryProviderError(
          "A fonte de dados está temporariamente limitada. Aguarde um pouco e tente novamente.",
        );
      }
      if (response.status === 504 || response.status === 503) {
        throw new DiscoveryProviderError(
          "A fonte de dados está sobrecarregada. Tente novamente em instantes.",
        );
      }
      throw new DiscoveryProviderError(
        "A fonte de dados retornou um erro inesperado. Tente novamente.",
      );
    }

    const json = (await response.json().catch(() => null)) as { elements?: OverpassElement[] } | null;
    if (!json || !Array.isArray(json.elements)) {
      throw new DiscoveryProviderError("A fonte de dados retornou uma resposta inválida.");
    }
    return json.elements;
  }
}

export function createDiscoveryProvider(providerName = "overpass"): DiscoveryProvider {
  if (providerName === "overpass") return new OverpassProvider();
  throw new DiscoveryProviderError(`Provedor de descoberta desconhecido: ${providerName}`);
}
