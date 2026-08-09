# RELATÓRIO — AUTO PROSPECT (Etapa 5: Inteligência Comercial)

**Data:** 09/08/2026 — **Projeto Supabase:** `slapyjstnzzesnlnubof` — **Sem regressão:** AME Control preservado.

## 1. Objetivo
Transformar "lead qualificado" em "oportunidade priorizada e compreendida": a partir da qualificação persistida, gerar a **Inteligência Comercial** — interpretação, prioridade (1–4), score/potencial/confiança consolidados, justificativa, próxima ação e serviços recomendados — persistindo **uma linha por execução** (histórico auditável), sem recrawling e sem inventar dados.

## 2. Arquitetura implementada
```
UI (AutoProspectView — mobile-first)
 ↓ POST /api/autoprospect/intelligence  (rota dedicada; reanálise)
POST /api/autoprospect/analyze  (fluxo completo: enriquece + qualifica + inteligência)
 ↓
Intelligence Service (domain/autoprospect/intelligence.ts)
 ├→ determinístico: prioridade 1–4 → reasons → next_action → rotuladores → consistência
 └→ IA (opcional, substituível): AiIntelligenceProvider (OpenAI-compatible; desligado sem chave)
 ↓
Repository → Supabase (ap_intelligence)  [histórico: 1 registro por execução]
```
- A rota `/intelligence` reanalisa **somente com dados persistidos** (qualificação → inteligência), sem recrawling; cria novo registro de histórico.
- `analyze` executa o fluxo completo e persiste tudo de uma vez (locks em memória por empresa; clique duplicado → 409).

## 3. Prioridade 1–4 (100% determinística)
| Prioridade | Critério (regras explícitas) | Saída de ação |
|---|---|---|
| 1 — Abordar agora | Score ≥ 70 (Alto/Muito alto) | `Abordar agora` |
| 2 — Investigar | Score 50–69 (Médio) | `Investigar detalhes` |
| 3 — Acompanhar | Score 30–49 (Baixo) | `Acompanhar` |
| 4 — Baixa prioridade | Score ≤ 29 (Muito baixo) | `Baixa prioridade` |

Mesma entrada → mesma prioridade (testado). A IA interpreta e sugere, mas **nunca altera** a prioridade/score determinísticos.

## 4. Saídas da Inteligência (tudo persistido em `ap_intelligence`)
- `priority` (1–4) + `priority_reason` (explicação em texto);
- `reasons[]` (lista de motivos, ex.: "Localização atendida pela AME", "Possível demanda por transfer");
- `next_action` (próxima ação concreta — ver §3);
- `summary` (interpretação em texto: o que é, potencial, necessidades prováveis);
- `recommended_services[]` (serviços AME com justificativa; sem evidência → vazio);
- snapshots do score/potencial/confiança da qualificação (imutáveis no registro);
- metadados de auditoria: `provider`, `model`, `ai_status` (`deterministico`/`ia`/`ia_falha`), `tokens_in/out`, `cost_estimate`, `analysis_version` (`intelligence-v1`), `created_at`.

## 5. IA
- Provider opcional OpenAI-compatible (`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` — server-side; sem chave no projeto → **modo determinístico**, custo zero; secrets nunca vão ao frontend).
- Prompt contém **somente** os fatos/sinais/score persistidos; proibido inventar clientes, faturamento, eventos etc. Saída vira apenas texto de interpretação (`ai_response`).
- Resposta inválida/timeout/erro → `ia_falha` com fallback determinístico mantido. Nenhum caminho bloqueia a análise.

## 6. Banco — migration `00008_auto_prospect_intelligence.sql`
- `ap_intelligence`: uma linha por execução (referencia `company_id`, `enrichment_id`, `qualification_id` existentes — **não duplica** dados de etapas anteriores); check `priority between 1 and 4`, `ai_status`, `analysis_version`; índices por company/created_at/priority; RLS `all_anon` (padrão do Auto Prospect).
- **Aplicada manualmente** no SQL Editor pelo usuário (pg-meta desativado). Nenhuma tabela do AME alterada.
- Consulta ao vivo confirmada via REST (14:22–19:02, 09/08): `ap_intelligence` = **13**, `ap_qualifications` = **12**, `ap_enrichments` = **12**, `ap_discoveries` = **79**, `ap_campaigns` = **8**.

## 7. Teste real (empresas reais, fluxo completo e persistência confirmada ao vivo)
Campanhas `TESTE 4 – Hoteis BH` e demais testes → 79 discoveries → 12 enriquecidas → 12 qualificadas → **13 registros de inteligência** (11 empresas únicas + 2 reanálises):

| Empresa | Score | Prioridade | Potencial | Registros |
|---|---|---|---|---|
| OYO Hotel L'Espace – Jaraguá BH | 88 | 1 | Muito alto | 2 (reanálise via `/intelligence`) |
| Holiday Inn BH | 88 | 1 | Muito alto | 1 |
| Quality Hotel Afonso Pena | 88 | 1 | Muito alto | 1 |
| Core Synesis | 85 | 1 | Muito alto | 1 |
| Chalé Mineiro Hostel | 83 | 1 | Alto | 1 |
| Hotel Boulevard | 28 | 4 | Muito baixo | 2 (reanálise) |
| Royal Golden / Vitória / Mercure / Allia / Barreiro | 28 | 4 | Muito baixo | 1 cada |

- **Prioridade 1 (Abordar agora):** 5 empresas · **Prioridade 4 (Baixa prioridade):** 6 empresas. Prioridades 2/3 não ocorreram no dataset real (cobertas nos 32 testes unitários).
- Reanálises comprovaram o **mecanismo de histórico**: mesmo resultado (OYO 88/prio 1 em 2 execuções), registros distintos.

## 8. Auditoria — a IA não inventou dados
- **OYO (88, prio 1)**: `reasons` — "3 sinais comerciais encontrados", "4 serviços da AME potencialmente compatíveis", "Localização atendida pela AME", "Possível demanda por transfer", "Site comercial ativo"; 3 sinais com trecho e **URL de origem real** (oyorooms.com); 5 evidências persistidas (2 fatos + 3 sinais) todas com `source_url`; `next_action = Abordar agora`.
- **Barreiro (28, prio 4)**: enriquecimento sem sinais/serviços — saída honesta (0 sinais, 0 serviços recomendados, justificativa de baixa prioridade), sem inventar conteúdo.
- **Boulevard (28)**: site inacessível → inteligência baixa prioridade com razão; fluxo honesto.

## 9. Arquivos criados
1. `domain/autoprospect/intelligence.ts` — prioridade 1–4 determinística, reasons, next_action, rotuladores, `AiIntelligenceProvider` (OpenAI-compatible + desabilitado), `withAiIntelligence`.
2. `app/api/autoprospect/intelligence/route.ts` — POST server-side: reanálise com dados persistidos (sem recrawling), lock por empresa, novo registro de histórico; erros amigáveis (400/404/409/502).
3. `supabase/migrations/00008_auto_prospect_intelligence.sql`.
4. `lib/__tests__/autoprospect-intelligence.test.ts` (32 testes).

## 10. Arquivos modificados
1. `app/api/autoprospect/analyze/route.ts` — fluxo completo: enriquecimento → qualificação → inteligência → persistência em uma chamada.
2. `lib/repository-mappers.ts` — mappers `apIntelligenceFromSupabase/ToSupabase` (+366 linhas no diff).
3. `hooks/useAutoProspect.ts` — estado de inteligência + `analyzeCompany`/reanálise.
4. `modules/autoprospect/components/AutoProspectView.tsx` — painel de inteligência (prioridade, justificativa, próxima ação, serviços).
5. `app/admin/page.tsx` — repasse do estado.

## 11. Testes
**167/167 passando** (7 arquivos; **32 novos**): prioridade determinística (4 faixas + limites 69/70/50/49/30/29), consistência (mesma entrada → mesma saída), reasons/next_action corretos, rotuladores, snapshots, segurança (fora de faixa rejeitado), histórico (reanálise cria registro), perfil de persistência/consulta, provider IA (desabilitado sem chave; resposta válida só na interpretação; falha → fallback determinístico).

## 12. Qualidade
- `tsc --noEmit`: **limpo** — apenas erros pré-existentes documentados em `supabase-integration.test.ts` (inalterados).
- `eslint .`: apenas erros pré-existentes do projeto (convenção `interface extends Omit {}` em `domain/*/types.ts`, `no-explicit-any`/`set-state-in-effect` em arquivos antigos não tocados) — **nenhum erro novo** introduzido pela Etapa 5 (diff confirma: mudanças apenas em 3 arquivos).
- `npm run build`: **OK** (Next 16.2.6, Turbopack) — 19 rotas, `ƒ /api/autoprospect/analyze`, `ƒ /api/autoprospect/intelligence`, `ƒ /api/autoprospect/discover`.

## 13. Custos
- **R$ 0 nesta etapa.** IA não configurada → determinística. Overpass/site próprio: gratuitos. Rastreio futuro já implementado: `provider/model/tokens/cost_estimate` por registro.

## 14. Segurança / LGPD
- Sem segredos no frontend (chaves server-side; nenhuma em `NEXT_PUBLIC_*`/localStorage/banco exposto).
- Reanálise usa **somente dados já persistidos** (sem novas buscas); evidências com URL de origem preservada; RLS `all_anon` padrão do módulo.

## 15. Limitações
1. Prioridades 2 e 3 não exercitadas no dataset real (testadas unitariamente).
2. Lock por empresa é in-memory (1 processo).
3. IA depende de chave (hoje determinística — explicável, menos contextual).
4. Extração/interpretação limitadas ao conteúdo textual do site oficial.

## 16. Pendências
- **Dados de teste identificados** (aguardando autorização de limpeza): 13 registros `ap_intelligence`, 12 `ap_qualifications`, 12 `ap_enrichments` (+evidências), 79 `ap_discoveries`, campanhas com prefixo `TESTE`.
- Migration `00008` aplicada manualmente (documentada).

## 17. Próximos passos (aguardando autorização)
1. Limpeza dos dados de teste.
2. Configurar chave de IA para modo híbrido e avaliar interpretações.
3. Pipeline em lote com limites — fora desta etapa.

---

**DISCOVERY → ENRIQUECIMENTO → QUALIFICAÇÃO → INTELIGÊNCIA → PRIORIDADE → SCORE → PRÓXIMA AÇÃO → PERSISTÊNCIA — implementado e validado com empresas reais, persistência confirmada via REST e auditoria de não-invenção comprovada.**

**PARE. Aguardando autorização explícita do Arquiteto/CTO para a Etapa 6.**
