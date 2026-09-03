-- ============================================================
-- AME Control - Auto Prospect
-- Oportunidade Comercial (Etapa 6)
-- Alves Mobilidade Executiva
-- ============================================================

-- A oportunidade NAO duplica empresa: referencia ap_companies e
-- guarda apenas o snapshot dos dados da inteligencia (score, prioridade,
-- potencial, confianca, servicos sugeridos) no momento da criacao.
-- Historico da abordagem fica em ap_opportunity_interactions.
-- Abordagem MANUAL: nenhum envio automatico e realizado pelo sistema.

-- 1. Oportunidades -------------------------------------------------

create table public.ap_opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.ap_companies(id) on delete cascade,
  intelligence_id uuid references public.ap_intelligence(id) on delete set null,
  qualification_id uuid references public.ap_qualifications(id) on delete set null,
  status text not null default 'Nova'
    check (status in ('Nova', 'Para abordar', 'Em contato', 'Respondeu', 'Interessado', 'Sem interesse', 'Convertido')),
  priority integer not null default 4 check (priority between 1 and 4),
  score integer not null default 0 check (score between 0 and 100),
  potential text not null default '',
  confidence text not null default '',
  priority_reason text not null default '',
  next_action text not null default '',
  recommended_services jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1 oportunidade ATIVA por empresa (encerradas podem receber nova)
create unique index idx_ap_opportunities_one_active
  on public.ap_opportunities (company_id)
  where status in ('Nova', 'Para abordar', 'Em contato', 'Respondeu', 'Interessado');

create index idx_ap_opportunities_company on public.ap_opportunities(company_id);
create index idx_ap_opportunities_status on public.ap_opportunities(status);
create index idx_ap_opportunities_priority on public.ap_opportunities(priority);
create index idx_ap_opportunities_created_at on public.ap_opportunities(created_at desc);

-- 2. Interacoes (historico da abordagem) ---------------------------

create table public.ap_opportunity_interactions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.ap_opportunities(id) on delete cascade,
  channel text not null default 'Outro'
    check (channel in ('WhatsApp', 'Telefone', 'E-mail', 'Instagram', 'LinkedIn', 'Outro')),
  result text not null default '',
  note text not null default '',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_ap_opportunity_interactions_opportunity
  on public.ap_opportunity_interactions(opportunity_id);
create index idx_ap_opportunity_interactions_occurred
  on public.ap_opportunity_interactions(occurred_at desc);

-- 3. ROW LEVEL SECURITY -------------------------------------------
-- Mesmo padrao do restante do Auto Prospect (anon para todas)

alter table public.ap_opportunities enable row level security;
alter table public.ap_opportunity_interactions enable row level security;

create policy "all_anon" on public.ap_opportunities for all using (true) with check (true);
create policy "all_anon" on public.ap_opportunity_interactions for all using (true) with check (true);