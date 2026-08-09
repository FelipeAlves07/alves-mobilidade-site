# RELATÓRIO — AUTO PROSPECT (Etapa 2.1: Persistência Real e Validação Final)

**Data:** 07/08/2026
**Sistema:** AME Control — Alves Mobilidade Executiva
**Escopo:** Aplicar `00005_auto_prospect.sql` no Supabase, validar tabelas `ap_*` e o fluxo real CAMPANHA → EMPRESA → DISCOVERY, e revalidar tecnicamente a entrega. **Sem implementação da Etapa 3.**

---

## Resumo executivo

**A migration `00005_auto_prospect.sql` NÃO foi aplicada no Supabase e não pode ser aplicada a partir deste ambiente.** Confirmado por três vias independentes: (1) REST 404 nas 3 tabelas `ap_*`; (2) ausência de `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`; (3) sem CLI supabase instalada e sem `supabase/config.toml` no projeto. Conforme a regra da missão (**sem acesso a DDL, não contornar — apenas informar**), a aplicação deve ser feita manualmente pelo responsável no SQL editor do Supabase. Os **Testes Reais 1–6 ficam bloqueados** até a aplicação; todo o roteiro de validação real já está preparado abaixo. A validação técnica local está **100% verde** (57/57 testes, TypeScript, ESLint, build).

## Banco de dados

### Estado verificado (07/08/2026, via REST com chave anon — sem expor segredos)

| Tabela | HTTP | Significado |
|---|---|---|
| `contacts` | **200 OK** | Migrations 00001–00004 aplicadas |
| `ap_campaigns` | **404** | Migration 00005 NÃO aplicada |
| `ap_companies` | **404** | Migration 00005 NÃO aplicada |
| `ap_discoveries` | **404** | Migration 00005 NÃO aplicada |

### Por que não foi possível aplicar daqui

1. `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão setadas → estratégia ativa é **supabase** (não localStorage).
2. `SUPABASE_SERVICE_ROLE_KEY` está **ausente/comentada** no `.env.local` → a chave anon é a única disponível, e ela não executa DDL.
3. **CLI supabase não instalada** e **sem `supabase/config.toml`** no repositório → sem `supabase db push` ou `db execute`.
4. Busca no projeto por `postgresql://`, `DATABASE_URL`, `connection_string` ou `service_role`: **nenhuma ocorrência** → não existe string de conexão Postgres direta em nenhum arquivo do projeto.

### Ação manual necessária (quem tiver acesso ao painel do Supabase)

1. Supabase Dashboard → seu projeto → **SQL Editor → New query**.
2. Colar o conteúdo de `supabase/migrations/00005_auto_prospect.sql` (arquivo já contém `city`/`state`, dedup `lower(name)`, `unique(company_id, campaign_id)`, RLS `all_anon` e triggers `updated_at`).
3. Executar (Run). Sucesso esperado: 3 tabelas + 3 índices + RLS + triggers.
4. Revalidar por REST (ver comando abaixo) — as 3 tabelas `ap_*` devem responder **200**.

Comando de verificação (usado nesta e nas etapas anteriores, sem expor valores):

```powershell
$envs = Get-Content .env.local | ConvertFrom-StringData
$url = $envs.NEXT_PUBLIC_SUPABASE_URL; $key = $envs.NEXT_PUBLIC_SUPABASE_ANON_KEY
$tables = @("contacts","ap_campaigns","ap_companies","ap_discoveries")
foreach ($t in $tables) {
  $r = Invoke-WebRequest -Uri "$url/rest/v1/$t`?select=*&limit=1" -Headers @{ apikey = $key; Authorization = "Bearer $key" } -UseBasicParsing -SkipHttpErrorCheck
  Write-Output "$t -> $($r.StatusCode)"
}
```

## Testes reais (bloqueados — roteiro preparado)

Após a aplicação manual da migration, executar sequencialmente no app (`npm run dev` → aba **Auto Prospect**):

1. **Teste 1 — criar campanha**: criar campanha de teste e recarregar (F5) → campanha permanece (persistiu via `ap_campaigns`).
2. **Teste 2 — criar empresa**: preencher formulário com uma empresa nova → aparece em "Empresas" e no banco (`ap_companies`).
3. **Teste 3 — reload mantém dados**: F5 → campanha e empresa continuam presentes (sem fallback local).
4. **Teste 4 — criar discovery**: nova empresa (ou empresa existente) vinculada a uma campanha → discovery registrada em `ap_discoveries`.
5. **Teste 5 — mesma empresa, outra campanha**: repetir a mesma empresa numa 2ª campanha → **sem duplicação de empresa**; apenas nova discovery vinculada à nova campanha (1 empresa : 2 discoveries).
6. **Teste 6 — mesma empresa, mesma campanha**: repetir a mesma empresa na mesma campanha → bloqueio `already-linked`, nada duplica.

Critério de aceite: nenhuma linha duplicada em `ap_companies` (regra `lower(name)` + lógica client-side) e `unique(company_id, campaign_id)` em `ap_discoveries`.

**Não executáveis hoje** — dependem da aplicação manual da migration. Registro de cada teste deve ser anexado a este relatório quando executado.

## Validação técnica (executada hoje)

| Verificação | Comando | Resultado |
|---|---|---|
| Testes | `npm test` (Vitest) | **57/57 passando** (39 + 18 do autoprospect) |
| TypeScript | `npx tsc --noEmit` | **Limpo nos arquivos da entrega** (só erros pré-existentes em `lib/__tests__/supabase-integration.test.ts` — WebSocket/possibly-null, não relacionados) |
| ESLint | `npx eslint domain/autoprospect hooks/useAutoProspect.ts lib/repository-mappers.ts modules/autoprospect lib/__tests__/autoprospect.test.ts` | **0 erros** |
| Build | `npm run build` | **Sucesso** (16 páginas, 0 estáticas com erro) |

## Fallback (localStorage) — intacto

A estratégia `getStorageStrategy()` em `lib/repository-factory.ts` não foi alterada: usa **supabase** quando URL+anon estão setadas (situação atual) e **local** (`ame-ap-*-v1`) caso contrário. Os round-trips do `LocalStorageRepository` continuam cobertos pelos testes existentes. Nada foi removido nem alterado nesta etapa.

## Arquivos

**Criados nesta etapa:** nenhum arquivo de código (etapa de validação). Este relatório (`docs/AUTO_PROSPECT_ETAPA2_1_RELATORIO.md`) é o único artefato novo.

**Alterados nesta etapa:** nenhum.

**Arquivos de referência da entrega (Etapas 1–2, validados hoje):**

- `supabase/migrations/00005_auto_prospect.sql` — pendente de aplicação manual
- `domain/autoprospect/service.ts` — dedup + `runDiscovery` + `ASSISTED_DISCOVERY_SOURCE`
- `domain/autoprospect/types.ts` — `AutoProspectCampaign`, `ProspectCompany` (city/state), `ProspectDiscovery` (`campaignId: string | null`)
- `hooks/useAutoProspect.ts` — `discoverCompany`, `deleteCompany` (cascade), refs espelho
- `modules/autoprospect/components/AutoProspectView.tsx` — view mobile-first
- `hooks/useData.ts` + `app/admin/page.tsx` — integração (menu "Auto Prospect")
- `lib/repository-mappers.ts` — mappers `ap*`
- `lib/__tests__/autoprospect.test.ts` — 18 testes
- `docs/AUTO_PROSPECT_RELATORIO.md` e `docs/AUTO_PROSPECT_ETAPA2_RELATORIO.md` — relatórios anteriores

## Problemas encontrados

1. **CRÍTICO — Migration 00005 não aplicada no Supabase**: persistência real pendente; sem acesso a DDL a partir deste ambiente (anon key, sem service role, sem CLI, sem config.toml). Aplicação manual necessária — **não contornado**, conforme regra da missão.
2. Testes Reais 1–6 **não executáveis** até a migration ser aplicada; roteiro pronto acima.
3. Erros TS pré-existentes em `lib/__tests__/supabase-integration.test.ts` e 3 erros de lint `no-empty-object-type` pré-existentes (`domain/lead/types.ts`, `domain/motorista/types.ts`) — fora do escopo desta entrega.

## Próximo passo (aguardando ação externa + autorização)

1. **Aplicação manual da migration** (SQL editor do Supabase, conforme instruções acima) — ação do responsável com acesso ao projeto.
2. Revalidar `ap_*` via REST (200) e **executar os Testes Reais 1–6**, anexando os resultados a este relatório.
3. **Etapa 3 (Discovery Automática)** — somente com autorização explícita: sem scraping, Google/Maps, APIs de terceiros, IA, Lead Score, enriquecimento ou busca automática de contatos, conforme escopo aprovado.

---

### Registro de status

- [ ] Migration 00005 aplicada no Supabase (aguardando)
- [ ] Teste 1 — campanha persiste após reload (aguardando)
- [ ] Teste 2 — empresa persiste (aguardando)
- [ ] Teste 3 — reload mantém dados (aguardando)
- [ ] Teste 4 — discovery registrada (aguardando)
- [ ] Teste 5 — mesma empresa, outra campanha → sem duplicação (aguardando)
- [ ] Teste 6 — mesma empresa, mesma campanha → bloqueio (aguardando)
- [x] Validação técnica local (57/57 testes, tsc, ESLint, build)
- [x] Fallback localStorage intacto
