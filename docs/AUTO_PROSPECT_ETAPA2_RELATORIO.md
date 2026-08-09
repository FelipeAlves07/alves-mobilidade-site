# RELATÓRIO — AUTO PROSPECT (Etapa 2: Primeira Descoberta de Empresa)

**Data:** 06/08/2026
**Sistema:** AME Control — Alves Mobilidade Executiva
**Escopo:** Entrada assistida de empresa + validação do fluxo CAMPANHA → EMPRESA ÚNICA → DISCOVERY

---

## Objetivo

Provar tecnicamente o fluxo fundamental do Auto Prospect:

**CAMPANHA → EMPRESA ENCONTRADA → EMPRESA SALVA → DESCOBERTA REGISTRADA → EMPRESA VINCULADA À CAMPANHA**

com o conceito crítico de **empresa única**: a mesma empresa nunca é duplicada na base; cada nova aparição em outra campanha gera apenas uma nova **Discovery** vinculada.

## Arquivos analisados (releitura da Etapa 1)

- `domain/autoprospect/types.ts`
- `hooks/useAutoProspect.ts`
- `modules/autoprospect/components/AutoProspectView.tsx`
- `lib/repository-mappers.ts`
- `hooks/useData.ts` / `app/admin/page.tsx` (integração)
- `supabase/migrations/00005_auto_prospect.sql`
- `docs/AUTO_PROSPECT_RELATORIO.md` (Etapa 1)
- `lib/__tests__/supabase-repository.test.ts` (padrão de testes)

## Verificação do Supabase (persistência real)

Consulta REST com a chave anon (sem expor segredos) ao banco de produção:

- `contacts` → **200 OK** (migrations 00001–00004 aplicadas)
- `ap_campaigns`, `ap_companies`, `ap_discoveries` → **404** (migration 00005 **NÃO aplicada**)

Consequência: como `.env.local` define as envs do Supabase, a estratégia ativa é `supabase` (não localStorage). Enquanto a migration não for aplicada, as operações em tabelas `ap_*` falham silenciosamente (`.catch(() => {})` do padrão existente) e nada persiste entre recarregamentos. **Pendência crítica para a próxima etapa.**

## Arquivos criados

1. `domain/autoprospect/service.ts` — lógica pura de negócio:
   - `normalizeCompanyName(name)` — minúsculas, sem acentos (NFD), sem espaços múltiplos
   - `findCompanyByName(companies, name)` — deduplicação por nome normalizado
   - `runDiscovery(companies, discoveries, form, campaignId, deps)` — orquestra: cria empresa se nova; cria discovery se empresa existente; retorna `already-linked` se a combinação empresa+campanha já existe
   - `ASSISTED_DISCOVERY_SOURCE = "Manual / Assisted Discovery"` (origem padrão)
2. `lib/__tests__/autoprospect.test.ts` — 18 testes novos

## Arquivos modificados

1. `domain/autoprospect/types.ts` — `ProspectCompany`: `location` → **`city` + `state`** (estruturados); `ProspectDiscovery.campaignId` agora `string | null` (descoberta sem campanha é permitida)
2. `lib/repository-mappers.ts` — mappers de empresa com `city`/`state`; discovery suporta `campaign_id` nulo
3. `hooks/useAutoProspect.ts` — refs espelho (`companiesRef`, `discoveriesRef`), novo `discoverCompany` (usa `runDiscovery`), `deleteCompany` agora remove também as discoveries relacionadas (cascade no estado local, igual ao `ON DELETE CASCADE` do banco)
4. `supabase/migrations/00005_auto_prospect.sql` — `ap_companies`: `location` → `city` + `state`; índice `idx_ap_companies_city`
5. `modules/autoprospect/components/AutoProspectView.tsx` — reescrita (detalhes abaixo)
6. `app/admin/page.tsx` — props `onDiscoverCompany` e `onDeleteCompany` passadas à view

## Arquivos removidos

Nenhum.

## Funcionalidades implementadas

1. **Entrada assistida de empresa** (simulação de Discovery): formulário mobile-first com Nome*, Segmento (select + custom), Cidade, Estado (select UF), Endereço, Site, Telefone, WhatsApp comercial, E-mail comercial, Instagram, LinkedIn, Observação/contexto. Origem gravada como `Manual / Assisted Discovery`.
2. **Vinculação à campanha**: select de campanha no formulário (opcional, com banner "Adicionando à campanha: X" quando pré-selecionada) + botão **"Adicionar empresa"** em cada campanha (mobile e desktop) que pré-seleciona a campanha e leva ao formulário.
3. **Empresa única**: verificação de duplicidade por **nome normalizado** (sem acentos/caixa/espaços). Se já existe → NÃO cria nova empresa; cria apenas a Discovery. Se a empresa já está vinculada àquela campanha → `already-linked`, nada duplica.
4. **Dica ao vivo no formulário**: ao digitar um nome que já existe na base, aparece aviso âmbar explicando que não haverá duplicação.
5. **Feedback após salvar** com 3 estados: criada (verde), já existia → nova descoberta (azul), já vinculada (âmbar), erro (vermelho).
6. **Listagem de empresas**: cards mobile (contatos, descobertas, campanhas com chips, origem, data) e tabela desktop densa (Empresa, Segmento, Cidade/UF, Contatos, Descobertas, Campanhas, Ações); busca; exclusão com cascade das discoveries.
7. **Métricas** passam a refletir dados reais (campanhas, ativas, empresas, descobertas).

## Decisões técnicas

1. **Lógica de negócio extraída para função pura** (`domain/autoprospect/service.ts`) em vez de ficar no hook: testável sem Supabase/localStorage, e reutilizável pelo futuro motor de Discovery real. O hook injeta os repositórios via `deps`.
2. **Dedup por nome normalizado** (estratégia da Etapa 1, `lower(name)` no banco + normalização de acentos no cliente). **Limitação registrada:** duas empresas distintas com o mesmo nome (ex.: "Central de Eventos LTDA" em BH e em SP) são tratadas como a mesma empresa; CNPJ ou endereço não participam do match. Melhoria futura recomendada: adicionar CNPJ como identificador forte quando disponível.
3. **`city` + `state` estruturados** (substituindo `location` livre): o escopo exige Cidade e Estado como campos; como a migration 00005 **nunca foi aplicada**, foi editada in loco — sem migration nova nem backfill.
4. **Discovery sem campanha permitida** (`campaign_id` nulo): o schema original já era nulo; o `unique(company_id, campaign_id)` do Postgres ignora NULL, então múltiplas discoveries sem campanha são possíveis. Uso client-side de `already-linked` considera `campaignId === null`.
5. **Cascade de exclusão no hook** (empresa → discoveries): espelha o `ON DELETE CASCADE` do banco para o fallback local.
6. **Refs espelho** para evitar closures obsoletos na verificação de duplicidade assíncrona.

## Banco de dados

- Alteração: `00005_auto_prospect.sql` — `ap_companies` com `city`/`state` (era `location`); índice `idx_ap_companies_city`. Nada mais mudou.
- **Migration NÃO aplicada** (confirmado via REST: 404 nas 3 tabelas `ap_*`). O ambiente usa estratégia Supabase (envs presentes), portanto **é necessário rodar `00005` no SQL editor do Supabase** para que campanhas/empresas persistam. O fluxo local funciona, mas a persistência só se confirma após aplicar.

## Testes realizados

Novos (`lib/__tests__/autoprospect.test.ts`, 18 casos):
1. criar empresa ✓ (runDiscovery → `created` + dep createCompany chamado)
2. criar discovery ✓ (vinculada à campanha com origem padrão)
3. associar discovery a campanha ✓ (mapper `campaign_id` + round-trip repo)
4. impedir duplicação da empresa ✓ (mesmo nome normalizado → `linked`, 1 única empresa)
5. múltiplas discoveries p/ mesma empresa ✓ (3 campanhas → 1 empresa, 3 discoveries)
6. recuperar empresa corretamente ✓ (`findCompanyByName` + `findAll` do repo)
7. persistência ✓ (mapper round-trip + SupabaseRepository create/findAll com mock, igual padrão existente)
8. `already-linked` (empresa+campanha repetida → sem nova discovery)
9. dedup com caixa/acentos diferentes ✓
10. normalização (acentos, espaços, case) ✓

Suite completa: **57 testes, 57 passando** (39 anteriores + 18 novos). `npx tsc --noEmit`: limpo nos arquivos da entrega. `npm run build`: **sucesso**. ESLint: apenas os 3 erros do padrão `interface extends Omit {}` que já existem no código original (`domain/lead/types.ts`, `domain/motorista/types.ts`) — convenção mantida.

## Responsividade

Formulário de empresa em 1 coluna no mobile (campos empilhados, inputs grandes para toque, select nativo de UF) e 2–3 colunas no desktop. Empresas em **cards no mobile** (contatos, campanhas e origem visíveis) e **tabela densa no desktop**. Nenhuma tabela é "espremida" no celular (usa `hidden md:block`). Navegação por abas touch-friendly mantida.

## Problemas encontrados

1. **Migration 00005 não aplicada no Supabase** — persistência real pendente (verificado por REST; não posso aplicar DDL sem acesso ao SQL editor/service role).
2. Teste próprio com dado inválido na 1ª rodada ("LTDA." vs "LTDA") — corrigido; comportamento do código confirmado correto.
3. Nenhuma regressão nas áreas existentes (suite completa passando + build OK).

## Limitações

- Deduplicação é **somente por nome normalizado** (sem CNPJ/cidade no match) — limitação registrada formalmente.
- Campo segmento da empresa é **único** (string), enquanto campanhas têm múltiplos segmentos — suficiente para esta etapa.
- Sem Discovery automática, Lead Score, IA, contatos, abordagens ou pipeline (fora de escopo, conforme missão).
- Erros de lint `no-empty-object-type` pré-existentes na convenção `interface X extends Omit {}`.

## Pendências

1. **Aplicar `00005_auto_prospect.sql` no Supabase** (SQL editor) — bloqueia persistência real.
2. Revisão arquitetural deste relatório antes de prosseguir (regra da missão).

## Próximos passos (recomendados, aguardando autorização)

1. Aplicar a migration e validar persistência real com dados de teste.
2. **Importação assistida em lote** (ex.: lista de nomes/sites colados) reutilizando `runDiscovery` — valida o dedup em volume pequeno.
3. Discovery real: integração com fontes públicas permitidas (ainda sem scraping) — ex.: importação a partir de arquivo ou busca guiada.
4. Qualificação: sinais de oportunidade por segmento → Lead Score com FATO/INFERÊNCIA/RECOMENDAÇÃO.

---

### Prova do conceito (comportamento garantido pelos testes)

> Uma empresa pode ser encontrada, **salva uma única vez** e possuir **várias descobertas vinculadas a diferentes campanhas** — `1 empresa : N discoveries`, sem duplicação.
