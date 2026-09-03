# RELATORIO - AUTO PROSPECT (Etapa 7: Correcao Pos-Validacao Real)

**Data:** 13/08/2026  
**Projeto oficial auditado:** `slapyjstnzzesnlnubof`  
**Resultado:** correcao preparada e validada localmente; migration pendente de aplicacao manual  
**Status da Etapa 7:** **NAO CONCLUIDA**

> Nenhum DDL foi executado no Supabase oficial. Nenhum registro foi alterado ou
> removido. Nenhuma limpeza ou recuperacao foi feita. AME Control e AME Vision
> nao foram modificados. A Etapa 8 nao foi iniciada.

## Escopo e causa raiz

A migration aplicada `00011_auto_prospect_batch.sql` selecionava o candidato no
`p_run_id`, mas atualizava a fila externa somente por `company_id`. Como a
identidade real e `(batch_run_id, company_id)`, um claim podia alterar o mesmo
`company_id` em runs distintos.

Foram preservadas a `00011`, os dados existentes e o pipeline das Etapas 1-6.
A nova `00012` e sequencial e nao recupera os dados historicos por conta propria.

## Correcao entregue

Arquivo novo: `supabase/migrations/00012_fix_auto_prospect_batch_claim_isolation.sql`.

- Claim retorna JSON com `batchRunId`, `companyId`, `claimedAt` e `retryCount`.
- Claim, finalizacao, defer, cancelamento, conclusao, contadores e criacao de
  snapshot usam RPCs atomicas com a chave composta.
- Criacao de run e itens da fila acontecem na mesma transacao.
- `claimed_at` e fencing token. Escritas de E/Q/I/evidencias e transicoes de
  fila falham se o token divergir, o run for cancelado ou o lease exceder cinco
  minutos no relogio do banco.
- Um takeover limpa E/Q/I/evidencias parciais somente daquele `(run, company)`
  antes de reprocessar.
- E/Q/I usam unicidade por `(batch_run_id, company_id)`; evidencias sao
  substituidas de forma atomica e idempotente pelo lease atual.
- Apenas um run ativo por campanha e permitido por indice parcial.
- Contadores sao recalculados sob lock do run em cada mutacao e antes de marcar
  um run como concluido.
- `started_at` e `finished_at` sao gerados no banco.
- A fila passou a reter empresas referenciadas (`ON DELETE RESTRICT`) para nao
  perder snapshot nem contadores por cascade.
- Leitura e escrita de batch sao exclusivas de `service_role`. As tabelas de
  lote (`ap_batch_runs`, `ap_batch_company_runs`) tiveram as policies
  `read_anon` removidas e `SELECT/INSERT/UPDATE/DELETE` revogados de `anon` e
  `authenticated`; so o `service_role` (que bypassa RLS) consegue acessa-las. As
  rotas GET e POST de batch exigem uma sessao de operador validada por bearer
  Supabase; fora da allowlist `BATCH_OPERATOR_USER_IDS` a resposta e `403`
  (`BatchForbiddenError`).
- As mutacoes de batch passam pelos RPCs `SECURITY DEFINER` exclusivos de
  `service_role`; as rotas Node validam o bearer e a allowlist antes de criar o
  cliente server-only. Analises manuais sem `batch_run_id` continuam permitidas
  pelas policies `write_manual_anon` das Etapas 4-5.
- `lib/batch-server.ts` e `lib/batch-executor.ts` usam `import "server-only"`;
  a chave `SUPABASE_SERVICE_ROLE_KEY` nao existe mais no cliente do navegador.
- O endpoint `app/api/auth/setup` foi desativado (retorna `410 Gone`); nenhum
  administrador com senha hardcoded e criado.

`lib/batch-executor.ts` foi adaptado aos novos contratos. O executor descarta
resultado de worker cujo lease foi perdido em vez de permitir que ele finalize
ou grave artefatos atrasados.

## Regressões cobertas

`lib/__tests__/autoprospect-batch.test.ts` (66+ casos de regressao/contrato) e
`lib/__tests__/batch-server.test.ts` (5 casos de autorizacao) cobrem, entre
outros:

1. Chave composta no claim.
2. Mesmo `company_id` em runs distintos.
3. Lease expirado e takeover.
4. Worker antigo sem direito de gravar/finalizar apos takeover.
5. Worker antigo bloqueado mesmo sem takeover apos cinco minutos.
6. Cancelamento durante processamento invalida o lease.
7. Limpeza de artefatos parciais no takeover.
8. Contadores, conclusao, pause/resume, retry e concorrencia sem duplicacao.
9. Contratos SQL de RPC, RLS, unicidade e integridade da fila.
10. `revoke select` das tabelas de lote de `anon`/`authenticated` e ausencia de
    policy `read_anon` nessas tabelas.
11. Autorizacao de batch: sem token, sessao invalida, allowlist vazia, usuario
    fora da allowlist e operador permitido (respostas 401/503/403/200).

## Validacao executada

| Checagem | Resultado |
|---|---|
| Teste direcionado Etapa 7 (`autoprospect-batch.test.ts`) | 66+ passed |
| Teste de autorizacao (`batch-server.test.ts`) | 5 passed |
| Suite segura sem `supabase-integration.test.ts` | 252 passed, 12 skipped |
| ESLint direcionado | 0 erros, 0 warnings |
| Build Next.js | sucesso, 21 rotas geradas |
| PostgreSQL 17 isolado (00005/00007/00008/00011/00012) | aplicadas com sucesso; `ap_batch_claim_version() = 2`; `anon`/`authenticated` negados em insert/claim; ambas FKs `RESTRICT` |

O teste real mutante continua opt-in e exige `RUN_ETAPA7_REAL=1`. Antes de
qualquer escrita ele exige `ap_batch_claim_version() = 2`, portanto interrompe
antes de criar dados se a `00012` ainda nao estiver aplicada.

`npx tsc --noEmit --pretty false` continua vermelho exclusivamente por 27
diagnosticos preexistentes em `lib/__tests__/supabase-integration.test.ts`; apos
o build, ha tambem o artefato gerado `.next/types/validator.ts` ausente em uma
execucao isolada do `tsc`. Nenhum diagnostico foi atribuido aos arquivos da
Etapa 7. O build, que executa a checagem de producao, passou.

## Dados historicos preservados

Os oito itens ja identificados continuam sem alteracao:

- quatro `processando` em runs `concluido`;
- quatro `processando` em runs `cancelado`;
- todos em campanhas `TESTE BATCH ETAPA7`;
- 12 enriquecimentos, 12 qualificacoes e 13 inteligencias anteriores continuam
  com `batch_run_id IS NULL`.

Nao houve recuperacao, limpeza ou recalculo dos runs historicos. Isso requer
autorizacao explicita e snapshot novo imediatamente antes da operacao.

## Aplicacao manual obrigatoria

1. Pausar endpoints/workers de batch e aguardar qualquer worker antigo expirar.
2. Conferir antes da aplicacao que nao ha duplicatas de E/Q/I por
   `(batch_run_id, company_id)` nem mais de um run ativo por campanha.
3. Aplicar a `00012` inteira em uma unica transacao durante janela de manutencao.
4. Recarregar o cache de schema do PostgREST.
5. Confirmar `ap_batch_claim_version() = 2`, os RPCs novos, os indices e as
   policies antes de reativar processamento.
6. Configurar `SUPABASE_SERVICE_ROLE_KEY` somente no ambiente do servidor e
   `BATCH_OPERATOR_USER_IDS` (UUIDs de operador separados por virgula) no mesmo
   ambiente. Sem a allowlist, as rotas de batch retornam `503`
   (`BatchConfigurationError`). Confirmar que o navegador envia o token de
   sessao (bearer) em todas as chamadas de batch, inclusive GET.
7. Fazer a validacao real somente com autorizacao separada.
8. Recuperar os oito itens historicos somente sob autorizacao separada.

## Conclusao

A correcao esta pronta, mas nao esta ativa no Supabase oficial ate a aplicacao
manual da `00012`. Os dados historicos permanecem intocados. Portanto, **a
Etapa 7 continua nao concluida** e a Etapa 8 nao deve ser iniciada.
