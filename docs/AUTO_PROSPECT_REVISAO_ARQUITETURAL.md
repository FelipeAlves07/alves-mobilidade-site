# AUTO PROSPECT — REVISÃO ARQUITETURAL ETAPAS 1→6

**Data:** 11/08/2026 — **Escopo:** análise somente (nenhum código, migration, dado ou arquivo alterado) — baseada no código real (domínio, rotas, mappers, hook, UI, migrations) e no estado real do banco.

---

## 1. Estado atual

### Código
- Etapas 1–6 implementadas. Etapa 6 commitada? **Não** — alterações da Etapa 6 seguem não commitadas (uso normal do fluxo: aguardando aprovação).
- Camadas: `domain/autoprospect/*` (puro), `app/api/autoprospect/*` (6 rotas), `lib/repository-mappers.ts` (mappers ap*), `hooks/useAutoProspect.ts`, `modules/autoprospect/components/AutoProspectView.tsx`, migrations `00005`–`00010`.

### Banco (contagem real via REST, hoje)
| Tabela | Registros |
|---|---|
| ap_campaigns | 8 |
| ap_companies | **62** |
| ap_discoveries | 79 |
| ap_enrichments | 12 |
| ap_enrichment_evidences | 29 |
| ap_qualifications | 12 |
| ap_intelligence | 13 (11 empresas únicas + 2 reanálises) |
| ap_opportunities | 3 (Para abordar 1 · Sem interesse 1 · Nova 1) |
| ap_opportunity_interactions | 1 |

**Observação relevante:** 62 empresas, apenas 12 enriquecidas/qualificadas e 11 com inteligência → ~50 empresas da base estão **paradas entre Discovery e Inteligência** (sem análise). Isso é o gap operacional atual.

### Testes
**207/207** (10 arquivos). `tsc` sem erros novos. Build OK. AME Vision: **0 arquivos alterados** (git status confirmado).

---

## 2. Arquitetura geral — responsabilidades

```
Discovery ──► Enriquecimento ──► Evidências ──► Qualificação ──► Inteligência ──► Oportunidade ──► Interações
   │              │                   │               │                │                │
ap_companies  ap_enrichments  ap_enrichment_  ap_qualifications  ap_intelligence  ap_opportunities
ap_discoveries                evidences                                 │                │
   ▲                                                                 snapshot         ap_opportunity_
   │                                                                                    interactions
ap_campaigns (critério)
```

**Veredito:** separação correta. As responsabilidades são:

- **Domínio** (`domain/autoprospect/*`): regras puras e testáveis — normalização/dedup de nome, providers de discovery (interface + Overpass), detecção de sinais/robots, score determinístico com breakdown, prioridade 1–4 determinística, snapshot de oportunidade, validação de status/canais, fallback de IA.
- **Rotas API**: orquestração + persistência + validação de entrada (nunca regra de negócio).
- **Mappers** (`repository-mappers`): conversão pura snake↔camel (roundtrip testado).
- **Hook**: estado client e chamadas (sem regras de negócio além de derivações de apresentação).
- **UI**: apresentação mobile-first.

**Regras de negócio indevidamente no frontend?** Não encontrei casos reais. As únicas lógicas no frontend são de **apresentação**: ordenação do ranking, derivação do nome da campanha (via discoveries) e formatação. A regra crítica (1 oportunidade ativa/empresa) está no servidor **e** no banco.

---

## 3. Modelo de dados

| Tabela | FK | Integridade | Histórico |
|---|---|---|---|
| ap_companies | — (raiz) | `unique lower(name)` (dedup por nome) | entidade única por empresa |
| ap_discoveries | company (cascade) · campaign (cascade) | `unique(company_id, campaign_id)` | 1 discovery por empresa+campanha |
| ap_enrichments | company (cascade) | check status | 1 linha por execução (auditável) |
| ap_enrichment_evidences | enrichment (cascade) | check kind (fato/sinal/inferencia) | origem (URL) obrigatória |
| ap_qualifications | company (cascade) · enrichment (set null) | checks score/potential/confidence/recommendation | 1 linha por execução |
| ap_intelligence | company (cascade) · enrichment/qualification (set null) | checks priority/ai_status/analysis_version | 1 linha por execução |
| ap_opportunities | company (cascade) · intelligence/qualification (set null) | checks status/priority/score + **partial unique 1 ativa/empresa** | snapshot imutável + status mutável |
| ap_opportunity_interactions | opportunity (cascade) | check channel | append-only |

**Avaliações:**

- **Relacionamentos e FKs:** corretos e coerentes. `set null` nas referências históricas (enrichment/qualification) evita apagar o histórico ao remover um registro anterior; `cascade` na raiz (company) garante limpeza consistente sem órfãos.
- **Índices:** todos os caminhos de acesso atuais indexados (company, created_at desc, status, priority, segment, city). ✓
- **Deduplicação:** dupla camada (domínio normaliza com NFD e banco com `lower(name)`). ✓ — porém o índice do banco não aplica NFD (ver §16).
- **Órfãos:** nenhuma rota de órfãos encontrada. Único caso teórico: ap_intelligence/ap_opportunities com enrichment/qualification `set null` ficam com snapshot próprio (correto por design — não perdem dados).
- **Duplicações indevidas:** discovery tem unique(company, campaign); oportunidade tem partial unique. Empresa é única por nome. ✓

---

## 4. Inteligência → Oportunidade (ponto crítico)

**Confirmado e garantido em 3 camadas:**

1. **Código:** `buildOpportunitySnapshot()` (domain/autoprospect/opportunity.ts) copia exatamente priority/score/potential/confidence/priority_reason/next_action/recommended_services da inteligência **no momento da criação** — não recalcula.
2. **Rotas:** POST /opportunities usa o snapshot; PATCH altera **somente status** (+updated_at, testado: "envia apenas status + updated_at"); nenhuma rota reescreve os campos do snapshot.
3. **Banco:** as colunas de snapshot são colunas fixas sem trigger de recálculo — a inteligência pode mudar depois (reanálise) sem tocar a oportunidade.

**Provado no teste real:** reanálise da OYO criou 2º registro de inteligência; a oportunidade permaneceu com o snapshot original. ✓

**Nota 🟡:** se o usuário reanalisar a inteligência após criar a oportunidade, a UI não indica que o snapshot está desatualizado. Hoje é correto (a oportunidade é um registro do momento); no futuro, um aviso "há análise mais recente" seria melhoria de UX.

---

## 5. Empresa única

Princípio **"uma empresa = uma entidade central"** confirmado em todo o fluxo:

- `ap_companies` é a única raiz; discoveries, enrichments, qualifications, intelligence e opportunities apontam para `company_id`.
- Dedup por nome em duas camadas (domínio com NFD + índice `lower(name)` no banco) + `unique(company_id, campaign_id)` nas discoveries + `unique company_id WHERE ativa` nas oportunidades.
- A Etapa 6 foi explícita: a oportunidade **não** cria segunda empresa — testado real (POST com mesma empresa → 409).

**Duplicação desnecessária de dados:** nenhuma encontrada — as únicas cópias são **snapshots** (qualificação na inteligência, inteligência na oportunidade), que são intencionais e imutáveis.

---

## 6. Contatos

- **Fonte única hoje:** `ap_companies.phone/whatsapp/email/website/instagram/linkedin` (coletados na descoberta, editáveis manualmente) + `ap_enrichment_evidences` (origem pública de cada dado).
- A oportunidade **lê** a empresa via join — não copia contatos (verificado no mapper `apOpportunityListItemFromSupabase`).
- **Riscos arquiteturais identificados (sem implementar):**
  - 🟡 O roadmap prevê futuramente **"Contatos comerciais" (responsáveis com cargo)**. O risco real é essa camada nascer desacoplada da empresa (ex.: tabela própria sem `company_id`, ou duplicar contatos dentro da oportunidade). A decisão arquitetural correta futura: nova entidade `ap_contacts` com `company_id` FK — **não** duplicar contatos na oportunidade.
  - 🟡 `ap_companies` não tem auditoria de edição de contatos (sem histórico de valores anteriores). Aceitável hoje (dado curado manualmente); se virar crítico no futuro, requer tabela de histórico — decisão consciente.

---

## 7. Oportunidades

**O modelo atual suporta evolução sem recriação:** ✓

| Requisito | Como está | Suporta futuro? |
|---|---|---|
| 1 ativa/empresa | partial unique index + 409 no servidor | ✓ (prova real nos 2 sentidos) |
| Encerramento | status `Sem interesse`/`Convertido` (fora do partial unique) | ✓ |
| Reabertura | nova oportunidade (nova linha, novo snapshot) — provado real | ✓ |
| Histórico | interações append-only + `created_at` ("Oportunidade criada") | ✓ |
| Status | 7 oficiais, check no banco, validação server-side | ✓ |
| Interações | tabela própria com FK cascade + índice por oportunidade/data | ✓ |
| Snapshot | imutável, criado na hora | ✓ |
| Vínculo c/ inteligência | `intelligence_id` + snapshot | ✓ |
| Vínculo c/ campanha | **indireto**: opportunity → company → discovery → campaign | ⚠️ ver nota |

**Nota 🟡:** o vínculo com campanha é derivado no frontend (primeira discovery encontrada). Se a mesma empresa for descoberta em 2 campanhas, o nome exibido é o da primeira do array (não determinístico). Não gera inconsistência de dados (a campanha de origem da descoberta continua em ap_discoveries, que é a fonte de verdade para métricas de campanha), mas a **exibição** pode variar. Futuro: resolver a campanha no servidor (determinístico) ou persistir `campaign_id` na oportunidade — sem alteração de modelo necessária hoje.

---

## 8. APIs e domínio

- **Domínio puro** (sem imports de banco/Next): discovery, enrichment, qualification, intelligence, opportunity — todos com funções exportadas testadas. ✓
- **Rotas** = orquestração fina com validação de entrada (400), relações (404), duplicação (409), erros amigáveis (502), locks in-memory anti-clique duplo. Padrão consistente nas 6 rotas. ✓
- **Mappers**: roundtrip testado; adições da Etapa 6 não alteraram mappers existentes. ✓
- **Hook**: estado + fetch; fallback silencioso de leitura; sem regras críticas no client. ✓
- **UI**: recebe props tipadas; nenhum acesso direto ao banco. ✓

**Conclusão:** arquitetura em camadas consistente. O ponto de atenção futuro é manter a disciplina (regras novas devem ir para `domain/autoprospect`, nunca para a UI).

---

## 9. IA

- **Persistida:** ap_intelligence guarda análise + snapshots + metadados (provider/model/ai_status/tokens/cost/version) por execução. ✓
- **Histórico preservado:** reanálise NUNCA sobrescreve — cria novo registro (13 registros / 11 empresas no banco real). ✓
- **Oportunidade independente de IA:** abre a oportunidade com snapshot; a abertura NUNCA dispara chamada (comentado no hook: "abrir a empresa NUNCA dispara IA; apenas lê o último resultado persistido"). ✓
- **Separação inteligência × operação comercial:** tabelas distintas; a operação (status/interações) não toca a inteligência; a inteligência não sabe de status. ✓
- **Robustez:** modo determinístico sem chave; `ia_falha` com fallback determinístico; custos rastreados por registro. ✓

---

## 10. Discovery (extensibilidade)

- `DiscoveryProvider` é uma **interface** (`search(criteria): RawCompanyResult[]`); `createDiscoveryProvider(name)` é a factory — novo provider = nova classe + 1 linha na factory. Sem reescrever sistema. ✓
- `OverpassProvider` já cobre: consulta estrita→relaxada, failover entre instâncias (overpass-api.de + kumi.systems), timeout com abort, tratamento 429/503/504 com mensagens amigáveis, User-Agent próprio, limite de resultados. ✓
- `parseCriteriaFromCampaign` isola o mapeamento campanha→critério (testável). ✓
- `DISCOVERY_PROVIDER` (env) permite trocar o provider sem deploy. ✓
- **Limitação conhecida:** busca síncrona dentro da request (up to ~30s) — aceitável hoje; para volume (ver §14) exigirá execução em background/fila (não é refatoração, é adição de mecanismo).

---

## 11. Escalabilidade (100 / 1.000 / 10.000 / 100.000)

| Faixa | Diagnóstico |
|---|---|
| 100 empresas | ✅ Confortável — tudo indexado, cargas em memória triviais. |
| 1.000 | ✅ Ok — payloads ainda aceitáveis no mobile (~1–3 MB). |
| 10.000 | ⚠️ **Primeiros limites:** (1) o frontend carrega **todas** as empresas/discoveries/intelligence via repos `findAll` sem paginação (mobile pesado); (2) `runAutomaticDiscovery` carrega a base inteira em memória para deduplicar por nome (2 selects completos por busca); (3) análise/evidências em loops síncronos. |
| 100.000 | ❌ Inviável no modelo atual: exige paginação server-side (listas + filtros no banco), lookup de dedup por nome indexado (pg_trgm ou coluna normalizada), análise assíncrona em lote/fila, e revisão do RLS/multi-tenant. |

**Não é dívida estrutural** (é evolução aditiva), mas o **primeiro limitante real é a ausência de paginação no carregamento do frontend** — afeta também o mobile diário quando a base crescer. Nada a corrigir agora para o volume atual (62 empresas).

---

## 12. Mobile-first

- Tabs horizontais, cards no mobile, tabela no desktop (padrão já existente do Control), painéis em coluna única, botões touch-friendly, estados de loading/erro inline. ✓
- Fluxos diários (abrir análise, criar oportunidade, mudar status, registrar interação, ver histórico) cabem em uma mão no celular. ✓
- **Risco único:** o peso da lista sem paginação (§11) é o que degradaria o mobile primeiro.

---

## 13. AME Control (isolamento)

- `useAutoProspect` **não importa** `useData` — estado próprio; convive lado a lado. ✓
- `repository-mappers.ts`: adições apenas no final do arquivo; mappers existentes (lead/trip/finance/referral/proposal) **intocados**; diff da Etapa 6 não tocou nenhum bloco anterior. ✓
- `page.tsx`: caso `auto-prospect` isolado com props próprias; nada do Control foi alterado para o Prospector na Etapa 6 (só repasse). ✓
- Tipos: `domain/autoprospect/*` separados; sem imports cruzados com domain/lead etc. ✓
- Navegação: item próprio ("Auto Prospect", ícone Radar), sem interferência no menu. ✓
- Contatos/clientes do Control: **não são usados** pelo Prospector (e vice-versa) — decisão correta por enquanto (são domínios diferentes); risco futuro: se um dia o Prospector quiser "promover" uma empresa a cliente do Control, a ponte deve ser explícita (ação do usuário + mapeamento), nunca automática.

**Riscos compartilhados documentados:**
- 🟡 `lib/repository-mappers.ts` e `lib/repository-factory.ts` são compartilhados — mudanças futuras exigem cuidado (nada quebrado hoje).
- 🟡 RLS `all_anon` é o padrão de TODO o projeto (não só do Prospector) — qualquer evolução de autenticação será global.

---

## 14. AME Vision

**CONFIRMADO INTACTO.** `git status` mostra **0 arquivos** do Vision alterados (AMEVisionPanel, ameVisionHTML, ameVisionSync, tv-de-bordo, APIs ame-vision, ame_vision_state). Nenhuma dependência compartilhada do Vision foi tocada nas Etapas 1–6 (`lib/supabase.ts` intocado; adições em `repository-mappers.ts` não são importadas pelo Vision). Nada foi modificado nesta revisão.

---

## 15. Testes

- **207 testes / 10 arquivos**, incluindo 18 da Etapa 6 (oportunidades/interações).
- **Cobertos:** regras determinísticas (score, prioridade 1–4 com limites, sinais, robots), mappers roundtrip, snapshot, idempotência, status/canais, validação de criação, segurança dos mappers, regressão das etapas anteriores.
- **Lacunas importantes (sem criar agora):**
  - 🟡 **Rotas não testadas unitariamente** (validações 400/404/409/502 das 6 rotas foram exercitadas só no teste real manual). Sugestão futura: testes de integração com mock do supabase.
  - 🟡 Hook/UI sem testes (padrão do projeto — views sem teste; aceitável).
  - 🟠 `supabase-integration.test.ts` (pré-existente, **fora** do Auto Prospect) tem 31 erros TS (status antigos `"Indicado"`/`"scheduled"`) — dívida antiga já documentada, não relacionada ao Prospector.

---

## 16. Segurança

- **Secrets:** chave de IA (AI_API_KEY) server-side, nunca ao frontend/banco; respostas de API não expõem provider/model internos sensíveis nem tokens (testado: mappers não carregam `api_key/tokens/cost`).
- **Service role:** não utilizada — client usa ANON_KEY (padrão do projeto).
- **Validações server-side:** completas (entrada, existência de entidades, duplicação, status/canais oficiais, locks). O frontend não confia em si mesmo.
- **Exposição:** RLS `all_anon` (using true / with check true) em todas as tabelas ap_* — **coerente com o padrão do projeto inteiro** (admin sem autenticação hoje), mas significa que qualquer pessoa com a URL pública lê/grava. 🟠 **Risco real quando o sistema sair do uso pessoal/operar em produção pública** — é uma decisão global (não só do Prospector) a ser tomada com autenticação.

---

## 17. Dívida técnica (somente problemas reais)

| Nível | Problema | Onde |
|---|---|---|
| 🔴 | **Nenhum encontrado** | — |
| 🟠 | RLS `all_anon` global (acesso por quem souber a URL) — pré-existente de todo o projeto | todas as tabelas |
| 🟠 | Frontend carrega listas inteiras sem paginação (limite em ~10k empresas; afeta mobile primeiro) | useAutoProspect + repos `findAll` |
| 🟡 | `supabase-integration.test.ts` com 31 erros TS (status antigos `"Indicado"`/`"scheduled"`, tipagem WebSocket) — pré-existente, fora do Prospector | lib/__tests__ |
| 🟡 | Índice `lower(name)` do banco não normaliza acentos (domínio sim) — duplicação teórica tipo "Chalé"/"Chale" | ap_companies |
| 🟡 | Dedup do discovery carrega base inteira em memória por busca | app/api/discover |
| 🟡 | Vínculo oportunidade→campanha derivado no frontend (não determinístico com 2+ campanhas) | AutoProspectView |
| 🟡 | Inserção de evidências em loop (N inserts por análise) | app/api/analyze |
| 🟡 | Locks in-memory (não protegem multi-instância) — já documentado nas etapas | rotas |
| 🟡 | Sem indicação de snapshot desatualizado quando há inteligência mais recente que a oportunidade | UI |
| 🟡 | Warnings pré-existentes de `no-unused-vars` no page.tsx (ex.: `today`, `setLeads`) | app/admin/page.tsx |
| 🟢 | Histórico imutável, snapshot, dedup em 2 camadas, providers plugáveis, fallback de IA, checks no banco | arquitetura |

---

## 18. Riscos

1. **Crescimento da base** (§11) — o único risco estrutural real é a paginação, e ele só ativa perto de ~10k empresas.
2. **RLS anon** (§16) — risco de segurança quando o projeto sair do uso pessoal.
3. **Pendências operacionais:** 50 empresas da base sem análise (gap Discovery→Inteligência) — não é risco de arquitetura, é acúmulo de trabalho manual.
4. **Código da Etapa 6 não commitado** — risco de perda por acidente (recomendo commit assim que aprovado).

---

## 19. Pontos fortes

- Pipeline em etapas com **histórico imutável por execução** (auditoria real) e **snapshots** (imutabilidade no ponto de decisão).
- **Empresa única** como entidade central, dedup em 2 camadas.
- **Determinismo + IA opcional** com fallback e custo zero sem chave.
- **Providers plugáveis** (discovery) e mappers isolados — extensão sem reescrita.
- **Oportunidade desacoplada de IA** — o trabalho comercial não depende de chamadas.
- **Banco com constraints reais** (checks, partial unique, FKs cascade/set-null) — não apenas convenções.
- Isolamento do AME Control e do AME Vision comprovado.
- 207 testes com as regras críticas cobertas + teste real com dados de produção.

---

## 20. Prontidão para Etapa 7

**Resposta: SIM.** A arquitetura atual está pronta para receber a próxima camada **sem refatoração** — o modelo de dados (histórico + snapshot + oportunidade + interações) e a separação de camadas foram projetados exatamente para isso, e o único limite (paginação) só se torna relevante em escala (~10k), não na próxima etapa funcional.

**Condições para o SIM (nenhuma exige refatoração):**
1. Manter o padrão: nova lógica em `domain/autoprospect/*`, nova tabela (se houver) com FK `company_id` + check + partial unique quando houver "1 ativo", rota com validação server-side, mappers adicionais ao final do arquivo.
2. Não tocar AME Vision; não recriar nada existente.
3. Commit da Etapa 6 antes de seguir (recomendação).

---

## 21. Próximo passo recomendado

**Não é automação de WhatsApp.** Análise baseada no código real:

O fluxo completo Discovery→Oportunidade está sólido, mas há um **gargalo operacional real: 50 das 62 empresas estão paradas sem análise** (a criação de oportunidade exige inteligência). O que desbloqueia mais valor com menos risco, usando a arquitetura existente:

**Recomendação: Etapa 7 = análise em lote com limites (pipeline de processamento).**
- Por quê: usa o `analyze` existente (enriquecimento→qualificação→inteligência) sem mudar modelo de dados; fecha o gap Discovery→Oportunidade das ~50 empresas pendentes; entrega oportunidades reais para o usuário trabalhar; prepara a base para os futuros Contatos/Abordagem.
- Requer apenas: processamento em background/fila (mover o analyze de síncrono para enfileirado com limites de concorrência) + paginação/limites de busca — **adições**, não refatorações.

**Alternativa (B) Contatos comerciais (responsáveis):** nova entidade `ap_contacts` (FK company_id) — também encaixa sem refatoração, mas só faz sentido quando houver mais oportunidades em trabalho (hoje: 3).

**Automação de WhatsApp/e-mail:** fica para depois — a Etapa 6 a definiu como futura e a revisão concorda: primeiro fechar o pipeline (lote), depois dar capilaridade comercial (contatos), e só então automação de abordagem sobre uma base com volume.

---

## 22. Preservação

Nada foi apagado, limpo ou modificado nesta revisão. Dados reais intactos: 13 ap_intelligence, 12 qualificações, 12 enriquecimentos, 79 discoveries, 8 campanhas, 3 oportunidades, 1 interação.

---

**PARE. Revisão entregue. Aguardando revisão e autorização do Arquiteto/CTO.**
