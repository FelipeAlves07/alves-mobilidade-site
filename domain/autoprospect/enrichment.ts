import type { ProspectCompany } from "./types";

// ─── Limites de coleta (conteúdo público, sem crawling agressivo) ───

export const ENRICHMENT_CONFIG = {
  timeoutMs: 12_000,
  maxBytes: 1_500_000,
  maxPages: 6,
  maxRedirects: 3,
} as const;

// ─── Sinais comerciais (determinísticos) ────────────────────────

export type SignalCategory =
  | "eventos_corporativos"
  | "atendimento_empresarial"
  | "turismo_hospedagem"
  | "viagens"
  | "executivos"
  | "eventos_sociais";

export interface EnrichmentSignal {
  category: SignalCategory;
  label: string;
  snippet: string;
  sourceUrl: string;
}

export const SIGNAL_RULES: { category: SignalCategory; label: string; patterns: string[] }[] = [
  {
    category: "eventos_corporativos",
    label: "Eventos corporativos",
    patterns: [
      "eventos corporativos", "congresso", "convenção", "convencao", "seminário", "seminario",
      "conferência", "conferencia", "feira de negócios", "workshop", "simpósio", "simposio",
      "eventos empresariais",
    ],
  },
  {
    category: "atendimento_empresarial",
    label: "Atendimento a empresas (B2B)",
    patterns: [
      "corporativo", "corporativos", "atendemos empresas", "clientes corporativos",
      "para empresas", "soluções empresariais", "b2b", "empresarial", "business",
    ],
  },
  {
    category: "turismo_hospedagem",
    label: "Turismo e hospedagem",
    patterns: [
      "turismo", "hotel", "pousada", "resort", "hospedagem", "city tour", "receptivo",
      "hóspedes", "hospedes", "acomodação", "acomodacao",
    ],
  },
  {
    category: "viagens",
    label: "Viagens e deslocamentos",
    patterns: [
      "viagem", "viagens", "aeroporto", "transfer", "traslado", "excursão", "excursao",
      "roteiro", "intermunicipal",
    ],
  },
  {
    category: "executivos",
    label: "Atendimento a executivos",
    patterns: [
      "executivo", "executivos", "diretoria", "alta direção", "alta direcao", "c-level",
      "presidência", "presidencia",
    ],
  },
  {
    category: "eventos_sociais",
    label: "Eventos sociais",
    patterns: [
      "casamento", "bodas", "recepção", "recepcao", "festa", "formatura", "aniversário",
      "aniversario", "eventos sociais",
    ],
  },
];

// ─── Tipos ──────────────────────────────────────────────────────

export type EnrichmentStatus = "ok" | "unavailable" | "error";

export interface EnrichmentOutcome {
  status: EnrichmentStatus;
  sourceUrl: string;
  fetchedPages: number;
  title: string;
  description: string;
  signals: EnrichmentSignal[];
  reason: string;
  collectedAt: string;
}

export interface EnrichmentProvider {
  readonly name: string;
  enrich(company: ProspectCompany): Promise<EnrichmentOutcome>;
}

// ─── Utilidades de texto/HTML ───────────────────────────────────

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)));
}

export function extractText(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const text = withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return decodeEntities(text);
}

export function extractTitle(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i);
  if (og) return decodeEntities(og[1].trim());
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return title ? decodeEntities(title[1].replace(/\s+/g, " ").trim()) : "";
}

export function extractDescription(html: string): string {
  const meta = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i)
    || html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["'][^>]*>/i);
  return meta ? decodeEntities(meta[1].replace(/\s+/g, " ").trim()) : "";
}

export function extractLinks(html: string, baseUrl: URL): string[] {
  const links: string[] = [];
  const hrefPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefPattern.exec(html)) !== null) {
    try {
      const resolved = new URL(match[1], baseUrl);
      if (resolved.origin !== baseUrl.origin) continue;
      const path = resolved.pathname.toLowerCase();
      if (path === "/" || path === "") continue;
      if (/(\.pdf|\.zip|\.rar|\.jpg|\.png|\.webp|\.gif|\.svg|\.ico|\.css|\.js)$/i.test(path)) continue;
      links.push(resolved.toString());
    } catch {
      // href inválido é ignorado
    }
  }
  return [...new Set(links)];
}

function sentenceWindow(text: string, index: number, maxLength = 130): string {
  const start = Math.max(0, index - Math.floor(maxLength / 3));
  const end = Math.min(text.length, index + Math.floor((maxLength * 2) / 3));
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (snippet.length >= maxLength) snippet = `${snippet.slice(0, maxLength - 3)}...`;
  return snippet;
}

export function detectSignals(
  text: string,
  sourceUrl: string,
): EnrichmentSignal[] {
  const lower = text.toLowerCase();
  const signals: EnrichmentSignal[] = [];
  for (const rule of SIGNAL_RULES) {
    let matchedIndex = -1;
    for (const pattern of rule.patterns) {
      const index = lower.indexOf(pattern);
      if (index !== -1) {
        matchedIndex = index;
        break;
      }
    }
    if (matchedIndex === -1) continue;
    signals.push({
      category: rule.category,
      label: rule.label,
      snippet: sentenceWindow(text, matchedIndex),
      sourceUrl,
    });
  }
  return signals;
}

// ─── Robots.txt (regras simples, sem burlar bloqueios) ─────────

export interface RobotsRules {
  allowed: boolean;
  disallowedPaths: string[];
}

export function parseRobotsTxt(content: string): RobotsRules {
  const disallowedPaths: string[] = [];
  let inGlobalSection = true;
  let anyAgent = false;
  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/^[\s\uFEFF]+|[\s\r]+$/g, "");
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("User-agent:")) {
      const agent = line.slice("User-agent:".length).trim().toLowerCase();
      if (agent === "*") {
        inGlobalSection = true;
        anyAgent = true;
      } else {
        inGlobalSection = false;
      }
      continue;
    }
    if (inGlobalSection && line.startsWith("Disallow:")) {
      const path = line.slice("Disallow:".length).trim();
      if (!path) continue;
      if (path === "/") {
        disallowedPaths.length = 0;
        disallowedPaths.push("/");
      } else {
        disallowedPaths.push(path);
      }
    }
  }
  if (!anyAgent) {
    for (const rawLine of content.split("\n")) {
      const line = rawLine.replace(/^[\s\uFEFF]+|[\s\r]+$/g, "");
      if (!line || line.startsWith("#")) continue;
      if (line.startsWith("Disallow:")) {
        const path = line.slice("Disallow:".length).trim();
        if (!path) continue;
        if (path === "/") {
          disallowedPaths.length = 0;
          disallowedPaths.push("/");
        } else {
          disallowedPaths.push(path);
        }
      }
    }
  }
  return {
    allowed: disallowedPaths.length === 0,
    disallowedPaths,
  };
}

export function isPathAllowed(path: string, rules: RobotsRules): boolean {
  if (rules.disallowedPaths.includes("/")) return false;
  const lowerPath = path.toLowerCase();
  return !rules.disallowedPaths.some((disallowed) => lowerPath.startsWith(disallowed.toLowerCase()));
}

// ─── Fetch com limites (timeout, tamanho, redirecionamento) ─────

export interface FetchLimits {
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
  maxPages: number;
}

async function fetchWithLimits(
  url: string,
  limits: FetchLimits,
  redirectsLeft: number,
): Promise<{ ok: boolean; status: number; url: string; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), limits.timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AME-Control-AutoProspect/1.0 (alves-mobilidade)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "manual",
      signal: controller.signal,
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location && redirectsLeft > 0) {
        const nextUrl = new URL(location, url);
        if (nextUrl.origin === new URL(url).origin) {
          return fetchWithLimits(nextUrl.toString(), limits, redirectsLeft - 1);
        }
      }
      return { ok: false, status: response.status, url, text: "" };
    }
    if (!response.ok) {
      return { ok: false, status: response.status, url, text: "" };
    }
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > limits.maxBytes) {
      return { ok: false, status: 413, url, text: "" };
    }
    let body = "";
    const reader = response.body?.getReader();
    if (reader) {
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > limits.maxBytes) {
          reader.cancel().catch(() => {});
          return { ok: true, status: 200, url: response.url || url, text: body };
        }
        body += new TextDecoder().decode(value, { stream: true });
      }
    } else {
      body = await response.text();
      if (body.length > limits.maxBytes) body = body.slice(0, limits.maxBytes);
    }
    return { ok: true, status: response.status, url: response.url || url, text: body };
  } catch {
    return { ok: false, status: 0, url, text: "" };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Provider de site (fonte oficial da empresa) ────────────────

const PREFERRED_PATH_KEYWORDS = [
  "servico", "servico", "sobre", "empresa", "evento", "contato", "quem-somos",
  "turismo", "viagem", "hotel", "corporativo", "institucional",
];

export class WebsiteEnrichmentProvider implements EnrichmentProvider {
  readonly name = "Website";

  constructor(private readonly limits: FetchLimits = ENRICHMENT_CONFIG) {}

  async enrich(company: ProspectCompany): Promise<EnrichmentOutcome> {
    const rawWebsite = company.website.trim();
    const collectedAt = new Date().toISOString();
    if (!rawWebsite) {
      return {
        status: "unavailable",
        sourceUrl: "",
        fetchedPages: 0,
        title: "",
        description: "",
        signals: [],
        reason: "A empresa não possui site cadastrado no Discovery.",
        collectedAt,
      };
    }

    let baseUrl: URL;
    try {
      baseUrl = new URL(rawWebsite.startsWith("http") ? rawWebsite : `https://${rawWebsite}`);
    } catch {
      return {
        status: "unavailable",
        sourceUrl: rawWebsite,
        fetchedPages: 0,
        title: "",
        description: "",
        signals: [],
        reason: "O endereço do site é inválido.",
        collectedAt,
      };
    }

    // 1. robots.txt
    const robotsUrl = new URL("/robots.txt", baseUrl).toString();
    const robots = await fetchWithLimits(robotsUrl, this.limits, this.limits.maxRedirects);
    const robotsRules = robots.ok
      ? parseRobotsTxt(robots.text)
      : { allowed: true, disallowedPaths: [] as string[] };

    if (!isPathAllowed("/", robotsRules)) {
      return {
        status: "unavailable",
        sourceUrl: baseUrl.toString(),
        fetchedPages: 0,
        title: "",
        description: "",
        signals: [],
        reason: "O site não autoriza acesso automatizado (robots.txt).",
        collectedAt,
      };
    }

    // 2. Página inicial
    const homepage = await fetchWithLimits(baseUrl.toString(), this.limits, this.limits.maxRedirects);
    if (!homepage.ok || homepage.status !== 200) {
      return {
        status: "unavailable",
        sourceUrl: baseUrl.toString(),
        fetchedPages: 0,
        title: "",
        description: "",
        signals: [],
        reason:
          homepage.status === 0
            ? "Não foi possível acessar o site (rede, timeout ou bloqueio)."
            : "O site respondeu com erro (HTTP " + homepage.status + ").",
        collectedAt,
      };
    }

    const pages: { url: string; html: string }[] = [{ url: homepage.url, html: homepage.text }];

    // 3. Páginas relevantes (limite de páginas e tamanho)
    const candidates = extractLinks(homepage.text, baseUrl);
    candidates.sort((a, b) => {
      const scoreA = PREFERRED_PATH_KEYWORDS.some((k) => a.toLowerCase().includes(k)) ? 0 : 1;
      const scoreB = PREFERRED_PATH_KEYWORDS.some((k) => b.toLowerCase().includes(k)) ? 0 : 1;
      return scoreA - scoreB;
    });

    for (const candidate of candidates) {
      if (pages.length >= this.limits.maxPages) break;
      const path = new URL(candidate).pathname;
      if (!isPathAllowed(path, robotsRules)) continue;
      const fetched = await fetchWithLimits(candidate, this.limits, this.limits.maxRedirects);
      if (fetched.ok && fetched.status === 200 && fetched.text.trim()) {
        pages.push({ url: fetched.url, html: fetched.text });
      }
    }

    // 4. Extração + sinais
    const allTextParts: string[] = [];
    let title = "";
    let description = "";
    const signals: EnrichmentSignal[] = [];

    for (const page of pages) {
      const pageTitle = extractTitle(page.html);
      const pageDescription = extractDescription(page.html);
      const pageText = extractText(page.html);
      if (!title && pageTitle) title = pageTitle;
      if (!description && pageDescription) description = pageDescription;
      if (pageText) allTextParts.push(pageText);
      signals.push(...detectSignals(pageText, page.url));
      if (pageTitle && page.url === pages[0].url && !description) {
        description = pageText.slice(0, 220);
      }
    }

    // Deduplica sinais por categoria (primeira ocorrência é a mais relevante)
    const seenCategories = new Set<SignalCategory>();
    const uniqueSignals: EnrichmentSignal[] = [];
    for (const signal of signals) {
      if (seenCategories.has(signal.category)) continue;
      seenCategories.add(signal.category);
      uniqueSignals.push(signal);
    }

    return {
      status: "ok",
      sourceUrl: baseUrl.toString(),
      fetchedPages: pages.length,
      title,
      description,
      signals: uniqueSignals,
      reason: "",
      collectedAt,
    };
  }
}

export function createEnrichmentProvider(name = "website"): EnrichmentProvider {
  if (name === "website") return new WebsiteEnrichmentProvider();
  throw new Error(`Provider de enriquecimento desconhecido: ${name}`);
}
