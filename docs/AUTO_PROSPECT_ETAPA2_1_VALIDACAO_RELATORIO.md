# RELATÓRIO — AUTO PROSPECT (Etapa 2.1: Validação Real no Supabase)

**Data:** 07/08/2026
**Sistema:** AME Control — Alves Mobilidade Executiva
**Projeto Supabase:** `slapyjstnzzesnlnubof` (confirmado e autorizado pelo usuário)
**Escopo:** Validação real da persistência e dos fluxos do Auto Prospect após aplicação manual da migration `00005_auto_prospect.sql`. **Nenhuma funcionalidade nova. Etapa 3 NÃO iniciada.**

---

## 1. Migration aplicada

`supabase/migrations/00005_auto_prospect.sql` foi aplicada manualmente pelo usuário no **SQL Editor** do projeto `slapyjstnzzesnlnubof` (autorizado). Nenhuma alteração foi feita na migration — aplicada exatamente como está no repositório.

## 2. Confirmação das tabelas no banco real (REST, chave anon)

| Tabela | HTTP | Resultado |
|---|---|---|
| `ap_campaigns` | **200** | existe ✓ |
| `ap_companies` | **200** | existe ✓ |
| `ap_discoveries` | **200** | existe ✓ |

## 3. Testes reais 1–6 (executados contra o Supabase, payloads idênticos aos mappers da aplicação)

**Teste 1 — criar campanha e confirmar persistência** ✓
`POST ap_campaigns` → 201. SELECT posterior retorna: `TESTE 2.1 - Campanha A` (status Ativa, `created_at` 2026-08-07T13:42:27).

**Teste 2 — criar empresa e confirmar persistência** ✓
`POST ap_companies` → 201. SELECT posterior retorna: `TESTE 2.1 - Empresa Alfa LTDA` (Belo Horizonte/MG, origem "Manual / Assisted Discovery").

**Teste 3 — recarregar e confirmar que os dados continuam** ✓
Novas leituras independentes (equivalentes à montagem da view após reload — a app carrega do Supabase via `SupabaseRepository.findAll`) retornam campanha e empresa. Persistência no servidor comprovada: todas as leituras foram via REST no servidor, independentes de qualquer estado de browser/localStorage.

**Teste 4 — criar Discovery e confirmar persistência** ✓
`POST ap_discoveries` (empresa `2aa36869…` + campanha `c8efbc15…`) → 201. SELECT retorna a discovery com origem "Manual / Assisted Discovery".

**Teste 5 — mesma empresa em outra campanha, sem duplicar a empresa** ✓
- `POST` campanha B → 201.
- Tentativa de `POST` da mesma empresa com caixa diferente (`teste 2.1 - empresa alfa ltda`) → **409** `idx_ap_companies_dedup` — o índice `lower(name)` bloqueia duplicação no banco.
- `POST` discovery com a MESMA empresa + campanha B → 201.
- Base final: **1 única empresa** com **2 discoveries** (campanhas A e B) — prova do conceito `1 empresa : N discoveries`.

**Teste 6 — mesma empresa na mesma campanha (bloqueio de duplicação)** ✓
`POST` discovery duplicada (mesma empresa + campanha A) → **409** `ap_discoveries_company_id_campaign_id_key` — a constraint `unique(company_id, campaign_id)` impede a duplicata no banco (backstop da checagem client-side `already-linked`). Nenhuma linha extra criada (permaneceu 2 discoveries).

### Estado final do banco (dados de teste)

- `ap_campaigns`: 2 linhas (`TESTE 2.1 - Campanha A`, `TESTE 2.1 - Campanha B`)
- `ap_companies`: 1 linha (`TESTE 2.1 - Empresa Alfa LTDA`)
- `ap_discoveries`: 2 linhas (empresa única vinculada às campanhas A e B)

Todos os registros de teste são identificáveis pelo prefixo `TESTE 2.1`. **Permanecem no banco como evidência da validação; remoção somente com autorização.**

## 4. Persistência no Supabase (não localStorage)

- Estratégia ativa: **supabase** (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` presentes → `getStorageStrategy()` = "supabase").
- Todas as leituras do teste foram feitas via REST com a anon key — dados residem em Postgres no projeto `slapyjstnzzesnlnubof`, visíveis em múltiplas requisições independentes (impossível via localStorage).
- `trySyncLocalToSupabase` (sync automático de módulos antigos) continua intacto e não foi acionado.

## 5. Validação técnica (re-executada hoje)

| Verificação | Comando | Resultado |
|---|---|---|
| Testes | `npm test` | **57/57 passando** (3 arquivos) |
| TypeScript | `npx tsc --noEmit` | Apenas erros **pré-existentes** em `lib/__tests__/supabase-integration.test.ts` (WebSocket/possibly-null/TripStatus) — não relacionados, inalterados |
| ESLint | `npx eslint` nos arquivos da entrega | 3 erros do padrão **já conhecido** `interface extends Omit {}` (`domain/autoprospect/types.ts`) — mesma convenção pré-existente em `domain/lead/types.ts` e `domain/motorista/types.ts`; nenhum erro novo |
| Build | `npm run build` | **Sucesso** (16 rotas, TypeScript OK) |

## 6. Erros, regressões e comportamento inesperado

1. **Nenhuma regressão** em funcionalidades existentes (suite completa + build OK).
2. **Nenhum erro da aplicação** no fluxo validado — as constraints do banco (dedup por nome, discovery única por empresa+campanha) agiram exatamente como projetado.
3. **Incidência do script de validação (não da aplicação):** nas primeiras execuções do teste, o PowerShell 5.1 não retornou o corpo das respostas 201 do PostgREST, então o script enviou `company_id` nulo nos POSTs de discovery → 400 (`null value in column "company_id"`). **Nenhuma linha inválida foi inserida** (o banco rejeitou), e o script foi corrigido (captura de ids via SELECT) — os resultados acima são da execução final correta. Os 400 iniciais, na verdade, confirmam que a constraint NOT NULL está ativa.
4. Nada foi alterado no código nesta etapa (validação apenas). Scripts temporários de validação foram criados fora do repositório (`%TEMP%\opencode\validate-etapa21*.ps1`) e não fazem parte da entrega.

## 7. Arquivos

- **Alterados nesta etapa:** nenhum.
- **Referência:** `supabase/migrations/00005_auto_prospect.sql` (aplicada como está).
- **Relatórios relacionados:** `docs/AUTO_PROSPECT_RELATORIO.md`, `docs/AUTO_PROSPECT_ETAPA2_RELATORIO.md`, `docs/AUTO_PROSPECT_ETAPA2_1_RELATORIO.md`.

## 8. Pendências

1. **Limpeza dos dados de teste** (`TESTE 2.1 - *`) no Supabase — aguardando autorização (REST `DELETE` com anon key é suficiente; cascade removeria as 2 discoveries).
2. (Opcional) Verificação manual no navegador: `npm run dev` → aba **Auto Prospect** → confirmar visualmente as 2 campanhas, a empresa e as 2 descobertas após reload.
3. **Revisão do Arquiteto/CTO** deste relatório antes de qualquer próxima etapa.

## 9. Próximo passo

Aguardo autorização do Arquiteto/CTO. **Etapa 3 (Discovery Automática) NÃO foi iniciada** e não será sem autorização explícita (sem scraping, Google/Maps, APIs de terceiros, IA, Lead Score, enriquecimento ou busca automática de contatos).

---

### Prova do conceito (agora validada em banco real)

> Empresa encontrada, **salva uma única vez** no Supabase, com **várias discoveries vinculadas a campanhas diferentes** — `1 empresa : N discoveries`, sem duplicação (bloqueada pela app e pelo banco em dupla camada).
