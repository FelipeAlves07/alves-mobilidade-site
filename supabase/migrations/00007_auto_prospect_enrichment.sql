-- ============================================================
-- AME Control - Auto Prospect
-- Enriquecimento e qualificacao de empresas (Etapa 4)
-- Alves Mobilidade Executiva
-- ============================================================

-- 1. Enriquecimentos: resultado de uma coleta no site da empresa
--    (uma linha por execucao -> mantem historico)

create table public.ap_enrichments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.ap_companies(id) on delete cascade,
  status text not null default 'Pendente'
    check (status in ('Pendente', 'Concluido', 'Indisponivel', 'Erro')),
  source_url text not null default '',
  fetched_pages integer not null default 0,
  title text not null default '',
  description text not null default '',
  reason text not null default '',
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_ap_enrichments_company on public.ap_enrichments(company_id);
create index idx_ap_enrichments_created_at on public.ap_enrichments(created_at desc);

-- 2. Evidencias: de onde cada informacao/sinal veio (origem obrigatoria)

create table public.ap_enrichment_evidences (
  id uuid primary key default gen_random_uuid(),
  enrichment_id uuid not null references public.ap_enrichments(id) on delete cascade,
  kind text not null default 'sinal'
    check (kind in ('fato', 'sinal', 'inferencia')),
  label text not null default '',
  text text not null default '',
  source_url text not null default '',
  collected_at timestamptz not null default now()
);

create index idx_ap_evidences_enrichment on public.ap_enrichment_evidences(enrichment_id);

-- 3. Qualificacoes: resultado da analise (uma linha por execucao -> historico)
--    score 0-100, potencial, confianca, fatos, inferencias, servicos,
--    evidencias e justificativa do score

create table public.ap_qualifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.ap_companies(id) on delete cascade,
  enrichment_id uuid references public.ap_enrichments(id) on delete set null,
  score integer not null default 0 check (score between 0 and 100),
  potential text not null default ''
    check (potential in ('Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto')),
  confidence text not null default ''
    check (confidence in ('Baixa', 'Média', 'Alta')),
  confidence_reason text not null default '',
  summary text not null default '',
  opportunity_reason text not null default '',
  recommendation text not null default ''
    check (recommendation in ('abordar', 'investigar', 'baixa_prioridade')),
  recommendation_text text not null default '',
  facts jsonb not null default '[]',
  inferences jsonb not null default '[]',
  possible_services jsonb not null default '[]',
  score_breakdown jsonb not null default '[]',
  ai_provider text not null default '',
  ai_model text not null default '',
  ai_status text not null default 'deterministico',
  created_at timestamptz not null default now()
);

create index idx_ap_qualifications_company on public.ap_qualifications(company_id);
create index idx_ap_qualifications_created_at on public.ap_qualifications(created_at desc);

-- 4. ROW LEVEL SECURITY ----------------------------------------
-- Mesmo padrao do restante do Auto Prospect (anon para todas)

alter table public.ap_enrichments enable row level security;
alter table public.ap_enrichment_evidences enable row level security;
alter table public.ap_qualifications enable row level security;

create policy "all_anon" on public.ap_enrichments for all using (true) with check (true);
create policy "all_anon" on public.ap_enrichment_evidences for all using (true) with check (true);
create policy "all_anon" on public.ap_qualifications for all using (true) with check (true);

-- 5. TRIGGER (updated_at) — handle_updated_at ja existe (migration 00005)

create trigger set_updated_at before update on public.ap_enrichments
  for each row execute function public.handle_updated_at();
