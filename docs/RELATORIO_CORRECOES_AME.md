# RELATÓRIO COMPLETO — Correções e Validações (Alves Mobilidade)

**Data:** 10/08/2026
**Escopo:** Correções solicitadas pós-build + validação com testes automatizados
**Status:** Concluído — nada commitado

---

## 1. Empresas restaurada no menu do Admin ✓

- Item `{ id: "empresas", group: "Comercial", label: "Empresas", icon: Briefcase }` de volta ao menu lateral (agrupamento "Comercial").
- Import `Briefcase` restaurado de `lucide-react`.
- Funcionalidade interna inalterada: o `case "clientes": case "prospeccao": case "empresas":` continua com o filtro `l.type === "Empresa"` na listagem.
- Arquivo: `app/admin/page.tsx` (menu) — demais lógica intocada.

## 2. AME Vision — validação de não-regressão ✓

Arquivos do Vision tocados nesta execução: **nenhum** (`git diff HEAD` vazio):

| Arquivo | Status |
|---|---|
| `app/admin/tv-de-bordo/page.tsx` | intocado |
| `app/admin/tv-de-bordo/layout.tsx` | intocado |
| `components/admin/AMEVisionPanel.tsx` | intocado |
| `lib/ameVisionSync.ts` | intocado |
| `lib/ameVisionHTML.ts` | intocado |
| `app/api/ame-vision/news/route.ts` | intocado |
| `app/api/ame-vision/news/image/route.ts` | intocado |
| `app/api/ame-vision/route/route.ts` | intocado |

- **Dependências compartilhadas:** nenhuma. O Vision importa apenas `lucide-react`, `react`, `lib/ameVisionSync` e `lib/ameVisionHTML` (que só puxa `@/lib/supabase`). Nada do que foi alterado (constants, useData, repository-mappers, domain types, views) é importado por ele.
- **Polling:** intacto — `AMEVisionPanel` faz `setInterval(refresh, 3000)` + `readAMEVisionState` (tabela `ame_vision_state`); `tv-de-bordo` faz `setInterval(pollState/sendSettings, 3000)` + `navigator.onLine`.
- **GPS:** intacto — iframe com `allow="fullscreen; geolocation"` no `AMEVisionPanel`.
- **Sequência de telas/layout/animações/textos/assets:** vivem em `lib/ameVisionHTML.ts` (template) — arquivo intocado.
- **Iniciar/finalizar viagem:** estado gerenciado pelo `AMEVisionPanel` via `ame_vision_state`; o `finishTrip` da Agenda não interfere. Case `"ame-vision"` e prop `trips` do page.tsx: inalterados.
- **Rota `/admin/tv-de-bordo`:** estática, gerada no build (19/19 páginas).

## 3. IA da Alves — ações clicáveis ✓

- `AISuggestions` renderiza **botões reais** em cada recomendação com lead vinculado:
  - **WhatsApp** — abre o chat com a mensagem contextual via `messageKeyForLead` (ex.: Pós-atendimento → `agradecimento`; Novo contato → `apresentacao`).
  - **Concluir etapa** — `onCompleteAction` (avança o lead).
- Disponível no Dashboard ("Inteligência rápida") e na aba "IA da Alves" (AIView agora recebe `leads/today/onSendLeadMessage/onCompleteAction`).
- Lógica extraída em `modules/ai/services/ai.service.ts` (`buildAiRecommendations`), testável.

## 4. Marketing — rotação e conclusão por dia ✓

- Item concluído hoje **some** da lista; "Tudo feito hoje!" quando esgotar.
- Recarregar no mesmo dia: itens concluídos continuam ocultos (`completedAt` persistido).
- Dia seguinte: rotação (`day % length`) reposiciona e o item volta.
- Lógica em `modules/marketing/services/marketing.service.ts` (`getMarketingRotation`, `buildVisibleSuggestions`).

## 5. Financeiro — Ganho AME sem duplicação ✓

- Agendar viagem **não lança** ganho (o ganho só nasce no `finishTrip`).
- Concluir viagem gera `Ganho AME — Cliente (Rota)` com `category: "ganhos_ame"` e `tripId` vinculado.
- Concluir de novo (ou após reload) **não duplica** — protegido por guard de `tripId` em `buildFinishTripEffects` (`modules/viagens/services/viagens.service.ts`).
- `finishTrip` do page.tsx refatorado para usar os efeitos do service.

## 6. Indicação — Pendente → Convertida ✓

- Fica "Pendente" enquanto a viagem estiver agendada.
- Conclusão da viagem converte a indicação para "Convertida" + crédito lançado.
- Não credita 2x (guard por `status === "Pendente"`), mesmo com reload/concluir de novo.
- Match por telefone (com tolerância a máscara) e fallback por nome.
- Não converte indicação de telefone diferente.
- Lead do cliente vira "Pós-atendimento" ao concluir.

## 7. WhatsApp — mensagens contextuais ✓

- Novo contato/Apresentação → `apresentacao`; Pós-atendimento → `agradecimento`; Orçamento → `orcamento`.
- Texto de **confirmação de viagem não repete** origem/destino/passageiros/horário (mensagem nova verificada em teste).

---

## Testes criados (novos)

### `lib/__tests__/ame-control-correcoes.test.ts` (13 testes)
- **Financeiro (4):** agendar não lança ganho; finishTrip gera Ganho AME com `category: ganhos_ame` e `tripId`; concluir de novo não duplica; reload não duplica.
- **Indicação (6):** permanece Pendente enquanto agendada; conclusão converte + credita; não converte 2x; match por telefone com máscara; fallback por nome; não converte outro telefone; lead vira Pós-atendimento.
- **WhatsApp (4):** apresentacao/agradecimento/orcamento; texto de confirmação sem repetição de origem/destino/passageiro/horário.

### `lib/__tests__/ame-control-ia-marketing.test.ts` (9 testes)
- **IA da Alves (4):** follow-up atrasado → recomendação com lead + `messageKey` contextual; contato novo → `apresentacao` com lead; sem leads → nenhuma ação vinculada; contagens aparecem nos textos.
- **Marketing (5):** rotação diária altera ordem mantendo todos os itens; concluído hoje some; reload no mesmo dia mantém oculto; volta em outro dia (reposicionado pela rotação); todos concluídos → lista vazia.

---

## Validações executadas

| Check | Resultado |
|---|---|
| `vitest` (suíte completa) | **189/189** testes passando (9 arquivos; +22 novos) |
| `tsc --noEmit` | **0 erros novos** — apenas 31 pré-existentes em `lib/__tests__/supabase-integration.test.ts` (intocado) |
| `eslint` (arquivos alterados) | **0 erros** (warnings pré-existentes no page.tsx) |
| `next build` | ✓ Compiled successfully — 19/19 páginas estáticas geradas, rota `/admin/tv-de-bordo` incluída |

## Arquivos alterados nesta execução

- `app/admin/page.tsx` — menu "Empresas" restaurado; `finishTrip` via `buildFinishTripEffects`; AIView recebe leads/actions; imports órfãos removidos (`cleanPhone`, `addDaysISO`).
- `modules/viagens/services/viagens.service.ts` — `buildFinishTripEffects` (ganho AME + conversão de indicação + crédito + lead Pós-atendimento).
- `modules/ai/services/ai.service.ts` — `buildAiRecommendations` (lógica extraída do DashboardView).
- `modules/ai/components/AIView.tsx` — botões WhatsApp/Concluir nas recomendações.
- `components/admin/AISuggestions.tsx` — botões clicáveis com mensagem contextual.
- `modules/marketing/services/marketing.service.ts` — `getMarketingRotation`, `buildVisibleSuggestions`.
- `modules/marketing/components/MarketingView.tsx` — sugestões rotacionadas + conclusão por dia.
- `lib/__tests__/ame-control-correcoes.test.ts` (novo)
- `lib/__tests__/ame-control-ia-marketing.test.ts` (novo)

## Riscos restantes

1. **Erros TS pré-existentes** em `lib/__tests__/supabase-integration.test.ts` (31 erros: status `"Indicado"`/`"scheduled"` em vez de `"Indicacao"`/`"Agendada"`, tipagem de WebSocket, `data` possibly null) — arquivo intocado; candidato a lote futuro de correção.
2. **Validação do AME Vision é estática** (diff/código/build) — sem execução em browser.
3. **Conversão de indicação por nome** é fallback quando falta telefone; o `ClientSelect` já preenche os telefones automaticamente no cadastro.
4. Testes de UI (browser) não executados.

## Conclusão

Os 7 pontos solicitados foram corrigidos e cobertos por 22 testes automatizados novos; suíte completa 189/189; build de produção OK; `tsc` sem erros novos; `eslint` sem erros. Nenhum commit realizado.
