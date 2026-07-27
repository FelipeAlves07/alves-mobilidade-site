-- ============================================================
-- Fix: Infinite RLS recursion in profiles admin policies
-- Sprint 2.2: Hotfix
-- ============================================================
-- Root cause: policies using `auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')`
-- on the profiles table itself cause infinite recursion.
-- Fix: use a SECURITY DEFINER function to bypass RLS.
-- ============================================================

-- 1. Create security definer helper (avoids recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Fix profiles table policies (remove recursion)
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all"
  ON public.profiles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Fix all other tables that reference profiles in admin policies
-- The following policies currently use the recursive subquery pattern.

-- companies
DROP POLICY IF EXISTS "companies_admin_all" ON public.companies;
CREATE POLICY "companies_admin_all"
  ON public.companies FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- contacts (leads)
DROP POLICY IF EXISTS "contacts_admin_all" ON public.contacts;
CREATE POLICY "contacts_admin_all"
  ON public.contacts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- drivers
DROP POLICY IF EXISTS "drivers_admin_all" ON public.drivers;
CREATE POLICY "drivers_admin_all"
  ON public.drivers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- vehicles
DROP POLICY IF EXISTS "vehicles_admin_all" ON public.vehicles;
CREATE POLICY "vehicles_admin_all"
  ON public.vehicles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- pricing_rules
DROP POLICY IF EXISTS "pricing_rules_admin_all" ON public.pricing_rules;
CREATE POLICY "pricing_rules_admin_all"
  ON public.pricing_rules FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- proposals
DROP POLICY IF EXISTS "proposals_admin_all" ON public.proposals;
CREATE POLICY "proposals_admin_all"
  ON public.proposals FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- trips
DROP POLICY IF EXISTS "trips_admin_all" ON public.trips;
CREATE POLICY "trips_admin_all"
  ON public.trips FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- trip_reviews
DROP POLICY IF EXISTS "trip_reviews_admin_all" ON public.trip_reviews;
CREATE POLICY "trip_reviews_admin_all"
  ON public.trip_reviews FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- trip_contents
DROP POLICY IF EXISTS "trip_contents_admin_all" ON public.trip_contents;
CREATE POLICY "trip_contents_admin_all"
  ON public.trip_contents FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- finance_categories
DROP POLICY IF EXISTS "finance_categories_admin_all" ON public.finance_categories;
CREATE POLICY "finance_categories_admin_all"
  ON public.finance_categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- finance_entries
DROP POLICY IF EXISTS "finance_entries_admin_all" ON public.finance_entries;
CREATE POLICY "finance_entries_admin_all"
  ON public.finance_entries FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- referrals
DROP POLICY IF EXISTS "referrals_admin_all" ON public.referrals;
CREATE POLICY "referrals_admin_all"
  ON public.referrals FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- marketing_tasks
DROP POLICY IF EXISTS "marketing_tasks_admin_all" ON public.marketing_tasks;
CREATE POLICY "marketing_tasks_admin_all"
  ON public.marketing_tasks FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- conversations
DROP POLICY IF EXISTS "conversations_admin_all" ON public.conversations;
CREATE POLICY "conversations_admin_all"
  ON public.conversations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- messages
DROP POLICY IF EXISTS "messages_admin_all" ON public.messages;
CREATE POLICY "messages_admin_all"
  ON public.messages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- follow_ups
DROP POLICY IF EXISTS "follow_ups_admin_all" ON public.follow_ups;
CREATE POLICY "follow_ups_admin_all"
  ON public.follow_ups FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- lead_status_log
DROP POLICY IF EXISTS "lead_status_log_admin_all" ON public.lead_status_log;
CREATE POLICY "lead_status_log_admin_all"
  ON public.lead_status_log FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- trip_status_log
DROP POLICY IF EXISTS "trip_status_log_admin_all" ON public.trip_status_log;
CREATE POLICY "trip_status_log_admin_all"
  ON public.trip_status_log FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- audit_log
DROP POLICY IF EXISTS "audit_log_select_admin" ON public.audit_log;
CREATE POLICY "audit_log_select_admin"
  ON public.audit_log FOR SELECT
  USING (public.is_admin());

-- company_settings
DROP POLICY IF EXISTS "company_settings_admin_all" ON public.company_settings;
CREATE POLICY "company_settings_admin_all"
  ON public.company_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Also fix the main migration.sql policies (non-sprint schema)
-- In case the main migration was used, fix those too:

DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin());
