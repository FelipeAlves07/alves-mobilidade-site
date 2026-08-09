# RELATÓRIO — AUTO PROSPECT (Etapa 1: Fundação)

**Data:** 06/08/2026
**Sistema:** AME Control — Alves Mobilidade Executiva
**Escopo:** Análise completa do sistema + criação da fundação do Auto Prospect

---

## 1. Objetivo

Adicionar ao AME Control existente uma nova área independente chamada **Auto Prospect** — um prospector comercial digital automatizado que deve, em etapas futuras, pesquisar, encontrar, captar, salvar, analisar, qualificar, pontuar e preparar a prospecção de novas empresas/potenciais clientes para a AME.

A Prospecção atual do AME Control (contatos manuais/conhecidos) **não foi alterada** — são áreas distintas.

## 2. Estado atual

O AME Control é um sistema **100% web**, SPA em Next.js, já com: Dashboard, Financeiro, Comercial (orçamento/propostas), Clientes, Prospecção, Empresas, Indicações, WhatsApp, Viagens, Motoristas, Veículos, Marketing, IA da Alves, AME Vision, Comando AME (voz), tv-de-bordo e site público (/, /corporativo, /frota, /servicos, /quem-somos, /contato, /solicitar-atendimento).

A Prospecção existente é a aba "Prospecção" do menu, que reutiliza `ClientesView` filtrando leads ativos com opção de importação de contatos. Foi mantida intacta.

## 3. Arquitetura existente

- **Stack:** Next.js 16.2.6 (App Router + Turbopack), React 19, TypeScript 5, Tailwind CSS 4, Vitest.
- **Backend:** Supabase (Postgres + Auth + RLS). Fallback automático para `localStorage` via `getStorageStrategy()` quando não há envs do Supabase.
- **Admin:** SPA — `app/admin/page.tsx` com estado `active`; array `menu` define as abas (Sidebar desktop + MobileNav drawer); cada aba renderiza um `<XxxView>` recebendo dados e callbacks por props.
- **Padrão de dados:** `domain/<entidade>/types.ts` → `hooks/use<Entidade>.ts` → `createRepository(table, storageKey, factory, mappers)` → `SupabaseRepository`/`LocalStorageRepository`. Mappers centralizados em `lib/repository-mappers.ts`.
- **Auth:** `services/auth.ts` (Supabase Auth + flag local `ame-admin-auth`).
- **Banco:** migrations em `supabase/migrations/00001..00004` + `fix_rls_final.sql` (RLS anon para todas as tabelas). Tabelas reais: `contacts`, `trips`, `finance_entries`, `referrals`, `proposals`, `marketing_tasks`, `drivers`, `vehicles`, `companies`, `ame_vision_state`, `audit_log`, etc.
- **Design:** tema escuro com CSS vars (`--accent`, `--bg-card`, `--accent-15`...), classe utilitária `input-admin`, cards `rounded-xl border`.

## 4. Arquivos analisados (principais)

- `app/admin/page.tsx` (navegação, menu, renderização das abas)
- `app/admin/layout.tsx`, `components/admin/Sidebar.tsx`, `MobileNav.tsx`, `LeadCard.tsx`
- `hooks/useData.ts`, `useLeads.ts`, `useMotoristas.ts`
- `domain/lead/types.ts`, `domain/motorista/types.ts`
- `lib/repository-factory.ts`, `repository.ts`, `supabase-repository.ts`, `local-storage-repository.ts`, `repository-mappers.ts`, `supabase.ts`, `utils/string.ts`
- `services/auth.ts`
- `supabase/migration.sql`, `supabase/fix_rls_final.sql`, `supabase/migrations/00001_ame_control_schema.sql`
- `modules/motoristas/components/MotoristasView.tsx`, `modules/clientes/components/ClientesView.tsx`
- `app/globals.css` (design tokens), `vitest.config.ts`, `package.json`, `README.md`

## 5. Arquivos criados

1. `domain/autoprospect/types.ts` — tipos `AutoProspectCampaign`, `ProspectCompany`, `ProspectDiscovery` + forms
2. `supabase/migrations/00005_auto_prospect.sql` — tabelas `ap_campaigns`, `ap_companies`, `ap_discoveries`
3. `hooks/useAutoProspect.ts` — hook com repositórios (campanhas, empresas, descobertas)
4. `modules/autoprospect/components/AutoProspectView.tsx` — interface inicial mobile-first

## 6. Arquivos modificados

1. `lib/repository-mappers.ts` — mappers `apCampaign*`, `apCompany*`, `apDiscovery*`
2. `hooks/useData.ts` — integração do `useAutoProspect` no state global
3. `app/admin/page.tsx` — item de menu "Auto Prospect" (grupo Comercial, ícone Radar), import do `Radar` e da view, case `auto-prospect` no `renderContent`

## 7. Arquivos removidos

Nenhum.

## 8. Implementações realizadas

- **Nova aba "Auto Prospect"** no menu (grupo Comercial), com ícone próprio, visível no Sidebar e no MobileNav sem alterar os componentes de navegação.
- **Interface inicial mobile-first** (`AutoProspectView`):
  - Hero explicando o que é o Auto Prospect, distinção explícita da Prospecção atual e os 10 passos do fluxo (Pesquisar → Encontrar → Captar → Salvar → Analisar → Qualificar → Pontuar → Contatos → Personalizar → Prospecção).
  - Aviso LGPD/boas práticas (sem scraping invasivo, sem disparo automático — o usuário decide o envio).
  - Métricas: campanhas, ativas, empresas na base, descobertas (dados reais dos hooks).
  - **Campanhas:** criação completa (nome, localização, segmentos em chips pré-definidos + segmento customizado, objetivo, quantidade desejada), status (Rascunho/Ativa/Pausada/Encerrada), busca, listagem em **cards no mobile** e **tabela no desktop**, exclusão com confirmação, ações futuras (pesquisa) sinalizadas com cadeado.
  - **Base de empresas:** estado vazio com roadmap das próximas etapas (Discovery, Coleta, Qualificação, Lead Score, IA, Contatos, Abordagem, Pipeline) e lista simples quando houver dados.
- **Camada de dados pronta** para as próximas etapas: campanhas com CRUD completo funcionando (Supabase ou localStorage), empresas e descobertas com repositórios prontos (CRUD disponível no hook).
- **Banco:** migration SQL seguindo o padrão do projeto, com dedup de empresas (`unique lower(name)`), vínculo descoberta↔campanha único e RLS no padrão `all_anon` do `fix_rls_final.sql`.

## 9. Decisões técnicas

1. **Integração no SPA existente (aba no menu), não novo projeto/frontend** — respeita a regra de não criar sistema separado; custo baixo, sem nova rota/autenticação.
2. **Padrão de módulo existente** (`modules/<nome>/components/<Nome>View.tsx` + `hooks/use<Nome>.ts` + `domain/<nome>/types.ts`) — zero inovação desnecessária; consistência garantida.
3. **Tabelas próprias com prefixo `ap_`** (`ap_campaigns`, `ap_companies`, `ap_discoveries`) — evita colisão com tabelas atuais e deixa claro que é um domínio novo; mesmo banco (Supabase) sem segundo banco.
4. **Empresa única + descobertas vinculadas** — atende o requisito anti-duplicação ("uma empresa única e relacionar as descobertas/campanhas a ela"): `unique(company_id, campaign_id)` + índice único em `lower(name)`.
5. **localStorage como fallback automático** — reutiliza `repository-factory`, permitindo testar sem Supabase configurado.
6. **Estágio futuro sinalizado com cadeado, não bloqueado por permissões** — as etapas Discovery/IA/CRM não foram implementadas de propósito (ordem de desenvolvimento do escopo).

## 10. Banco de dados

- **Alteração planejada (aplicar no Supabase):** `supabase/migrations/00005_auto_prospect.sql` — cria `ap_campaigns`, `ap_companies`, `ap_discoveries` (RLS anon, triggers `updated_at`, índices, dedup).
- **Local:** chaves `ame-ap-campaigns-v1`, `ame-ap-companies-v1`, `ame-ap-discoveries-v1` no localStorage; nada foi gravado em produção.
- Nenhuma tabela existente foi alterada.

## 11. Testes

- `npx tsc --noEmit`: limpo nos arquivos novos/modificados (restam erros **pré-existentes** em `lib/__tests__/supabase-integration.test.ts`, confirmados via `git stash` — não relacionados a esta entrega).
- `npx eslint`: sem novos erros (1 erro e warnings pré-existentes em código não tocado).
- `npm test` (Vitest): **39/39 testes passando**.
- `npm run build`: **build de produção completo com sucesso** (16 páginas, incluindo /admin).

## 12. Responsividade

Abordagem mobile-first em toda a view: hero em coluna no mobile e expandido no desktop (`md:`), métricas 2 colunas → 4 colunas, campanhas em **cards** abaixo de `md` e **tabela densa** a partir de `md`, chips e botões com área de toque adequada, busca empilhada no mobile e alinhada no desktop, navegação por abas touch-friendly. A aba entra automaticamente no MobileNav (drawer) sem alterações.

## 13. Problemas encontrados

- Erros de tipo pré-existentes no teste de integração `supabase-integration.test.ts` (não bloqueiam build/testes).
- 1 erro de lint pré-existente em `useData.ts:56` (`set-state-in-effect`) e warnings de imports não usados em `page.tsx` — pré-existentes, não tocados.
- `@next/third-parties`/fontes Google podem falhar offline no build (já documentado no README do projeto).

## 14. Limitações (não implementado nesta etapa)

- Discovery/pesquisa de empresas em fontes externas (não há scraping/API de busca; decisão consciente).
- Coleta automática e normalização de dados (site, telefone, redes).
- Qualificação, Lead Score, IA, contatos comerciais, abordagens personalizadas e pipeline.
- Nenhum envio automático de mensagens (WhatsApp/e-mail) — por regra do escopo.
- As novas tabelas só existem em SQL; precisam ser aplicadas no Supabase (ou usar localStorage, que funciona já).

## 15. Pendências

1. Aplicar `00005_auto_prospect.sql` no Supabase (pelo dashboard SQL ou CLI) para habilitar persistência na nuvem.
2. Criar tipos/config de campanha reutilizáveis sem tocar no código principal (constantes de segmentos já localizadas no módulo).

## 16. Próximos passos (recomendados, nesta ordem)

1. **Campanhas → Discovery (manual/assistido):** permitir adicionar a primeira empresa à base manualmente (com origem/campanha) para validar o fluxo empresa única + descobertas.
2. **Discovery:** integração com fontes públicas permitidas (ex.: busca orgânica guiada, cadastro manual assistido) sem burlar proteções.
3. **Qualificação:** sinais de oportunidade por segmento.
4. **Lead Score** com explicação FATO/INFERÊNCIA/RECOMENDAÇÃO.
5. **IA:** resumos, abordagens personalizadas (visualizar/editar/copiar/abrir WhatsApp — sem disparo automático).
6. **Pipeline** próprio do Auto Prospect (Encontrado → ... → Fechado/Descartado), mantendo a Prospecção atual intacta.
