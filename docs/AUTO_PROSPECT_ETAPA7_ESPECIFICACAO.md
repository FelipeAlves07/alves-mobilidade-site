# AME Auto Prospect — Especificação Técnica da Etapa 7
## Processamento em Lote (Pipeline de Análise Automática)

**Documento:** especificação para revisão do Arquiteto/CTO
**Status:** especificação — NENHUM código foi alterado
**Base:** revisão arquitetural das Etapas 1→6 (aprovada) — `docs/AUTO_PROSPECT_REVISAO_ARQUITETURAL.md`

> Regra desta execução: **não implementar**. Este documento especifica; a implementação
> só começa após autorização explícita.

---

## 1. Objetivo

Permitir que uma campanha com muitas empresas descobertas seja processada **automaticamente em lote**:

```
100 empresas descobertas
→ entram no processamento
→ são analisadas respeitando limites
→ cada empresa passa pelo pipeline existente
→ resultados são persistidos
→ o sistema continua para a próxima
→ ao final apresenta resumo completo
```

Sem recriar a arquitetura: **100% do pipeline existente das Etapas 1→6 é reutilizado**.
O lote é uma **camada de orquestração** (fila + executor + progresso + controle), não um novo pipeline.

---

## 2. Problema atual

- O pipeline Discovery → Enriquecimento → Qualificação → Inteligência → Oportunidade está
  completo e testado, mas cada empresa exige **uma análise manual** (botão "Analisar").
- Dado real: **50 das 62 empresas** cadastradas estão paradas sem análise (nenhuma linha em
  `ap_intelligence`), e a criação de oportunidade exige inteligência prévia.
- Nenhum mecanismo de fila, retomada, progresso ou retry existe hoje.

**Efeito desejado:** transformar ~50 empresas paradas em inteligência persistida e prioridades
(1-4) para o usuário trabalhar, com um clique e acompanhamento de progresso.

---

## 3. Fluxo proposto

```
┌─ CAMPANHA ────────────────────────────────────────────────┐
│  Discovery (existente, NÃO faz parte do lote)             │
│  → ap_companies + ap_discoveries                          │
└──────────────────────────┬────────────────────────────────┘
                           ▼
┌─ SELEÇÃO DE EMPRESAS (criação do run) ────────────────────┐
│  Filtros: campaignId, apenas sem inteligência, limite     │
│  → snapshot das empresas elegíveis em ap_batch_company_runs│
│    (estado inicial: pendente)                             │
└──────────────────────────┬────────────────────────────────┘
                           ▼
┌─ FILA PERSISTIDA (Postgres) ──────────────────────────────┐
│  ap_batch_runs (1 linha = 1 processamento)                │
│  ap_batch_company_runs (1 linha por empresa do run)       │
│  Claim atômico por empresa (função RPC, SKIP LOCKED)      │
└──────────────────────────┬────────────────────────────────┘
                           ▼
┌─ PROCESSADOR (chunks, server-side) ───────────────────────┐
│  Para cada empresa reclamada, reutilizar o fluxo do       │
│  POST /api/autoprospect/analyze (Etapa 4+5):              │
│   1. Enriquecimento  → WebsiteEnrichmentProvider          │
│      (timeout 12s, máx 6 páginas, robots.txt)             │
│      + ap_enrichments + ap_enrichment_evidences           │
│   2. Qualificação    → buildQualification + withAiExplanation│
│      + ap_qualifications                                  │
│   3. Inteligência    → runCommercialIntelligence          │
│      + ap_intelligence (prioridade 1-4, custo, aiStatus)  │
│  → registrar resultado na fila (concluida / sem_dados /   │
│    falha) + atualizar contadores do run                   │
└──────────────────────────┬────────────────────────────────┘
                           ▼
┌─ PRÓXIMA EMPRESA ─────────────────────────────────────────┐
│  (loop até chunk acabar por N empresas ou janela de tempo)│
└──────────────────────────┬────────────────────────────────┘
                           ▼
┌─ CONCLUSÃO ───────────────────────────────────────────────┐
│  run = Concluido → resumo completo (contadores, prioridades│
│  1-4, custo IA, falhas listadas, tempo)                   │
└────────────────────────────────────────────────────────────┘
```

**O que é reutilizado (sem alteração):**
- `domain/autoprospect/enrichment.ts` — `WebsiteEnrichmentProvider` com todos os limites (`ENRICHMENT_CONFIG`: timeout 12s, 1,5 MB, 6 páginas, 3 redirects, robots.txt).
- `domain/autoprospect/qualification.ts` — `buildQualification` (determinístico) + `withAiExplanation` (IA opcional com fallback).
- `domain/autoprospect/intelligence.ts` — `runCommercialIntelligence` (determinística sempre; IA opcional; `aiStatus` = `deterministico | ia | ia_falha`).
- `lib/repository-mappers.ts` — mappers `apEnrichmentToSupabase`, `apEvidenceToSupabase`, `apQualificationToSupabase`, `apIntelligenceToSupabase`, `apCompanyFromSupabase`.
- Persistência: mesmas tabelas `ap_enrichments`, `ap_enrichment_evidences`, `ap_qualifications`, `ap_intelligence` (histórico imutável por execução, preservado).

**O que é novo (adição, não refatoração):**
- `domain/autoprospect/batch.ts` — domínio puro da fila (estados, classificação de erros, política de retry, seleção de empresas).
- Executor server-side (chunks) — orquestra o fluxo do `analyze` em lote com limites.
- 2 tabelas de fila + colunas de vínculo + 1 função RPC de claim (ver §12).
- Rotas `POST/GET /api/autoprospect/batch...` (ver §13).
- Painel de lote na UI existente (ver §14).

**O que o lote NÃO faz (decisão de domínio):**
- Não executa Discovery automático (é pré-requisito; Overpass permanece fora do lote).
- **Não cria oportunidades** — a Etapa 6 definiu abordagem 100% manual; o lote entrega a
  inteligência pronta e o usuário decide a oportunidade (regra 1 ativa/empresa preservada).

---

## 4. Arquitetura

### 4.1 Estratégia recomendada: fila persistida em Postgres + executor em chunks + polling

Camadas:

| Camada | Responsabilidade | Onde vive |
|---|---|---|
| Fila persistida | Estado durável por run e por empresa; sobrevive a navegador/servidor | `ap_batch_runs` + `ap_batch_company_runs` |
| Domínio puro | Estados, elegibilidade, classificação de erro, retry (testável sem banco) | `domain/autoprospect/batch.ts` |
| Executor | Claim → pipeline (reutiliza `analyze`) → registrar → contadores | service server-side (chunk) |
| Transporte | Rotas REST + polling do cliente | `app/api/autoprospect/batch/**`, `useAutoProspect` |
| UI | Iniciar/pausar/retomar/cancelar, progresso mobile-first | `AutoProspectView.tsx` (aba) |

### 4.2 Por que NÃO processamento 100% síncrono em uma única request

- Uma empresa leva ~5-60s (site + IA opcional). 100 empresas = até ~1-2h. Uma request única
  estoura a janela de função serverless e congela a UI.
- Processamento 100% no cliente (navegador): sobrevive mal a fechar aba/perda de conexão
  (requisito §4 da autorização) e é frágil no celular.

### 4.3 Por que NÃO fila externa paga agora

- Sem necessidade para o volume atual (62 empresas; horizonte 1.000): Postgres já é a fonte de
  verdade das Etapas 1→6 e não adiciona custo (ver §18).
- A fila persistida é o **contrato estável**: quando 10.000+ empresas justificarem, troca-se
  apenas o executor (worker/cron), nunca o modelo de dados.

### 4.4 Execução dos chunks

- `POST /batch/:id/process` executa até **N empresas OU até T segundos** (o que vier primeiro;
  default N=10, T=25s) — adaptativo à janela serverless.
- O cliente admin mantém o loop de `process` enquanto o usuário está na tela; se o navegador
  fechar, o chunk em voo termina e o run permanece retomável (`GET /batch/:id` + novo `process`).
- Retorno de cada chunk: `{ processed, remaining, run }` (estado atualizado).

---

## 5. Estados

### 5.1 Estados por empresa (`ap_batch_company_runs.status`)

Alinhado ao vocabulário já existente no banco (`ap_enrichments.status` usa
`Pendente/Concluido/Indisponivel/Erro`):

| Estado | Significado | Transições | Terminal? |
|---|---|---|---|
| `pendente` | Aguardando processamento | → `processando` | não |
| `processando` | Claimada por um executor (lease `claimed_at`) | → `concluida` / `sem_dados` / `falha` / `pendente` (lease expirado) | não |
| `concluida` | Pipeline completo persistido (enriquecimento + qualificação + inteligência) | — | sim |
| `sem_dados` | Pipeline completo, mas enriquecimento indisponível (sem site cadastrado, site inacessível/bloqueado) — inteligência gerada com confiança baixa, mesmo comportamento do `analyze` individual | — | sim |
| `falha` | Erro definitivo ou retries esgotados (com `error_code` + `error_message`) | → `pendente` (somente via "reprocessar falhas") | sim |
| `cancelada` | Run cancelado antes de processar | — | sim |

> **Decisão de domínio:** `sem_dados` NÃO interrompe o pipeline. O `analyze` individual hoje
> já qualifica e gera inteligência mesmo sem site (confiança baixa). O lote preserva esse
> comportamento — `sem_dados` é apenas a classificação do resumo (empresa sem coleta útil),
> nunca um bloqueio.

### 5.2 Estados do run (`ap_batch_runs.status`)

| Estado | Significado |
|---|---|
| `pendente` | Criado, aguardando primeiro `process` |
| `processando` | Pelo menos um chunk em execução |
| `pausado` | Executor não pode reclamar empresas (claims em voo terminam) |
| `concluido` | Todas as empresas terminais (nenhuma `pendente`/`processando`) |
| `cancelado` | Cancelado pelo usuário; `pendentes` viram `cancelada` |

### 5.3 Máquina de estados (empresa)

```
pendente ──claim──▶ processando ──sucesso──────────────────▶ concluida
                       │  ├── enriquecimento indisponível ──▶ sem_dados
                       │  └── falha definitiva ─────────────▶ falha
                       └── lease expirado (crash) ──────────▶ pendente (re-claimável)
falha ── retry-failures ────────────────────────────────────▶ pendente
pendente ── cancel ─────────────────────────────────────────▶ cancelada
```

---

## 6. Fila / processamento

### 6.1 Criação do run (snapshot de seleção)

1. `POST /batch` valida campanha e filtros; verifica se já existe run **ativo** (não
   `concluido`/`cancelado`) para a campanha → 409 (anti-duplicação).
2. Seleção (SQL server-side, com `LIMIT`):
   - empresas ligadas à campanha via `ap_discoveries`;
   - filtro `apenasSemInteligencia` → `NOT EXISTS (SELECT 1 FROM ap_intelligence i WHERE i.company_id = ap_companies.id)`;
   - limite máximo por run (default 500, configurável) — evita run gigante acidental.
3. Insert em lote em `ap_batch_company_runs` (estado `pendente`).
4. Run em `pendente`; contadores iniciais `total`/`pending`.

### 6.2 Claim atômico (execução única garantida)

Substitui o `runningLocks` em memória usado hoje nas rotas (insuficiente com múltiplas
instâncias de função):

```sql
-- função RPC recomendada (documentada, NÃO criada nesta execução):
create or replace function public.ap_batch_claim_next(p_run_id uuid)
returns uuid
language sql volatile as $$
  update public.ap_batch_company_runs
  set status = 'processando', claimed_at = now(), retry_count = retry_count
  where id = (
    select bcr.id
    from public.ap_batch_company_runs bcr
    where bcr.batch_run_id = p_run_id
      and bcr.status = 'pendente'
      and (bcr.next_retry_at is null or bcr.next_retry_at <= now())
    order by bcr.created_at
    limit 1
    for update skip locked
  )
  returning id;
$$;
```

- Duas invocações concorrentes nunca reclamam a mesma empresa (`SKIP LOCKED`).
- Chunk = `N` chamadas ao claim + processamento de cada empresa (ou janela de tempo).

### 6.3 Execução por empresa (reutilização do `analyze`)

Mesma sequência do `POST /api/autoprospect/analyze/route.ts` (extraída para o executor):

1. `apCompanyFromSupabase` (empresa reclamada);
2. `WebsiteEnrichmentProvider.enrich(company)` → insert `ap_enrichments` (+ evidências se ok);
3. `buildQualification` + `withAiExplanation` → insert `ap_qualifications`;
4. `runCommercialIntelligence` → insert `ap_intelligence`;
5. registrar `concluida`/`sem_dados` na fila + atualizar contadores do run.

Diferenças propositais vs. rota individual:
- **sem `runningLocks` em memória** (o claim no banco é a trava);
- cada etapa em `try/catch` individual com classificação de erro (§7/§8);
- vínculo `batch_run_id` nos artefatos (se a opção §12.4 for aprovada) para relatórios por run.

### 6.4 Pausa/retomada/cancelamento

- `pause`: run → `pausado`; o claim só é chamado se `status <> 'pausado'` e `<> 'cancelado'`; claims em voo terminam normalmente.
- `resume`: run → `pendente`/`processando` (re-habilita claims).
- `cancel`: run → `cancelado`; `UPDATE ... SET status = 'cancelada' WHERE status = 'pendente'` (uma instrução); processando em voo termina e o executor descarta o resultado da empresa (ou registra `cancelada`).

---

## 7. Concorrência

| Parâmetro | Default | Máximo recomendado | Onde |
|---|---|---|---|
| Empresas simultâneas por chunk (executor único) | 1 (sequencial) | 3 (com semáforo) | `BATCH_CONCURRENCY` (env) |
| Empresas por invocação | 10 | 25 | corpo de `POST /process` |
| Janela por invocação | 25s | 40s | `BATCH_CHUNK_TIMEOUT_MS` |
| Delay entre empresas | 500ms | — | `BATCH_DELAY_MS` |
| Delay no 429 | Retry-After ou backoff 30s-2min | — | classificação de erro |
| Overpass | **não é chamado** pelo lote (Discovery é pré-requisito) | 1 consulta ativa se um dia entrar | — |
| Site externo | nunca mais de 1-3 requisições simultâneas | — | semáforo + delay |
| Runs ativos por campanha | 1 | 1 (409 na criação) | validação de criação |

Regras:
- **Overpass:** o lote não consulta Overpass (o Discovery automático já foi executado). Se no
  futuro o lote absorver Discovery, manter 1 consulta por vez + fallback de instâncias (já
  implementado em `OverpassProvider`) + delay ≥ 5s entre consultas.
- **Sites externos:** enriquecimento já é educado (robots.txt, 6 páginas, 1,5 MB, timeout 12s).
  O lote adiciona delay entre empresas e concorrência configurável; o 429 é tratado com
  backoff (§7 tabela de retry).
- **Rate limit 429:** para sites de empresas → `sem_dados` com reason "site limitou o acesso"
  após 1 retry (não insistir); para a IA → a IA nunca é re-chamada (fallback determinístico).

---

## 8. Retry

### 8.1 Classificação de erros (função pura `classifyBatchError`)

| Erro | Retry? | Max | Backoff | Resultado final |
|---|---|---|---|---|
| Timeout (fetch abort — enrichment 12s / IA 30-45s) | sim | 2 | 5s → 15s | `falha` (ou `sem_dados` no site) |
| HTTP 429 (site / provider) | sim | 3 | Retry-After; senão 30s → 2min | `sem_dados` (site) / `falha` (provider) |
| HTTP 500 / 502 / 503 (site) | sim | 2 | 5s → 30s | `sem_dados` |
| Site inacessível (status 0: DNS, conn recusada) | sim | 1 | 15s | `sem_dados` (semântica `unavailable` do enrichment preservada) |
| Resposta inválida (HTML vazio/incompleto, status inesperado) | sim | 1 | 10s | `falha` |
| Empresa sem site (`website` vazio) | **não** | 0 | — | `sem_dados` (definitivo) |
| Erro de banco (Supabase transiente) | sim | 3 | 1s → 5s | `falha`; **o chunk não aborta a campanha** |
| Erro de validação (empresa não encontrada 404, corpo inválido) | **não** | 0 | — | `falha` (definitivo) |
| IA falhou (`aiStatus = ia_falha`) | **não** | 0 | — | `concluida` com fallback determinístico (comportamento atual, custo zero de retry) |

Regras gerais:
- Retry só ocorre **no mesmo chunk** (a empresa volta para `pendente` com `next_retry_at` se o
  chunk terminar); nunca em invocações futuras sem intenção — o default é `falha` quando
  `next_retry_at` futuro expira sem nova chance (ou `retry_count` atinge o máximo).
- `error_code` (enum documentado) + `error_message` gravados na linha da empresa.
- **Definitivos (sem retry):** sem site, validação, IA, 404. **Retryáveis:** timeout, 429, 5xx, rede, banco.

---

## 9. Idempotência

| Risco | Proteção existente (reutilizada) | Proteção nova |
|---|---|---|
| Empresa duplicada | `idx_ap_companies_dedup` (lower(name)) + dedup em 2 camadas do Discovery | — |
| Discovery duplicado | `unique (company_id, campaign_id)` em `ap_discoveries` | — |
| Enriquecimento duplicado | histórico por execução (sem unique — por design, permite reanálise manual) | **o claim atômico garante 1 execução por empresa por run** |
| Qualificação duplicada | idem (histórico) | idem |
| Inteligência duplicada | idem | idem |
| Oportunidade duplicada | partial unique `idx_ap_opportunities_one_active` | **lote não cria oportunidades** (decisão §3) |
| Processamento duplicado | — | claim com `SKIP LOCKED` + estado `processando` + lease; retomada só pega `pendente` |
| Run duplicado | — | 1 run ativo por campanha (409) |

Princípio: **a fila é o mecanismo anti-duplicidade do lote**; os artefatos seguem o modelo de
histórico imutável por execução das Etapas 1→6 (nada é sobrescrito). Uma empresa só é
processada de novo se o usuário pedir (novo run de reanálise ou "reprocessar falhas").

---

## 10. Falha parcial

- **Cada empresa é a unidade atômica** do loop: `try/catch` por empresa dentro do chunk.
- Empresa 3 falhar NÃO interrompe as empresas 4 e 5:

```
Empresa 1 ✅  Empresa 2 ✅  Empresa 3 ❌ (falha registrada)  Empresa 4 ✅  Empresa 5 ✅
```

- Falha registrada com `error_code`/`error_message`; contadores do run refletem.
- **Exceção (infraestrutura):** se o próprio banco de dados estiver indisponível (erro em todas
  as gravações), o executor aborta o chunk com erro explícito e o run permanece retomável
  (empresas ficam `pendente`/`processando` com lease) — não há corrupção de estado.
- Ao final: resumo com falhas listadas + ação "processar novamente falhas".

---

## 11. Retomada

| Cenário | Comportamento |
|---|---|
| Navegador fechado | Chunk em voo termina na função server; run fica onde parou. Ao reabrir, `GET /batch/:id` mostra estado e o usuário (ou o próprio polling da tela) dispara novo `process`. **Nenhuma empresa é reprocessada indevidamente.** |
| Celular perde conexão | Idem — o processamento é server-side; a perda de conexão só interrompe o *polling*, nunca o run. |
| Servidor reiniciado | Nada em memória; fila no Postgres. Empresas `processando` com `claimed_at` antigo (lease > 5 min) são re-elegíveis como `pendente` (a consulta de claim inclui `claimed_at < now() - interval '5 minutes'` quando status = `processando`). |
| Processamento interrompido (deploy/crash no meio de um chunk) | Empresas `processando` sem finalização → recuperadas pelo lease no próximo claim. Empresas já registradas (`concluida`) jamais são tocadas. |
| Uma empresa falha | `falha` (ou `sem_dados`); não impede as demais (§10). |
| Metade da campanha processada | Contadores refletem; retomada processa apenas `pendente` (nunca `concluida`). |

**Regra de ouro:** a elegibilidade é derivada do estado da fila no banco. "Não reprocessar
indevidamente" é garantido pela máquina de estados (§5) — só `pendente` é reclamável, e o
claim é atômico.

---

## 12. Banco

### 12.1 Conclusão: o modelo atual é suficiente para o *domínio*, mas NÃO para a fila

- `ap_enrichments`/`ap_qualifications`/`ap_intelligence` são **histórico imutável por execução** —
  não podem ser usados como fila (não têm claim, retry, lease nem estado de trabalho).
- As proteções de duplicidade existentes (§9) permanecem intocadas.

**É necessário criar a camada de fila.** Especificação abaixo — **NENHUMA migration foi aplicada.**

### 12.2 Tabela `ap_batch_runs` (1 linha = 1 processamento)

| Coluna | Tipo | Finalidade |
|---|---|---|
| `id` | uuid PK default gen_random_uuid() | identidade |
| `campaign_id` | uuid NOT NULL FK → `ap_campaigns(id)` ON DELETE CASCADE | campanha processada |
| `status` | text check (`pendente`, `processando`, `pausado`, `concluido`, `cancelado`) | máquina de estados do run |
| `filters` | jsonb default `{}` | filtros de seleção (apenasSemInteligencia, limite) |
| `total` / `pending` / `processing` / `completed` / `failed` / `without_data` / `cancelled` | integer default 0 | contadores (denormalizados para leitura barata da UI; mantidos pelo executor) |
| `error_summary` | jsonb default `[]` | lista de {error_code, count} para o resumo |
| `started_at` / `finished_at` | timestamptz | duração e ETA |
| `created_at` / `updated_at` | timestamptz (+ trigger existente) | auditoria |

Índices: `idx_ap_batch_runs_campaign (campaign_id)`, `idx_ap_batch_runs_status (status)`,
`idx_ap_batch_runs_created_at (created_at desc)`.
RLS: `all_anon` (padrão da casa) + checks + trigger `set_updated_at`.

### 12.3 Tabela `ap_batch_company_runs` (1 linha por empresa do run)

| Coluna | Tipo | Finalidade |
|---|---|---|
| `batch_run_id` | uuid NOT NULL FK → `ap_batch_runs(id)` ON DELETE CASCADE | vínculo ao run |
| `company_id` | uuid NOT NULL FK → `ap_companies(id)` ON DELETE CASCADE | empresa |
| `status` | text check (`pendente`, `processando`, `concluida`, `sem_dados`, `falha`, `cancelada`) | máquina de estados |
| `error_code` / `error_message` | text default '' | diagnóstico de falha |
| `retry_count` | integer default 0 | tentativas |
| `next_retry_at` | timestamptz null | backoff entre chunks |
| `claimed_at` | timestamptz null | lease (recuperação de crash: `processando` + claimed_at > 5 min → re-elegível) |
| `created_at` / `updated_at` | timestamptz | auditoria |

- **PK composta `(batch_run_id, company_id)`** — garante 1 linha por empresa por run (idempotência estrutural).
- Índices: `idx_ap_bcr_claim (batch_run_id, status, next_retry_at)` (consultado pelo claim),
  `idx_ap_bcr_company (company_id)`.
- RLS `all_anon` + checks + trigger.

### 12.4 Vínculo dos artefatos ao run (para relatórios por run)

**Opção A (recomendada):** adicionar coluna nullable `batch_run_id uuid` FK → `ap_batch_runs(id)
ON DELETE SET NULL` em `ap_enrichments`, `ap_qualifications` e `ap_intelligence` + índice por
`batch_run_id`. Não-destrutivo (ADD COLUMN), não altera dados existentes, permite: prioridades
1-4 do run, custo de IA, `aiStatus`, tempos — consultando as tabelas de artefatos com o vínculo.

**Opção B (alternativa, zero alteração nas tabelas existentes):** espelhar no
`ap_batch_company_runs` um JSONB `result` com `{priority, score, costEstimate, aiStatus}`.
Menos limpa (duplica dados), mas não toca tabelas existentes.

**Recomendação: Opção A** — segue o padrão da casa (FK + histórico real) e evita espelho.
Esta decisão fica registrada para a migration da Etapa 7.

### 12.5 Função RPC de claim

`ap_batch_claim_next(p_run_id uuid)` — ver SQL em §6.2 (função `security definer`? **não** —
executa com privilégios do chamador anon via RLS, igual ao resto do projeto; os UPDATEs na
própria tabela são permitidos pela policy `all_anon`).

---

## 13. APIs

Padrão da casa (REST, body JSON, `runtime = "nodejs"`, validação server-side, erros
`{ ok: false, error, detail }`). Estrutura **analisada** contra o existente — não copiada do
exemplo conceitual:

| Método/Rota | Finalidade | Sucesso | Erros |
|---|---|---|---|
| `POST /api/autoprospect/batch` | Criar run (`{campaignId, apenasSemInteligencia?, limiteMaximo?}`) | 201 run | 400 inválido · 404 campanha · 409 run ativo |
| `GET /api/autoprospect/batch` | Listar runs (`?limit=20`) | 200 [] | 400 |
| `GET /api/autoprospect/batch/:id` | Estado detalhado: run + contadores + últimos 20 itens (nome da empresa via join) + ETA | 200 | 404 |
| `POST /api/autoprospect/batch/:id/process` | Processar chunk (`{empresasPorChunk?}`); **exige run ativo e não pausado** | 200 `{processed, remaining, run}` | 400 pausado · 404 · 409 cancelado/concluido |
| `POST /api/autoprospect/batch/:id/pause` | Pausar (bloqueia novos claims) | 200 | 404 · 409 estado inválido |
| `POST /api/autoprospect/batch/:id/resume` | Retomar | 200 | 404 · 409 |
| `POST /api/autoprospect/batch/:id/cancel` | Cancelar (pendentes → cancelada) | 200 | 404 · 409 |
| `POST /api/autoprospect/batch/:id/retry-failures` | Cria run de continuação com as empresas `falha` (novo run, histórico preservado) | 201 | 404 · 409 |

Regras:
- `process` retorna **estado incremental** para o polling da UI; o loop é do cliente, o estado é do servidor.
- Transições inválidas → 409 (nunca silencioso).
- `retry-failures` cria **novo run** (não reabre o antigo) — mantém imutabilidade do histórico e
  reutiliza toda a máquina de estados.

---

## 14. UI / mobile

### 14.1 Métricas exibidas (mobile-first)

Tela do lote (aba existente do Auto Prospect, painel de progresso):

- Barra de progresso fixa no topo: **percentual** = (concluídas + falhas + sem_dados + canceladas) / total.
- Linha compacta de contadores: **total · pendentes · processando · concluídas · falhas · sem dados**.
- Badges de **prioridade 1-4** (contados pela inteligência do run — vínculo §12.4), com o emoji/label da Etapa 5.
- **Tempo decorrido** + **ETA** (pendentes × tempo médio por empresa).
- Feed rolável dos últimos itens (nome da empresa + estado + erro curto) — 1 linha por card.
- Resumo final: "Run concluído — X concluídas, Y falhas (botão reprocessar), Z sem dados".

### 14.2 Comportamento mobile-first

- Polling `GET /batch/:id` a cada **2-3s** enquanto `processando`/`pendente` (sem WebSocket —
  sem infra nova); polling para em `pausado`/`concluido`/`cancelado`.
- Componentes já responsivos do `AutoProspectView` (grid que vira coluna no mobile) — o painel
  segue o mesmo padrão.
- Botões "Iniciar", "Pausar", "Retomar", "Cancelar", "Processar novamente falhas" no mesmo
  padrão visual existente.

### 14.3 Controles do usuário (todos especificados, decisão de UI)

| Controle | Comportamento |
|---|---|
| Iniciar | Cria run (filtros: pendentes / só sem inteligência) e dispara o primeiro chunk |
| Pausar / Retomar | `pause` / `resume` (§6.4) |
| Cancelar | `cancel` (confirmação na UI) |
| Processar novamente falhas | `retry-failures` |
| Processar somente pendentes | filtro padrão do run (elegibilidade §6.1) |
| Processar somente empresas sem inteligência | filtro `apenasSemInteligencia` na criação |

---

## 15. Segurança

| Tópico | Análise / Mitigação |
|---|---|
| Server-side | Toda lógica de fila/execução é server-side; o cliente só chama rotas REST. Sem `service_role` no cliente (padrão atual preservado). |
| Secrets | `AI_API_KEY` continua apenas em variáveis de ambiente do servidor (como hoje em `createAiAnalysisProvider`/`createCommercialIntelligenceProvider`); o lote não as expõe em respostas. |
| Concorrência / execução duplicada | Claim atômico `SKIP LOCKED` no banco substitui `runningLocks` em memória — correto sob múltiplas instâncias/funções serverless. |
| Abuso de endpoint | Limite de chunks: `process` exige run ativo; janela de taxa simples (ex. máx 60 chamadas/min por run) + `limiteMaximo` por run (500 default) + 1 run ativo por campanha. Nível de autenticação = o atual do projeto (RLS anon — dívida conhecida, fora do escopo desta etapa; documentada em §21). |
| Execução duplicada de `process` | Dois `process` simultâneos reclamam empresas distintas (`SKIP LOCKED`) — nunca a mesma. |
| Exposição de dados | `GET /batch/:id` devolve apenas dados já visíveis no admin (nomes/estados) + contadores; sem credenciais, URLs internas ou dados de API externa. |

---

## 16. IA

- **Sem `AI_API_KEY`:** `createAiAnalysisProvider()` e `createCommercialIntelligenceProvider()`
  já retornam providers desabilitados (`enabled = false`) → o batch roda **100% determinístico**,
  custo zero, sem nenhuma falha. **A IA não é requisito do lote.**
- **Com `AI_API_KEY`:** qualificação (`withAiExplanation`) e inteligência
  (`runCommercialIntelligence`) usam IA com o fallback automático existente:
  `aiStatus = ia_falha` → resultado determinístico mantido, empresa **conclui normalmente**.
- O lote **nunca faz retry de IA** (custo) — uma falha de IA degrada apenas a camada de
  interpretação, nunca o processamento.
- Relatório do run: contadores `ia vs deterministico vs ia_falha` (vínculo §12.4 → `ai_status`
  das inteligências do run).

---

## 17. Escalabilidade

| Volume | Adequação | Notas |
|---|---|---|
| 100 | Excelente | ~10 chunks de 10; minutos; nenhuma preocupação |
| 1.000 | Adequada | ~100 invocações de `process`; dezenas de minutos a ~1h (sites + delay). A fila Postgres e o claim aguentam com folga. |
| 10.000 | Adequada com ajuste | ~1.000 invocações; recomenda-se executor agendado (Vercel Cron / QStash free tier) para não depender do navegador; páginas de listagem já precisam de paginação server-side (dívida §21). |
| 100.000 | **Adequada? Não** | Exige executor dedicado (worker com concorrência real — BullMQ/Redis, QStash ou VM), paginação + índices especializados (pg_trgm no dedup) e revisão de RLS/multi-tenant (já apontado na revisão §14). **Ponto de inflexão:** ~5-10k empresas por run rotineiramente. |

**Compromisso:** o contrato (fila persistida + máquina de estados + claim) **não muda** até
100k — troca-se apenas o executor. Nada precisa ser descartado em 1.000.

---

## 18. Custos

- **Zero serviços novos/pagos.** Postgres (Supabase atual), invocações serverless dentro da cota
  e Overpass público são o suficiente até ~10k.
- IA: custo **apenas** com `AI_API_KEY` configurada (ex. gpt-4o-mini ≈ US$0,0001/empresa);
  determinístico = custo zero.
- Se 10k+ se tornar rotina: Vercel Cron (grátis na cota) ou QStash free tier **antes** de
  qualquer serviço pago — e só então justificar worker dedicado.

---

## 19. Impacto no AME Control

**Nenhum.** Nenhum arquivo ou tabela do Control (`00001`, `00009`, telas existentes) é alterado;
as novas tabelas seguem o prefixo `ap_` e o padrão de RLS/triggers das Etapas 5-6. Verificação
na implementação: `git status` não pode listar arquivos do Control.

---

## 20. Impacto no AME Vision

**Nenhum — absolutamente nada** (arquivos, dados ou migrações `00002`). Verificação na
implementação: `git status` limpo para qualquer arquivo da Vision + conferência de que nenhuma
query toca tabelas da Vision.

---

## 21. Riscos

| Risco | Severidade | Mitigação |
|---|---|---|
| Custo de IA em volume (se chave configurada) | média | IA opcional; fallback determinístico; relatório de custo por run; decisão de desligar por env |
| Sites lentos/instáveis atrasam o lote | média | timeouts existentes (12s), delay, `sem_dados` rápido (não retry excessivo) |
| Rate limit de sites/Overpass | baixa | backoff + Retry-After + concorrência default 1 |
| Janela serverless (chunk interrompido) | média | chunk adaptativo (N ou 25s) + lease recupera `processando` órfãos |
| Dupla execução (batch + análise manual na mesma empresa) | baixa | inofensiva no banco (histórico imutável); UI desabilita "Analisar" para empresas do run ativo |
| `runningLocks` em memória insuficiente multi-instância | — | substituído pelo claim atômico no banco |
| RLS `all_anon` + sem autenticação (dívida pré-existente) | alta (pré-existente) | fora do escopo; documentado; o lote não piora o quadro (mesmas policies) |
| Mudança em tabelas existentes (Opção A §12.4) | baixa | ADD COLUMN nullable + FK SET NULL; não toca dados; revisão antes da migration |
| Listas sem paginação (front) a 10k | média (10k+) | paginação server-side como tarefa de escala (§17) |
| Abuso dos endpoints de batch | baixa | 1 run ativo/campanha, limite por run, janela de taxa |

---

## 22. Testes necessários

**Unitários (domínio puro — sem banco):**
1. `classifyBatchError`: cada linha da tabela §8 mapeia para retry/backoff/terminal corretos.
2. Máquina de estados: todas as transições válidas/inválidas da §5.
3. Elegibilidade/retomada: dada uma lista de estados, só `pendente` (com `next_retry_at` vencido) é selecionada.
4. Criação do run: filtros (só sem inteligência), limite, 409 com run ativo.
5. Contadores: sequência de conclusões/falhas/cancelamentos produz o resumo correto.

**Executor (deps mockadas — sem rede):**
6. Uma empresa percorre enrich→qualify→intelligence com providers falsos (mesmos cenários do `autoprospect-opportunity.test.ts`).
7. Falha parcial: empresa 3 falha → 4 e 5 processadas; contadores e resumo corretos.
8. Retry: 429 → backoff → sucesso; retries esgotados → `falha` com `error_code`.
9. Idempotência: dois `process` concorrentes nunca processam a mesma empresa (claim).
10. Retomada: run interrompido com `processando` órfão (lease vencido) → re-claimável; `concluida` nunca é reprocessada.
11. Pausa/cancelamento: `process` negado nos estados errados (409); cancelamento transforma pendentes em canceladas.
12. Sem `AI_API_KEY`: pipeline 100% determinístico (providers desabilitados).

**Integração (rotas, com Supabase real — padrão dos relatórios de etapa):**
13. Fluxo completo REST: criar run → processar → progresso → concluir → resumo.
14. Teste real com dados atuais (sem tocar os 13 inteligências/12 qualificações/12 enriquecimentos/79 discoveries/8 campanhas/oportunidades): run em campanha existente, validar retomada e falha parcial; confirmar `git status` sem arquivos Vision/Control.

**Verificação final:** suíte completa verde (207 + novos), `tsc` sem erros novos, eslint 0, `next build` OK.

---

## 23. Critérios de aceite

1. Run de campanha com ~50 empresas pende → processa em chunks com progresso na UI (mobile-first), sem travar a interface.
2. **Nenhuma empresa é analisada 2x** no mesmo run (claim atômico) e nenhuma `concluida` é reprocessada por retomada.
3. Fechar o navegador no meio → reabrir → `GET /batch/:id` mostra estado correto e `process` retoma sem reprocessar.
4. Falha de uma empresa não interrompe as demais; resumo final lista falhas com motivo.
5. Pausar impede novos processamentos; retomar continua; cancelar zera `pendentes` para `canceladas`.
6. Retry segue a tabela §8 (429 com backoff; sem site = `sem_dados` definitivo).
7. Sem `AI_API_KEY`, o lote funciona 100% determinístico, custo zero.
8. Dados atuais intactos (contagens §17 da autorização conferidas antes/depois); AME Vision e AME Control com zero alterações no `git status`.
9. 1 run ativo por campanha (409); limite de empresas por run respeitado.
10. Suíte de testes (novos + 207 existentes) verde; tsc/eslint/build OK.

---

## 24. Ordem de implementação

1. **Migration `00011`** (ap_batch_runs + ap_batch_company_runs + colunas `batch_run_id` nas 3 tabelas de artefatos + função `ap_batch_claim_next` + índices/checks/RLS) — aplicada manualmente pelo usuário (padrão da casa).
2. **`domain/autoprospect/batch.ts`** — tipos, estados, máquina de estados pura, `classifyBatchError`, política de retry, seleção/elegibilidade (100% testável sem banco).
3. **Executor** (service server-side) — claim → pipeline reutilizando providers/mappers existentes → registro por empresa → contadores; sem alterar `enrichment.ts`/`qualification.ts`/`intelligence.ts`.
4. **Rotas** `app/api/autoprospect/batch/**` (criar/listar/detalhar/process/pause/resume/cancel/retry-failures) + mappers adicionais ao final de `lib/repository-mappers.ts`.
5. **Hook + UI** — estado de batch no `useAutoProspect`, polling, painel mobile-first na aba existente do Auto Prospect.
6. **Testes** — unitários + executor mockado (§22.1-12), suíte completa, tsc/eslint/build.
7. **Teste real** (§22.13-14) com os dados atuais preservados e relatório final `docs/AUTO_PROSPECT_ETAPA7_RELATORIO.md`.

> Aguarda **autorização explícita** do Arquiteto/CTO para iniciar o passo 1.
