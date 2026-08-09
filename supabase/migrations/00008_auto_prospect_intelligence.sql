-- ============================================================
-- AME Control - Auto Prospect
-- Inteligencia Comercial (Etapa 5)
-- Alves Mobilidade Executiva
-- ============================================================

-- Inteligencia comercial: interpretacao + priorizacao de oportunidades.
-- Uma linha por execucao -> mantem historico (auditoria).
-- NAO duplica: referencia a empresa, enriquecimento e qualificacao existentes.
-- Prioridade 1-4 e deterministica (regras explícitas); a IA interpreta e
-- sugere, mas o score/potencial determinístico continuam como base.

create table public.ap_intelligence (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.ap_companies(id) on delete cascade,
  enrichment_id uuid references public.ap_enrichments(id) on delete set null,
  qualification_id uuid references public.ap_qualifications(id) on delete set null,
  provider text not null default '',
  model text not null default '',
  status text not null default 'Concluido'
    check (status in ('Pendente', 'Concluido', 'Erro')),
  error text not null default '',
  priority integer not null default 4 check (priority between 1 and 4),
  priority_reason text not null default '',
  reasons jsonb not null default '[]',
  next_action text not null default '',
  summary text not null default '',
  recommended_services jsonb not null default '[]',
  ai_confidence text not null default ''
    check (ai_confidence in ('', 'Baixa', 'Média', 'Alta')),
  score_snapshot integer not null default 0 check (score_snapshot between 0 and 100),
  potential_snapshot text not null default '',
  confidence_snapshot text not null default '',
  ai_response jsonb,
  ai_status text not null default 'deterministico'
    check (ai_status in ('deterministico', 'ia', 'ia_falha')),
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_estimate numeric(10, 6) not null default 0,
  analysis_version text not null default 'intelligence-v1',
  created_at timestamptz not null default now()
);

create index idx_ap_intelligence_company on public.ap_intelligence(company_id);
create index idx_ap_intelligence_created_at on public.ap_intelligence(created_at desc);
create index idx_ap_intelligence_priority on public.ap_intelligence(priority);

-- ROW LEVEL SECURITY ------------------------------------------
-- Mesmo padrao do restante do Auto Prospect (anon para todas)

alter table public.ap_intelligence enable row level security;

create policy "all_anon" on public.ap_intelligence for all using (true) with check (true);
