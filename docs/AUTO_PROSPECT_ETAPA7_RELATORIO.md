# RELATÓRIO — AUTO PROSPECT (Etapa 7: Teste Real Completo)

**Data da auditoria:** 12/08/2026  
**Projeto oficial:** `slapyjstnzzesnlnubof`  
**Escopo:** validação real da Etapa 7, sem iniciar a Etapa 8  
**Resultado objetivo:** **ETAPA 7 NÃO CONCLUÍDA**

> Nenhuma migration foi aplicada nesta validação. Nenhum registro da Etapa 7 foi
> removido. Nenhuma correção de arquitetura ou funcionalidade foi implementada.

> **Atualização pós-validação (13/08/2026):** a correção foi preparada, mas ainda
> não foi aplicada no Supabase. Ver
> `docs/AUTO_PROSPECT_ETAPA7_CORRECAO_RELATORIO.md`. A Etapa 7 permanece não
> concluída.

## 1. Estado inicial auditado

Ao iniciar esta auditoria, a implementação e as tentativas de teste real da Etapa 7
já existiam no worktree. O relatório final solicitado ainda não existia.

Evidências encontradas:

- migration `supabase/migrations/00011_auto_prospect_batch.sql`;
- domínio e executor de lote em `domain/autoprospect/batch.ts` e
  `lib/batch-executor.ts`;
- rotas em `app/api/autoprospect/batch/**`;
- teste unitário da Etapa 7 em
  `lib/__tests__/autoprospect-batch.test.ts`;
- teste real mutante em
  `lib/__tests__/autoprospect-batch-real.test.ts`;
- diagnósticos de leitura em
  `lib/__tests__/autoprospect-batch-real-diag.test.ts` e
  `lib/__tests__/autoprospect-batch-real-details.test.ts`;
- cinco campanhas `TESTE BATCH ETAPA7` já persistidas no Supabase oficial;
- doze runs e cem itens de fila já persistidos.

O `git status` inicial já estava sujo, com alterações anteriores em Auto Prospect e
AME Control. Esta validação não desfez nem modificou essas alterações.

## 2. Migration confirmada

A migration `00011_auto_prospect_batch.sql` está aplicada no Supabase oficial.
Foram comprovados por leitura real:

- tabela `ap_batch_runs`;
- tabela `ap_batch_company_runs`;
- RPC `ap_batch_claim_next(uuid)`;
- coluna `batch_run_id` em `ap_enrichments`;
- coluna `batch_run_id` em `ap_qualifications`;
- coluna `batch_run_id` em `ap_intelligence`.

Limitação constatada: `ap_enrichment_evidences` não possui `batch_run_id`. Isso é
coerente com o SQL da migration, que adiciona a coluna somente às três tabelas
acima, mas conflita com a consulta feita pelo teste real em
`lib/__tests__/autoprospect-batch-real.test.ts:369`. Evidências ainda poderiam ser
associadas indiretamente por `enrichment_id`, mas os runs auditados criaram zero
evidências porque nenhum enriquecimento terminou com status `Concluido`.

## 3. Campanhas usadas

Foram encontradas cinco campanhas claramente identificadas como teste:

| Campanha | ID | Discoveries | Runs |
|---|---|---:|---:|
| `TESTE BATCH ETAPA7 2026-08-12-14-36-38 (remover apos validacao)` | `2189bd5e-5d34-47c4-a19d-fa8e6bd7761a` | 12 | 0 |
| `TESTE BATCH ETAPA7 2026-08-12-14-37-19 (remover apos validacao)` | `99493119-fae1-4e58-a3a4-c755913aa892` | 12 | 3 |
| `TESTE BATCH ETAPA7 2026-08-12-14-40-45 (remover apos validacao)` | `acbbd967-5ebc-45a7-8e92-9fcce7a467eb` | 12 | 3 |
| `TESTE BATCH ETAPA7 2026-08-12-14-42-49 (remover apos validacao)` | `6798d0a7-1425-4332-b03a-a12e5fec8ca9` | 12 | 3 |
| `TESTE BATCH ETAPA7 2026-08-12-17-29-52 (remover apos validacao)` | `8c1633cc-1b99-4ed7-acc1-7cbd62fc3aa0` | 12 | 3 |

A primeira tentativa criou campanha e discoveries, mas não criou run. O motivo
exato desse aborto não ficou persistido e, portanto, não é inventado neste
relatório.

## 4. Empresas processadas

Quatro runs principais processaram 48 empresas reais já existentes. A primeira e
a segunda campanha apontam para o mesmo grupo inicial de 12 empresas; somente a
segunda possui runs.

### Grupo 1 — campanhas `2189bd5e` e `99493119`

| Empresa | Company ID | Site cadastrado |
|---|---|---|
| Apart-Hotel Saint Martin | `e1122320-e574-4335-bf35-fd15381378fc` | sim |
| Royal Design Savassi Hotel | `62be9656-8796-4ac0-9dd6-6a8bc5130a19` | sim |
| Hotel Stop Inn Expominas | `a8e52bd9-7ada-4c6a-8ac4-944944fa2326` | sim |
| 3bits Estúdio Criativo | `17d56466-5125-4f38-b23b-d6dd520b2402` | sim |
| Hotel Brilhante | `a4e34260-65a1-40d3-8243-ff43e7b8766a` | não |
| Bristol Jaraguá Hotel | `988d5c95-c7ea-4058-a184-bca3c630ba78` | não |
| Hotel Portinari | `4d119609-2818-4963-8442-c0ef496bfb54` | não |
| Hotel Financial | `ba423dd7-df88-44b4-9832-5344d8853afe` | não |
| Quality Hotel Pampulha | `c177678a-49cb-41c6-acd5-5b6d85d2d350` | não |
| Hotel Esmeralda | `acee40f1-4f7a-4ae8-bdc9-8bb6335d5625` | não |
| Sul América Palace Hotel | `24e47f5b-58d4-4234-847c-50e7ab4c57fd` | não |
| Hotel Gmatos | `725041e4-5e00-461c-bae1-636891df4229` | não |

### Grupo 2 — campanha `acbbd967`

Todas as 12 empresas estavam sem site cadastrado:

- Hotel BH Residencial — `f5be2a98-8a29-485f-998c-6cc2a8362776`;
- Mercure Belo Horizonte Lifecenter Hotel — `5bef05a6-b646-4d7c-b578-34323d50ab0b`;
- Ouro Minas Palace Hotel — `b974b30f-9c47-4189-a6ee-02afa8ea0056`;
- Hotel Intercity — `dd4b2833-486a-4845-bc98-8005b957b170`;
- Ville Celestine Condo Hotel & Eventos — `2d4f1d9a-4598-4c8b-9240-cea265156af2`;
- Estação Turismo — `bc692034-75f5-46d5-a566-7c6bfbda6c78`;
- TAP-Air Portugal — `65566df4-90ad-4a9e-bc48-b1048b768fa7`;
- Viagem Perfeita — `753ddd38-cf5e-4461-ac7f-6c3a3cecdc87`;
- expresso manini | agência de viagem em belo horizonte —
  `82c74c43-b6ff-467a-bfb9-11d5b487a5af`;
- Roteiro — `b8804b77-d74c-4759-bd9e-7faebbd8e57b`;
- Rouxinol Viagens e Turismo — `c9dd6869-c5d8-4134-b62b-7620824a31a4`;
- Rouxinol Transportes Viagens e Turismo —
  `b79b9121-2c6c-4a25-9533-68a951fb5f1c`.

### Grupo 3 — campanha `6798d0a7`

Todas as 12 empresas estavam sem site cadastrado:

- Mercure — `2d05011f-dfe0-4bbb-9cf0-4d3bbbbf8246`;
- Rio Jordao — `6a2a48a7-d9f9-4493-b4f4-7f6d27aceb8e`;
- Bristol — `2e010654-a687-49e8-982f-31ce27fdd592`;
- Flamboyant Home Service — `20f5babd-eec1-4e8e-93a2-92ad10c02a26`;
- Augustus — `fc94f46f-c2c5-4e8a-a1f5-79f50c15d145`;
- Sunny — `5306c48f-536a-4dd1-9876-a21f14babf37`;
- Caesar Bussiness — `73d2eff0-e1e6-4b8b-9b34-b879ec9ffc22`;
- Single Flat — `9f15a773-9b92-4e12-8519-620b6f87c7e3`;
- Motel Palmares — `0a38c65a-6db4-43f9-a931-590faa9a82a8`;
- Hospedaria Martuccelli — `80889a0e-2c07-4d96-9381-e64127fa9d2c`;
- UNA - Centro universitário — `dd28fc47-1c6a-4714-95e9-eb77b61524ec`;
- Centro Universitário UNA — `f2a9427f-7056-446f-9cf0-752bcdc124d1`.

### Grupo 4 — campanha `8c1633cc`

Todas as 12 empresas estavam sem site cadastrado:

- Pitágoras — `092295a1-8485-4c24-b3f3-12393a08a103`;
- Creche das Rosinhas — `dc806649-aa92-4a82-b125-cd0bebb5bdd2`;
- SENAC — `a3d0be7a-5907-4125-9c0e-a498a326823d`;
- Faculdade Jesuíta de Filosofia e Teologia —
  `c5716f03-82d3-4af5-833d-03cf11c3f32c`;
- Faculdade Novos Horizontes — `cc35ca68-19cf-494d-a829-931fa941c601`;
- Una-Barro preto — `cef9cb07-b78c-4bc9-aba3-4833fa240ef8`;
- Eletrobras Furnas — `4b922c62-71ee-4943-9b67-14d2808fba38`;
- Top Digital — `c728ce54-a6c3-49c9-a865-7810d8aaf9d5`;
- Vanessa Perdigão Decorações — `7e6780a6-5aaf-42b1-819e-a9018fba7c3b`;
- Anglo American — `318b67f1-338c-46c4-82fd-677e2bda604d`;
- MAV Tecnologia — `35e76267-091b-4e6f-8e8a-d4c04cd5d62a`;
- Google — `96af02c8-6c5e-47bf-b798-dd1ff5379c65`.

## 5. Fluxo real executado

O estado persistido comprova que quatro tentativas chegaram ao pipeline real:

1. criação de campanha de teste;
2. vínculo de 12 empresas reais existentes por campanha;
3. criação de run e snapshot de 12 itens;
4. cinco claims paralelos;
5. envelhecimento controlado de `claimed_at` para simular órfãos;
6. retomada e execução do pipeline;
7. persistência de enriquecimento;
8. persistência de qualificação determinística;
9. persistência de inteligência determinística;
10. nova leitura do banco;
11. criação de run para pause/resume/cancelamento;
12. fabricação de uma falha na fila de teste e criação de um run de retry.

O pipeline alcançou Enriquecimento → Qualificação → Inteligência para 52 execuções:
48 dos quatro runs principais e 4 dos runs de retry. Como `AI_API_KEY` não estava
configurada, todos os resultados foram determinísticos e com custo de IA zero.

Nenhuma execução terminou como `concluida`: todas produziram enriquecimento
`Indisponivel`. Mesmo assim, qualificação e inteligência foram geradas, conforme a
regra de baixa confiança para empresa sem dados.

## 6. Resultados individuais persistidos

### Runs principais

| Run | Campanha | Estado do run | Estado real dos 12 itens | Artefatos |
|---|---|---|---|---|
| `45b1bc9f-b619-444a-9222-84c6b67ad6d4` | `99493119` | `concluido` | 11 `sem_dados` + 1 `processando` | 12/12/12 |
| `9d4ed8b0-8c2e-4c25-aac2-9a80e664de26` | `acbbd967` | `concluido` | 11 `sem_dados` + 1 `processando` | 12/12/12 |
| `07e30e3f-dfa4-4eaf-b6d0-88bb1883394d` | `6798d0a7` | `concluido` | 11 `sem_dados` + 1 `processando` | 12/12/12 |
| `87ae72ba-54b4-4b11-ab15-20dbaa8550cc` | `8c1633cc` | `concluido` | 11 `sem_dados` + 1 `processando` | 12/12/12 |

`Artefatos` representa, respectivamente, enriquecimentos/qualificações/inteligências.

Itens atualmente corrompidos para `processando` nos runs principais:

| Run | Empresa | Company ID | Erro persistido |
|---|---|---|---|
| `45b1bc9f` | 3bits Estúdio Criativo | `17d56466-5125-4f38-b23b-d6dd520b2402` | `timeout` fabricado pelo teste |
| `9d4ed8b0` | Viagem Perfeita | `753ddd38-cf5e-4461-ac7f-6c3a3cecdc87` | `timeout` fabricado pelo teste |
| `07e30e3f` | Motel Palmares | `0a38c65a-6db4-43f9-a931-590faa9a82a8` | `timeout` fabricado pelo teste |
| `87ae72ba` | Creche das Rosinhas | `dc806649-aa92-4a82-b125-cd0bebb5bdd2` | `timeout` fabricado pelo teste |

Nos quatro runs principais, os demais 44 itens estão `sem_dados`.

### Runs de retry

| Run | Origem | Empresa | Resultado | Artefatos |
|---|---|---|---|---|
| `6e25f001-6221-4182-ba21-21465aca6ca6` | `45b1bc9f` | 3bits Estúdio Criativo | `sem_dados/site_inacessivel` | 1/1/1 |
| `75809b69-4ae7-41ee-830d-aebc08197047` | `9d4ed8b0` | Viagem Perfeita | `sem_dados/sem_site` | 1/1/1 |
| `de1a9239-3c3d-438a-860c-eef5ed56651b` | `07e30e3f` | Motel Palmares | `sem_dados/sem_site` | 1/1/1 |
| `3bb8df69-5562-4790-9efc-48dd5164d969` | `87ae72ba` | Creche das Rosinhas | `sem_dados/sem_site` | 1/1/1 |

### Runs de cancelamento

| Run | Estado do run | Estado real dos itens |
|---|---|---|
| `44ff4561-0049-4b85-bd1c-0bcf15937435` | `cancelado` | 11 `cancelada` + 3bits `processando` |
| `ca13bf8b-7d81-4979-b755-9bd63b56154e` | `cancelado` | 11 `cancelada` + Viagem Perfeita `processando` |
| `d0bcce96-538e-462e-b467-e1b5bdf5ca40` | `cancelado` | 11 `cancelada` + Motel Palmares `processando` |
| `60b25bd5-c421-48d1-a73c-611a3dbecec7` | `cancelado` | 11 `cancelada` + Creche das Rosinhas `processando` |

## 7. Persistência real

Persistência comprovada em nova leitura independente:

| Tabela | Registros anteriores | Registros da Etapa 7 | Total atual |
|---|---:|---:|---:|
| `ap_enrichments` | 12 com `batch_run_id IS NULL` | 52 | 64 |
| `ap_enrichment_evidences` | 29 | 0 | 29 |
| `ap_qualifications` | 12 com `batch_run_id IS NULL` | 52 | 64 |
| `ap_intelligence` | 13 com `batch_run_id IS NULL` | 52 | 65 |

Os 52 registros de qualificação e os 52 de inteligência da Etapa 7 estão com
`ai_status = deterministico`. As 52 inteligências possuem prioridade 4 e custo de
IA zero. Os 52 enriquecimentos estão `Indisponivel`.

O requisito de persistência do pipeline com resultado `sem_dados` foi comprovado.
O caminho positivo de enriquecimento `Concluido` com evidências reais ficou
**BLOQUEADO/SEM COBERTURA**, pois nenhum site selecionado produziu coleta útil.

## 8. Contagens antes/depois

Não foi encontrado um log durável das contagens capturadas imediatamente antes de
cada tentativa. A coluna “antes” abaixo foi reconstruída por duas evidências
independentes:

- relatório aprovado da Etapa 6;
- registros atuais não pertencentes a campanhas/runs da Etapa 7 e artefatos com
  `batch_run_id IS NULL`.

Snapshot final capturado em `2026-08-12T17:43:07.447Z`.

| Entidade | Antes reconstruído | Depois | Diferença atribuída à Etapa 7 |
|---|---:|---:|---:|
| `ap_campaigns` | 8 | 13 | +5 |
| `ap_companies` | 62 | 62 | 0 |
| `ap_discoveries` | 79 | 139 | +60 |
| `ap_enrichments` | 12 | 64 | +52 |
| `ap_enrichment_evidences` | 29 | 29 | 0 |
| `ap_qualifications` | 12 | 64 | +52 |
| `ap_intelligence` | 13 | 65 | +52 |
| `ap_opportunities` | 3 | 3 | 0 |
| `ap_opportunity_interactions` | 1 | 1 | 0 |
| `ap_batch_runs` | 0 | 12 | +12 |
| `ap_batch_company_runs` | 0 | 100 | +100 |
| `ame_vision_state` | 1 | 1 | 0 |

Os dados anteriores continuam distinguíveis e com as mesmas contagens da Etapa 6.
Nenhuma empresa foi criada, removida ou atualizada pelo lote.

## 9. Claim e concorrência

**Resultado: FALHOU.**

O teste fez cinco chamadas concorrentes à RPC e recebeu cinco IDs diferentes no
run-alvo. Isso comprova ausência de repetição dentro daquela seleção imediata, mas
não comprova isolamento entre runs.

A RPC aplicada possui um defeito crítico em
`supabase/migrations/00011_auto_prospect_batch.sql:99-119`:

```sql
update public.ap_batch_company_runs bcr
set status = 'processando', claimed_at = now()
where bcr.company_id = (
  select bcr2.company_id
  from public.ap_batch_company_runs bcr2
  where bcr2.batch_run_id = p_run_id
  ...
)
```

A subconsulta filtra `p_run_id`, mas o `UPDATE` externo filtra apenas
`company_id`. Se a empresa aparece em mais de um run, todas as linhas dessa empresa
podem ser alteradas, inclusive linhas de runs `concluido` ou `cancelado`.

Evidência persistida: cada claim do run de retry alterou simultaneamente a linha da
mesma empresa no run principal e no run cancelado. Por isso existem hoje oito
linhas `processando` dentro de oito runs terminais.

Nenhum novo teste mutante foi disparado após essa descoberta, pois poderia ampliar
a corrupção da fila real.

## 10. Progresso e contadores

**Resultado: FALHOU.**

Os contadores denormalizados não correspondem aos itens reais:

- quatro runs principais informam `without_data=12` e `processing=0`, mas cada um
  possui 11 itens `sem_dados` e 1 `processando`;
- quatro runs cancelados informam `cancelled=12` e `processing=0`, mas cada um
  possui 11 itens `cancelada` e 1 `processando`;
- somatório real dos 100 itens: 48 `sem_dados`, 44 `cancelada` e 8 `processando`;
- somatório publicado pelos runs: 52 `without_data`, 48 `cancelled` e 0
  `processing`.

Além disso, todos os doze runs têm `started_at = null`, apesar de terem sido
processados. Em vários runs, `finished_at` é anterior a `created_at`, indicando
diferença entre o relógio local usado pelo executor e o relógio do banco. Duração e
ETA não podem ser considerados validados.

## 11. Empresa sem site/sem dados

**Resultado: COMPROVADO.**

Empresas reais sem site produziram:

- `ap_enrichments.status = Indisponivel`;
- `error_code = sem_site` na fila;
- qualificação determinística persistida;
- inteligência determinística persistida;
- prioridade 4;
- custo de IA zero;
- estado terminal esperado `sem_dados` antes da corrupção cruzada da RPC.

O cenário foi repetido em dezenas de empresas reais. Empresas com site que
retornaram HTTP 301/rede indisponível também seguiram até qualificação e
inteligência, classificadas como `site_inacessivel`.

## 12. Falha parcial

**Resultado real: NÃO COMPROVADO.**

O teste real chama `processOneCompany` com um UUID inexistente depois que o run já
terminou. Esse UUID não pertence a `ap_batch_company_runs`, de modo que a tentativa
de gravar a falha não atualiza uma linha real da fila. Isso comprova somente o
retorno de domínio `falha/validacao`; não comprova “empresa N falha e empresas
N+1/N+2 continuam no mesmo lote”.

O cenário passa apenas no executor com banco falso em
`lib/__tests__/autoprospect-batch.test.ts`. Não foi fabricada nova falha no banco
oficial durante esta auditoria porque a RPC já estava comprovadamente insegura.

## 13. Retry de falhas

**Resultado: PARCIAL, com falha de integridade.**

Comprovado:

- uma linha de cada run principal foi alterada manualmente para `falha/timeout`;
- `retry-failures` criou um novo run de uma empresa;
- os quatro runs de retry persistiram novo enriquecimento, qualificação e
  inteligência;
- o vínculo `reprocessarFalhasDoRun` foi preservado em `filters`.

Não comprovado ou inválido:

- não houve falha natural durante o lote;
- `retry_count` permaneceu 0 em todos os 100 itens;
- backoff/retry automático não foi exercitado de forma real;
- a falha foi fabricada alterando uma linha terminal do run original;
- ao reclamar a empresa no novo run, a RPC recolocou as linhas dos runs original e
  cancelado em `processando`.

Portanto, o retry cria e processa um run de continuação, mas não preserva
corretamente o estado histórico enquanto a RPC aplicada permanecer assim.

## 14. Pause e resume

**Resultado: PARCIAL.**

Foi comprovado que:

- `pause` persistiu `pausado`;
- `processChunk` rejeitou o run pausado;
- `resume` persistiu novamente `pendente`.

Não foi comprovado processamento real após o resume: o teste cancela o run
imediatamente depois da transição. A continuidade do pipeline após pausa/resume
fica sem evidência real completa.

## 15. Cancelamento

**Resultado inicial passou; persistência final falhou.**

Na asserção imediata, os 12 itens pendentes foram convertidos para `cancelada` e
novo `processChunk` foi rejeitado. Porém, cada claim posterior de retry mudou uma
dessas linhas para `processando` por causa do defeito da RPC.

Na leitura final, cada run cancelado possui 11 itens `cancelada` e 1
`processando`. O cancelamento não é durável sob novos claims de outra execução.

## 16. Reload/nova leitura

**Resultado: COMPROVADO e revelou inconsistências.**

Todos os dados descritos neste relatório foram lidos novamente em clientes
independentes do Supabase. Runs, itens e artefatos sobreviveram ao encerramento das
execuções. A nova leitura também comprovou que os estados terminais e contadores
estão inconsistentes; portanto, reload funciona como persistência, mas não valida
correção do estado.

## 17. Retomada de processo órfão

**Resultado: COMPROVADO de forma controlada, mas a RPC global continua inválida.**

Cinco claims foram marcados com `claimed_at` de dez minutos antes e voltaram a ser
elegíveis. O executor processou os itens e persistiu os artefatos. Empresas já
terminais não receberam novos artefatos no mesmo `batch_run_id` durante essa
retomada.

O cenário ocorreu antes de existirem os runs de cancelamento/retry com as mesmas
empresas. Quando esses runs passaram a existir, o filtro externo incompleto da RPC
quebrou o isolamento entre runs. Assim, a recuperação por lease funciona no caso
simples, mas a implementação de claim não atende o requisito global.

## 18. Idempotência

**Resultado: FALHOU na fila; duplicação de artefato no mesmo run não observada.**

Comprovado:

- filtro `apenasSemInteligencia` não selecionou novamente as empresas já
  analisadas da campanha;
- cada run possui uma única linha por empresa pela chave composta;
- não foram encontrados artefatos extras além dos 12 por run principal e 1 por run
  de retry;
- nenhum artefato novo foi vinculado novamente ao mesmo run concluído.

Falhou:

- claims de um run alteram linhas terminais de outros runs;
- quatro runs `concluido` e quatro `cancelado` possuem item `processando`;
- contadores continuam exibindo o estado anterior, divergindo da fonte detalhada.

## 19. Oportunidades automáticas

**Resultado: COMPROVADO.**

- antes reconstruído: 3 oportunidades e 1 interação;
- depois: 3 oportunidades e 1 interação;
- diferença: 0 e 0.

Nenhuma oportunidade ou interação foi criada pelo processamento em lote.

## 20. Testes técnicos

### Comparação com a validação anterior

| Validação | Etapa 6/anterior | Etapa 7 auditada | Resultado |
|---|---|---|---|
| Vitest seguro | 207/207 | 263/263 | +56 testes, sem regressão nessa suíte |
| Testes puros da Etapa 7 | inexistentes | 56/56 | passou |
| Diagnóstico real de leitura | inexistente | 2/2 após timeout explícito | passou |
| `tsc --noEmit` | erros históricos do teste Supabase | falhou, incluindo novos erros nos 3 testes reais da Etapa 7 | regressão técnica |
| ESLint global | não havia baseline global equivalente | 44 erros e 25 warnings | falhou |
| ESLint dos arquivos de produção da Etapa 7 | — | 0 erros | passou |
| `next build` | OK | OK | sem regressão de build |

Comandos efetivamente executados:

```text
npx vitest run lib/__tests__/autoprospect-batch.test.ts --reporter=verbose
Resultado: 56/56, 1 arquivo.

npx vitest run --exclude lib/__tests__/autoprospect-batch-real.test.ts \
  --exclude lib/__tests__/autoprospect-batch-real-diag.test.ts \
  --exclude lib/__tests__/autoprospect-batch-real-details.test.ts
Resultado: 263/263, 11 arquivos.

npx vitest run lib/__tests__/autoprospect-batch-real-diag.test.ts \
  lib/__tests__/autoprospect-batch-real-details.test.ts --reporter=verbose
Resultado: diagnóstico passou; details excedeu o timeout padrão de 5 s.

npx vitest run lib/__tests__/autoprospect-batch-real-details.test.ts \
  --reporter=verbose --testTimeout=120000
Resultado: 1/1 em 13,76 s.

npx tsc --noEmit
Resultado: falhou.

npm run lint
Resultado: falhou com 44 erros e 25 warnings.

npm run build
Resultado: sucesso, Next.js 16.2.6, 21 páginas geradas.
```

### Vitest completo literal

**BLOQUEADO por segurança.**

Executar `npm test` sem exclusões também executaria
`autoprospect-batch-real.test.ts`, que cria novas campanhas e runs no Supabase
oficial e chama a RPC defeituosa. Como já há oito linhas corrompidas por claims
cruzados, repetir a suíte ampliaria dados de teste e poderia alterar mais runs
terminais. A regra da missão permite marcar cenários inseguros como BLOQUEADO.

### TypeScript

Além dos erros históricos em `supabase-integration.test.ts`, o `tsc` encontrou
erros novos nos três arquivos reais da Etapa 7:

- incompatibilidade do tipo de `ws` com `WebSocketLikeConstructor`;
- resultados Supabase inferidos como `never` nos diagnósticos;
- possíveis valores `null` não tratados no teste mutante.

O build passa porque a checagem do Next não inclui os testes da mesma forma que o
`tsc` global. Como o requisito exige `tsc`, a validação final não está verde.

### ESLint

O ESLint global falha em arquivos preexistentes do projeto, incluindo AME Vision,
componentes compartilhados, tipos de domínio, serviços e `whatsapp-scanner`.
Arquivos de teste são ignorados pela configuração em `eslint.config.mjs:15-17`.
Os arquivos de produção específicos da Etapa 7 não apresentaram erro no lint
direcionado.

## 21. AME Control

Nenhum arquivo do AME Control foi alterado por esta auditoria. O `git status`
inicial já continha mudanças anteriores do usuário/agentes nessas áreas, que foram
preservadas.

Snapshot final do banco:

- `contacts`: 7;
- `trips`: 1;
- `proposals`: 0;
- `referrals`: 1;
- `finance_entries`: 1.

A suíte técnica segura incluiu o teste preexistente
`supabase-integration.test.ts`. Ele cria registros temporários de integração no AME
Control e os remove no próprio `afterAll`. Uma leitura posterior confirmou que não
restou nenhum marcador (`Lead Teste Integração`, `Passageiro Teste`, `ENUM Test`,
`Cliente Proposta Teste`, `Quem Indicou Teste`, `Transfer Teste Integração` ou
`Test Entrada/Saída`). Nenhum dado real foi apagado pelo teste.

Como não havia snapshot contemporâneo do AME Control antes das tentativas antigas
da Etapa 7, não se declara uma comparação absoluta de conteúdo linha a linha. O
executor de lote consulta somente tabelas `ap_*`.

## 22. AME Vision

AME Vision permaneceu intacto:

- `ame_vision_state`: 1 linha;
- ID: `main`;
- status atual: `running`;
- `updated_at`: `2026-08-05T02:46:20.946512+00:00`, anterior à Etapa 7;
- nenhum arquivo de AME Vision apareceu alterado no `git status` direcionado;
- nenhuma query do executor de lote toca `ame_vision_state`.

## 23. Dados de teste criados

**Nenhum destes registros foi removido. Aguardando autorização explícita.**

Inventário exato por escopo identificável:

| Tabela | Quantidade | Identificação exata |
|---|---:|---|
| `ap_campaigns` | 5 | os cinco IDs da seção 3 |
| `ap_discoveries` | 60 | `campaign_id` em um dos cinco IDs e `source = teste-batch-etapa7` |
| `ap_companies` | 0 | nenhuma empresa criada |
| `ap_batch_runs` | 12 | IDs listados abaixo |
| `ap_batch_company_runs` | 100 | chave composta com `batch_run_id` em um dos 12 IDs abaixo |
| `ap_enrichments` | 52 | `batch_run_id` em um dos 12 IDs abaixo |
| `ap_enrichment_evidences` | 0 | nenhuma criada pelos runs |
| `ap_qualifications` | 52 | `batch_run_id` em um dos 12 IDs abaixo |
| `ap_intelligence` | 52 | `batch_run_id` em um dos 12 IDs abaixo |
| `ap_opportunities` | 0 | nenhuma criada |
| `ap_opportunity_interactions` | 0 | nenhuma criada |

IDs exatos dos runs de teste:

```text
45b1bc9f-b619-444a-9222-84c6b67ad6d4
44ff4561-0049-4b85-bd1c-0bcf15937435
6e25f001-6221-4182-ba21-21465aca6ca6
9d4ed8b0-8c2e-4c25-aac2-9a80e664de26
ca13bf8b-7d81-4979-b755-9bd63b56154e
75809b69-4ae7-41ee-830d-aebc08197047
07e30e3f-dfa4-4eaf-b6d0-88bb1883394d
d0bcce96-538e-462e-b467-e1b5bdf5ca40
de1a9239-3c3d-438a-860c-eef5ed56651b
87ae72ba-54b4-4b11-ab15-20dbaa8550cc
60b25bd5-c421-48d1-a73c-611a3dbecec7
3bb8df69-5562-4790-9efc-48dd5164d969
```

Os 100 itens de fila são identificados sem ambiguidade por esses 12
`batch_run_id`. Os 156 artefatos também são identificados sem ambiguidade por
`batch_run_id`, sem depender de nome ou data.

Quatro linhas dos runs principais conservam a mensagem fabricada pelo teste:

```text
error_code = timeout
error_message = teste etapa7: falha fabricada para validar retry
```

## 24. Matriz dos 20 critérios obrigatórios

| # | Critério | Situação | Evidência objetiva |
|---:|---|---|---|
| 1 | Contagens antes | PARCIAL | baseline reconstruído; log contemporâneo não persistido |
| 2 | Criar campanha de teste | PASSOU | 5 campanhas identificadas |
| 3 | Selecionar empresas reais | PASSOU | 60 vínculos, 48 execuções principais |
| 4 | Iniciar batch | PASSOU | 12 runs persistidos |
| 5 | Pipeline completo E→Q→I | PARCIAL | 52 E/Q/I, todos com enriquecimento indisponível |
| 6 | Persistência de cada resultado | PASSOU para `sem_dados` | 52/52/52 vinculados |
| 7 | Claim/concurrency | FALHOU | claim altera outros runs |
| 8 | Progresso/contadores | FALHOU | contadores divergem dos 100 itens |
| 9 | Empresa sem site/sem dados | PASSOU | dezenas de casos reais |
| 10 | Falha parcial sem parar lote | NÃO COMPROVADO | fake UUID fora da fila; só teste com fakes passa |
| 11 | Retry de falhas | PARCIAL/FALHOU integridade | novos runs concluíram, históricos foram corrompidos |
| 12 | Pause | PASSOU como transição | process foi bloqueado |
| 13 | Resume | PARCIAL | voltou a pendente; não processou após resume |
| 14 | Cancelamento | FALHOU na leitura final | 1 item `processando` em cada run cancelado |
| 15 | Reload/nova leitura | PASSOU | estado e artefatos relidos do banco |
| 16 | Retomada de órfão | PASSOU no caso simples | leases vencidos foram retomados |
| 17 | Concluídas não reprocessadas | PARCIAL | sem artefato duplicado no mesmo run; fila terminal alterada |
| 18 | Sem oportunidade automática | PASSOU | 3→3; interações 1→1 |
| 19 | Dados anteriores intactos | PASSOU por contagem/escopo | baseline não-teste preservido |
| 20 | Contagens depois/diferenças | PASSOU | snapshot e deltas registrados |

## 25. Problemas encontrados

1. **Crítico:** RPC sem `batch_run_id = p_run_id` no `UPDATE` externo; claims
   atravessam runs.
2. Oito itens estão `processando` dentro de runs terminais.
3. Contadores de oito runs divergem dos itens reais.
4. Cancelamento deixa de ser durável quando outra execução reclama a mesma empresa.
5. Retry altera o histórico que deveria preservar.
6. Falha parcial real não foi exercitada no lote.
7. Resume não foi seguido de processamento real.
8. Nenhum caso positivo de site coletado/evidências foi produzido.
9. `started_at` não foi preenchido.
10. Há `finished_at` anterior a `created_at`, impedindo validar duração/ETA.
11. O teste consulta `ap_enrichment_evidences.batch_run_id`, coluna inexistente.
12. Os três testes reais adicionam erros ao `tsc` global.
13. O teste de detalhes excede o timeout padrão de 5 segundos.
14. O teste real mutante não é seguro para fazer parte de `npm test` no estado
    atual.
15. Uma campanha inicial ficou sem run e sem causa persistida.

## 26. Limitações e bloqueios

- Não foi executado novo lote após a descoberta do defeito da RPC.
- Não foi aplicada migration corretiva, conforme proibição expressa.
- Não foram corrigidos testes, tipos, lint ou código de produção.
- Não foi executada a suíte literal que repetiria o teste real mutante.
- Não houve limpeza dos registros listados.
- Não foi executado cenário positivo com evidências porque nenhum site do conjunto
  coletou conteúdo útil.
- Não se declara cobertura HTTP/UI: o teste real chama diretamente o executor e a
  RPC, não as rotas REST por um servidor em execução.
- Contagens “antes” foram reconstruídas; não há arquivo de log contemporâneo das
  tentativas anteriores.

## 27. Conclusão objetiva

**A Etapa 7 não pode ser declarada concluída.**

Há evidência real de criação de campanha, seleção de empresas, persistência do
pipeline determinístico, tratamento de empresas sem site, retry por novo run,
pause, leitura posterior, retomada por lease e ausência de oportunidades
automáticas. Os dados anteriores do Auto Prospect e o AME Vision permanecem
distinguíveis e com suas contagens preservadas.

Entretanto, critérios obrigatórios falharam: claim/concurrency, consistência de
contadores, durabilidade do cancelamento e preservação histórica no retry. Falha
parcial real e processamento após resume não foram comprovados. `tsc` e ESLint
global não estão verdes, e o Vitest completo literal é inseguro enquanto o teste
mutante usar a RPC aplicada.

**PARE. Não iniciar Etapa 8. Aguardar revisão do Arquiteto/CTO e autorização antes
de qualquer correção ou remoção dos dados de teste.**
