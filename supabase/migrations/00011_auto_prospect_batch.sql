-- ============================================================
-- AME Control - Auto Prospect
-- Processamento em Lote (Etapa 7)
-- Alves Mobilidade Executiva
-- ============================================================

-- Fila persistida + processamento em chunks server-side.
-- Reutiliza o pipeline existente (enriquecimento → qualificação →
-- inteligência); o lote NÃO cria oportunidades (abordagem manual).
-- Nenhum dado existente é alterado: ADD COLUMN são não-destrutivos.

-- 1. Runs de lote (1 linha = 1 processamento de uma campanha) ---

create table public.ap_batch_runs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ap_campaigns(id) on delete cascade,
  status text not null default 'pendente'
    check (status in ('pendente', 'processando', 'pausado', 'concluido', 'cancelado')),
  filters jsonb not null default '{}',
  total integer not null default 0,
  pending integer not null default 0,
  processing integer not null default 0,
  completed integer not null default 0,
  failed integer not null default 0,
  without_data integer not null default 0,
  cancelled integer not null default 0,
  error_summary jsonb not null default '[]',
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ap_batch_runs_campaign on public.ap_batch_runs(campaign_id);
create index idx_ap_batch_runs_status on public.ap_batch_runs(status);
create index idx_ap_batch_runs_created_at on public.ap_batch_runs(created_at desc);

-- 2. Empresas do run (fila por empresa) ---------------------------
-- PK composta (batch_run_id, company_id): 1 linha por empresa por run.

create table public.ap_batch_company_runs (
  batch_run_id uuid not null references public.ap_batch_runs(id) on delete cascade,
  company_id uuid not null references public.ap_companies(id) on delete cascade,
  status text not null default 'pendente'
    check (status in ('pendente', 'processando', 'concluida', 'sem_dados', 'falha', 'cancelada')),
  error_code text not null default '',
  error_message text not null default '',
  retry_count integer not null default 0,
  next_retry_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (batch_run_id, company_id)
);

create index idx_ap_bcr_claim on public.ap_batch_company_runs(batch_run_id, status, next_retry_at);
create index idx_ap_bcr_company on public.ap_batch_company_runs(company_id);

-- 3. Vínculo dos artefatos ao run (relatórios por run) -------------
-- ADD COLUMN nullable com FK ON DELETE SET NULL: dados existentes
-- permanecem intactos (histórico das Etapas 1-6 preservado).

alter table public.ap_enrichments add column batch_run_id uuid references public.ap_batch_runs(id) on delete set null;
alter table public.ap_qualifications add column batch_run_id uuid references public.ap_batch_runs(id) on delete set null;
alter table public.ap_intelligence add column batch_run_id uuid references public.ap_batch_runs(id) on delete set null;

create index idx_ap_enrichments_batch_run on public.ap_enrichments(batch_run_id);
create index idx_ap_qualifications_batch_run on public.ap_qualifications(batch_run_id);
create index idx_ap_intelligence_batch_run on public.ap_intelligence(batch_run_id);

-- 4. ROW LEVEL SECURITY --------------------------------------------
-- Mesmo padrão do restante do Auto Prospect (anon para todas).

alter table public.ap_batch_runs enable row level security;
alter table public.ap_batch_company_runs enable row level security;

create policy "all_anon" on public.ap_batch_runs for all using (true) with check (true);
create policy "all_anon" on public.ap_batch_company_runs for all using (true) with check (true);

-- 5. Triggers (updated_at) — handle_updated_at existe (migration 00005)

create trigger set_updated_at before update on public.ap_batch_runs
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.ap_batch_company_runs
  for each row execute function public.handle_updated_at();

-- 6. Claim atômico (concorrência segura entre instâncias) -----------
-- Pega a próxima empresa elegível do run com SKIP LOCKED:
--  - pendente com next_retry_at vencido;
--  - OU processando com lease expirado (claimed_at > 5 min) — recupera
--    execuções órfãs (navegador fechado / servidor reiniciado).
-- Duas invocações concorrentes nunca reclamam a mesma empresa.

create or replace function public.ap_batch_claim_next(p_run_id uuid)
returns uuid
language sql
volatile
as $$
  update public.ap_batch_company_runs bcr
  set status = 'processando',
      claimed_at = now()
  where bcr.company_id = (
    select bcr2.company_id
    from public.ap_batch_company_runs bcr2
    where bcr2.batch_run_id = p_run_id
      and (
        bcr2.status = 'pendente'
        or (
          bcr2.status = 'processando'
          and bcr2.claimed_at is not null
          and bcr2.claimed_at < now() - interval '5 minutes'
        )
      )
      and (bcr2.next_retry_at is null or bcr2.next_retry_at <= now())
    order by bcr2.created_at, bcr2.company_id
    limit 1
    for update skip locked
  )
  returning bcr.company_id;
$$;
