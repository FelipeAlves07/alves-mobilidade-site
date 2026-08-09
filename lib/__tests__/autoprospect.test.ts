import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ASSISTED_DISCOVERY_SOURCE,
  findCompanyByName,
  normalizeCompanyName,
  runDiscovery,
} from "@/domain/autoprospect/service";
import type {
  ProspectCompany,
  ProspectCompanyForm,
  ProspectDiscovery,
} from "@/domain/autoprospect/types";
import { SupabaseRepository } from "../supabase-repository";
import {
  apCampaignFromSupabase,
  apCampaignFormToSupabase,
  apCompanyFromSupabase,
  apCompanyFormToSupabase,
  apDiscoveryFromSupabase,
  apDiscoveryFormToSupabase,
} from "../repository-mappers";

const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
};

vi.mock("../supabase", () => ({
  supabase: {
    from: vi.fn(() => mockQueryBuilder),
  },
}));

function makeCompany(id: string, name: string, city = "Belo Horizonte", state = "MG"): ProspectCompany {
  return {
    id, name, segment: "Eventos", city, state, address: "", website: "", phone: "",
    whatsapp: "", email: "", instagram: "", linkedin: "", notes: "", source: "Manual / Assisted Discovery",
    collectedAt: "2026-08-06T10:00:00Z", createdAt: "2026-08-06T10:00:00Z",
  };
}

function companyForm(overrides: Partial<ProspectCompanyForm> = {}): ProspectCompanyForm {
  return {
    name: "Empresa XPTO", segment: "Eventos", city: "Belo Horizonte", state: "MG",
    address: "", website: "https://xpto.com.br", phone: "", whatsapp: "(31) 99999-0000",
    email: "contato@xpto.com.br", instagram: "", linkedin: "", notes: "", source: "",
    ...overrides,
  };
}

describe("normalizeCompanyName", () => {
  it("normaliza maiúsculas, espaços e acentos", () => {
    expect(normalizeCompanyName("  AGÊNCIA  XPTO LTDA ")).toBe("agencia xpto ltda");
  });

  it("trata empresa sem acentos", () => {
    expect(normalizeCompanyName("Agencia XPTO Ltda")).toBe("agencia xpto ltda");
  });

  it("empresas com e sem acento são iguais após normalização", () => {
    expect(normalizeCompanyName("Agência XPTO")).toBe(normalizeCompanyName("Agencia XPTO"));
  });
});

describe("findCompanyByName", () => {
  const companies = [makeCompany("1", "Empresa XPTO"), makeCompany("2", "Hotel Alfa")];

  it("encontra empresa existente ignorando caixa/acentos/espaços", () => {
    expect(findCompanyByName(companies, "empresa xpto")?.id).toBe("1");
    expect(findCompanyByName(companies, "Empresa Xpto")?.id).toBe("1");
  });

  it("não encontra empresa inexistente", () => {
    expect(findCompanyByName(companies, "Outra Empresa")).toBeUndefined();
  });

  it("recupera a empresa corretamente após ser adicionada", () => {
    const updated = [...companies, makeCompany("3", "Eventos MG")];
    expect(findCompanyByName(updated, "eventos mg")?.id).toBe("3");
  });
});

describe("runDiscovery — fluxo empresa única + descobertas", () => {
  let companies: ProspectCompany[];
  let discoveries: ProspectDiscovery[];
  const createCompany = vi.fn(async (form: ProspectCompanyForm) =>
    makeCompany(`c-${companies.length + 1}`, form.name, form.city, form.state)
  );
  const createDiscovery = vi.fn(async (form: { companyId: string; campaignId: string | null; source: string; url: string }) =>
    ({ id: `d-${discoveries.length + 1}`, ...form, createdAt: "2026-08-06T10:00:00Z" })
  );

  beforeEach(() => {
    vi.clearAllMocks();
    companies = [];
    discoveries = [];
  });

  it("cria empresa e registra discovery vinculada à campanha", async () => {
    const result = await runDiscovery(companies, discoveries, companyForm(), "camp-1", {
      createCompany, createDiscovery,
    });

    expect(result.action).toBe("created");
    expect(companies).toHaveLength(0); // persistência é responsabilidade do dep
    expect(createCompany).toHaveBeenCalledOnce();
    expect(createDiscovery).toHaveBeenCalledWith({
      companyId: "c-1",
      campaignId: "camp-1",
      source: ASSISTED_DISCOVERY_SOURCE,
      url: "",
    });
    expect(createCompany).toHaveBeenCalledWith(expect.objectContaining({ source: ASSISTED_DISCOVERY_SOURCE }));
  });

  it("usa a origem padrão Manual / Assisted Discovery quando vazia", async () => {
    await runDiscovery(companies, discoveries, companyForm({ source: "   " }), null, {
      createCompany, createDiscovery,
    });
    expect(createDiscovery).toHaveBeenCalledWith(expect.objectContaining({ source: ASSISTED_DISCOVERY_SOURCE }));
  });

  it("NÃO duplica empresa: cria apenas nova discovery para campanha diferente", async () => {
    const created = await runDiscovery(companies, discoveries, companyForm(), "camp-1", {
      createCompany, createDiscovery,
    });
    if (created.action !== "created") throw new Error("expected created");
    companies.push(created.company);
    discoveries.push(created.discovery);

    const second = await runDiscovery(companies, discoveries, companyForm(), "camp-2", {
      createCompany, createDiscovery,
    });

    expect(second.action).toBe("linked");
    expect(second.company.id).toBe(created.company.id);
    expect(createCompany).toHaveBeenCalledTimes(1);
    expect(createDiscovery).toHaveBeenCalledWith(expect.objectContaining({ campaignId: "camp-2" }));
  });

  it("NÃO cria discovery duplicada na mesma campanha", async () => {
    const created = await runDiscovery(companies, discoveries, companyForm(), "camp-1", {
      createCompany, createDiscovery,
    });
    if (created.action !== "created") throw new Error("expected created");
    companies.push(created.company);
    discoveries.push(created.discovery);

    const duplicate = await runDiscovery(companies, discoveries, companyForm(), "camp-1", {
      createCompany, createDiscovery,
    });

    expect(duplicate.action).toBe("already-linked");
    expect(createDiscovery).toHaveBeenCalledTimes(1);
  });

  it("permite múltiplas descobertas para a mesma empresa em campanhas diferentes", async () => {
    const created = await runDiscovery(companies, discoveries, companyForm(), "camp-1", {
      createCompany, createDiscovery,
    });
    if (created.action !== "created") throw new Error("expected created");
    companies.push(created.company);
    discoveries.push(created.discovery);

    const second = await runDiscovery(companies, discoveries, companyForm(), "camp-2", {
      createCompany, createDiscovery,
    });
    if (second.action !== "linked") throw new Error("expected linked");
    discoveries.push(second.discovery);

    const third = await runDiscovery(companies, discoveries, companyForm(), "camp-3", {
      createCompany, createDiscovery,
    });
    if (third.action !== "linked") throw new Error("expected linked");
    discoveries.push(third.discovery);

    expect(companies).toHaveLength(1);
    expect(discoveries).toHaveLength(3);
    expect(new Set(discoveries.map((d) => d.campaignId))).toEqual(new Set(["camp-1", "camp-2", "camp-3"]));
  });

  it("detecta empresa existente com nome em caixa/acentos diferentes", async () => {
    const created = await runDiscovery(companies, discoveries, companyForm({ name: "Empresa XPTO LTDA" }), "camp-1", {
      createCompany, createDiscovery,
    });
    if (created.action !== "created") throw new Error("expected created");
    companies.push(created.company);
    discoveries.push(created.discovery);

    const second = await runDiscovery(companies, discoveries, companyForm({ name: "EMPRESA xpto Ltda" }), "camp-2", {
      createCompany, createDiscovery,
    });

    expect(second.action).toBe("linked");
    expect(createCompany).toHaveBeenCalledTimes(1);
  });
});

describe("mappers Auto Prospect ↔ ap_* (persistência)", () => {
  it("mapeia empresa para colunas snake_case e de volta (round-trip)", () => {
    const dbRow = apCompanyFormToSupabase(companyForm());
    expect(dbRow.city).toBe("Belo Horizonte");
    expect(dbRow.state).toBe("MG");
    expect(dbRow).not.toHaveProperty("collectedAt");

    const company = apCompanyFromSupabase({
      id: "c1",
      name: "Empresa XPTO",
      segment: "Eventos",
      city: "Belo Horizonte",
      state: "MG",
      address: "",
      website: "https://xpto.com.br",
      phone: "",
      whatsapp: "(31) 99999-0000",
      email: "contato@xpto.com.br",
      instagram: "",
      linkedin: "",
      notes: "",
      source: "Manual / Assisted Discovery",
      collected_at: "2026-08-06T10:00:00Z",
      created_at: "2026-08-06T10:00:00Z",
    });

    expect(company.city).toBe("Belo Horizonte");
    expect(company.state).toBe("MG");
    expect(company.collectedAt).toBe("2026-08-06T10:00:00Z");
  });

  it("mapeia discovery com campaign_id nulo (sem campanha)", () => {
    const dbRow = apDiscoveryFormToSupabase({ companyId: "c1", campaignId: null, source: "Manual / Assisted Discovery", url: "" });
    expect(dbRow).toEqual({
      company_id: "c1",
      campaign_id: null,
      source: "Manual / Assisted Discovery",
      url: "",
    });

    const discovery = apDiscoveryFromSupabase({
      id: "d1", company_id: "c1", campaign_id: null, source: "x", url: "", created_at: "2026-08-06T10:00:00Z",
    });
    expect(discovery.campaignId).toBeNull();
  });

  it("mapeia discovery com campanha associada", () => {
    const discovery = apDiscoveryFromSupabase({
      id: "d1", company_id: "c1", campaign_id: "camp-1", source: "x", url: "", created_at: "2026-08-06T10:00:00Z",
    });
    expect(discovery.campaignId).toBe("camp-1");
  });

  it("mapeia campanha com array de segmentos, keyword e target_count", () => {
    const dbRow = apCampaignFormToSupabase({
      name: "Empresas BH", location: "Belo Horizonte", segments: ["Empresas", "Hotéis"],
      keyword: "buffet", objective: "Encontrar clientes", targetCount: 50, status: "Ativa",
    });
    expect(dbRow.segments).toEqual(["Empresas", "Hotéis"]);
    expect(dbRow.keyword).toBe("buffet");
    expect(dbRow.target_count).toBe(50);

    const campaign = apCampaignFromSupabase({
      id: "camp-1", name: "Empresas BH", location: "Belo Horizonte",
      segments: ["Empresas", "Hotéis"], keyword: "buffet", objective: "Encontrar clientes",
      target_count: 50, status: "Ativa", created_at: "2026-08-06T10:00:00Z",
    });
    expect(campaign.segments).toEqual(["Empresas", "Hotéis"]);
    expect(campaign.keyword).toBe("buffet");
    expect(campaign.targetCount).toBe(50);
    expect(campaign.status).toBe("Ativa");
  });

  it("cria e recupera empresa via SupabaseRepository (persistência)", async () => {
    const repo = new SupabaseRepository<ProspectCompany, ProspectCompanyForm>(
      "ap_companies",
      { fromDb: apCompanyFromSupabase, toDb: apCompanyFormToSupabase },
    );

    mockQueryBuilder.single.mockResolvedValue({
      data: {
        id: "c-99", name: "Empresa XPTO", segment: "Eventos", city: "Belo Horizonte", state: "MG",
        address: "", website: "", phone: "", whatsapp: "", email: "", instagram: "", linkedin: "",
        notes: "", source: "Manual / Assisted Discovery", collected_at: "2026-08-06T10:00:00Z",
        created_at: "2026-08-06T10:00:00Z",
      },
      error: null,
    });

    const created = await repo.create(companyForm());
    expect(created.id).toBe("c-99");
    expect(created.name).toBe("Empresa XPTO");
    expect(mockQueryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
      city: "Belo Horizonte",
      state: "MG",
      collected_at: expect.any(String),
    }));

    mockQueryBuilder.order.mockResolvedValue({
      data: [{
        id: "c-99", name: "Empresa XPTO", segment: "Eventos", city: "Belo Horizonte", state: "MG",
        address: "", website: "", phone: "", whatsapp: "", email: "", instagram: "", linkedin: "",
        notes: "", source: "Manual / Assisted Discovery", collected_at: "2026-08-06T10:00:00Z",
        created_at: "2026-08-06T10:00:00Z",
      }],
      error: null,
    });

    const [recovered] = await repo.findAll();
    expect(recovered.id).toBe("c-99");
    expect(recovered.city).toBe("Belo Horizonte");
    expect(recovered.state).toBe("MG");
  });

  it("cria e recupera discovery vinculada à campanha via SupabaseRepository", async () => {
    const repo = new SupabaseRepository<any, any>(
      "ap_discoveries",
      { fromDb: apDiscoveryFromSupabase, toDb: apDiscoveryFormToSupabase },
    );

    mockQueryBuilder.single.mockResolvedValue({
      data: {
        id: "d-99", company_id: "c-99", campaign_id: "camp-1",
        source: "Manual / Assisted Discovery", url: "", created_at: "2026-08-06T10:00:00Z",
      },
      error: null,
    });

    const created = await repo.create({
      companyId: "c-99", campaignId: "camp-1", source: "Manual / Assisted Discovery", url: "",
    });
    expect(created.campaignId).toBe("camp-1");
    expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
      company_id: "c-99",
      campaign_id: "camp-1",
      source: "Manual / Assisted Discovery",
      url: "",
    });

    mockQueryBuilder.order.mockResolvedValue({
      data: [{
        id: "d-99", company_id: "c-99", campaign_id: "camp-1",
        source: "Manual / Assisted Discovery", url: "", created_at: "2026-08-06T10:00:00Z",
      }],
      error: null,
    });

    const [recovered] = await repo.findAll();
    expect(recovered.campaignId).toBe("camp-1");
    expect(recovered.companyId).toBe("c-99");
  });
});
