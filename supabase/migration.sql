-- ============================================================
-- AME Control - Supabase Migration Script
-- Alves Mobilidade Executiva
-- ============================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 2. ENUM TYPES
-- ============================================================

create type lead_type as enum (
  'Aeroporto', 'Empresa', 'Hotel', 'Evento', 'Indicação', 'Cliente antigo', 'Outro'
);

create type lead_status as enum (
  'Novo contato', 'Apresentação enviada', 'Respondeu',
  'Orçamento enviado', 'Negociação', 'Fechou',
  'Pós-atendimento', 'Arquivado'
);

create type trip_status as enum (
  'Agendada', 'Concluída', 'Cancelada'
);

create type referral_status as enum (
  'Indicado', 'Transfer realizado', 'Transfer creditado'
);

create type finance_type as enum (
  'Entrada', 'Saída'
);

create type proposal_status as enum (
  'Rascunho', 'Enviada', 'Aceita', 'Convertida', 'Recusada'
);

-- ============================================================
-- 3. TABLES
-- ============================================================

-- 3.1 Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  phone text,
  role text not null default 'admin' check (role in ('admin', 'operator', 'driver', 'viewer')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.2 Leads / Clients (CRM)
create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text not null default '',
  type lead_type not null default 'Aeroporto',
  origin text not null default '',
  status lead_status not null default 'Novo contato',
  notes text not null default '',
  next_action text not null default '',
  next_date date,
  last_contact timestamptz,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.3 Trips
create table public.trips (
  id uuid primary key default uuid_generate_v4(),
  client text not null,
  phone text not null default '',
  date date not null,
  time time not null,
  route text not null,
  value numeric(10,2) not null default 0,
  status trip_status not null default 'Agendada',
  lead_id uuid references public.leads(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  -- AME Vision fields
  driver_name text,
  driver_phone text,
  vehicle_model text,
  vehicle_plate text,
  origin_address text,
  destination_address text,
  passenger_count integer default 1,
  luggage_count integer default 0,
  language text default 'pt-BR',
  notes text,
  qr_code text,
  welcome_message text,
  tablet_content jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.4 Referrals (Programa de Indicação)
create table public.referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer text not null,
  referred text not null,
  status referral_status not null default 'Indicado',
  credits integer not null default 0,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.5 Finance Entries
create table public.finance_entries (
  id uuid primary key default uuid_generate_v4(),
  description text not null,
  value numeric(10,2) not null default 0,
  type finance_type not null default 'Entrada',
  date date not null default now(),
  trip_id uuid references public.trips(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.6 Proposals
create table public.proposals (
  id uuid primary key default uuid_generate_v4(),
  client text not null,
  phone text not null default '',
  origin text not null default '',
  destination text not null default '',
  date date,
  time time,
  km numeric(10,2) not null default 0,
  passengers integer not null default 1,
  bags integer not null default 0,
  value numeric(10,2) not null default 0,
  status proposal_status not null default 'Rascunho',
  valid_until date,
  message text not null default '',
  lead_id uuid references public.leads(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.7 Marketing Tasks
create table public.marketing_tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  url text not null default '',
  completed boolean not null default false,
  completed_at timestamptz,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.8 Settings (user preferences)
create table public.settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, key)
);

-- 3.9 AME Vision State (sync entre AME Control e tablet de bordo)
create table public.ame_vision_state (
  id text primary key default 'main',
  status text not null default 'idle' check (status in ('idle', 'prepared', 'running', 'completed')),
  trip jsonb,
  started_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 3.10 Audit Log
create table public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4. INDEXES
-- ============================================================

create index idx_leads_status on public.leads(status);
create index idx_leads_type on public.leads(type);
create index idx_leads_next_date on public.leads(next_date);
create index idx_leads_user_id on public.leads(user_id);
create index idx_leads_name on public.leads using gin(to_tsvector('portuguese', name));
create index idx_leads_phone on public.leads(phone);
create index idx_leads_created_at on public.leads(created_at desc);

create index idx_trips_date on public.trips(date);
create index idx_trips_status on public.trips(status);
create index idx_trips_lead_id on public.trips(lead_id);
create index idx_trips_user_id on public.trips(user_id);
create index idx_trips_client on public.trips(client);

create index idx_referrals_status on public.referrals(status);
create index idx_referrals_referrer on public.referrals(referrer);

create index idx_finance_date on public.finance_entries(date);
create index idx_finance_type on public.finance_entries(type);
create index idx_finance_trip_id on public.finance_entries(trip_id);

create index idx_proposals_status on public.proposals(status);
create index idx_proposals_lead_id on public.proposals(lead_id);
create index idx_proposals_created_at on public.proposals(created_at desc);

create index idx_marketing_completed on public.marketing_tasks(completed);
create index idx_audit_log_created_at on public.audit_log(created_at desc);

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.trips enable row level security;
alter table public.referrals enable row level security;
alter table public.finance_entries enable row level security;
alter table public.proposals enable row level security;
alter table public.marketing_tasks enable row level security;
alter table public.settings enable row level security;
alter table public.ame_vision_state enable row level security;
alter table public.audit_log enable row level security;

-- 5.1 Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 5.2 Leads policies
create policy "Authenticated users can view leads"
  on public.leads for select
  to authenticated
  using (true);

create policy "Authenticated users can insert leads"
  on public.leads for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update leads"
  on public.leads for update
  to authenticated
  using (true);

create policy "Authenticated users can delete leads"
  on public.leads for delete
  to authenticated
  using (true);

-- 5.3 Trips policies
create policy "Authenticated users can view trips"
  on public.trips for select
  to authenticated
  using (true);

create policy "Authenticated users can insert trips"
  on public.trips for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update trips"
  on public.trips for update
  to authenticated
  using (true);

create policy "Authenticated users can delete trips"
  on public.trips for delete
  to authenticated
  using (true);

-- 5.4 Referrals policies
create policy "Authenticated users can view referrals"
  on public.referrals for select
  to authenticated
  using (true);

create policy "Authenticated users can manage referrals"
  on public.referrals for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update referrals"
  on public.referrals for update
  to authenticated
  using (true);

create policy "Authenticated users can delete referrals"
  on public.referrals for delete
  to authenticated
  using (true);

-- 5.5 Finance entries policies
create policy "Authenticated users can view finance"
  on public.finance_entries for select
  to authenticated
  using (true);

create policy "Authenticated users can manage finance"
  on public.finance_entries for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update finance"
  on public.finance_entries for update
  to authenticated
  using (true);

create policy "Authenticated users can delete finance"
  on public.finance_entries for delete
  to authenticated
  using (true);

-- 5.6 Proposals policies
create policy "Authenticated users can view proposals"
  on public.proposals for select
  to authenticated
  using (true);

create policy "Authenticated users can manage proposals"
  on public.proposals for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update proposals"
  on public.proposals for update
  to authenticated
  using (true);

create policy "Authenticated users can delete proposals"
  on public.proposals for delete
  to authenticated
  using (true);

-- 5.7 Marketing tasks policies
create policy "Authenticated users can view marketing tasks"
  on public.marketing_tasks for select
  to authenticated
  using (true);

create policy "Authenticated users can manage marketing tasks"
  on public.marketing_tasks for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update marketing tasks"
  on public.marketing_tasks for update
  to authenticated
  using (true);

-- 5.8 Settings policies
create policy "Users can manage own settings"
  on public.settings for all
  using (auth.uid() = user_id);

-- 5.9 AME Vision State policies
create policy "Authenticated users can view vision state"
  on public.ame_vision_state for select
  to authenticated
  using (true);

create policy "Authenticated users can upsert vision state"
  on public.ame_vision_state for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update vision state"
  on public.ame_vision_state for update
  to authenticated
  using (true);

-- 5.10 Audit log policies (insert only for regular users, select for admins)
create policy "System can insert audit log"
  on public.audit_log for insert
  to authenticated
  with check (true);

create policy "Admins can view audit log"
  on public.audit_log for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- 6. TRIGGERS (updated_at)
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.leads
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.trips
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.referrals
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.finance_entries
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.proposals
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.marketing_tasks
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.settings
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.ame_vision_state
  for each row execute function public.handle_updated_at();

-- ============================================================
-- 7. AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 8. STORAGE BUCKET
-- ============================================================

insert into storage.buckets (id, name, public) values ('attachments', 'attachments', true);
insert into storage.buckets (id, name, public) values ('proposals', 'proposals', true);
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

create policy "Authenticated users can upload files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('attachments', 'proposals', 'avatars'));

create policy "Anyone can view files"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('attachments', 'proposals', 'avatars'));

create policy "Owners can delete their files"
  on storage.objects for delete
  to authenticated
  using (auth.uid() = owner);
