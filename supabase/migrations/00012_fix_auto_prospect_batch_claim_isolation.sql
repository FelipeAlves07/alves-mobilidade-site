-- ============================================================
-- AME Auto Prospect - Etapa 7
-- Correcao do isolamento do claim entre batch runs
-- ============================================================
-- A migration 00011 ja foi aplicada. Esta migration corrige o claim e
-- acrescenta invariantes de concorrencia; nao recupera dados existentes.
-- Aplique todo este arquivo em uma unica transacao, com workers de batch parados.

-- 1. Preflight e invariantes estruturais ------------------------
-- Execute esta migration dentro de uma unica transacao. Estas verificacoes
-- falham antes de qualquer DDL caso dados do contrato anterior impeçam os
-- novos indices de unicidade.
do $$
begin
  if exists (
    select 1
    from public.ap_enrichments
    where batch_run_id is not null
    group by batch_run_id, company_id
    having count(*) > 1
  ) then
    raise exception 'migration interrompida: existem enriquecimentos duplicados por run e empresa';
  end if;

  if exists (
    select 1
    from public.ap_qualifications
    where batch_run_id is not null
    group by batch_run_id, company_id
    having count(*) > 1
  ) then
    raise exception 'migration interrompida: existem qualificacoes duplicadas por run e empresa';
  end if;

  if exists (
    select 1
    from public.ap_intelligence
    where batch_run_id is not null
    group by batch_run_id, company_id
    having count(*) > 1
  ) then
    raise exception 'migration interrompida: existem inteligencias duplicadas por run e empresa';
  end if;

  if exists (
    select 1
    from public.ap_batch_runs
    where status in ('pendente', 'processando', 'pausado')
    group by campaign_id
    having count(*) > 1
  ) then
    raise exception 'migration interrompida: existe mais de um run ativo para a mesma campanha';
  end if;
end;
$$;

-- NULL em batch_run_id continua permitindo o historico das analises
-- manuais. Para um item de lote, cada etapa pode existir uma unica vez.

alter table public.ap_enrichments add column batch_claimed_at timestamptz;
alter table public.ap_enrichment_evidences add column batch_claimed_at timestamptz;
alter table public.ap_qualifications add column batch_claimed_at timestamptz;
alter table public.ap_intelligence add column batch_claimed_at timestamptz;

-- A fila e um snapshot historico: uma empresa referenciada por qualquer run
-- nao pode ser removida em cascata e invalidar os contadores desse run.
alter table public.ap_batch_company_runs
  drop constraint ap_batch_company_runs_company_id_fkey,
  add constraint ap_batch_company_runs_company_id_fkey
    foreign key (company_id) references public.ap_companies(id) on delete restrict;

-- Campanhas tambem fazem parte do snapshot historico do run. Sem este
-- RESTRICT, apagar uma campanha apagaria a fila e desvincularia E/Q/I.
alter table public.ap_batch_runs
  drop constraint ap_batch_runs_campaign_id_fkey,
  add constraint ap_batch_runs_campaign_id_fkey
    foreign key (campaign_id) references public.ap_campaigns(id) on delete restrict;

create unique index idx_ap_enrichments_batch_company_unique
  on public.ap_enrichments(batch_run_id, company_id);
create unique index idx_ap_qualifications_batch_company_unique
  on public.ap_qualifications(batch_run_id, company_id);
create unique index idx_ap_intelligence_batch_company_unique
  on public.ap_intelligence(batch_run_id, company_id);
create unique index idx_ap_evidences_execution_unique
  on public.ap_enrichment_evidences(
    enrichment_id,
    md5(kind),
    md5(label),
    md5(text),
    md5(source_url)
  )
  where batch_claimed_at is not null;

-- Garante no banco a regra ja validada pelo executor.
create unique index idx_ap_batch_runs_one_active_campaign
  on public.ap_batch_runs(campaign_id)
  where status in ('pendente', 'processando', 'pausado');

-- Cria o run e o snapshot da fila na mesma transacao. Assim nenhum worker
-- consegue observar um run ativo ainda sem suas empresas.
create or replace function public.ap_batch_create_run(
  p_run_id uuid,
  p_campaign_id uuid,
  p_filters jsonb,
  p_company_ids uuid[]
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.ap_batch_runs%rowtype;
  v_total integer := coalesce(cardinality(p_company_ids), 0);
begin
  if v_total = 0 then
    raise exception 'o lote precisa ter ao menos uma empresa'
      using errcode = '22023';
  end if;

  insert into public.ap_batch_runs (
    id,
    campaign_id,
    status,
    filters,
    total,
    pending
  ) values (
    p_run_id,
    p_campaign_id,
    'pendente',
    coalesce(p_filters, '{}'::jsonb),
    v_total,
    v_total
  )
  returning * into v_run;

  insert into public.ap_batch_company_runs (batch_run_id, company_id)
  select p_run_id, company_id
  from unnest(p_company_ids) as companies(company_id);

  return to_jsonb(v_run);
end;
$$;

-- 2. Claim isolado ---------------------------------------------

drop function public.ap_batch_claim_next(uuid);

create function public.ap_batch_claim_next(p_run_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid;
  v_retry_count integer;
  v_claimed_at timestamptz;
begin
  -- Todas as mutacoes da fila bloqueiam primeiro o run. Isso serializa os
  -- contadores e estabelece a mesma ordem de locks do cancelamento.
  perform 1
  from public.ap_batch_runs br
  where br.id = p_run_id
    and br.status in ('pendente', 'processando')
  for update;

  if not found then
    return null;
  end if;

  update public.ap_batch_runs
  set status = 'processando'
  where id = p_run_id
    and status = 'pendente';

  select bcr2.company_id, bcr2.retry_count
  into v_company_id, v_retry_count
  from public.ap_batch_company_runs bcr2
  where bcr2.batch_run_id = p_run_id
    and (
      bcr2.status = 'pendente'
      or (
        bcr2.status = 'processando'
        and bcr2.claimed_at is not null
        and bcr2.claimed_at <= clock_timestamp() - interval '5 minutes'
      )
    )
    and (bcr2.next_retry_at is null or bcr2.next_retry_at <= clock_timestamp())
  order by bcr2.created_at, bcr2.company_id
  limit 1
  for update of bcr2 skip locked;

  if not found then
    return null;
  end if;

  v_claimed_at := clock_timestamp();

  -- Um takeover sempre recomeca o artefato do item. Isso remove resultados
  -- parciais da tentativa anterior sem tocar em outros runs da empresa.
  delete from public.ap_intelligence
  where batch_run_id = p_run_id
    and company_id = v_company_id;

  delete from public.ap_qualifications
  where batch_run_id = p_run_id
    and company_id = v_company_id;

  delete from public.ap_enrichments
  where batch_run_id = p_run_id
    and company_id = v_company_id;

  update public.ap_batch_company_runs bcr
  set status = 'processando',
      claimed_at = v_claimed_at,
      next_retry_at = null
  where bcr.batch_run_id = p_run_id
    and bcr.company_id = v_company_id;

  perform public.ap_batch_refresh_run_counters(p_run_id);

  return jsonb_build_object(
    'batchRunId', p_run_id,
    'companyId', v_company_id,
    'claimedAt', v_claimed_at,
    'retryCount', v_retry_count
  );
end;
$$;

-- Marcador somente de leitura para a validacao real interromper antes de
-- qualquer mutacao caso esta migration ainda nao esteja aplicada.
create or replace function public.ap_batch_claim_version()
returns integer
language sql
stable
as $$
  select 2;
$$;

-- 3. Fencing de artefatos por lease ----------------------------

create or replace function public.ap_batch_validate_artifact_claim()
returns trigger
language plpgsql
as $$
begin
  -- Preserva os ON DELETE SET NULL das FKs entre E/Q/I. Fora desse caso,
  -- artefatos de batch so podem ser alterados pelo lease ativo.
  if tg_op = 'UPDATE'
     and old.batch_run_id is not distinct from new.batch_run_id
     and old.batch_claimed_at is not distinct from new.batch_claimed_at then
    if tg_table_name = 'ap_qualifications'
       and to_jsonb(new)->>'enrichment_id' is null
       and (to_jsonb(old) - 'enrichment_id') = (to_jsonb(new) - 'enrichment_id') then
      return new;
    end if;

    if tg_table_name = 'ap_intelligence'
       and (
         (
           to_jsonb(new)->>'enrichment_id' is null
           and to_jsonb(old)->>'enrichment_id' is distinct from
               to_jsonb(new)->>'enrichment_id'
         )
         or (
           to_jsonb(new)->>'qualification_id' is null
           and to_jsonb(old)->>'qualification_id' is distinct from
               to_jsonb(new)->>'qualification_id'
         )
       )
       and (to_jsonb(old) - 'enrichment_id' - 'qualification_id') =
           (to_jsonb(new) - 'enrichment_id' - 'qualification_id') then
      return new;
    end if;
  end if;

  if new.batch_run_id is null then
    if tg_op = 'UPDATE'
       and old.batch_run_id is not null
       and exists (
         select 1
         from public.ap_batch_runs br
         where br.id = old.batch_run_id
       ) then
      raise exception 'artefato de batch nao pode ser desvinculado de um run existente';
    end if;

    -- Preserva ON DELETE SET NULL da FK criada na 00011.
    new.batch_claimed_at = null;
    return new;
  end if;

  if new.batch_claimed_at is null then
    raise exception 'claim de batch ausente, cancelado ou expirado';
  end if;

  -- A mesma ordem de locks do cancelamento lineariza artefatos em voo:
  -- ou o artefato confirma antes do cancelamento, ou e recusado depois dele.
  perform 1
  from public.ap_batch_runs br
  where br.id = new.batch_run_id
    and br.status in ('pendente', 'processando', 'pausado')
  for share;

  if not found then
    raise exception 'claim de batch ausente, cancelado ou expirado';
  end if;

  perform 1
  from public.ap_batch_company_runs bcr
  where bcr.batch_run_id = new.batch_run_id
    and bcr.company_id = new.company_id
    and bcr.status = 'processando'
    and bcr.claimed_at = new.batch_claimed_at
    and bcr.claimed_at > clock_timestamp() - interval '5 minutes'
  for share;

  if not found then
    raise exception 'claim de batch ausente, cancelado ou expirado';
  end if;

  return new;
end;
$$;

create trigger validate_batch_claim
  before insert or update on public.ap_enrichments
  for each row execute function public.ap_batch_validate_artifact_claim();
create trigger validate_batch_claim
  before insert or update on public.ap_qualifications
  for each row execute function public.ap_batch_validate_artifact_claim();
create trigger validate_batch_claim
  before insert or update on public.ap_intelligence
  for each row execute function public.ap_batch_validate_artifact_claim();

-- Escritas de artefato passam por RPCs que bloqueiam run -> item antes do
-- UPSERT. Isso evita inversao com takeover/cancelamento.
create or replace function public.ap_batch_lock_claim(
  p_run_id uuid,
  p_company_id uuid,
  p_claimed_at timestamptz
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  perform 1
  from public.ap_batch_runs br
  where br.id = p_run_id
    and br.status in ('pendente', 'processando', 'pausado')
  for share;

  if not found then
    raise exception 'claim de batch ausente, cancelado ou expirado';
  end if;

  perform 1
  from public.ap_batch_company_runs bcr
  where bcr.batch_run_id = p_run_id
    and bcr.company_id = p_company_id
    and bcr.status = 'processando'
    and bcr.claimed_at = p_claimed_at
    and bcr.claimed_at > clock_timestamp() - interval '5 minutes'
  for share;

  if not found then
    raise exception 'claim de batch ausente, cancelado ou expirado';
  end if;
end;
$$;

create or replace function public.ap_batch_upsert_enrichment(p_payload jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  perform public.ap_batch_lock_claim(
    (p_payload->>'batch_run_id')::uuid,
    (p_payload->>'company_id')::uuid,
    (p_payload->>'batch_claimed_at')::timestamptz
  );

  insert into public.ap_enrichments (
    company_id,
    status,
    source_url,
    fetched_pages,
    title,
    description,
    reason,
    collected_at,
    batch_run_id,
    batch_claimed_at
  ) values (
    (p_payload->>'company_id')::uuid,
    p_payload->>'status',
    coalesce(p_payload->>'source_url', ''),
    coalesce((p_payload->>'fetched_pages')::integer, 0),
    coalesce(p_payload->>'title', ''),
    coalesce(p_payload->>'description', ''),
    coalesce(p_payload->>'reason', ''),
    coalesce((p_payload->>'collected_at')::timestamptz, clock_timestamp()),
    (p_payload->>'batch_run_id')::uuid,
    (p_payload->>'batch_claimed_at')::timestamptz
  )
  on conflict (batch_run_id, company_id)
  do update set
    status = excluded.status,
    source_url = excluded.source_url,
    fetched_pages = excluded.fetched_pages,
    title = excluded.title,
    description = excluded.description,
    reason = excluded.reason,
    collected_at = excluded.collected_at,
    batch_claimed_at = excluded.batch_claimed_at
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.ap_batch_upsert_qualification(p_payload jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_run_id uuid := (p_payload->>'batch_run_id')::uuid;
  v_company_id uuid := (p_payload->>'company_id')::uuid;
  v_claimed_at timestamptz := (p_payload->>'batch_claimed_at')::timestamptz;
  v_enrichment_id uuid := nullif(p_payload->>'enrichment_id', '')::uuid;
begin
  perform public.ap_batch_lock_claim(
    v_run_id,
    v_company_id,
    v_claimed_at
  );

  -- A FK simples de enrichment_id nao prova que o pai pertence a esta
  -- execucao. O lock segue a ordem run -> item -> artefato do takeover.
  if v_enrichment_id is not null then
    perform 1
    from public.ap_enrichments e
    where e.id = v_enrichment_id
      and e.batch_run_id = v_run_id
      and e.company_id = v_company_id
      and e.batch_claimed_at = v_claimed_at
    for share;

    if not found then
      raise exception 'claim de batch do enriquecimento nao corresponde ao lease atual';
    end if;
  end if;

  insert into public.ap_qualifications (
    company_id,
    enrichment_id,
    score,
    potential,
    confidence,
    confidence_reason,
    summary,
    opportunity_reason,
    recommendation,
    recommendation_text,
    facts,
    inferences,
    possible_services,
    score_breakdown,
    ai_provider,
    ai_model,
    ai_status,
    batch_run_id,
    batch_claimed_at
  ) values (
    (p_payload->>'company_id')::uuid,
    nullif(p_payload->>'enrichment_id', '')::uuid,
    coalesce((p_payload->>'score')::integer, 0),
    coalesce(p_payload->>'potential', ''),
    coalesce(p_payload->>'confidence', ''),
    coalesce(p_payload->>'confidence_reason', ''),
    coalesce(p_payload->>'summary', ''),
    coalesce(p_payload->>'opportunity_reason', ''),
    coalesce(p_payload->>'recommendation', ''),
    coalesce(p_payload->>'recommendation_text', ''),
    coalesce(p_payload->'facts', '[]'::jsonb),
    coalesce(p_payload->'inferences', '[]'::jsonb),
    coalesce(p_payload->'possible_services', '[]'::jsonb),
    coalesce(p_payload->'score_breakdown', '[]'::jsonb),
    coalesce(p_payload->>'ai_provider', ''),
    coalesce(p_payload->>'ai_model', ''),
    coalesce(p_payload->>'ai_status', 'deterministico'),
    (p_payload->>'batch_run_id')::uuid,
    (p_payload->>'batch_claimed_at')::timestamptz
  )
  on conflict (batch_run_id, company_id)
  do update set
    enrichment_id = excluded.enrichment_id,
    score = excluded.score,
    potential = excluded.potential,
    confidence = excluded.confidence,
    confidence_reason = excluded.confidence_reason,
    summary = excluded.summary,
    opportunity_reason = excluded.opportunity_reason,
    recommendation = excluded.recommendation,
    recommendation_text = excluded.recommendation_text,
    facts = excluded.facts,
    inferences = excluded.inferences,
    possible_services = excluded.possible_services,
    score_breakdown = excluded.score_breakdown,
    ai_provider = excluded.ai_provider,
    ai_model = excluded.ai_model,
    ai_status = excluded.ai_status,
    batch_claimed_at = excluded.batch_claimed_at
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.ap_batch_upsert_intelligence(p_payload jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_run_id uuid := (p_payload->>'batch_run_id')::uuid;
  v_company_id uuid := (p_payload->>'company_id')::uuid;
  v_claimed_at timestamptz := (p_payload->>'batch_claimed_at')::timestamptz;
  v_enrichment_id uuid := nullif(p_payload->>'enrichment_id', '')::uuid;
  v_qualification_id uuid := nullif(p_payload->>'qualification_id', '')::uuid;
begin
  perform public.ap_batch_lock_claim(
    v_run_id,
    v_company_id,
    v_claimed_at
  );

  if v_enrichment_id is not null then
    perform 1
    from public.ap_enrichments e
    where e.id = v_enrichment_id
      and e.batch_run_id = v_run_id
      and e.company_id = v_company_id
      and e.batch_claimed_at = v_claimed_at
    for share;

    if not found then
      raise exception 'claim de batch do enriquecimento nao corresponde ao lease atual';
    end if;
  end if;

  if v_qualification_id is not null then
    perform 1
    from public.ap_qualifications q
    where q.id = v_qualification_id
      and q.batch_run_id = v_run_id
      and q.company_id = v_company_id
      and q.batch_claimed_at = v_claimed_at
    for share;

    if not found then
      raise exception 'claim de batch da qualificacao nao corresponde ao lease atual';
    end if;
  end if;

  insert into public.ap_intelligence (
    company_id,
    enrichment_id,
    qualification_id,
    provider,
    model,
    status,
    error,
    priority,
    priority_reason,
    reasons,
    next_action,
    summary,
    recommended_services,
    ai_confidence,
    score_snapshot,
    potential_snapshot,
    confidence_snapshot,
    ai_response,
    ai_status,
    tokens_in,
    tokens_out,
    cost_estimate,
    analysis_version,
    batch_run_id,
    batch_claimed_at
  ) values (
    (p_payload->>'company_id')::uuid,
    nullif(p_payload->>'enrichment_id', '')::uuid,
    nullif(p_payload->>'qualification_id', '')::uuid,
    coalesce(p_payload->>'provider', ''),
    coalesce(p_payload->>'model', ''),
    coalesce(p_payload->>'status', 'Concluido'),
    coalesce(p_payload->>'error', ''),
    coalesce((p_payload->>'priority')::integer, 4),
    coalesce(p_payload->>'priority_reason', ''),
    coalesce(p_payload->'reasons', '[]'::jsonb),
    coalesce(p_payload->>'next_action', ''),
    coalesce(p_payload->>'summary', ''),
    coalesce(p_payload->'recommended_services', '[]'::jsonb),
    coalesce(p_payload->>'ai_confidence', ''),
    coalesce((p_payload->>'score_snapshot')::integer, 0),
    coalesce(p_payload->>'potential_snapshot', ''),
    coalesce(p_payload->>'confidence_snapshot', ''),
    p_payload->'ai_response',
    coalesce(p_payload->>'ai_status', 'deterministico'),
    coalesce((p_payload->>'tokens_in')::integer, 0),
    coalesce((p_payload->>'tokens_out')::integer, 0),
    coalesce((p_payload->>'cost_estimate')::numeric, 0),
    coalesce(p_payload->>'analysis_version', 'intelligence-v1'),
    (p_payload->>'batch_run_id')::uuid,
    (p_payload->>'batch_claimed_at')::timestamptz
  )
  on conflict (batch_run_id, company_id)
  do update set
    enrichment_id = excluded.enrichment_id,
    qualification_id = excluded.qualification_id,
    provider = excluded.provider,
    model = excluded.model,
    status = excluded.status,
    error = excluded.error,
    priority = excluded.priority,
    priority_reason = excluded.priority_reason,
    reasons = excluded.reasons,
    next_action = excluded.next_action,
    summary = excluded.summary,
    recommended_services = excluded.recommended_services,
    ai_confidence = excluded.ai_confidence,
    score_snapshot = excluded.score_snapshot,
    potential_snapshot = excluded.potential_snapshot,
    confidence_snapshot = excluded.confidence_snapshot,
    ai_response = excluded.ai_response,
    ai_status = excluded.ai_status,
    tokens_in = excluded.tokens_in,
    tokens_out = excluded.tokens_out,
    cost_estimate = excluded.cost_estimate,
    analysis_version = excluded.analysis_version,
    batch_claimed_at = excluded.batch_claimed_at
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.ap_batch_validate_evidence_claim()
returns trigger
language plpgsql
as $$
declare
  v_batch_run_id uuid;
  v_company_id uuid;
  v_claimed_at timestamptz;
begin
  select e.batch_run_id, e.company_id, e.batch_claimed_at
  into v_batch_run_id, v_company_id, v_claimed_at
  from public.ap_enrichments e
  where e.id = new.enrichment_id;

  if v_batch_run_id is null then
    if new.batch_claimed_at is not null then
      raise exception 'claim de batch da evidencia informado sem batch';
    end if;
    return new;
  end if;

  if new.batch_claimed_at is null
     or v_claimed_at is null
     or new.batch_claimed_at <> v_claimed_at then
    raise exception 'claim de batch da evidencia ausente, cancelado ou expirado';
  end if;

  perform 1
  from public.ap_batch_runs br
  where br.id = v_batch_run_id
    and br.status in ('pendente', 'processando', 'pausado')
  for share;

  if not found then
    raise exception 'claim de batch da evidencia ausente, cancelado ou expirado';
  end if;

  perform 1
  from public.ap_batch_company_runs bcr
  where bcr.batch_run_id = v_batch_run_id
    and bcr.company_id = v_company_id
    and bcr.status = 'processando'
    and bcr.claimed_at = new.batch_claimed_at
    and bcr.claimed_at > clock_timestamp() - interval '5 minutes'
  for share;

  if not found then
    raise exception 'claim de batch da evidencia ausente, cancelado ou expirado';
  end if;

  -- Valida novamente o pai depois de adquirir run -> item, a mesma ordem
  -- usada por claim, cancelamento e os RPCs de artefato.
  perform 1
  from public.ap_enrichments e
  where e.id = new.enrichment_id
    and e.batch_run_id = v_batch_run_id
    and e.company_id = v_company_id
    and e.batch_claimed_at = new.batch_claimed_at
  for share;

  if not found then
    raise exception 'claim de batch da evidencia ausente, cancelado ou expirado';
  end if;

  return new;
end;
$$;

create trigger validate_batch_claim
  before insert or update on public.ap_enrichment_evidences
  for each row execute function public.ap_batch_validate_evidence_claim();

-- Substitui o conjunto de evidencias da tentativa anterior. A exclusao e a
-- insercao usam o mesmo fencing token e acontecem na mesma transacao.
create or replace function public.ap_batch_replace_evidences(
  p_enrichment_id uuid,
  p_claimed_at timestamptz,
  p_evidences jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_batch_run_id uuid;
  v_company_id uuid;
begin
  select e.batch_run_id, e.company_id
  into v_batch_run_id, v_company_id
  from public.ap_enrichments e
  where e.id = p_enrichment_id
    and e.batch_claimed_at = p_claimed_at;

  if not found then
    raise exception 'claim de batch da evidencia ausente, cancelado ou expirado';
  end if;

  perform 1
  from public.ap_batch_runs br
  where br.id = v_batch_run_id
    and br.status in ('pendente', 'processando', 'pausado')
  for share;

  if not found then
    raise exception 'claim de batch da evidencia ausente, cancelado ou expirado';
  end if;

  perform 1
  from public.ap_batch_company_runs bcr
  where bcr.batch_run_id = v_batch_run_id
    and bcr.company_id = v_company_id
    and bcr.status = 'processando'
    and bcr.claimed_at = p_claimed_at
    and bcr.claimed_at > clock_timestamp() - interval '5 minutes'
  for share;

  if not found then
    raise exception 'claim de batch da evidencia ausente, cancelado ou expirado';
  end if;

  -- Serializa repeticoes concorrentes da mesma substituicao.
  perform pg_advisory_xact_lock(hashtextextended(p_enrichment_id::text, 0));

  delete from public.ap_enrichment_evidences
  where enrichment_id = p_enrichment_id;

  insert into public.ap_enrichment_evidences (
    enrichment_id,
    kind,
    label,
    text,
    source_url,
    collected_at,
    batch_claimed_at
  )
  select
    p_enrichment_id,
    evidence.kind,
    evidence.label,
    evidence.text,
    evidence.source_url,
    coalesce(min(evidence.collected_at), clock_timestamp()),
    p_claimed_at
  from jsonb_to_recordset(coalesce(p_evidences, '[]'::jsonb)) as evidence(
    enrichment_id uuid,
    kind text,
    label text,
    text text,
    source_url text,
    collected_at timestamptz,
    batch_claimed_at timestamptz
  )
  group by evidence.kind, evidence.label, evidence.text, evidence.source_url;
end;
$$;

-- ON DELETE SET NULL de ap_batch_runs tambem remove o token das evidencias.
create or replace function public.ap_batch_clear_evidence_claim()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.batch_run_id is not null and new.batch_run_id is null then
    update public.ap_enrichment_evidences
    set batch_claimed_at = null
    where enrichment_id = new.id
      and batch_claimed_at is not null;
  elsif new.batch_run_id is not null
        and old.batch_claimed_at is distinct from new.batch_claimed_at then
    delete from public.ap_enrichment_evidences
    where enrichment_id = new.id;
  end if;
  return new;
end;
$$;

create trigger clear_evidence_batch_claim
  after update of batch_run_id, batch_claimed_at on public.ap_enrichments
  for each row execute function public.ap_batch_clear_evidence_claim();

-- Finalizacao/reagendamento atomicos com hard fencing no relogio do banco.
create or replace function public.ap_batch_finish_company(
  p_run_id uuid,
  p_company_id uuid,
  p_claimed_at timestamptz,
  p_status text,
  p_error_code text,
  p_error_message text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_changed integer;
begin
  if p_status not in ('concluida', 'sem_dados', 'falha') then
    raise exception 'status terminal de empresa invalido'
      using errcode = '22023';
  end if;

  perform 1
  from public.ap_batch_runs br
  where br.id = p_run_id
    and br.status in ('pendente', 'processando', 'pausado')
  for update;

  if not found then
    return false;
  end if;

  update public.ap_batch_company_runs bcr
  set status = p_status,
      next_retry_at = null,
      error_code = coalesce(p_error_code, ''),
      error_message = coalesce(p_error_message, '')
  where bcr.batch_run_id = p_run_id
    and bcr.company_id = p_company_id
    and bcr.status = 'processando'
    and bcr.claimed_at = p_claimed_at
    and bcr.claimed_at > clock_timestamp() - interval '5 minutes';

  get diagnostics v_changed = row_count;
  if v_changed = 0 then
    return false;
  end if;

  perform public.ap_batch_refresh_run_counters(p_run_id);
  return true;
end;
$$;

create or replace function public.ap_batch_defer_company(
  p_run_id uuid,
  p_company_id uuid,
  p_claimed_at timestamptz,
  p_retry_count integer,
  p_next_retry_at timestamptz,
  p_error_code text,
  p_error_message text
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_changed integer;
begin
  perform 1
  from public.ap_batch_runs br
  where br.id = p_run_id
    and br.status in ('pendente', 'processando', 'pausado')
  for update;

  if not found then
    return false;
  end if;

  update public.ap_batch_company_runs bcr
  set status = 'pendente',
      claimed_at = null,
      retry_count = p_retry_count,
      next_retry_at = p_next_retry_at,
      error_code = coalesce(p_error_code, ''),
      error_message = coalesce(p_error_message, '')
  where bcr.batch_run_id = p_run_id
    and bcr.company_id = p_company_id
    and bcr.status = 'processando'
    and bcr.claimed_at = p_claimed_at
    and bcr.claimed_at > clock_timestamp() - interval '5 minutes';

  get diagnostics v_changed = row_count;
  if v_changed = 0 then
    return false;
  end if;

  perform public.ap_batch_refresh_run_counters(p_run_id);
  return true;
end;
$$;

-- 4. Timestamps do run no relogio do banco ---------------------

create or replace function public.ap_batch_set_run_timestamps()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'pendente'
     and new.status = 'processando'
     and new.started_at is null then
    new.started_at = now();
  end if;

  if old.status not in ('concluido', 'cancelado')
     and new.status in ('concluido', 'cancelado')
     and new.finished_at is null then
    new.finished_at = now();
  end if;

  return new;
end;
$$;

create trigger set_run_timestamps
  before update on public.ap_batch_runs
  for each row execute function public.ap_batch_set_run_timestamps();

create or replace function public.ap_batch_set_run_status(
  p_run_id uuid,
  p_status text,
  p_expected_statuses text[]
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_changed integer;
begin
  if p_status not in ('pendente', 'processando', 'pausado') then
    raise exception 'transicao de run invalida'
      using errcode = '22023';
  end if;

  update public.ap_batch_runs
  set status = p_status
  where id = p_run_id
    and (
      coalesce(cardinality(p_expected_statuses), 0) = 0
      or status = any(p_expected_statuses)
    )
    and (
      (status = 'pendente' and p_status in ('processando', 'pausado'))
      or (status = 'processando' and p_status = 'pausado')
      or (status = 'pausado' and p_status = 'pendente')
    );

  get diagnostics v_changed = row_count;
  return v_changed = 1;
end;
$$;

-- 5. Contadores serializados por run ---------------------------

create or replace function public.ap_batch_refresh_run_counters(p_run_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_total integer;
  v_pending integer;
  v_processing integer;
  v_completed integer;
  v_failed integer;
  v_without_data integer;
  v_cancelled integer;
begin
  -- Serializa refreshes concorrentes do mesmo run.
  perform 1
  from public.ap_batch_runs
  where id = p_run_id
  for update;

  if not found then
    return null;
  end if;

  select
    count(*)::integer,
    count(*) filter (where status = 'pendente')::integer,
    count(*) filter (where status = 'processando')::integer,
    count(*) filter (where status = 'concluida')::integer,
    count(*) filter (where status = 'falha')::integer,
    count(*) filter (where status = 'sem_dados')::integer,
    count(*) filter (where status = 'cancelada')::integer
  into
    v_total,
    v_pending,
    v_processing,
    v_completed,
    v_failed,
    v_without_data,
    v_cancelled
  from public.ap_batch_company_runs
  where batch_run_id = p_run_id;

  update public.ap_batch_runs
  set total = v_total,
      pending = v_pending,
      processing = v_processing,
      completed = v_completed,
      failed = v_failed,
      without_data = v_without_data,
      cancelled = v_cancelled
  where id = p_run_id;

  return jsonb_build_object(
    'total', v_total,
    'pending', v_pending,
    'processing', v_processing,
    'completed', v_completed,
    'failed', v_failed,
    'withoutData', v_without_data,
    'cancelled', v_cancelled
  );
end;
$$;

-- 6. Conclusao e cancelamento atomicos -------------------------

create or replace function public.ap_batch_finish_run(p_run_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  perform 1
  from public.ap_batch_runs br
  where br.id = p_run_id
    and br.status in ('pendente', 'processando')
  for update;

  if not found or exists (
    select 1
    from public.ap_batch_company_runs bcr
    where bcr.batch_run_id = p_run_id
      and bcr.status in ('pendente', 'processando')
  ) then
    return false;
  end if;

  perform public.ap_batch_refresh_run_counters(p_run_id);

  update public.ap_batch_runs
  set status = 'concluido',
      finished_at = now()
  where id = p_run_id;

  return true;
end;
$$;

create or replace function public.ap_batch_cancel_run(p_run_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_changed integer;
  v_total integer;
  v_completed integer;
  v_failed integer;
  v_without_data integer;
  v_cancelled integer;
begin
  update public.ap_batch_runs
  set status = 'cancelado',
      finished_at = now()
  where id = p_run_id
    and status in ('pendente', 'processando', 'pausado');

  get diagnostics v_changed = row_count;
  if v_changed = 0 then
    return false;
  end if;

  update public.ap_batch_company_runs
  set status = 'cancelada',
      claimed_at = null,
      next_retry_at = null
  where batch_run_id = p_run_id
    and status in ('pendente', 'processando');

  select
    count(*)::integer,
    count(*) filter (where status = 'concluida')::integer,
    count(*) filter (where status = 'falha')::integer,
    count(*) filter (where status = 'sem_dados')::integer,
    count(*) filter (where status = 'cancelada')::integer
  into v_total, v_completed, v_failed, v_without_data, v_cancelled
  from public.ap_batch_company_runs
  where batch_run_id = p_run_id;

  update public.ap_batch_runs
  set total = v_total,
      pending = 0,
      processing = 0,
      completed = v_completed,
      failed = v_failed,
      without_data = v_without_data,
      cancelled = v_cancelled
  where id = p_run_id;

  return true;
end;
$$;

-- O lote e a fila nao sao legiveis por clientes anonimos/autenticados. Toda
-- leitura e escrita de batch ocorre via service_role (rotas Node com bearer de
-- operador); artefatos manuais (batch_run_id null) continuam seguindo as
-- policies preexistentes das Etapas 4-5.
drop policy "all_anon" on public.ap_batch_runs;
drop policy "all_anon" on public.ap_batch_company_runs;

drop policy if exists "read_anon" on public.ap_batch_runs;
drop policy if exists "read_anon" on public.ap_batch_company_runs;

revoke insert, update, delete on public.ap_batch_runs
  from anon, authenticated;
revoke insert, update, delete on public.ap_batch_company_runs
  from anon, authenticated;

revoke select on public.ap_batch_runs
  from anon, authenticated;
revoke select on public.ap_batch_company_runs
  from anon, authenticated;

drop policy "all_anon" on public.ap_enrichments;
drop policy "all_anon" on public.ap_enrichment_evidences;
drop policy "all_anon" on public.ap_qualifications;
drop policy "all_anon" on public.ap_intelligence;

create policy "read_anon" on public.ap_enrichments
  for select using (true);
create policy "write_manual_anon" on public.ap_enrichments
  for insert with check (batch_run_id is null and batch_claimed_at is null);
create policy "update_manual_anon" on public.ap_enrichments
  for update using (batch_run_id is null)
  with check (batch_run_id is null and batch_claimed_at is null);
create policy "delete_manual_anon" on public.ap_enrichments
  for delete using (batch_run_id is null);

create policy "read_anon" on public.ap_qualifications
  for select using (true);
create policy "write_manual_anon" on public.ap_qualifications
  for insert with check (batch_run_id is null and batch_claimed_at is null);
create policy "update_manual_anon" on public.ap_qualifications
  for update using (batch_run_id is null)
  with check (batch_run_id is null and batch_claimed_at is null);
create policy "delete_manual_anon" on public.ap_qualifications
  for delete using (batch_run_id is null);

create policy "read_anon" on public.ap_intelligence
  for select using (true);
create policy "write_manual_anon" on public.ap_intelligence
  for insert with check (batch_run_id is null and batch_claimed_at is null);
create policy "update_manual_anon" on public.ap_intelligence
  for update using (batch_run_id is null)
  with check (batch_run_id is null and batch_claimed_at is null);
create policy "delete_manual_anon" on public.ap_intelligence
  for delete using (batch_run_id is null);

create policy "read_anon" on public.ap_enrichment_evidences
  for select using (true);
create policy "write_manual_anon" on public.ap_enrichment_evidences
  for insert with check (
    batch_claimed_at is null
    and exists (
      select 1
      from public.ap_enrichments e
      where e.id = enrichment_id
        and e.batch_run_id is null
    )
  );
create policy "update_manual_anon" on public.ap_enrichment_evidences
  for update using (
    batch_claimed_at is null
    and exists (
      select 1
      from public.ap_enrichments e
      where e.id = enrichment_id
        and e.batch_run_id is null
    )
  )
  with check (
    batch_claimed_at is null
    and exists (
      select 1
      from public.ap_enrichments e
      where e.id = enrichment_id
        and e.batch_run_id is null
    )
  );
create policy "delete_manual_anon" on public.ap_enrichment_evidences
  for delete using (
    batch_claimed_at is null
    and exists (
      select 1
      from public.ap_enrichments e
      where e.id = enrichment_id
        and e.batch_run_id is null
    )
  );

revoke execute on function public.ap_batch_lock_claim(uuid, uuid, timestamptz) from public;
revoke execute on function public.ap_batch_validate_artifact_claim() from public;
revoke execute on function public.ap_batch_validate_evidence_claim() from public;
revoke execute on function public.ap_batch_clear_evidence_claim() from public;
revoke execute on function public.ap_batch_set_run_timestamps() from public;

revoke execute on function public.ap_batch_lock_claim(uuid, uuid, timestamptz) from anon, authenticated;
revoke execute on function public.ap_batch_validate_artifact_claim() from anon, authenticated;
revoke execute on function public.ap_batch_validate_evidence_claim() from anon, authenticated;
revoke execute on function public.ap_batch_clear_evidence_claim() from anon, authenticated;
revoke execute on function public.ap_batch_set_run_timestamps() from anon, authenticated;

revoke execute on function public.ap_batch_create_run(uuid, uuid, jsonb, uuid[]) from public;
revoke execute on function public.ap_batch_claim_next(uuid) from public;
revoke execute on function public.ap_batch_claim_version() from public;
revoke execute on function public.ap_batch_upsert_enrichment(jsonb) from public;
revoke execute on function public.ap_batch_upsert_qualification(jsonb) from public;
revoke execute on function public.ap_batch_upsert_intelligence(jsonb) from public;
revoke execute on function public.ap_batch_replace_evidences(uuid, timestamptz, jsonb) from public;
revoke execute on function public.ap_batch_finish_company(uuid, uuid, timestamptz, text, text, text) from public;
revoke execute on function public.ap_batch_defer_company(uuid, uuid, timestamptz, integer, timestamptz, text, text) from public;
revoke execute on function public.ap_batch_set_run_status(uuid, text, text[]) from public;
revoke execute on function public.ap_batch_refresh_run_counters(uuid) from public;
revoke execute on function public.ap_batch_finish_run(uuid) from public;
revoke execute on function public.ap_batch_cancel_run(uuid) from public;

revoke execute on function public.ap_batch_create_run(uuid, uuid, jsonb, uuid[]) from anon, authenticated;
revoke execute on function public.ap_batch_claim_next(uuid) from anon, authenticated;
revoke execute on function public.ap_batch_claim_version() from anon, authenticated;
revoke execute on function public.ap_batch_upsert_enrichment(jsonb) from anon, authenticated;
revoke execute on function public.ap_batch_upsert_qualification(jsonb) from anon, authenticated;
revoke execute on function public.ap_batch_upsert_intelligence(jsonb) from anon, authenticated;
revoke execute on function public.ap_batch_replace_evidences(uuid, timestamptz, jsonb) from anon, authenticated;
revoke execute on function public.ap_batch_finish_company(uuid, uuid, timestamptz, text, text, text) from anon, authenticated;
revoke execute on function public.ap_batch_defer_company(uuid, uuid, timestamptz, integer, timestamptz, text, text) from anon, authenticated;
revoke execute on function public.ap_batch_set_run_status(uuid, text, text[]) from anon, authenticated;
revoke execute on function public.ap_batch_refresh_run_counters(uuid) from anon, authenticated;
revoke execute on function public.ap_batch_finish_run(uuid) from anon, authenticated;
revoke execute on function public.ap_batch_cancel_run(uuid) from anon, authenticated;

grant execute on function public.ap_batch_create_run(uuid, uuid, jsonb, uuid[]) to service_role;
grant execute on function public.ap_batch_claim_next(uuid) to service_role;
grant execute on function public.ap_batch_claim_version() to service_role;
grant execute on function public.ap_batch_upsert_enrichment(jsonb) to service_role;
grant execute on function public.ap_batch_upsert_qualification(jsonb) to service_role;
grant execute on function public.ap_batch_upsert_intelligence(jsonb) to service_role;
grant execute on function public.ap_batch_replace_evidences(uuid, timestamptz, jsonb) to service_role;
grant execute on function public.ap_batch_finish_company(uuid, uuid, timestamptz, text, text, text) to service_role;
grant execute on function public.ap_batch_defer_company(uuid, uuid, timestamptz, integer, timestamptz, text, text) to service_role;
grant execute on function public.ap_batch_set_run_status(uuid, text, text[]) to service_role;
grant execute on function public.ap_batch_refresh_run_counters(uuid) to service_role;
grant execute on function public.ap_batch_finish_run(uuid) to service_role;
grant execute on function public.ap_batch_cancel_run(uuid) to service_role;
