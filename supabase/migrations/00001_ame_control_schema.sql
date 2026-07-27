-- ============================================================
-- AME Control — Database Schema
-- Sprint 2.1: Modelo Conceitual Definitivo v2.0
-- ============================================================
-- Generates: UUIDs via gen_random_uuid()
-- Constraints: CHECK, UNIQUE, FK ON DELETE SET NULL
-- Indexes: performance + business queries
-- Triggers: updated_at auto-update
-- ENUMs: where values are truly fixed
-- RLS: row-level security prepared for auth.users + profiles
-- ============================================================

-- 0. Extensions -------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. ENUMs -------------------------------------------------------

CREATE TYPE trip_status AS ENUM (
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE finance_type AS ENUM (
  'Entrada',
  'Saída'
);

CREATE TYPE message_direction AS ENUM (
  'inbound',
  'outbound'
);

CREATE TYPE conversation_channel AS ENUM (
  'whatsapp',
  'phone',
  'email'
);

CREATE TYPE content_type AS ENUM (
  'video',
  'image',
  'pdf',
  'text'
);

-- 2. Tables ------------------------------------------------------

-- 2.1 profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'operator', 'finance', 'driver')),
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 2.2 companies
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cnpj TEXT UNIQUE,
  address TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 2.3 company_settings
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1a56db',
  secondary_color TEXT NOT NULL DEFAULT '#3b82f6',
  accent_color TEXT NOT NULL DEFAULT '#1e40af',
  whatsapp_number TEXT NOT NULL,
  email TEXT,
  website TEXT,
  address TEXT,
  default_language TEXT NOT NULL DEFAULT 'pt-BR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Singleton: at most one active configuration
CREATE UNIQUE INDEX idx_company_settings_singleton
  ON company_settings((true))
  WHERE is_active;

-- 2.4 contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN (
    'Aeroporto', 'Empresa', 'Hotel', 'Evento',
    'Indicação', 'Cliente antigo', 'Outro'
  )),
  origin TEXT NOT NULL,
  lead_status TEXT CHECK (lead_status IN (
    'Novo contato', 'Apresentação enviada', 'Respondeu',
    'Orçamento enviado', 'Negociação', 'Fechou',
    'Pós-atendimento', 'Arquivado'
  )),
  next_action TEXT,
  next_date DATE,
  notes TEXT,
  last_contact TIMESTAMPTZ,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  whatsapp_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- 2.5 drivers
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  cpf TEXT UNIQUE,
  birth_date DATE,
  address TEXT,
  cnh TEXT,
  cnh_category TEXT,
  photo_url TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'Disponível' CHECK (status IN ('Disponível', 'Em viagem', 'Folga', 'Inativo')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 2.6 vehicles
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  color TEXT,
  renavam TEXT UNIQUE,
  chassis TEXT UNIQUE,
  capacity INTEGER NOT NULL,
  has_ac BOOLEAN NOT NULL DEFAULT true,
  has_wifi BOOLEAN NOT NULL DEFAULT false,
  has_tablet BOOLEAN NOT NULL DEFAULT false,
  insurance_expire_date DATE,
  inspection_date DATE,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'Disponível' CHECK (status IN ('Disponível', 'Em viagem', 'Manutenção', 'Inativo')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 2.7 pricing_rules
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  origin TEXT,
  destination TEXT,
  min_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_km NUMERIC(10,2),
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_per_km NUMERIC(10,2) NOT NULL,
  round_to INTEGER NOT NULL DEFAULT 10,
  max_passengers INTEGER NOT NULL DEFAULT 4,
  max_bags INTEGER NOT NULL DEFAULT 4,
  priority INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 2.8 proposals
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  date DATE,
  time TIME,
  km NUMERIC(10,2) NOT NULL,
  passengers INTEGER NOT NULL,
  bags INTEGER NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'Rascunho' CHECK (status IN ('Rascunho', 'Enviada', 'Aceita', 'Convertida', 'Recusada')),
  valid_until DATE NOT NULL,
  message TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- 2.9 trips
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  pricing_rule_id UUID REFERENCES pricing_rules(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  passengers INTEGER NOT NULL DEFAULT 1,
  value NUMERIC(10,2) NOT NULL,
  status trip_status NOT NULL DEFAULT 'scheduled',
  confirmed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  notes TEXT,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  welcome_message TEXT,
  access_code TEXT UNIQUE,
  id_code TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- 2.10 trip_reviews
CREATE TABLE trip_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL UNIQUE REFERENCES trips(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.11 trip_contents
CREATE TABLE trip_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  type content_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.12 finance_categories
CREATE TABLE finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Entrada', 'Saída', 'Ambos')),
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.13 finance_entries
CREATE TABLE finance_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES finance_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  type finance_type NOT NULL,
  date DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('Pix', 'Dinheiro', 'Cartão', 'Débito', 'Boleto', 'Outro')),
  payment_status TEXT DEFAULT 'Pendente' CHECK (payment_status IN ('Pendente', 'Recebido', 'Cancelado')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- 2.14 referrals
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  referred_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  referrer_name TEXT NOT NULL,
  referred_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Indicado' CHECK (status IN ('Indicado', 'Transfer realizado', 'Transfer creditado')),
  credits INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 2.15 marketing_tasks
CREATE TABLE marketing_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  url TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 2.16 conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  channel conversation_channel NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  last_message_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 2.17 messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction message_direction NOT NULL,
  content TEXT NOT NULL,
  template_key TEXT CHECK (template_key IN (
    'apresentacao', 'indicacao', 'followup',
    'agradecimento', 'orcamento', 'confirmacao'
  )),
  media_url TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 2.18 follow_ups
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ NOT NULL,
  note TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- 2.19 lead_status_log
CREATE TABLE lead_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- 2.20 trip_status_log
CREATE TABLE trip_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_status trip_status,
  to_status trip_status NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.21 audit_log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes ----------------------------------------------------

-- 3.1 profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- 3.2 contacts
CREATE INDEX idx_contacts_lead_status_next_date
  ON contacts(lead_status, next_date)
  WHERE lead_status IS NOT NULL;
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_company ON contacts(company_id);
CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_name ON contacts(name);
CREATE INDEX idx_contacts_created_by ON contacts(created_by);

-- 3.3 companies
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_created_by ON companies(created_by);

-- 3.4 trips
CREATE INDEX idx_trips_date_status ON trips(date, status);
CREATE INDEX idx_trips_contact ON trips(contact_id);
CREATE INDEX idx_trips_driver_status_date ON trips(driver_id, status, date);
CREATE INDEX idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX idx_trips_access_code ON trips(access_code);
CREATE INDEX idx_trips_company ON trips(company_id);
CREATE INDEX idx_trips_proposal ON trips(proposal_id);
CREATE INDEX idx_trips_pricing_rule ON trips(pricing_rule_id);
CREATE INDEX idx_trips_created_by ON trips(created_by);
CREATE INDEX idx_trips_confirmed_at ON trips(confirmed_at);
CREATE INDEX idx_trips_completed_at ON trips(completed_at);

-- 3.5 proposals
CREATE INDEX idx_proposals_contact ON proposals(contact_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_valid_until ON proposals(valid_until);
CREATE INDEX idx_proposals_created_by ON proposals(created_by);

-- 3.6 pricing_rules
CREATE INDEX idx_pricing_rules_active_priority
  ON pricing_rules(priority)
  WHERE active;

-- 3.7 finance_entries
CREATE INDEX idx_finance_entries_date ON finance_entries(date);
CREATE INDEX idx_finance_entries_type ON finance_entries(type);
CREATE INDEX idx_finance_entries_trip ON finance_entries(trip_id);
CREATE INDEX idx_finance_entries_contact ON finance_entries(contact_id);
CREATE INDEX idx_finance_entries_category ON finance_entries(category_id);
CREATE INDEX idx_finance_entries_created_by ON finance_entries(created_by);

-- 3.8 referrals
CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- 3.9 marketing_tasks
CREATE INDEX idx_marketing_tasks_date ON marketing_tasks(date);
CREATE INDEX idx_marketing_tasks_completed ON marketing_tasks(completed);

-- 3.10 conversations
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at);

-- 3.11 messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);

-- 3.12 follow_ups
CREATE INDEX idx_follow_ups_contact ON follow_ups(contact_id);
CREATE INDEX idx_follow_ups_due_status ON follow_ups(due_at, status);
CREATE INDEX idx_follow_ups_status ON follow_ups(status);

-- 3.13 trip_reviews
CREATE INDEX idx_trip_reviews_rating ON trip_reviews(rating);
CREATE INDEX idx_trip_reviews_contact ON trip_reviews(contact_id);

-- 3.14 trip_contents
CREATE INDEX idx_trip_contents_trip_order ON trip_contents(trip_id, sort_order);

-- 3.15 trip_status_log
CREATE INDEX idx_trip_status_log_trip ON trip_status_log(trip_id);
CREATE INDEX idx_trip_status_log_changed_at ON trip_status_log(changed_at);

-- 3.16 lead_status_log
CREATE INDEX idx_lead_status_log_contact ON lead_status_log(contact_id);
CREATE INDEX idx_lead_status_log_changed_at ON lead_status_log(changed_at);

-- 3.17 audit_log
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);

-- 3.18 drivers
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_phone ON drivers(phone);

-- 3.19 vehicles
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_insurance ON vehicles(insurance_expire_date);

-- 4. updated_at triggers ----------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_finance_entries_updated_at
  BEFORE UPDATE ON finance_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_marketing_tasks_updated_at
  BEFORE UPDATE ON marketing_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_follow_ups_updated_at
  BEFORE UPDATE ON follow_ups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. RLS Policies -----------------------------------------------

-- 5.1 profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_admin_all"
  ON profiles FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.2 companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select_auth"
  ON companies FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "companies_insert_own"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "companies_update_own"
  ON companies FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "companies_delete_own"
  ON companies FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "companies_admin_all"
  ON companies FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.3 company_settings
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_settings_select_auth"
  ON company_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "company_settings_admin_all"
  ON company_settings FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.4 contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contacts_select_auth"
  ON contacts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "contacts_insert_own"
  ON contacts FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "contacts_update_own"
  ON contacts FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "contacts_delete_own"
  ON contacts FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "contacts_admin_all"
  ON contacts FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.5 drivers
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drivers_select_auth"
  ON drivers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "drivers_insert_own"
  ON drivers FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "drivers_update_own"
  ON drivers FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "drivers_delete_own"
  ON drivers FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "drivers_admin_all"
  ON drivers FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.6 vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vehicles_select_auth"
  ON vehicles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "vehicles_insert_own"
  ON vehicles FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "vehicles_update_own"
  ON vehicles FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "vehicles_delete_own"
  ON vehicles FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "vehicles_admin_all"
  ON vehicles FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.7 pricing_rules
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pricing_rules_select_auth"
  ON pricing_rules FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "pricing_rules_admin_all"
  ON pricing_rules FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.8 proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select_auth"
  ON proposals FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "proposals_insert_own"
  ON proposals FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "proposals_update_own"
  ON proposals FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "proposals_delete_own"
  ON proposals FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "proposals_admin_all"
  ON proposals FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.9 trips
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trips_select_auth"
  ON trips FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "trips_insert_own"
  ON trips FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "trips_update_own"
  ON trips FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "trips_delete_own"
  ON trips FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "trips_admin_all"
  ON trips FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.10 trip_reviews
ALTER TABLE trip_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_reviews_select_auth"
  ON trip_reviews FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "trip_reviews_insert_own"
  ON trip_reviews FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT created_by FROM trips WHERE id = trip_id));

CREATE POLICY "trip_reviews_admin_all"
  ON trip_reviews FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.11 trip_contents
ALTER TABLE trip_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_contents_select_auth"
  ON trip_contents FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "trip_contents_admin_all"
  ON trip_contents FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.12 finance_categories
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_categories_select_auth"
  ON finance_categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "finance_categories_admin_all"
  ON finance_categories FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.13 finance_entries
ALTER TABLE finance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "finance_entries_select_auth"
  ON finance_entries FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "finance_entries_insert_own"
  ON finance_entries FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "finance_entries_update_own"
  ON finance_entries FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "finance_entries_delete_own"
  ON finance_entries FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "finance_entries_admin_all"
  ON finance_entries FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.14 referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals_select_auth"
  ON referrals FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "referrals_insert_own"
  ON referrals FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "referrals_update_own"
  ON referrals FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "referrals_delete_own"
  ON referrals FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "referrals_admin_all"
  ON referrals FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.15 marketing_tasks
ALTER TABLE marketing_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_tasks_select_auth"
  ON marketing_tasks FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "marketing_tasks_admin_all"
  ON marketing_tasks FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.16 conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_auth"
  ON conversations FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "conversations_insert_own"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "conversations_update_own"
  ON conversations FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "conversations_admin_all"
  ON conversations FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.17 messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_auth"
  ON messages FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "messages_insert_own"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sent_by);

CREATE POLICY "messages_admin_all"
  ON messages FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.18 follow_ups
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "follow_ups_select_auth"
  ON follow_ups FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "follow_ups_insert_own"
  ON follow_ups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "follow_ups_update_own"
  ON follow_ups FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "follow_ups_admin_all"
  ON follow_ups FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.19 lead_status_log
ALTER TABLE lead_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_status_log_select_auth"
  ON lead_status_log FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "lead_status_log_insert_auth"
  ON lead_status_log FOR INSERT
  WITH CHECK (auth.uid() = changed_by);

CREATE POLICY "lead_status_log_admin_all"
  ON lead_status_log FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.20 trip_status_log
ALTER TABLE trip_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_status_log_select_auth"
  ON trip_status_log FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "trip_status_log_insert_auth"
  ON trip_status_log FOR INSERT
  WITH CHECK (auth.uid() = changed_by);

CREATE POLICY "trip_status_log_admin_all"
  ON trip_status_log FOR ALL
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'))
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- 5.21 audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_admin"
  ON audit_log FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "audit_log_insert_auth"
  ON audit_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- End of Schema
-- ============================================================
