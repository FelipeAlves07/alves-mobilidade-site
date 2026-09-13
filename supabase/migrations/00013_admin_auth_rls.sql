-- ============================================================
-- Migration 00013: Admin Authentication + Secure RLS
-- GATE P1: Autenticacao Administrativa + RLS Segura
-- ============================================================

-- 1. Admin users table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_users IS 'Usuarios autorizados a acessar o AME Control';

-- Allow authenticated users to read admin_users (for self-check)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select_own" ON public.admin_users;
CREATE POLICY "admin_users_select_own"
  ON public.admin_users FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Helper function: is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Returns true if the current authenticated user is in admin_users';

-- 3. Seed initial admin from BATCH_OPERATOR_USER_IDS env var
-- ============================================================
-- This is the user ID from .env.local BATCH_OPERATOR_USER_IDS
INSERT INTO public.admin_users (user_id, role)
VALUES ('b341c36c-c0e9-433d-b8a2-f55242435a40', 'super_admin')
ON CONFLICT (user_id) DO NOTHING;

-- 4. Drop ALL permissive anon policies
-- ============================================================

-- profiles
DROP POLICY IF EXISTS "profiles_all_anon" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

-- companies
DROP POLICY IF EXISTS "companies_all_anon" ON public.companies;
DROP POLICY IF EXISTS "companies_select_auth" ON public.companies;
DROP POLICY IF EXISTS "companies_insert_own" ON public.companies;
DROP POLICY IF EXISTS "companies_update_own" ON public.companies;
DROP POLICY IF EXISTS "companies_delete_own" ON public.companies;
DROP POLICY IF EXISTS "companies_admin_all" ON public.companies;

-- company_settings
DROP POLICY IF EXISTS "company_settings_all_anon" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_select_auth" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_admin_all" ON public.company_settings;

-- contacts (leads)
DROP POLICY IF EXISTS "contacts_all_anon" ON public.contacts;
DROP POLICY IF EXISTS "contacts_select_auth" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_own" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_own" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete_own" ON public.contacts;
DROP POLICY IF EXISTS "contacts_admin_all" ON public.contacts;

-- drivers
DROP POLICY IF EXISTS "drivers_all_anon" ON public.drivers;
DROP POLICY IF EXISTS "drivers_select_auth" ON public.drivers;
DROP POLICY IF EXISTS "drivers_insert_own" ON public.drivers;
DROP POLICY IF EXISTS "drivers_update_own" ON public.drivers;
DROP POLICY IF EXISTS "drivers_delete_own" ON public.drivers;
DROP POLICY IF EXISTS "drivers_admin_all" ON public.drivers;

-- vehicles
DROP POLICY IF EXISTS "vehicles_all_anon" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_select_auth" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_insert_own" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_update_own" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_delete_own" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_admin_all" ON public.vehicles;

-- pricing_rules
DROP POLICY IF EXISTS "pricing_rules_all_anon" ON public.pricing_rules;
DROP POLICY IF EXISTS "pricing_rules_select_auth" ON public.pricing_rules;
DROP POLICY IF EXISTS "pricing_rules_admin_all" ON public.pricing_rules;

-- proposals
DROP POLICY IF EXISTS "proposals_all_anon" ON public.proposals;
DROP POLICY IF EXISTS "proposals_select_auth" ON public.proposals;
DROP POLICY IF EXISTS "proposals_insert_own" ON public.proposals;
DROP POLICY IF EXISTS "proposals_update_own" ON public.proposals;
DROP POLICY IF EXISTS "proposals_delete_own" ON public.proposals;
DROP POLICY IF EXISTS "proposals_admin_all" ON public.proposals;

-- trips
DROP POLICY IF EXISTS "trips_all_anon" ON public.trips;
DROP POLICY IF EXISTS "trips_select_auth" ON public.trips;
DROP POLICY IF EXISTS "trips_insert_own" ON public.trips;
DROP POLICY IF EXISTS "trips_update_own" ON public.trips;
DROP POLICY IF EXISTS "trips_delete_own" ON public.trips;
DROP POLICY IF EXISTS "trips_admin_all" ON public.trips;

-- trip_reviews
DROP POLICY IF EXISTS "trip_reviews_all_anon" ON public.trip_reviews;
DROP POLICY IF EXISTS "trip_reviews_select_auth" ON public.trip_reviews;
DROP POLICY IF EXISTS "trip_reviews_insert_own" ON public.trip_reviews;
DROP POLICY IF EXISTS "trip_reviews_admin_all" ON public.trip_reviews;

-- trip_contents
DROP POLICY IF EXISTS "trip_contents_all_anon" ON public.trip_contents;
DROP POLICY IF EXISTS "trip_contents_select_auth" ON public.trip_contents;
DROP POLICY IF EXISTS "trip_contents_admin_all" ON public.trip_contents;

-- finance_categories
DROP POLICY IF EXISTS "finance_categories_all_anon" ON public.finance_categories;
DROP POLICY IF EXISTS "finance_categories_select_auth" ON public.finance_categories;
DROP POLICY IF EXISTS "finance_categories_admin_all" ON public.finance_categories;

-- finance_entries
DROP POLICY IF EXISTS "finance_entries_all_anon" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_select_auth" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_insert_own" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_update_own" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_delete_own" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_admin_all" ON public.finance_entries;

-- referrals
DROP POLICY IF EXISTS "referrals_all_anon" ON public.referrals;
DROP POLICY IF EXISTS "referrals_select_auth" ON public.referrals;
DROP POLICY IF EXISTS "referrals_insert_own" ON public.referrals;
DROP POLICY IF EXISTS "referrals_update_own" ON public.referrals;
DROP POLICY IF EXISTS "referrals_delete_own" ON public.referrals;
DROP POLICY IF EXISTS "referrals_admin_all" ON public.referrals;

-- marketing_tasks
DROP POLICY IF EXISTS "marketing_tasks_all_anon" ON public.marketing_tasks;
DROP POLICY IF EXISTS "marketing_tasks_select_auth" ON public.marketing_tasks;
DROP POLICY IF EXISTS "marketing_tasks_admin_all" ON public.marketing_tasks;

-- conversations
DROP POLICY IF EXISTS "conversations_all_anon" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_auth" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_admin_all" ON public.conversations;

-- messages
DROP POLICY IF EXISTS "messages_all_anon" ON public.messages;
DROP POLICY IF EXISTS "messages_select_auth" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_admin_all" ON public.messages;

-- follow_ups
DROP POLICY IF EXISTS "follow_ups_all_anon" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_select_auth" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_insert_own" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_update_own" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_admin_all" ON public.follow_ups;

-- lead_status_log
DROP POLICY IF EXISTS "lead_status_log_all_anon" ON public.lead_status_log;
DROP POLICY IF EXISTS "lead_status_log_select_auth" ON public.lead_status_log;
DROP POLICY IF EXISTS "lead_status_log_insert_auth" ON public.lead_status_log;
DROP POLICY IF EXISTS "lead_status_log_admin_all" ON public.lead_status_log;

-- trip_status_log
DROP POLICY IF EXISTS "trip_status_log_all_anon" ON public.trip_status_log;
DROP POLICY IF EXISTS "trip_status_log_select_auth" ON public.trip_status_log;
DROP POLICY IF EXISTS "trip_status_log_insert_auth" ON public.trip_status_log;
DROP POLICY IF EXISTS "trip_status_log_admin_all" ON public.trip_status_log;

-- audit_log
DROP POLICY IF EXISTS "audit_log_all_anon" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_select_admin" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert_auth" ON public.audit_log;

-- ame_vision_state
DROP POLICY IF EXISTS "ame_vision_state_all_anon" ON public.ame_vision_state;
DROP POLICY IF EXISTS "ame_vision_state_select_auth" ON public.ame_vision_state;
DROP POLICY IF EXISTS "ame_vision_state_insert_auth" ON public.ame_vision_state;
DROP POLICY IF EXISTS "ame_vision_state_update_auth" ON public.ame_vision_state;

-- 5. Create new authenticated-only policies for all admin tables
-- ============================================================
-- Policy pattern: only authenticated + admin users can access

-- profiles
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- companies
CREATE POLICY "companies_admin_all" ON public.companies
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- company_settings
CREATE POLICY "company_settings_admin_all" ON public.company_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- contacts
CREATE POLICY "contacts_admin_all" ON public.contacts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- drivers
CREATE POLICY "drivers_admin_all" ON public.drivers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- vehicles
CREATE POLICY "vehicles_admin_all" ON public.vehicles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- pricing_rules
CREATE POLICY "pricing_rules_admin_all" ON public.pricing_rules
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- proposals
CREATE POLICY "proposals_admin_all" ON public.proposals
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- trips
CREATE POLICY "trips_admin_all" ON public.trips
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- trip_reviews
CREATE POLICY "trip_reviews_admin_all" ON public.trip_reviews
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- trip_contents
CREATE POLICY "trip_contents_admin_all" ON public.trip_contents
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- finance_categories
CREATE POLICY "finance_categories_admin_all" ON public.finance_categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- finance_entries
CREATE POLICY "finance_entries_admin_all" ON public.finance_entries
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- referrals
CREATE POLICY "referrals_admin_all" ON public.referrals
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- marketing_tasks
CREATE POLICY "marketing_tasks_admin_all" ON public.marketing_tasks
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- conversations
CREATE POLICY "conversations_admin_all" ON public.conversations
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- messages
CREATE POLICY "messages_admin_all" ON public.messages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- follow_ups
CREATE POLICY "follow_ups_admin_all" ON public.follow_ups
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- lead_status_log
CREATE POLICY "lead_status_log_admin_all" ON public.lead_status_log
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- trip_status_log
CREATE POLICY "trip_status_log_admin_all" ON public.trip_status_log
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- audit_log
CREATE POLICY "audit_log_admin_all" ON public.audit_log
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ame_vision_state
CREATE POLICY "ame_vision_state_admin_all" ON public.ame_vision_state
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. Update receipts policies (already had auth check, upgrade to is_admin)
-- ============================================================
DROP POLICY IF EXISTS "Admins podem gerenciar recibos" ON public.receipts;
CREATE POLICY "receipts_admin_all" ON public.receipts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins podem gerenciar contadores" ON public.receipt_counters;
CREATE POLICY "receipt_counters_admin_all" ON public.receipt_counters
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7. Grant usage on admin_users to authenticated (for self-check queries)
-- ============================================================
GRANT SELECT ON public.admin_users TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.admin_users TO service_role;

-- 8. Ensure is_admin() is callable by authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
