# RELATÓRIO — AUTO PROSPECT (Etapa 3: Discovery Automática — Primeiro Motor Real)

**Data:** 07/08/2026
**Sistema:** AME Control — Alves Mobilidade Executiva
**Projeto Supabase:** `slapyjstnzzesnlnubof`
**Escopo:** Primeiro motor real de Discovery — o usuário cria uma campanha, define o que quer encontrar, clica em **Pesquisar** e o sistema encontra empresas reais, normaliza, deduplica, salva e vincula via Discoveries. **Sem IA, Lead Score, contatos automáticos ou automação comercial.**

---

## 1. Fonte escolhida

**OpenStreetMap — Overpass API** (`https://overpass-api.de/api/interpreter`, fallback `https://overpass.kumi.systems/api/interpreter`).

**Por quê:**
- **Gratuita e sem chave** — zero custo, zero segredos para proteger, zero cadastro/billing.
- **Dados abertos (ODbL)** — uso comercial permitido com atribuição; dados de empresas/POIs públicos, sem dados pessoais (alinhado à LGPD).
- **Critérios de busca compatíveis**: localização (área da cidade), categoria/segmento (tags OSM), palavra-chave (regex no nome), limite de resultados.
- **Cobertura real no Brasil** (comprovada no teste): dezenas de hotéis/hostels de Belo Horizonte com telefone, site, e-mail e endereço.
- **Sem CAPTCHA, sem autenticação, sem scraping de áreas privadas**; política de uso justo respeitada (1–2 requisições por ação do usuário, timeout e maxsize controlados).
- **Abstração pronta para evolução**: a interface `DiscoveryProvider` permite adicionar Google Places, BrasilAPI etc. sem reescrever o Auto Prospect.

**Alternativas avaliadas e rejeitadas nesta etapa:** Google Places API (excelente qualidade, porém **paga** — Text Search ~USD 32/1.000 reqs — e exige projeto GCP com billing), BrasilAPI (só consulta **por CNPJ**, não permite buscar por critérios), Yelp Fusion (sem cobertura relevante no Brasil), Nominatim (apenas geocodificação, não busca empresas).

## 2. Arquitetura

```
AutoProspectView (mobile-first)
   ↓ onRunDiscovery(campaignId)
useAutoProspect.runCampaignDiscovery  →  POST /api/autoprospect/discover
                                              ↓ (server-side)
                                   parseCriteriaFromCampaign (cidade+UF, segmentos, keyword, meta)
                                              ↓
                                   DiscoveryProvider  ← interface (futuro: A, B, C...)
                                   OverpassProvider (Overpass API)
                                              ↓ raw results (OSM elements)
                                   normalizeAutomaticResult (nome, telefone, URL, UF, e-mail, tags)
                                              ↓
                                   runAutomaticDiscovery → reusa runDiscovery (dedup única)
                                              ↓
                                   Supabase: ap_companies + ap_discoveries (RLS all_anon)
                                              ↓
                                   { counts, results } → UI (Pesquisando... → Pesquisa concluída)
```

- **Critérios usados da campanha existente** (sem novo modelo): `location` → cidade + UF; `segments` → tags OSM (Hotéis, Agências de turismo, Clínicas, Faculdades, Escritórios, Indústrias, Empresas...); nova **keyword** opcional (menor alteração: 1 coluna); `target_count` → limite; `objective` permanece descritivo.
- **Abstração**: `domain/autoprospect/discovery.ts` define `DiscoveryProvider.search(criteria) → RawCompanyResult[]`; `createDiscoveryProvider(env DISCOVERY_PROVIDER)` seleciona o provider (default `overpass`). Novos providers são plugins.

## 3. Arquivos criados

1. `domain/autoprospect/discovery.ts` — tipos (critérios, resultados brutos, provider), normalização (telefone/URL/UF/nome), mapeamento OSM → empresa, `buildOverpassQuery`, `OverpassProvider` (timeout, fallback de instância, User-Agent), `runAutomaticDiscovery` (orquestrador), `parseCriteriaFromCampaign`, `createDiscoveryProvider`.
2. `app/api/autoprospect/discover/route.ts` — rota server-side POST: valida campanha, executa provider, aplica dedup/salvamento via Supabase, retorna resumo + resultados; lock in-memory por campanha; erros técnicos logados e mensagens amigáveis (nunca expõe detalhes sensíveis).
3. `supabase/migrations/00006_auto_prospect_keyword.sql` — `add column keyword text not null default ''` em `ap_campaigns`.
4. `lib/__tests__/autoprospect-discovery.test.ts` — 42 testes novos.

## 4. Arquivos modificados

1. `domain/autoprospect/types.ts` — `AutoProspectCampaign`/`Form` ganham `keyword: string`.
2. `domain/autoprospect/service.ts` — `runDiscovery` ganha parâmetro opcional `url` (URL da fonte na Discovery) — **compatível com todos os usos existentes**.
3. `lib/repository-mappers.ts` — mappers de campanha com `keyword` (enviado ao banco **somente quando preenchido** — funciona antes e depois da migration 00006).
4. `hooks/useAutoProspect.ts` — novo `runCampaignDiscovery(campaignId)`: chama a rota e recarrega empresas/discoveries após salvar.
5. `app/admin/page.tsx` — repasse da prop `onRunDiscovery`.
6. `modules/autoprospect/components/AutoProspectView.tsx` — campo "Palavra-chave (busca)" no formulário de campanha; botão **Pesquisar** substituindo os placeholders "em breve"; estados: **Pesquisando...** (spinner) → **Pesquisa concluída** com chips (Encontradas/Novas/Já existentes/Já vinculadas/Descartadas) → **Pesquisa não concluída** (erro amigável); lista de resultados com segmento, cidade/UF, endereço, telefone, site, fonte e badge (Nova/Já existente/Já vinculada/Descartada). Mobile-first: painel dentro do card no celular e abaixo da tabela no desktop.

## 5. Banco

- **Sem tabelas novas**; reuso total de `ap_campaigns`, `ap_companies`, `ap_discoveries`.
- **Migration `00006`** (coluna `keyword`) — **PENDENTE de aplicação manual** no SQL editor (mesmo processo da 00005). Sem ela, a app funciona normalmente (keyword vazia é omitida pelo mapper); o campo "Palavra-chave" só persiste após a aplicação.
- Nenhuma tabela do AME Control foi modificada.

## 6. Discovery (como a pesquisa funciona)

1. Clicar em **Pesquisar** → rota server-side carrega a campanha e monta os critérios.
2. `OverpassProvider` monta a query: área da cidade (admin_level 8, com fallback relaxado), regras OSM dos segmentos e palavra-chave como regex no nome (`out center tags 60`).
3. Timeout de 30s por instância; tentativa primária + fallback; **User-Agent próprio** (`AME-Control-AutoProspect/1.0`) — descoberto no teste real que sem UA o Overpass rejeita a requisição (406/429).
4. Resultados OSM → `RawCompanyResult` (nome, segmento, cidade, UF, endereço, telefone, WhatsApp, site, e-mail, Instagram, notas com ID OSM, URL `openstreetmap.org/type/id`).
5. Normalização: nome limpo, telefone com DDD formatado (e +55 tratado), URL com https://, estado completo → UF, e-mail minúsculo, lixo removido; resultados sem nome são descartados.
6. Salvamento com controle de **meta** (`target_count`): após atingir a meta, os excedentes são descartados — nunca executa dezenas de chamadas sem controle.

## 7. Deduplicação

- **100% reuso** de `normalizeCompanyName`/`findCompanyByName`/`runDiscovery` de `domain/autoprospect/service.ts` — nenhuma lógica nova de dedup.
- Empresa nova → cria empresa + Discovery (`source: "Automatic Discovery · OpenStreetMap"`, `url` da fonte).
- Empresa existente → **não duplica**; apenas nova Discovery na campanha.
- Empresa já vinculada à mesma campanha → `already-linked`, nada duplica (backstop: constraint `unique(company_id, campaign_id)` do banco).
- Bônus do lote: dedup interno por `externalId` (mesmo POI repetido na resposta) e descarte de inválidos.

## 8. Segurança

- **Nenhuma chave/secret**: a fonte é keyless; nada foi adicionado a `NEXT_PUBLIC_*`, localStorage, banco ou componentes React. Variáveis opcionais documentadas: `DISCOVERY_PROVIDER` (default `overpass`) e instâncias do Overpass embutidas como defaults (públicas).
- **Tudo server-side** (`app/api/autoprospect/discover`): o navegador só chama a rota com o `campaignId`.
- Erros técnicos (`console.error`) só no servidor; a UI recebe mensagens amigáveis em PT, sem detalhes sensíveis.
- Respeito a termos/privacidade: dados comerciais públicos (ODbL, atribuição no campo `notes`/`url`), sem CAPTCHA burlado, sem bloqueios contornados, sem coleta de dados pessoais; rate limits respeitados (1 requisição por clique + 1 fallback + 1 retry de área), lock por campanha impede execuções concorrentes.
- LGPD: apenas dados de pessoa jurídica/publicados; origem da informação preservada em `notes` e `url`.

## 9. Testes

- **99/99 testes passando** (57 anteriores + 42 novos). Suite completa: Vitest 4.1.10.
- Novos (`lib/__tests__/autoprospect-discovery.test.ts`):
  - **Discovery Service**: critérios → provider; normalização (telefone com +55, URL, UF, nome); erro amigável; limite/meta; resultados inválidos; duplicados do lote.
  - **Dedup**: nova → cria; existente → não duplica (só Discovery); outra campanha → nova Discovery; mesma campanha → não duplica Discovery (mesma semântica do `runDiscovery` testado na Etapa 2).
  - **Provider**: resposta válida (mapeamento OSM→empresa), vazia, 429 (rate limit), 504 (sobrecarga), falha de rede, timeout, resposta inválida, fallback de instância.
  - **Query**: montagem com área/segmentos/keyword/limite; escape regex; variante relaxada.
- `npx tsc --noEmit`: **limpo nos arquivos da entrega** (apenas erros pré-existentes em `lib/__tests__/supabase-integration.test.ts`, inalterados).
- ESLint: apenas os 3 erros do padrão **pré-existente** `interface extends Omit {}` (convenção do projeto).
- `npm run build`: **sucesso** (17 rotas, incluindo `/api/autoprospect/discover`).

## 10. Teste real (executado contra o banco de produção `slapyjstnzzesnlnubof`)

- Campanha: **"TESTE 3 - Hoteis BH"** — localização "Belo Horizonte - MG", segmento **Hotéis**, meta **5**.
- `POST /api/autoprospect/discover` (servidor Next dev) → **tempo 7,5s**.
- **Resultado:** `found: 54 · created: 5 · linked: 0 · alreadyLinked: 0 · discarded: 49` (49 = sem dados úteis + duplicados do lote + **excedente da meta**, comportamento correto).
- 5 empresas reais criadas em `ap_companies` (origem `Automatic Discovery · OpenStreetMap`): Mercure, Rio Jordao, Bristol, Hotel Mercure, Royal Golden Hotel — todas com cidade "Belo Horizonte" e notes com ID OSM.
- 5 Discoveries criadas em `ap_discoveries` vinculadas à campanha, com `source` e `url` (ex.: `https://www.openstreetmap.org/node/505534675`).
- Amostras reais retornadas pela fonte (e descartadas pela meta): Chalé Mineiro Hostel (tel/site), Radisson Blu Savassi (tel/e-mail/site), ibis Savassi (tel/e-mail), Allia Gran Hotel Pampulha (tel/e-mail), OYO Hotel L'Espace (tel/site), entre outras.
- **Dedup real confirmado**: nenhuma duplicação da base existente (empresa "TESTE 2.1 - Empresa Alfa LTDA" intacta, 1 registro).
- Persistência confirmada por leitura direta via REST após a execução.

## 11. Custos

- **OpenStreetMap/Overpass: custo R$ 0.** Serviço público e comunitário (FOSSGIS/e.V. e kumi.systems), sem chave, sem faturamento. Política de uso justo: uso leve com intervalos; implementado com timeout, maxsize, limite por consulta e 1 consulta por ação.
- **Atenção para futuros providers pagos:** Google Places Text Search ≈ **USD 32/1.000 requisições** (além de billing configurado); BrasilAPI gratuito (mas sem busca por critérios). Nenhum custo incorrido nesta etapa.

## 12. Limitações

1. **Dedup por nome normalizado** (existente desde a Etapa 2): variantes de nome ("Mercure" vs "Hotel Mercure") não são fundidas; CNPJ não participa do match. ID externo (OSM) fica em `notes`, sem coluna própria (evitar duplicação futura de POIs renomeados) — possível coluna `external_id`/`source_id` numa próxima etapa.
2. **Migration `00006` (keyword) não aplicada** — campo persiste somente após aplicação manual no SQL Editor.
3. **Cidade**: a busca usa a área administrativa da cidade no OSM (admin_level 8, com fallback); localizações vagas ("Grande BH") usam a primeira parte ("Belo Horizonte"); cidades não mapeadas retornam 0.
4. **Estado (UF)**: muitos POIs brasileiros não têm `addr:state` → UF vazia em parte dos resultados (cidade preenchida via fallback).
5. **Qualidade da fonte**: OSM tem cobertura desigual (bairros/hotéis bem mapeados, outros segmentos esparsos); campos como Instagram/WhatsApp são raros; "não disponível" é exibido quando ausente.
6. **Lock por campanha é in-memory** (um processo de servidor): com múltiplas instâncias de deploy poderia haver execução concorrente; o botão desabilita durante a busca.
7. **Segmentos não mapeados** na tabela OSM são ignorados pelo provider (sem erro) — keywords cobrem esses casos.
8. 3 campanhas "TESTE 3 - Hoteis BH" vazias criadas pelas tentativas anteriores do script de validação + dados de teste das Etapas 2.1/3 permanecem no banco (prefixos `TESTE 2.1`/`TESTE 3`) — limpeza com autorização.

## 13. Próximos passos (recomendados, aguardando autorização do Arquiteto/CTO)

1. Aplicar `00006_auto_prospect_keyword.sql` no SQL Editor (habilita palavra-chave persistente).
2. Limpeza dos dados de teste (`TESTE 2.1`/`TESTE 3`).
3. Novo provider (ex.: Google Places) atrás da mesma interface `DiscoveryProvider` — **somente após revisão de custo**.
4. Coluna `external_id`/`source_id` para dedup por fonte (evita re-save de POI renomeado).
5. Melhoria de cobertura: `addr:state` derivado da cidade; enriquecimento futuro (fora de escopo: IA, Lead Score, contatos, WhatsApp/e-mail automáticos, pipeline).

---

### Prova da Etapa 3 (validada em produção)

> O usuário cria uma campanha (cidade + segmento + keyword + meta), clica em **Pesquisar** e o Auto Prospect **encontrou 54 empresas reais em BH (7,5s), salvou 5 novas (meta respeitada), registrou as Discoveries com fonte/URL e não duplicou nada.**
