import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detectSignals,
  extractDescription,
  extractLinks,
  extractText,
  extractTitle,
  isPathAllowed,
  parseRobotsTxt,
  WebsiteEnrichmentProvider,
  ENRICHMENT_CONFIG,
} from "@/domain/autoprospect/enrichment";
import type { ProspectCompany } from "@/domain/autoprospect/types";

const COMPANY_WITH_SITE: ProspectCompany = {
  id: "c1",
  name: "Empresa Teste LTDA",
  segment: "Agências de eventos",
  city: "Belo Horizonte",
  state: "MG",
  address: "",
  website: "https://empresateste.com.br",
  phone: "",
  whatsapp: "",
  email: "",
  instagram: "",
  linkedin: "",
  notes: "",
  source: "Test",
  collectedAt: "",
  createdAt: "",
};

const COMPANY_NO_SITE: ProspectCompany = { ...COMPANY_WITH_SITE, website: "" };

const COMPANY_BAD_URL: ProspectCompany = { ...COMPANY_WITH_SITE, website: "not a url" };

interface StubResponse {
  ok: boolean;
  status: number;
  url: string;
  text: string;
  headers?: Record<string, string>;
  delayAbort?: boolean;
}

let fetchCalls: { url: string }[] = [];

function stubFetch(handler: (url: string) => StubResponse | Promise<StubResponse>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetchCalls.push({ url });
      return Promise.resolve(handler(url)).then((stub) => {
        if (stub.delayAbort) {
          return new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new Error("Aborted"));
            });
          });
        }
        return {
          ok: stub.ok,
          status: stub.status,
          url: stub.url,
          headers: {
            get: (name: string) => stub.headers?.[name] ?? null,
          },
          text: async () => stub.text,
        };
      });
    }),
  );
}

const HOME_HTML = `<!DOCTYPE html>
<html><head>
<title>Empresa Teste — Eventos Corporativos em BH</title>
<meta name="description" content="Organizamos congressos, convenções e eventos empresariais em Belo Horizonte." />
</head>
<body>
<h1>Empresa Teste</h1>
<p>Atendemos empresas com eventos corporativos, feiras e seminários. Também oferecemos viagens e transfers para aeroporto de Confins.</p>
<a href="/servicos-corporativos">Serviços</a>
<a href="/sobre">Sobre</a>
<a href="/contato">Contato</a>
<a href="https://outrosite.com.br/x">Externo</a>
</body></html>`;

const SERVICOS_HTML = `<!DOCTYPE html><html><head><title>Serviços corporativos</title></head>
<body><p>Executivos e diretoria de empresas: transporte executivo e recepção em aeroportos.</p></body></html>`;

function defaultStub(url: string): StubResponse {
  if (url.includes("/robots.txt")) return { ok: true, status: 200, url, text: "User-agent: *\nDisallow:" };
  if (url === "https://empresateste.com.br/" || url === "https://empresateste.com.br") {
    return { ok: true, status: 200, url, text: HOME_HTML };
  }
  if (url.includes("/servicos-corporativos")) return { ok: true, status: 200, url, text: SERVICOS_HTML };
  if (url.includes("/sobre") || url.includes("/contato")) {
    return { ok: true, status: 200, url, text: "<html><head><title>Pagina</title></head><body><p>Conteudo.</p></body></html>" };
  }
  return { ok: false, status: 404, url, text: "" };
}

describe("Enriquecimento — utilidades de HTML", () => {
  it("extrai título e descrição", () => {
    expect(extractTitle(HOME_HTML)).toBe("Empresa Teste — Eventos Corporativos em BH");
    expect(extractDescription(HOME_HTML)).toContain("congressos, convenções");
  });

  it("extrai texto sem tags e com entidades decodificadas", () => {
    const text = extractText("<p>a &amp; b</p><script>var x=1;</script>");
    expect(text).toContain("a & b");
    expect(text).not.toContain("script");
  });

  it("extrai apenas links do mesmo domínio", () => {
    const links = extractLinks(HOME_HTML, new URL("https://empresateste.com.br/"));
    expect(links).toContain("https://empresateste.com.br/servicos-corporativos");
    expect(links.some((link) => link.includes("outrosite.com.br"))).toBe(false);
  });

  it("detecta sinais e gera apenas um sinal por categoria", () => {
    const text = extractText(HOME_HTML) + " " + extractText(SERVICOS_HTML);
    const signals = detectSignals(text, "https://empresateste.com.br/");
    expect(signals.map((signal) => signal.category)).toContain("eventos_corporativos");
    expect(signals.map((signal) => signal.category)).toContain("atendimento_empresarial");
    const eventos = signals.filter((signal) => signal.category === "eventos_corporativos");
    expect(eventos.length).toBe(1);
    expect(eventos[0].sourceUrl).toBe("https://empresateste.com.br/");
  });
});

describe("Enriquecimento — robots.txt", () => {
  it("parseia regras globais", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /privado\nDisallow: /admin\n\nUser-agent: Bot\nDisallow: /tudo");
    expect(rules.allowed).toBe(false);
    expect(isPathAllowed("/publico", rules)).toBe(true);
    expect(isPathAllowed("/privado/x", rules)).toBe(false);
    expect(isPathAllowed("/admin", rules)).toBe(false);
  });

  it("trata Disallow: / como bloqueio total", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /");
    expect(isPathAllowed("/", rules)).toBe(false);
  });

  it("sem regras → tudo permitido", () => {
    const rules = parseRobotsTxt("# vazio");
    expect(rules.allowed).toBe(true);
    expect(isPathAllowed("/qualquer", rules)).toBe(true);
  });
});

describe("Enriquecimento — provider de site", () => {
  beforeEach(() => {
    fetchCalls = [];
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("site válido: coleta título, descrição e sinais com origem", async () => {
    stubFetch(defaultStub);
    const provider = new WebsiteEnrichmentProvider();
    const outcome = await provider.enrich(COMPANY_WITH_SITE);
    expect(outcome.status).toBe("ok");
    expect(outcome.title).toContain("Eventos Corporativos");
    expect(outcome.description).toContain("congressos");
    expect(outcome.signals.length).toBeGreaterThanOrEqual(2);
    expect(outcome.signals[0].sourceUrl).toMatch(/^https:\/\/empresateste\.com\.br/);
    expect(outcome.fetchedPages).toBeGreaterThan(1);
  });

  it("empresa sem site → enriquecimento indisponível", async () => {
    stubFetch(() => ({ ok: true, status: 200, url: "", text: "" }));
    const provider = new WebsiteEnrichmentProvider();
    const outcome = await provider.enrich(COMPANY_NO_SITE);
    expect(outcome.status).toBe("unavailable");
    expect(outcome.reason).toContain("não possui site");
    expect(outcome.signals).toEqual([]);
  });

  it("URL inválida → enriquecimento indisponível", async () => {
    const provider = new WebsiteEnrichmentProvider();
    const outcome = await provider.enrich(COMPANY_BAD_URL);
    expect(outcome.status).toBe("unavailable");
  });

  it("robots.txt proíbe acesso → enriquecimento indisponível", async () => {
    stubFetch((url) => {
      if (url.includes("/robots.txt")) return { ok: true, status: 200, url, text: "User-agent: *\nDisallow: /" };
      return { ok: true, status: 200, url, text: HOME_HTML };
    });
    const provider = new WebsiteEnrichmentProvider();
    const outcome = await provider.enrich(COMPANY_WITH_SITE);
    expect(outcome.status).toBe("unavailable");
    expect(outcome.reason).toContain("robots.txt");
    expect(fetchCalls.filter((call) => !call.url.includes("/robots.txt")).length).toBe(0);
  });

  it("site inacessível (falha de rede) → indisponível", async () => {
    stubFetch(() => {
      throw new Error("network down");
    });
    const provider = new WebsiteEnrichmentProvider();
    const outcome = await provider.enrich(COMPANY_WITH_SITE);
    expect(outcome.status).toBe("unavailable");
    expect(outcome.reason).toMatch(/rede|timeout|bloqueio/i);
  });

  it("timeout → indisponível", async () => {
    stubFetch(() => ({ ok: true, status: 200, url: "https://empresateste.com.br/", text: "", delayAbort: true }));
    const provider = new WebsiteEnrichmentProvider({ ...ENRICHMENT_CONFIG, timeoutMs: 50 });
    const outcome = await provider.enrich(COMPANY_WITH_SITE);
    expect(outcome.status).toBe("unavailable");
    expect(outcome.reason).toMatch(/rede|timeout|bloqueio/i);
  });

  it("resposta HTTP de erro → indisponível com código", async () => {
    stubFetch((url) => {
      if (url.includes("/robots.txt")) return { ok: true, status: 200, url, text: "User-agent: *" };
      return { ok: false, status: 500, url, text: "" };
    });
    const provider = new WebsiteEnrichmentProvider();
    const outcome = await provider.enrich(COMPANY_WITH_SITE);
    expect(outcome.status).toBe("unavailable");
    expect(outcome.reason).toContain("HTTP 500");
  });

  it("conteúdo vazio → ok sem sinais", async () => {
    stubFetch((url) => {
      if (url.includes("/robots.txt")) return { ok: true, status: 200, url, text: "User-agent: *" };
      return { ok: true, status: 200, url, text: "<html><body></body></html>" };
    });
    const provider = new WebsiteEnrichmentProvider();
    const outcome = await provider.enrich(COMPANY_WITH_SITE);
    expect(outcome.status).toBe("ok");
    expect(outcome.signals).toEqual([]);
    expect(outcome.title).toBe("");
  });

  it("limita o número de páginas coletadas", async () => {
    const manyLinks = Array.from({ length: 12 }, (_v, index) => `<a href="/pagina-${index}">link</a>`).join("");
    stubFetch((url) => {
      if (url.includes("/robots.txt")) return { ok: true, status: 200, url, text: "User-agent: *" };
      if (url.endsWith("/")) return { ok: true, status: 200, url, text: `<html><head><title>Home</title></head><body>${manyLinks}</body></html>` };
      return { ok: true, status: 200, url, text: "<html><head><title>P</title></head><body><p>Conteudo com viagens e aeroporto.</p></body></html>" };
    });
    const provider = new WebsiteEnrichmentProvider({ ...ENRICHMENT_CONFIG, maxPages: 3 });
    const outcome = await provider.enrich(COMPANY_WITH_SITE);
    expect(outcome.status).toBe("ok");
    expect(outcome.fetchedPages).toBeLessThanOrEqual(3);
  });

  it("limita o tamanho da resposta", async () => {
    const bigHtml = `<html><head><title>Grande Site</title></head><body>${"x".repeat(2000)}</body></html>`;
    stubFetch((url) => {
      if (url.includes("/robots.txt")) return { ok: true, status: 200, url, text: "User-agent: *" };
      return { ok: true, status: 200, url, text: bigHtml };
    });
    const provider = new WebsiteEnrichmentProvider({ ...ENRICHMENT_CONFIG, maxBytes: 500, maxPages: 1 });
    const outcome = await provider.enrich(COMPANY_WITH_SITE);
    expect(outcome.status).toBe("ok");
    expect(outcome.title).toBe("Grande Site");
  });

  it("redirecionamento externo é ignorado", async () => {
    stubFetch((url) => {
      if (url.includes("/robots.txt")) return { ok: true, status: 200, url, text: "User-agent: *" };
      if (url.endsWith("/")) return { ok: false, status: 302, url, text: "", headers: { location: "https://outro.com.br/" } };
      return { ok: true, status: 200, url, text: HOME_HTML };
    });
    const provider = new WebsiteEnrichmentProvider();
    const outcome = await provider.enrich(COMPANY_WITH_SITE);
    expect(outcome.status).toBe("unavailable");
  });

  it("deduplica sinais repetidos entre páginas (uma por categoria)", async () => {
    stubFetch((url) => {
      if (url.includes("/robots.txt")) return { ok: true, status: 200, url, text: "User-agent: *" };
      return { ok: true, status: 200, url, text: SERVICOS_HTML };
    });
    const provider = new WebsiteEnrichmentProvider();
    const outcome = await provider.enrich(COMPANY_WITH_SITE);
    const categories = outcome.signals.map((signal) => signal.category);
    expect(new Set(categories).size).toBe(categories.length);
    expect(outcome.signals.filter((s) => s.category === "atendimento_empresarial").length).toBe(1);
    expect(outcome.signals.filter((s) => s.category === "executivos").length).toBe(1);
  });
});
