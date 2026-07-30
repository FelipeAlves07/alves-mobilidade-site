# Relatório do Projeto — Alves Mobilidade Executiva

**Última atualização:** 30/07/2026
**Branch:** `main`

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [O que o Projeto Tem (Completo)](#2-o-que-o-projeto-tem-completo)
3. [O que Foi Feito Nesta Sessão (7 Fases)](#3-o-que-foi-feito-nesta-sessão-7-fases)
4. [O que Ainda Pode Ser Feito (Ideias Futuras)](#4-o-que-ainda-pode-ser-feito-ideias-futuras)
5. [Arquitetura Técnica](#5-arquitetura-técnica)
6. [Como Executar e Buildar](#6-como-executar-e-buildar)
7. [AME Vision — TV de Bordo](#7-ame-vision--tv-de-bordo)
8. [Estrutura de Diretórios](#8-estrutura-de-diretórios)

---

## 1. Visão Geral

Sistema completo para gestão de **Alves Mobilidade Executiva** com dois grandes módulos:

- **AME Control** (`/admin`) — SPA de gestão (clientes, viagens, financeiro, motoristas, veículos, marketing, propostas, etc.)
- **AME Vision** (`/admin/tv-de-bordo`) — Sistema de TV de bordo para tablets/veículos (exibição em looping com tela de descanso, mapa ao vivo, clima, notícias, QR codes)

Além do site público institucional: Home, Frota, Serviços, Corporativo, Quem Somos, Contato, Solicitar Atendimento.

---

## 2. O que o Projeto Tem (Completo)

### AME Control — Módulos Implementados

| Módulo | Funcionalidades |
|---|---|
| **Dashboard** | Hero com progresso do dia, ação prioritária, métricas (clientes, follow-ups, transfers, faturamento), gráfico de status dos leads (barras), gráfico financeiro mensal (barras empilhadas), viagens de hoje, sugestões IA |
| **Clientes** | CRUD completo, busca, importar de texto (`Nome: X, Contato: Y` ou `Nome;Telefone`), importar `.txt` com file picker, export CSV, cards por lead com ações (WhatsApp, concluir, editar), tipos (Aeroporto, Empresa, Hotel, etc.) |
| **Financeiro** | CRUD, filtro por mês, extrato visual (entradas/saídas/saldo do mês), campo de data, deletar, export CSV, métricas de saldo previsto |
| **Viagens e Agenda** | CRUD, orçamento inteligente (R$ 3/km, arredonda 10 em 10), calendário mensal com indicadores de viagem por dia, integração com GPS ao vivo (AME Vision), toggle rota ativa/desligada, export CSV |
| **Motoristas** | CRUD (nome, telefone, CNH, CPF, status), busca, export CSV |
| **Veículos** | CRUD (modelo, placa, ano, cor, status), busca, export CSV |
| **Comercial (Propostas)** | Orçamento, proposta premium com PNG/PDF, envio WhatsApp, converter para viagem |
| **WhatsApp** | Mensagens prontas (apresentação, indicação, follow-up, etc.), enviar para lead |
| **Indicações** | Programa de indicação (créditos), CRUD |
| **Marketing** | 6 sugestões rotativas (story, feed, indicação, empresas, hotéis, conteúdo) com conclusão |
| **Prospecção** | Filtro de leads não fechados |
| **Empresas** | Filtro de leads tipo Empresa |
| **IA da Alves** | Sugestões IA + backup |
| **AME Vision Panel** | Indicador de conexão, toggle rota, total de minutos corrigido, configuração |
| **Comando AME (Voz)** | Assistente por voz com etapas (orçamento, cliente, financeiro, WhatsApp) |
| **Login/Auth** | Autenticação local + Supabase, setup via `/api/auth/setup` |

### Public Site — Páginas
- Home, Frota, Serviços, Corporativo, Quem Somos, Contato, Solicitar Atendimento

### AME Vision — TV de Bordo
- 13 telas: Welcome, Trip, Live Map, Weather, News, Comfort, Pause, Fleet, Destinations, Referral, Reviews, Contact, Rest
- Schedule com trip e live-map sempre ativos
- GPS tracker persistente durante toda a sessão
- Tela de descanso sem logo, relógio ou data — QR codes WhatsApp + Site + Instagram
- Descanso ao fim de cada ciclo (7 min padrão, configurável)
- Loading spinner + badge de conexão + reativar fullscreen
- API routes: `/api/ame-vision/route`, `/api/ame-vision/news`, `/api/ame-vision/news/image`

---

## 3. O que Foi Feito Nesta Sessão (7 Fases)

| # | Fase | Commits | Arquivos |
|---|---|---|---|
| 1 | **Importar .txt de contatos** | `e160d0f` | `modules/clientes/services/clientes.service.ts`, `modules/clientes/components/ClientesView.tsx` |
| 2 | **Módulo Motoristas** (domain + hook + view + menu) | `82ee315` | `domain/motorista/types.ts`, `hooks/useMotoristas.ts`, `modules/motoristas/components/MotoristasView.tsx`, `hooks/useData.ts`, `app/admin/page.tsx` |
| 3 | **Módulo Veículos** (domain + hook + view + menu) | `4606d21` | `domain/veiculo/types.ts`, `hooks/useVeiculos.ts`, `modules/veiculos/components/VeiculosView.tsx`, `hooks/useData.ts`, `app/admin/page.tsx` |
| 4 | **Export CSV** em todas as views | `f90b8cd` | `lib/csv.ts`, `components/admin/Panel.tsx` (+ `extra` prop), `ClientesView`, `MotoristasView`, `VeiculosView`, `ViagensView`, `FinanceiroView` |
| 5 | **Gráficos no Dashboard** (status leads + financeiro mensal) | `a6e6cef` | `modules/dashboard/components/DashboardView.tsx`, `app/admin/page.tsx` |
| 6 | **Calendário de Viagens** | `f532f14` | `modules/viagens/components/ViagensView.tsx` |
| 7 | **Financeiro Melhorado** (filtro mês, extrato, delete, data) | `349cb7e` | `modules/financeiro/components/FinanceiroView.tsx`, `app/admin/page.tsx` |

---

## 4. O que Ainda Pode Ser Feito (Ideias Futuras)

### Prioridade Média
- **Vincular motorista/veículo à viagem** — adicionar campos motoristaId e veiculoId no formulário de viagem, puxar de `useMotoristas` e `useVeiculos`
- **Relatório financeiro anual** — gráfico anual com filtering por categoria
- **Notificações push** — lembrete de follow-up via notificação do navegador
- **Tema claro/escuro** — toggle no admin

### Prioridade Baixa
- **Exportar relatório em PDF** — gerar relatório mensal com dados de viagens e financeiro
- **Multi-usuário** — convidar membros da equipe com permissões
- **Integração com Google Calendar** — sincronizar viagens como eventos
- **App mobile** — PWA ou React Native para motoristas
- **Nota fiscal** — gerar NF para clientes corporativos
- **Checklist de embarque** — lista de verificação pré-viagem no AME Vision
- **Dashboard com gráfico de pizza** para distribuição de receita por tipo de viagem

---

## 5. Arquitetura Técnica

### Stack
- **Framework:** Next.js 16.2.6 (Turbopack, App Router)
- **Linguagem:** TypeScript 5, React 19
- **Estilo:** Tailwind CSS v4
- **Banco:** localStorage (default) ou Supabase (se configurado)
- **Ícones:** lucide-react
- **Animações:** framer-motion
- **Testes:** vitest
- **Mapa:** Leaflet (via CDN no AME Vision)

### Padrão de Dados (Repositório)
```
useData() (hook orquestrador)
  ├── useLeads()     → createRepository("contacts", "ame-leads-v2", ...)
  ├── useTrips()     → createRepository("trips", "ame-trips-v2", ...)
  ├── useFinance()   → createRepository("finance_entries", "ame-finance-v2", ...)
  ├── useReferrals() → createRepository("referrals", "ame-referrals-v2", ...)
  ├── useProposals() → createRepository("proposals", "ame-proposals-v1", ...)
  ├── useMotoristas()→ createRepository("motoristas", "ame-motoristas-v1", ...)
  └── useVeiculos()  → createRepository("veiculos", "ame-veiculos-v1", ...)
```

Cada hook retorna `[data, setData, add, update, delete]`.

O `createRepository` decide automaticamente entre localStorage e Supabase baseado em variáveis de ambiente.

### Fluxo de Dados
```
app/admin/page.tsx
  └── useData() (hook em hooks/useData.ts)
        ├── { leads, trips, finance, ... }
        └── stats (DashboardStats memoizado)

menu → renderContent() switch → <ViewComponent data={...} onAction={...} />
```

---

## 6. Como Executar e Buildar

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Iniciar produção
npm start

# Testes
npm test       # vitest
npx vitest run # modo headless
```

---

## 7. AME Vision — TV de Bordo

### Localização
- HTML gerado em: `lib/ameVisionHTML.ts` (função `visionDocument`)
- Assets JS: `public/ame-vision/assets/js/`
- CSS: `public/ame-vision/assets/css/ame-vision.css`
- Imagens: `public/ame-vision/assets/images/`
- Página de exibição: `app/admin/tv-de-bordo/page.tsx`

### Arquivos JS Core
| Arquivo | Função |
|---|---|
| `config.js` | Configurações (appName, API endpoints, contato) |
| `main.js` | Entry point, bootstrap do player |
| `core/player.js` | Classe `VisionPlayer` (orquestrador principal) |
| `core/schedule.js` | `getSchedule(mode)` — schedule curto/longo |
| `core/api.js` | `ameApi` — fetch de trip, weather, news, reviews |
| `core/dom.js` | Helpers de DOM |
| `core/gps.js` | `initGPSTracker()`, `startLiveMap()` — Leaflet + GPS |
| `screens/screens.js` | 13 telas com `.render()` |
| `data/content.js` | Dados mock (frota, destinos, notícias, reviews) |

### Pontos de Atenção
- `window.AME_VISION_GPS` — objeto global com dados de GPS ao vivo
- `initGPSTracker()` — roda a sessão toda, não para entre telas
- `clearTimers()` — NÃO chama `stopMap()`, GPS persiste
- `routeEnabled` — toggle no painel admin que traça/oculta rota
- `rest` screen — sem logo AME, sem relógio/data, QR codes WhatsApp + Site + Instagram
- Comunicação com iframe via `postMessage` / `AME_VISION_READY`

---

## 8. Estrutura de Diretórios

```
alves-mobilidade/
├── app/
│   ├── admin/
│   │   ├── page.tsx           ← SPA principal do AME Control
│   │   ├── tv-de-bordo/
│   │   │   └── page.tsx       ← Tela de exibição da TV de Bordo
│   │   └── constants.ts       ← Constantes (status, preços, mensagens)
│   ├── api/...                 ← API routes
│   ├── contato/, corporativo/, frota/, etc. ← Site público
│   └── page.tsx               ← Home
│
├── components/
│   └── admin/                 ← Componentes reutilizáveis do admin
│       ├── Panel.tsx, Metric.tsx, Sidebar.tsx, MobileNav.tsx
│       ├── LeadCard.tsx, TripList.tsx, ActionCard.tsx
│       ├── AMEVisionPanel.tsx, AISuggestions.tsx
│       ├── VoiceInput.tsx, VoiceTextarea.tsx, WhatsAppIcon.tsx
│       └── ...
│
├── domain/                    ← Tipos e mappers por domínio
│   ├── lead/, trip/, finance/, referral/, proposal/
│   ├── motorista/, veiculo/
│   ├── auth/, company/, marketing/, shared/
│   └── ...
│
├── hooks/                     ← Hooks de dados
│   ├── useData.ts             ← Orquestrador principal
│   ├── useLeads.ts, useTrips.ts, useFinance.ts
│   ├── useReferrals.ts, useProposals.ts
│   ├── useMotoristas.ts, useVeiculos.ts
│   └── ...
│
├── lib/                       ← Utilitários e serviços
│   ├── csv.ts                 ← Export CSV
│   ├── format.ts              ← Formatação de data/moeda
│   ├── quote.ts               ← Regras de precificação
│   ├── maps.ts                ← Google Maps / Waze
│   ├── voice.ts               ← Reconhecimento de voz
│   ├── whatsapp.ts            ← Link WhatsApp
│   ├── repository.ts          ← Interface Repository
│   ├── repository-factory.ts  ← Factory (local/Supabase)
│   ├── local-storage-repository.ts
│   ├── supabase-repository.ts
│   ├── ameVisionHTML.ts       ← Geração do HTML da TV
│   └── ameVisionSync.ts       ← Sincronização TV ↔ Admin
│
├── modules/                   ← Views por módulo
│   ├── clientes/
│   │   ├── components/ClientesView.tsx
│   │   └── services/clientes.service.ts
│   ├── dashboard/components/DashboardView.tsx
│   ├── financeiro/components/FinanceiroView.tsx
│   ├── viagens/components/ViagensView.tsx
│   ├── motoristas/components/MotoristasView.tsx
│   ├── veiculos/components/VeiculosView.tsx
│   ├── propostas/, indicacoes/, marketing/
│   ├── whatsapp/, voz/, ai/
│   └── ...
│
├── services/                  ← Serviços legados
│   ├── auth.ts, migration.ts
│   ├── leads.ts, trips.ts, finance.ts
│   └── ...
│
├── public/
│   └── ame-vision/assets/     ← Assets da TV de Bordo
│       ├── js/ (config, main, core/*, screens/*, data/*)
│       ├── css/ame-vision.css
│       └── images/qr/ (qr WhatsApp, Instagram, Site)
│
├── supabase/                  ← Migrations SQL
├── docs/                      ← Documentação do projeto
├── whatsapp-scanner/          ← Bot WhatsApp (standalone)
├── utils/
└── types/
```

---

> **Nota para agentes futuros:** Sempre executar `npx next build` antes de commitar para verificar TypeScript. O build pode falhar se Tipos não forem compatíveis. Verificar `hooks/useData.ts` ao adicionar novos hooks — precisa importar, instanciar e espalhar no return. Para adicionar nova view ao menu, editar `app/admin/page.tsx` em 4 lugares: import, array menu, destructuring do useData, case no switch renderContent.
