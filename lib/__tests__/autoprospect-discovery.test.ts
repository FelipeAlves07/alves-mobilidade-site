import { describe, it, expect, vi, afterEach } from "vitest";
import {
  AUTOMATIC_DISCOVERY_SOURCE,
  buildOverpassQuery,
  buildSourceLabel,
  createDiscoveryProvider,
  DiscoveryProviderError,
  escapeOverpassRegex,
  mapOsmElement,
  normalizeAutomaticResult,
  normalizePhone,
  normalizeWebsite,
  OverpassProvider,
  parseCriteriaFromCampaign,
  runAutomaticDiscovery,
  segmentToOsmRules,
  stateNameToUf,
  type DiscoveryCriteria,
  type RawCompanyResult,
  type OverpassElement,
} from "@/domain/autoprospect/discovery";
import type {
  AutoProspectCampaign,
  ProspectCompany,
  ProspectDiscovery,
} from "@/domain/autoprospect/types";
import { normalizeCompanyName } from "@/domain/autoprospect/service";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function criteria(overrides: Partial<DiscoveryCriteria> = {}): DiscoveryCriteria {
  return {
    keyword: "buffet",
    city: "Belo Horizonte",
    state: "MG",
    segments: ["Hotéis"],
    targetCount: 10,
    ...overrides,
  };
}

function rawCompany(overrides: Partial<RawCompanyResult> = {}): RawCompanyResult {
  return {
    externalId: "node/1001",
    name: "Restaurante Buffet XPTO",
    segment: "Restaurante",
    city: "Belo Horizonte",
    state: "MG",
    address: "Rua A, 100, Centro",
    phone: "(31) 3222-0000",
    whatsapp: "",
    website: "https://xpto.com.br",
    email: "contato@xpto.com.br",
    instagram: "@xpto",
    notes: "Origem: OpenStreetMap (OSM node/1001).",
    url: "https://www.openstreetmap.org/node/1001",
    ...overrides,
  };
}

function makeCompany(id: string, name: string): ProspectCompany {
  return {
    id, name, segment: "", city: "", state: "", address: "", website: "", phone: "",
    whatsapp: "", email: "", instagram: "", linkedin: "", notes: "",
    source: "Manual / Assisted Discovery", collectedAt: "2026-08-07T10:00:00Z", createdAt: "2026-08-07T10:00:00Z",
  };
}

function makeDiscovery(id: string, companyId: string, campaignId: string | null): ProspectDiscovery {
  return { id, companyId, campaignId, source: "x", url: "", createdAt: "2026-08-07T10:00:00Z" };
}

function fakeDeps() {
  return {
    createCompany: vi.fn(async (form) => {
      const id = `company-${form.name}`;
      return { ...form, id, collectedAt: "2026-08-07T10:00:00Z", createdAt: "2026-08-07T10:00:00Z" };
    }),
    createDiscovery: vi.fn(async (form) => {
      const id = `discovery-${form.companyId}-${form.campaignId ?? "none"}-${Math.random()}`;
      return { ...form, id, createdAt: "2026-08-07T10:00:00Z" };
    }),
  };
}

function overpassElement(overrides: Partial<OverpassElement> = {}): OverpassElement {
  return {
    type: "node",
    id: 1001,
    tags: {
      name: "Restaurante Buffet XPTO",
      amenity: "restaurant",
      phone: "+55 31 3222-0000",
      website: "xpto.com.br",
      "addr:city": "Belo Horizonte",
      "addr:state": "Minas Gerais",
      "addr:street": "Rua A",
      "addr:housenumber": "100",
    },
    lat: -19.9,
    lon: -43.9,
    ...overrides,
  };
}

// ─── Normalização ──────────────────────────────────────────────

describe("normalizePhone", () => {
  it("formata fixo com DDD", () => {
    expect(normalizePhone("+55 (31) 3222-0000")).toBe("(31) 3222-0000");
  });
  it("formata celular com DDD", () => {
    expect(normalizePhone("31 99999-0000")).toBe("(31) 99999-0000");
  });
  it("mantém número local curto", () => {
    expect(normalizePhone("3222-0000")).toBe("32220000");
  });
  it("descarta lixo evidente", () => {
    expect(normalizePhone("lixo")).toBe("");
    expect(normalizePhone("")).toBe("");
  });
});

describe("normalizeWebsite", () => {
  it("adiciona https:// quando ausente", () => {
    expect(normalizeWebsite("xpto.com.br")).toBe("https://xpto.com.br");
  });
  it("mantém URL já completa", () => {
    expect(normalizeWebsite("https://xpto.com.br/")).toBe("https://xpto.com.br/");
  });
  it("limpa pontuação final", () => {
    expect(normalizeWebsite("xpto.com.br.")).toBe("https://xpto.com.br");
  });
});

describe("stateNameToUf", () => {
  it("converte nome completo do estado em UF", () => {
    expect(stateNameToUf("Minas Gerais")).toBe("MG");
    expect(stateNameToUf("São Paulo")).toBe("SP");
    expect(stateNameToUf("Rio Grande do Sul")).toBe("RS");
  });
  it("mantém UF já abreviada", () => {
    expect(stateNameToUf("mg")).toBe("MG");
  });
  it("retorna vazio para valor inválido", () => {
    expect(stateNameToUf("Narnia")).toBe("");
  });
});

describe("normalizeAutomaticResult", () => {
  it("normaliza empresa válida", () => {
    const form = normalizeAutomaticResult(
      rawCompany({ phone: "+55 (31) 3222-0000", website: "xpto.com.br", email: " CONTATO@XPTO.COM.BR " }),
    );
    expect(form).not.toBeNull();
    expect(form!.phone).toBe("(31) 3222-0000");
    expect(form!.website).toBe("https://xpto.com.br");
    expect(form!.email).toBe("contato@xpto.com.br");
  });
  it("rejeita resultado sem nome", () => {
    expect(normalizeAutomaticResult(rawCompany({ name: "  " }))).toBeNull();
  });
  it("limpa nome com espaços múltiplos", () => {
    const form = normalizeAutomaticResult(rawCompany({ name: "  Restaurante  Buffet   XPTO  " }));
    expect(form!.name).toBe("Restaurante Buffet XPTO");
  });
});

// ─── Mapeamento OSM → RawCompanyResult ─────────────────────────

describe("mapOsmElement", () => {
  it("mapeia elemento com tags completas", () => {
    const result = mapOsmElement(overpassElement(), "Belo Horizonte");
    expect(result).not.toBeNull();
    expect(result!.externalId).toBe("node/1001");
    expect(result!.name).toBe("Restaurante Buffet XPTO");
    expect(result!.segment).toBe("Restaurante");
    expect(result!.city).toBe("Belo Horizonte");
    expect(result!.state).toBe("MG");
    expect(result!.address).toBe("Rua A, 100");
    expect(result!.phone).toBe("(31) 3222-0000");
    expect(result!.website).toBe("https://xpto.com.br");
    expect(result!.url).toBe("https://www.openstreetmap.org/node/1001");
    expect(result!.notes).toContain("OSM node/1001");
  });
  it("ignora elemento sem nome", () => {
    expect(mapOsmElement(overpassElement({ tags: { amenity: "restaurant" } }), "Belo Horizonte")).toBeNull();
  });
  it("trata resultado incompleto (sem telefone/site)", () => {
    const result = mapOsmElement(
      overpassElement({ tags: { name: "Buffet Sem Dados" } }),
      "Belo Horizonte",
    );
    expect(result!.phone).toBe("");
    expect(result!.website).toBe("");
    expect(result!.segment).toBe("");
  });
  it("deriva cidade da busca quando addr:city ausente", () => {
    const result = mapOsmElement(overpassElement({ tags: { name: "X" } }), "Belo Horizonte");
    expect(result!.city).toBe("Belo Horizonte");
  });
});

// ─── Query Overpass ────────────────────────────────────────────

describe("buildOverpassQuery", () => {
  it("inclui área, regras de segmento, keyword e limite", () => {
    const query = buildOverpassQuery(criteria(), { maxResults: 30 });
    expect(query).toContain('area["name"="Belo Horizonte"]["boundary"="administrative"]["admin_level"="8"]');
    expect(query).toContain('nwr["tourism"="hotel"](area.a);');
    expect(query).toContain('nwr[~"^(name)$"~"buffet",i](area.a);');
    expect(query).toContain("out center tags 30;");
  });
  it("remove filtro admin_level na variante relaxada", () => {
    const query = buildOverpassQuery(criteria(), { relaxArea: true });
    expect(query).not.toContain("admin_level");
  });
  it("escapa caracteres especiais da palavra-chave", () => {
    const query = buildOverpassQuery(criteria({ keyword: "d'água & sal" }), {});
    expect(query).toContain(`nwr[~"^(name)$"~"d'água.*&.*sal",i](area.a);`);
  });
  it("converte segmentos desconhecidos corretamente", () => {
    const rules = segmentToOsmRules(["Hotéis", "Clínicas", "Segmento Desconhecido"]);
    expect(rules).toContainEqual({ k: "tourism", v: "hotel" });
    expect(rules).toContainEqual({ k: "healthcare", v: "clinic" });
    expect(rules).toEqual(expect.not.arrayContaining([{ k: "Segmento Desconhecido" }]));
  });
});

describe("escapeOverpassRegex", () => {
  it("escapa metacaracteres", () => {
    expect(escapeOverpassRegex("a.b(c)")).toBe("a\\.b\\(c\\)");
  });
});

// ─── Critérios a partir da campanha ────────────────────────────

describe("parseCriteriaFromCampaign", () => {
  function campaign(overrides: Partial<AutoProspectCampaign> = {}): AutoProspectCampaign {
    return {
      id: "c1", name: "Teste", location: "Belo Horizonte - MG", segments: ["Hotéis"],
      keyword: "buffet", objective: "", targetCount: 10, status: "Ativa", createdAt: "2026-08-07T10:00:00Z",
      ...overrides,
    };
  }
  it("extrai cidade e UF da localização", () => {
    const parsed = parseCriteriaFromCampaign(campaign());
    expect(parsed.city).toBe("Belo Horizonte");
    expect(parsed.state).toBe("MG");
    expect(parsed.keyword).toBe("buffet");
    expect(parsed.targetCount).toBe(10);
  });
  it("trata localização com barra", () => {
    const parsed = parseCriteriaFromCampaign(campaign({ location: "São Paulo / Grande SP" }));
    expect(parsed.city).toBe("São Paulo");
    expect(parsed.state).toBe("SP");
  });
});

// ─── Provider: respostas, erros e timeout ──────────────────────

describe("OverpassProvider.search", () => {
  function mockFetchOk(elements: OverpassElement[]) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ elements }),
      }),
    );
  }

  it("retorna resultados mapeados para resposta válida", async () => {
    mockFetchOk([overpassElement(), overpassElement({ id: 1002, tags: { name: "Sem categoria" } })]);
    const results = await new OverpassProvider().search(criteria());
    expect(results).toHaveLength(2);
    expect(results[0].externalId).toBe("node/1001");
    expect(results[0].website).toBe("https://xpto.com.br");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("overpass-api.de"),
      expect.objectContaining({ method: "POST", body: expect.stringContaining("data=") }),
    );
  });

  it("retorna lista vazia para resposta vazia", async () => {
    mockFetchOk([]);
    const results = await new OverpassProvider().search(criteria());
    expect(results).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retorna vazio sem cidade ou sem critérios", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OverpassProvider();
    expect(await provider.search(criteria({ city: "" }))).toEqual([]);
    expect(await provider.search(criteria({ keyword: "", segments: [] }))).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lança erro amigável em 429 (rate limit)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(new OverpassProvider().search(criteria())).rejects.toThrow(DiscoveryProviderError);
    await expect(new OverpassProvider().search(criteria())).rejects.toThrow(/limitada/);
  });

  it("lança erro amigável em 504 (sobrecarga)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 504 }));
    await expect(new OverpassProvider().search(criteria())).rejects.toThrow(/sobrecarregada/);
  });

  it("lança erro amigável em falha de rede", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(new OverpassProvider().search(criteria())).rejects.toThrow(/acessar a fonte/);
  });

  it("lança erro amigável em timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
          }),
      ),
    );
    const provider = new OverpassProvider({ timeoutMs: 20 });
    await expect(provider.search(criteria())).rejects.toThrow(/interrompida/);
  });

  it("lança erro amigável em resposta inválida", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => null }));
    await expect(new OverpassProvider().search(criteria())).rejects.toThrow(/inválida/);
  });

  it("tenta instância alternativa após falha", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 504 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ elements: [overpassElement()] }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const results = await new OverpassProvider().search(criteria());
    expect(results).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("kumi.systems");
  });
});

describe("createDiscoveryProvider", () => {
  it("cria provider overpass por padrão", () => {
    const provider = createDiscoveryProvider();
    expect(provider.name).toBe("OpenStreetMap");
  });
  it("rejeita provider desconhecido", () => {
    expect(() => createDiscoveryProvider("xpto")).toThrow(DiscoveryProviderError);
  });
});

// ─── Deduplicação automática (reuso do runDiscovery) ───────────

describe("runAutomaticDiscovery", () => {
  it("cria empresa nova com origem automática e URL da fonte", async () => {
    const deps = fakeDeps();
    const outcome = await runAutomaticDiscovery([], [], [rawCompany()], "camp-1", criteria(), deps);
    expect(outcome.counts.created).toBe(1);
    expect(outcome.counts.found).toBe(1);
    expect(deps.createCompany).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Restaurante Buffet XPTO",
        source: expect.stringContaining(AUTOMATIC_DISCOVERY_SOURCE),
      }),
    );
    expect(deps.createDiscovery).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignId: "camp-1",
        url: "https://www.openstreetmap.org/node/1001",
      }),
    );
    expect(buildSourceLabel()).toContain("OpenStreetMap");
  });

  it("empresa existente → não duplica, apenas nova discovery", async () => {
    const deps = fakeDeps();
    const existing = makeCompany("c1", "Restaurante Buffet XPTO");
    const outcome = await runAutomaticDiscovery(
      [existing],
      [makeDiscovery("d1", "c1", "camp-0")],
      [rawCompany()],
      "camp-1",
      criteria(),
      deps,
    );
    expect(outcome.counts.created).toBe(0);
    expect(outcome.counts.linked).toBe(1);
    expect(deps.createCompany).not.toHaveBeenCalled();
    expect(deps.createDiscovery).toHaveBeenCalledTimes(1);
  });

  it("empresa existente na mesma campanha → already-linked, sem discovery nova", async () => {
    const deps = fakeDeps();
    const existing = makeCompany("c1", "Restaurante Buffet XPTO");
    const outcome = await runAutomaticDiscovery(
      [existing],
      [makeDiscovery("d1", "c1", "camp-1")],
      [rawCompany()],
      "camp-1",
      criteria(),
      deps,
    );
    expect(outcome.counts.alreadyLinked).toBe(1);
    expect(deps.createCompany).not.toHaveBeenCalled();
    expect(deps.createDiscovery).not.toHaveBeenCalled();
  });

  it("respeita a meta da campanha (descarta excedentes)", async () => {
    const deps = fakeDeps();
    const results = [
      rawCompany({ externalId: "node/1", name: "A" }),
      rawCompany({ externalId: "node/2", name: "B" }),
      rawCompany({ externalId: "node/3", name: "C" }),
    ];
    const outcome = await runAutomaticDiscovery([], [], results, "camp-1", criteria({ targetCount: 2 }), deps);
    expect(outcome.counts.created).toBe(2);
    expect(outcome.counts.discarded).toBe(1);
    expect(outcome.results.map((r) => r.action)).toEqual(["created", "created", "discarded"]);
  });

  it("descarta resultado inválido (sem nome) sem quebrar a execução", async () => {
    const deps = fakeDeps();
    const outcome = await runAutomaticDiscovery(
      [],
      [],
      [rawCompany({ name: "  " }), rawCompany()],
      "camp-1",
      criteria(),
      deps,
    );
    expect(outcome.counts.discarded).toBe(1);
    expect(outcome.counts.created).toBe(1);
  });

  it("descarta duplicado dentro do mesmo lote (mesmo externalId)", async () => {
    const deps = fakeDeps();
    const outcome = await runAutomaticDiscovery(
      [],
      [],
      [rawCompany(), rawCompany({ name: "Restaurante Buffet XPTO 2" })],
      "camp-1",
      criteria(),
      deps,
    );
    expect(outcome.counts.created).toBe(1);
    expect(outcome.counts.discarded).toBe(1);
  });

  it("usa a mesma lógica de dedup por nome normalizado", async () => {
    const deps = fakeDeps();
    const existing = makeCompany("c1", "Restaurante Buffet Xpto");
    const outcome = await runAutomaticDiscovery(
      [existing],
      [],
      [rawCompany({ name: "restaurante buffet xpto" })],
      "camp-1",
      criteria(),
      deps,
    );
    expect(outcome.counts.linked).toBe(1);
    expect(outcome.counts.created).toBe(0);
    expect(normalizeCompanyName("Restaurante Buffet XPTO")).toBe(normalizeCompanyName("restaurante buffet xpto"));
  });
});
