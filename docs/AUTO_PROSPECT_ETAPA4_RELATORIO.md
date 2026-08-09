# RELATÓRIO — AUTO PROSPECT (Etapa 4: Enriquecimento e Qualificação)

**Data:** 07/08/2026 — **Projeto Supabase:** `slapyjstnzzesnlnubof` — **Sem regressão:** AME Control preservado.

## 1. Objetivo
Transformar "empresa encontrada" em "lead compreendido e qualificado": o usuário abre uma empresa, clica em **Enriquecer e qualificar** e entende quem é, o que faz, por que pode ser interessante para a AME, qual o potencial comercial (0–100) e **por que** o sistema chegou àquela conclusão — com fatos, inferências, recomendações e evidências (origem de cada informação).

## 2. Arquitetura implementada
```
UI (AutoProspectView — mobile-first)
 ↓ onAnalyzeCompany (hook)
POST /api/autoprospect/analyze  (Application Service; lock por empresa; nodejs)
 ↓
Enrichment Service (domain/autoprospect/enrichment.ts)
 └→ Provider(s): WebsiteEnrichmentProvider (site oficial; limites; robots.txt)
 ↓
Qualification Service (domain/autoprospect/qualification.ts)
 ├→ determinístico: regras de score → breakdown → classificação → confiança → recomendação
 └→ IA (opcional, substituível): AiAnalysisProvider (OpenAI-compatible; desligado sem chave)
 ↓
Repository → Supabase (ap_enrichments + ap_enrichment_evidences + ap_qualifications)
```
- UI não fala com IA nem com banco de análise diretamente; a IA é um componente plugável (`createAiAnalysisProvider`) e **nunca bloqueia** a análise (fallback determinístico).

## 3. Enriquecimento
- Ação explícita por empresa (**Enriquecer e qualificar**); nada é executado em massa.
- Acessa o **site oficial** do Discovery: `robots.txt` (regras `User-agent: *`/`Disallow`, incluindo bloqueio total), página inicial + páginas relevantes (serviços/sobre/eventos/contato...), extrai título, meta description e conteúdo textual.
- **Limites**: timeout 12s/requisição, máx. 1,5 MB por página, máx. 6 páginas, máx. 3 redirecionamentos, **mesmo domínio**, `User-Agent` próprio, sem burlar CAPTCHA/bloqueios/rate limits.
- Detecção determinística de **sinais comerciais** (6 categorias) com trecho e URL de origem; dedup por categoria.
- Sem site, site inválido, robots bloqueando, rede/timeout, erro HTTP → **Enriquecimento indisponível** (razão clara) — nunca inventa conteúdo. Conteúdo vazio é aceito com zero sinais.

## 4. Fontes utilizadas
- **Site oficial da empresa** (indicado na Discovery) — título, descrição, textos, sinais. Única fonte de coleta desta etapa.
- **OpenStreetMap/Overpass** (Discovery, etapa anterior) — dados-base da empresa.
- Não há coleta de dados pessoais nem busca além do site oficial.

## 5. IA
- **Provider opcional** OpenAI-compatible (`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` — server-side; sem chave configurada no projeto → **modo determinístico**, custo zero). Secrets nunca vão ao frontend.
- A IA analisa **somente** fatos coletados (prompt com os fatos/sinais; proibido inventar clientes, faturamento, eventos etc.). Gera apenas **texto explicativo** (resumo, motivo da oportunidade, texto da recomendação).
- **O score é 100% determinístico** — a IA não pontua sozinha nem altera a pontuação. Resposta inválida/incompleta/timeout → `ia_falha` e texto determinístico mantido.

## 6. Qualificação
Separação obrigatória:
- **FATO**: título, descrição, sinais (com URL da fonte).
- **INFERÊNCIA**: conclusão a partir de fato (ex.: "sinal de viagens → pode demandar transfers").
- **RECOMENDAÇÃO**: ação sugerida (**abordar / investigar / baixa prioridade**) — nada automático é enviado.
- **Confiança da análise** separada do potencial: Alta (site + ≥2 sinais), Média (site ok, pouca info), Baixa (sem site/dados).
- Possíveis serviços sugeridos apenas dos serviços AME documentados (`app/servicos`): Transfer aeroporto, Transporte executivo, Transporte corporativo, Transporte para eventos, Viagens intermunicipais, Deslocamentos programados; sem evidência → "Necessidade não identificada".

## 7. Lead Score (0–100, critérios explícitos)
| Critério | Pontos |
|---|---|
| Segmento compatível (perfis AME) | 20 (outro segmento: 8) |
| Localização atendida (BH/região: 20 · MG: 12 · fora: 5) | 20 |
| Sinais de eventos | 15 |
| Possível demanda de transfer | 15 |
| Site comercial ativo | 10 |
| Informações comerciais encontradas | 10 |
| Atendimento empresarial (B2B) | 5 |
| Turismo e viagens | 5 |

Classificação: 0–29 Muito baixo · 30–49 Baixo · 50–69 Médio · 70–84 Alto · 85–100 Muito alto. Mesma entrada → mesmo score (testado).

## 8. Evidências
- Tabela `ap_enrichment_evidences`: cada fato/sinal com `kind`, `label`, texto, **`source_url`** e data.
- O score/cada item do breakdown carrega `reason`; inferências carregam `fromSignal` + URL. Na UI, cada sinal mostra o trecho e a URL de origem; links reais das páginas.

## 9. Banco — migration `00007_auto_prospect_enrichment.sql`
- `ap_enrichments` (status Concluido/Indisponivel/Erro, source_url, fetched_pages, título, descrição, reason, datas) — **histórico: 1 linha por execução**.
- `ap_enrichment_evidences` (kind fato/sinal/inferencia, label, texto, source_url).
- `ap_qualifications` (score, potential, confidence, resumo, oportunidade, recomendação, facts/inferences/possible_services/score_breakdown em jsonb, ai_provider/model/status, datas) — **histórico por execução**; RLS `all_anon` (padrão); trigger `updated_at` reusando `handle_updated_at`.
- **Aplicada manualmente** no SQL Editor pelo usuário (pg-meta desativado). Nenhuma tabela do AME alterada.

## 10. Arquivos criados
1. `domain/autoprospect/enrichment.ts` — limites, sinais, robots.txt, extração, `WebsiteEnrichmentProvider`, `createEnrichmentProvider`.
2. `domain/autoprospect/qualification.ts` — serviços AME, classificação, regras de score, confiança, fatos/inferências/recomendação, `AiAnalysisProvider` (OpenAI-compatible + desabilitado), `withAiExplanation`.
3. `app/api/autoprospect/analyze/route.ts` — POST server-side: lock por empresa, enriquecimento → evidências → qualificação → persistência; erros amigáveis (400/404/409/502).
4. `supabase/migrations/00007_auto_prospect_enrichment.sql`.
5. `lib/__tests__/autoprospect-enrichment.test.ts` (19 testes).
6. `lib/__tests__/autoprospect-qualification.test.ts` (17 testes).

## 11. Arquivos modificados
1. `lib/repository-mappers.ts` — mappers de enrichment/evidence/qualification.
2. `hooks/useAutoProspect.ts` — estado `analyses` (carrega últimas qualificações salvas), `analyzeCompany`.
3. `modules/autoprospect/components/AutoProspectView.tsx` — botão **Analisar** (mobile+desktop), coluna Score, painel completo da empresa (score, breakdown, resumo, oportunidade, sinais, serviços, inferências, evidências, confiança, recomendação, status IA, reanalisar).
4. `app/admin/page.tsx` — repasse de `analyses`/`analyzeCompany`.

## 12. Testes
**135/135 passando** (6 arquivos; 36 novos): enriquecimento (site válido, indisponível, timeout, resposta inválida, conteúdo vazio, limite de páginas, limite de tamanho, robots bloqueando/parcial, redirect externo, dedup de sinais, parse/extração); qualificação (alta compatibilidade → 100, baixa → <50, dados insuficientes → 0/confiança baixa, evidências com origem, consistência determinística, enriquecimento indisponível não bloqueia); IA (desabilitada sem chave, resposta válida só na explicação, inválida/incompleta/erro → fallback, markdown fences aceito). `tsc --noEmit` limpo (só erros pré-existentes em `supabase-integration.test.ts`); ESLint apenas os 3 erros do padrão pré-existente; `npm run build` **OK** (18 rotas, `ƒ /api/autoprospect/analyze`).

## 13. Teste real (empresas reais via Discovery no banco oficial)
Campanha `TESTE 4 - Hoteis BH` → Discovery automática (Overpass) → 54 encontradas / 10 criadas → 2 analisadas:
1. **Chalé Mineiro Hostel** (www.chalemineirohostel.com.br): enriquecimento **OK — 6 páginas coletadas**; 4 sinais únicos com URL de origem (turismo/hospedagem, viagens/deslocamentos, atendimento a executivos, eventos sociais); **Score 83/100 — Alto potencial**, confiança Alta, recomendação **abordar**; breakdown completo; 5 serviços sugeridos; 4 inferências com fonte; fatos/evidências persistidos (8 evidências na 1ª execução). Reanálise gerou **2º registro no histórico** (mecanismo de versão comprovado).
2. **Hotel Boulevard** (www.boulevardhoteis.com.br): site **inacessível** (rede/timeout/bloqueio) → **Enriquecimento indisponível** com motivo; Score **28/100 — Muito baixo**, confiança Baixa, baixa prioridade — fluxo honesto sem dados inventados.

## 14. Custos
- **R$ 0 nesta etapa.** Enriquecimento: site próprio da empresa (sem custo). IA: não configurada → determinística, sem custo. Overpass: gratuito (uso justo).
- Controle implementado para o futuro: lock por empresa (clique duplicado/concorrência → 409), sem retry infinito, 1 execução por ação; `ap_qualifications` registra provider/modelo/data/status por análise (rastreio de custo).

## 15. Segurança / LGPD
- Sem segredos no frontend (chaves de IA server-side; nenhuma em `NEXT_PUBLIC_*`, localStorage ou banco em campos expostos). Variáveis documentadas: `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`.
- Somente conteúdo público do site oficial; robots.txt respeitado; limites de volume; sem CAPTCHA/autenticação/bloqueios burlados; sem coleta de dados pessoais; atribuição da origem preservada (evidências) — LGPD alinhada.

## 16. Limitações
1. Análise da IA depende de chave configurada (atualmente determinística — explicável, porém menos "contextual").
2. `robots.txt` só considera `User-agent: *` (regras específicas de bots não são aplicadas — padrão conservador: bloqueios amplos são respeitados).
3. Sinais dependem do conteúdo textual do site; sites em JS pesado/imagens podem renderizar pouco texto.
4. Possíveis serviços derivam de sinais, não de um match CNPJ/atividade (evolução futura).
5. Lock por empresa é in-memory (1 processo de servidor).
6. Extração de meta description básica (sem Open Graph rich/JSON-LD estruturado).

## 17. Pendências
- **Dados de teste criados e identificados** (não removidos — aguardando autorização): campanhas `TESTE 4 - Hoteis BH` (4: `e847b500`, `55c019cc`, `1114da81`, `b4312042`), 10 empresas criadas pela Discovery, 3 enriquecimentos (2 Concluído/6 páginas + 1 Indisponível — Chalé Mineiro reanalisado), 14 evidências, 3 qualificações (scores 83, 28, 83 — histórico do Chalé Mineiro). Prefixo `TESTE 4` e empresas reais criadas só por estas execuções.
- Migration `00007` aplicada manualmente (documentada).

## 18. Próximos passos (aguardando autorização)
1. Limpeza dos dados de teste da Etapa 4.
2. Configurar IA (chave OpenAI-compatible) para ativar modo híbrido e avaliar qualidade das explicações.
3. Pipeline de processamento em lote (com limites) — fora desta etapa.
4. Dedup por CNPJ/external_id e extração estruturada (JSON-LD) para enriquecer sinais.

---

**DISCOVERY → ENRIQUECIMENTO → QUALIFICAÇÃO → LEAD SCORE → EXPLICAÇÃO — implementado e validado com empresas reais.**

**PARE. Aguardando autorização explícita do Arquiteto/CTO para a Etapa 5.**
