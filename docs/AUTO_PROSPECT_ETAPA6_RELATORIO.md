# RELATÓRIO — AUTO PROSPECT (Etapa 6: Oportunidade Comercial)

**Data:** 10/08/2026 — **Projeto Supabase:** `slapyjstnzzesnlnubof` — **Sem regressão:** AME Control preservado · AME Vision intocado.

---

## 1. Estado antes da execução

- Auto Prospect pausado após a **Etapa 5** (Inteligência Comercial), commitada em `00697e7` (HEAD).
- Etapas 1–5 intactas: `domain/autoprospect/*`, `hooks/useAutoProspect.ts`, APIs `/api/autoprospect/{discover,analyze,intelligence}`, 5 arquivos de teste (128 testes), migrations `00005`–`00008`.
- Dados reais persistidos: 13 `ap_intelligence`, 12 qualificações, 12 enriquecimentos, 79 discoveries, 8 campanhas.
- **Compatibilidade verificada:** as correções do AME Control não afetaram o Prospector (nenhum mapeador `ap*` alterado; `useAutoProspect` independente de `useData`; entrada do menu/case no page.tsx intactos).

## 2. Objetivo

Transformar empresa descoberta/enriquecida/qualificada em **oportunidade comercial trabalhável no AME Control**: prioridade preservada, contatos, serviço sugerido, status simples, histórico de interações. **Abordagem 100% manual** — nenhum envio automático.

## 3. O que foi implementado

- **`ap_opportunities`**: oportunidade vinculada a `ap_companies` (mesma empresa — sem duplicação), com **snapshot** da inteligência no momento da criação (prioridade 1–4, score, potencial, confiança, justificativa, próxima ação, serviços sugeridos) e referências a `intelligence_id`/`qualification_id`.
- **1 oportunidade ativa por empresa**: partial unique index (status ativos) + validação server-side com mensagem "Esta empresa já possui uma oportunidade em andamento." (409).
- **`ap_opportunity_interactions`**: histórico manual (canal, resultado, observação, data) vinculado à oportunidade; "Oportunidade criada" é derivada do `created_at`.
- **Status oficial (7):** `Nova`, `Para abordar`, `Em contato`, `Respondeu`, `Interessado`, `Sem interesse`, `Convertido` (5 ativos).
- **Contatos:** NENHUMA estrutura nova — vêm da empresa (`ap_companies.phone/whatsapp/email/website/instagram/linkedin`), sem duplicar fonte de verdade. Links manuais (wa.me sem mensagem, tel:, mailto:, site, redes) + copiar.
- **Serviço sugerido:** usa `recommended_services` já persistido na inteligência — nada é inventado.
- **Filtros:** status, prioridade, potencial, campanha, busca.
- **UI:** mobile = cards; desktop = tabela densa (padrão mobile-first existente).

## 4. Modelo de dados

```
ap_companies
   │
   └─── ap_opportunities (company_id FK · snapshot da inteligência)
          │
          └─── ap_opportunity_interactions (opportunity_id FK · histórico)
```

- `ap_opportunities`: `company_id` (FK cascade), `intelligence_id`/`qualification_id` (FK set null), `status` (check 7 valores), `priority` (check 1–4), `score` (check 0–100), `potential`, `confidence`, `priority_reason`, `next_action`, `recommended_services jsonb`, `created_at`, `updated_at`.
- `ap_opportunity_interactions`: `opportunity_id` (FK cascade), `channel` (check 6 canais), `result`, `note`, `occurred_at`, `created_at`.
- **Integridade:** FK+checks+índices; **1 ativa/empresa** via `idx_ap_opportunities_one_active` (partial unique); RLS `all_anon` (padrão do módulo).

## 5. Migrations

- **`supabase/migrations/00010_auto_prospect_opportunities.sql`** (NOVO): tabelas, índice único parcial, índices e RLS.
- **NÃO aplicada automaticamente** — aguardando sua autorização/aplicação no SQL Editor (pg-meta desativado), como nas etapas anteriores.
- Migrations anteriores: intocadas.

## 6. APIs (3 novas rotas)

| Rota | Operações |
|---|---|
| `POST/GET /api/autoprospect/opportunities` | Cria (valida empresa 404, inteligência 409, duplicação ativa 409, lock in-memory) / Lista com join da empresa |
| `GET/PATCH /api/autoprospect/opportunities/[id]` | Detalhe + interações / Altera status (valida os 7 status; erro de unique → 409 amigável) |
| `GET/POST /api/autoprospect/opportunities/[id]/interactions` | Histórico ordenado / Registra interação (valida canal, oportunidade 404) |

- Toda operação valida no servidor; sem secrets no response; IDs confiados são cruzados com o banco.

## 7. Serviços / Domínio

- `domain/autoprospect/opportunity.ts` (NOVO): status/canais oficiais, `buildOpportunitySnapshot` (nunca recalcula — preserva a inteligência), `validateOpportunityCreation`, `normalizeInteractionForm`, sugestões de resultado.

## 8. Frontend

- `AutoProspectView.tsx`: nova aba **"Oportunidades"** com lista (cards/table), filtros, e painel de detalhe (resumo quem é/por que interessa/como abordar, serviço sugerido, contatos com links manuais, alterar status, registrar contato, histórico).
- Botão **"Criar oportunidade comercial"** no painel de análise da empresa (só quando há inteligência e nenhuma ativa); se já existir, vira "Abrir oportunidade — {status}".
- `hooks/useAutoProspect.ts`: `opportunities`, `interactions`, `createOpportunity`, `updateOpportunityStatus`, `loadInteractions`, `addInteraction`.
- `app/admin/page.tsx`: repasse das novas props ao view.

## 9. Arquivos criados

1. `supabase/migrations/00010_auto_prospect_opportunities.sql`
2. `domain/autoprospect/opportunity.ts`
3. `app/api/autoprospect/opportunities/route.ts`
4. `app/api/autoprospect/opportunities/[id]/route.ts`
5. `app/api/autoprospect/opportunities/[id]/interactions/route.ts`
6. `lib/__tests__/autoprospect-opportunity.test.ts` (18 testes)

## 10. Arquivos modificados

1. `lib/repository-mappers.ts` — mappers `apOpportunity*`/`apInteraction*` adicionados ao final (mappers existentes intocados).
2. `hooks/useAutoProspect.ts` — estado + ações de oportunidades/interações.
3. `modules/autoprospect/components/AutoProspectView.tsx` — aba Oportunidades + painel + botão no QualificationPanel.
4. `app/admin/page.tsx` — repasse de props.

## 11. Testes

**207/207 passando (10 arquivos; 18 novos).** Cobertos:

- **Criação/vínculos:** snapshot preserva a inteligência sem recálculo; `company_id`/`intelligence_id`/`qualification_id` persistidos; roundtrip to→fromSupabase; join traz contatos da empresa.
- **Idempotência:** 1 ativa/empresa (sem inteligência → 409; ativa existente → 409; ok); PATCH envia só `status`+`updated_at`.
- **Status:** exatamente os 7 oficiais; inválidos rejeitados; ativos = 5 em andamento.
- **Interações:** 6 canais oficiais; normalização (trim, data default); canal inválido rejeitado; vínculo e persistência; sugestões de resultado.
- **Segurança:** nenhum secret/provider/token/`ai_response` nos mappers; sem IDs extras no PATCH.
- **Regressão:** 128 testes das Etapas 1–5 seguem passando 🟢.

## 12. Testes reais

**CONCLUÍDO (10/08/2026) — migration `00010` aplicada pelo usuário e fluxo exercitado via API real contra o Supabase.**

Cenários executados (servidor dev + dados reais de `ap_companies`/`ap_intelligence`):

| # | Cenário | Resultado |
|---|---|---|
| A | GET lista (antes) | 200, vazia |
| B | Criar oportunidade **OYO Hotel L'Espace** (prio 1 real, score 88) | 200 — `Nova`, prio 1, 88, Muito alto, Alta, "Abordar agora" |
| C | Criar OYO de novo | **409** — "já possui uma oportunidade em andamento" |
| D | Criar **Hotel Boulevard** (prio 4 real, score 28) | 200 — `Nova`, prio 4, 28, Muito baixo |
| E | Criar para empresa **sem inteligência** (3bits Estúdio Criativo) | **409** — "sem análise comercial" |
| F | Criar com companyId inexistente | **404** |
| G | PATCH OYO → `Para abordar` | 200 — status persistido |
| H | PATCH status inválido | **400** — "Status comercial inválido." |
| I | PATCH oportunidade inexistente | **404** |
| J | Registrar interação OYO (WhatsApp · Respondeu · "Solicitou orçamento transfer aeroporto") | 200 |
| K | Interação com canal inválido | **400** — "Canal de contato inválido." |
| L | Interação em oportunidade inexistente | **404** |
| M | GET histórico OYO | 1 interação com canal/resultado/nota/data |
| N | **Reload** GET lista | 2 oportunidades persistidas; OYO segue `Para abordar` |
| O | GET detalhe OYO | join com empresa real (telefone (31) 3443-5655, site oyorooms.com), 4 serviços recomendados com motivo, snapshot intacto |
| P | PATCH Boulevard → `Sem interesse` (encerra) | 200 |
| Q | Criar Boulevard novamente (encerrada permite nova) | **200** — prova o partial unique index nos dois sentidos |
| R | GET final | 3 oportunidades persistidas (estado no item 22) |

**Persistência confirmada:** todos os dados sobreviveram a novas leituras (reload) — o snapshot, status e histórico vieram do banco, não de memória.

## 13. Persistência

- Dados existentes (13/12/12/79/8): **intactos** — nenhuma tabela anterior tocada; nada apagado/recriado.
- Novos dados só nascem das novas tabelas, mediante aplicação da migration.

## 14. Segurança

- Sem secrets em nenhum response; chaves continuam server-side.
- Validações server-side completas (empresa existe, inteligência existe, 1 ativa, status/canais oficiais, lock anti-clique duplo).
- RLS `all_anon` — mesmo padrão do módulo Auto Prospect.

## 15. Impacto no AME Control

**Nenhum.** Fora do Prospector, apenas o `app/admin/page.tsx` ganhou repasse de props já existentes. Clientes, Agenda, Viagens, Orçamento, Financeiro, Indicações, WhatsApp, Marketing, Dashboard e IA da Alves: intocados. `useData`: intocado.

## 16. Impacto no AME Vision

**Nenhum (protegido).** `git status` confirma zero alterações em `AMEVisionPanel`, `ameVisionHTML`, `ameVisionSync`, `tv-de-bordo`, `ame_vision_state` ou APIs `ame-vision`. Nenhuma dependência compartilhada do Vision foi tocada (`repository-mappers.ts` recebeu apenas adições ao final).

## 17. Problemas encontrados

1. Erro TS próprio numa consulta (`select("id")` sem `status`) — corrigido na hora.
2. Testes exigem migration aplicada para validação real (limitação do ambiente, pg-meta desativado — mesmo fluxo das etapas anteriores).

## 18. Limitações

1. Lock de criação in-memory (1 processo) — mesmo padrão das rotas existentes.
2. "Respondeu/Interessado" são status manuais — o sistema não infere resultado (abordagem manual por definição).
3. Contatos exibidos são os coletados na descoberta/enriquecimento; se a empresa não tiver, a oportunidade mostra "sem contato público" (honesto).

## 19. Próximo passo recomendado

**Autorização para aplicar `00010_auto_prospect_opportunities.sql`** (SQL Editor) e rodar o **teste real obrigatório** com os dados existentes (item 12). Etapa 6 só será considerada concluída com essa evidência.

## 20. Pendências

- [x] Aplicação da migration `00010` (aplicada pelo usuário).
- [x] Teste real com empresas do banco (OYO prio 1 / Boulevard prio 4 / erros).
- [ ] **Ação opcional:** remover a 2ª oportunidade de demonstração do Boulevard (id `641a57a5-2862-475f-b9c6-0fd04b906d8b`, status `Nova`) criada para provar reabertura após encerramento — ou mantê-la como oportunidade real de trabalho.
- [ ] Decisão futura (fora desta etapa): múltiplas oportunidades por empresa, automação de abordagem.

## 22. Estado persistido após o teste real

| Empresa | Oportunidade | Status | Prioridade | Score |
|---|---|---|---|---|
| OYO Hotel L'Espace – Jaraguá BH | `c1d095c0` | Para abordar | 1 | 88 |
| Hotel Boulevard | `5abde510` | Sem interesse | 4 | 28 |
| Hotel Boulevard (demonstração de reabertura) | `641a57a5` | Nova | 4 | 28 |

Dados reais anteriores (13/12/12/79/8): **intactos**.

---

**PARE. Etapa 6 implementada, migration aplicada e teste real com evidências concluído. Aguardando revisão do Arquiteto/CTO.**