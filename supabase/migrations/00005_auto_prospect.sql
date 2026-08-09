-- ============================================================
-- AME Control - Auto Prospect
-- Fundação: campanhas, base de empresas e descobertas
-- Alves Mobilidade Executiva
-- ============================================================

-- 1. TABLES ----------------------------------------------------

-- 1.1 Campanhas de Auto Prospect
create table public.ap_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null default '',
  segments text[] not null default '{}',
  objective text not null default '',
  target_count integer not null default 0,
  status text not null default 'Rascunho'
    check (status in ('Rascunho', 'Ativa', 'Pausada', 'Encerrada')),
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.2 Base única de empresas encontradas (sem duplicação)
create table public.ap_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  segment text not null default '',
  city text not null default '',
  state text not null default '',
  address text not null default '',
  website text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  instagram text not null default '',
  linkedin text not null default '',
  notes text not null default '',
  source text not null default '',
  collected_at timestamptz,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evita duplicação: mesma empresa (normalizada por nome) só uma vez
create unique index idx_ap_companies_dedup on public.ap_companies (lower(name));

-- 1.3 Descobertas: liga empresa encontrada à campanha + origem
create table public.ap_discoveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.ap_companies(id) on delete cascade,
  campaign_id uuid references public.ap_campaigns(id) on delete cascade,
  source text not null default '',
  url text not null default '',
  created_at timestamptz not null default now(),
  unique (company_id, campaign_id)
);

-- 2. INDEXES ----------------------------------------------------

create index idx_ap_campaigns_status on public.ap_campaigns(status);
create index idx_ap_campaigns_created_at on public.ap_campaigns(created_at desc);
create index idx_ap_companies_segment on public.ap_companies(segment);
create index idx_ap_companies_city on public.ap_companies(city);
create index idx_ap_companies_created_at on public.ap_companies(created_at desc);
create index idx_ap_discoveries_company on public.ap_discoveries(company_id);
create index idx_ap_discoveries_campaign on public.ap_discoveries(campaign_id);

-- 3. ROW LEVEL SECURITY ----------------------------------------
-- Mesmo padrão de acesso do fix_rls_final.sql (anon para todas)

alter table public.ap_campaigns enable row level security;
alter table public.ap_companies enable row level security;
alter table public.ap_discoveries enable row level security;

create policy "all_anon" on public.ap_campaigns for all using (true) with check (true);
create policy "all_anon" on public.ap_companies for all using (true) with check (true);
create policy "all_anon" on public.ap_discoveries for all using (true) with check (true);

-- 4. TRIGGERS (updated_at) --------------------------------------

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.ap_campaigns
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.ap_companies
  for each row execute function public.handle_updated_at();
