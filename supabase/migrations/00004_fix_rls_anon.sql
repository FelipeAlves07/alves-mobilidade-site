-- ============================================================
-- Fix: RLS policies for anon/public access
-- Sprint 2.2: Hotfix
-- ============================================================
-- The app uses its own password auth (localStorage), not
-- Supabase Auth. So all RLS policies must allow anon access.
-- ============================================================

-- 1. Profiles
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_all_anon" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 2. Companies
DROP POLICY IF EXISTS "companies_select_auth" ON public.companies;
DROP POLICY IF EXISTS "companies_insert_own" ON public.companies;
DROP POLICY IF EXISTS "companies_update_own" ON public.companies;
DROP POLICY IF EXISTS "companies_delete_own" ON public.companies;
DROP POLICY IF EXISTS "companies_admin_all" ON public.companies;
CREATE POLICY "companies_all_anon" ON public.companies FOR ALL USING (true) WITH CHECK (true);

-- 3. Company settings
DROP POLICY IF EXISTS "company_settings_select_auth" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_admin_all" ON public.company_settings;
CREATE POLICY "company_settings_all_anon" ON public.company_settings FOR ALL USING (true) WITH CHECK (true);

-- 4. Contacts
DROP POLICY IF EXISTS "contacts_select_auth" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_own" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_own" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete_own" ON public.contacts;
DROP POLICY IF EXISTS "contacts_admin_all" ON public.contacts;
CREATE POLICY "contacts_all_anon" ON public.contacts FOR ALL USING (true) WITH CHECK (true);

-- 5. Drivers
DROP POLICY IF EXISTS "drivers_select_auth" ON public.drivers;
DROP POLICY IF EXISTS "drivers_insert_own" ON public.drivers;
DROP POLICY IF EXISTS "drivers_update_own" ON public.drivers;
DROP POLICY IF EXISTS "drivers_delete_own" ON public.drivers;
DROP POLICY IF EXISTS "drivers_admin_all" ON public.drivers;
CREATE POLICY "drivers_all_anon" ON public.drivers FOR ALL USING (true) WITH CHECK (true);

-- 6. Vehicles
DROP POLICY IF EXISTS "vehicles_select_auth" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_insert_own" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_update_own" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_delete_own" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_admin_all" ON public.vehicles;
CREATE POLICY "vehicles_all_anon" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

-- 7. Pricing rules
DROP POLICY IF EXISTS "pricing_rules_select_auth" ON public.pricing_rules;
DROP POLICY IF EXISTS "pricing_rules_admin_all" ON public.pricing_rules;
CREATE POLICY "pricing_rules_all_anon" ON public.pricing_rules FOR ALL USING (true) WITH CHECK (true);

-- 8. Proposals
DROP POLICY IF EXISTS "proposals_select_auth" ON public.proposals;
DROP POLICY IF EXISTS "proposals_insert_own" ON public.proposals;
DROP POLICY IF EXISTS "proposals_update_own" ON public.proposals;
DROP POLICY IF EXISTS "proposals_delete_own" ON public.proposals;
DROP POLICY IF EXISTS "proposals_admin_all" ON public.proposals;
CREATE POLICY "proposals_all_anon" ON public.proposals FOR ALL USING (true) WITH CHECK (true);

-- 9. Trips
DROP POLICY IF EXISTS "trips_select_auth" ON public.trips;
DROP POLICY IF EXISTS "trips_insert_own" ON public.trips;
DROP POLICY IF EXISTS "trips_update_own" ON public.trips;
DROP POLICY IF EXISTS "trips_delete_own" ON public.trips;
DROP POLICY IF EXISTS "trips_admin_all" ON public.trips;
CREATE POLICY "trips_all_anon" ON public.trips FOR ALL USING (true) WITH CHECK (true);

-- 10. Trip reviews
DROP POLICY IF EXISTS "trip_reviews_select_auth" ON public.trip_reviews;
DROP POLICY IF EXISTS "trip_reviews_insert_own" ON public.trip_reviews;
DROP POLICY IF EXISTS "trip_reviews_admin_all" ON public.trip_reviews;
CREATE POLICY "trip_reviews_all_anon" ON public.trip_reviews FOR ALL USING (true) WITH CHECK (true);

-- 11. Trip contents
DROP POLICY IF EXISTS "trip_contents_select_auth" ON public.trip_contents;
DROP POLICY IF EXISTS "trip_contents_admin_all" ON public.trip_contents;
CREATE POLICY "trip_contents_all_anon" ON public.trip_contents FOR ALL USING (true) WITH CHECK (true);

-- 12. Finance categories
DROP POLICY IF EXISTS "finance_categories_select_auth" ON public.finance_categories;
DROP POLICY IF EXISTS "finance_categories_admin_all" ON public.finance_categories;
CREATE POLICY "finance_categories_all_anon" ON public.finance_categories FOR ALL USING (true) WITH CHECK (true);

-- 13. Finance entries
DROP POLICY IF EXISTS "finance_entries_select_auth" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_insert_own" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_update_own" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_delete_own" ON public.finance_entries;
DROP POLICY IF EXISTS "finance_entries_admin_all" ON public.finance_entries;
CREATE POLICY "finance_entries_all_anon" ON public.finance_entries FOR ALL USING (true) WITH CHECK (true);

-- 14. Referrals
DROP POLICY IF EXISTS "referrals_select_auth" ON public.referrals;
DROP POLICY IF EXISTS "referrals_insert_own" ON public.referrals;
DROP POLICY IF EXISTS "referrals_update_own" ON public.referrals;
DROP POLICY IF EXISTS "referrals_delete_own" ON public.referrals;
DROP POLICY IF EXISTS "referrals_admin_all" ON public.referrals;
CREATE POLICY "referrals_all_anon" ON public.referrals FOR ALL USING (true) WITH CHECK (true);

-- 15. Marketing tasks
DROP POLICY IF EXISTS "marketing_tasks_select_auth" ON public.marketing_tasks;
DROP POLICY IF EXISTS "marketing_tasks_admin_all" ON public.marketing_tasks;
CREATE POLICY "marketing_tasks_all_anon" ON public.marketing_tasks FOR ALL USING (true) WITH CHECK (true);

-- 16. Conversations
DROP POLICY IF EXISTS "conversations_select_auth" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_admin_all" ON public.conversations;
CREATE POLICY "conversations_all_anon" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

-- 17. Messages
DROP POLICY IF EXISTS "messages_select_auth" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_admin_all" ON public.messages;
CREATE POLICY "messages_all_anon" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- 18. Follow ups
DROP POLICY IF EXISTS "follow_ups_select_auth" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_insert_own" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_update_own" ON public.follow_ups;
DROP POLICY IF EXISTS "follow_ups_admin_all" ON public.follow_ups;
CREATE POLICY "follow_ups_all_anon" ON public.follow_ups FOR ALL USING (true) WITH CHECK (true);

-- 19. Lead status log
DROP POLICY IF EXISTS "lead_status_log_select_auth" ON public.lead_status_log;
DROP POLICY IF EXISTS "lead_status_log_insert_auth" ON public.lead_status_log;
DROP POLICY IF EXISTS "lead_status_log_admin_all" ON public.lead_status_log;
CREATE POLICY "lead_status_log_all_anon" ON public.lead_status_log FOR ALL USING (true) WITH CHECK (true);

-- 20. Trip status log
DROP POLICY IF EXISTS "trip_status_log_select_auth" ON public.trip_status_log;
DROP POLICY IF EXISTS "trip_status_log_insert_auth" ON public.trip_status_log;
DROP POLICY IF EXISTS "trip_status_log_admin_all" ON public.trip_status_log;
CREATE POLICY "trip_status_log_all_anon" ON public.trip_status_log FOR ALL USING (true) WITH CHECK (true);

-- 21. Audit log
DROP POLICY IF EXISTS "audit_log_select_admin" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert_auth" ON public.audit_log;
CREATE POLICY "audit_log_all_anon" ON public.audit_log FOR ALL USING (true) WITH CHECK (true);

-- 22. AME Vision state (already works, but ensure consistency)
DROP POLICY IF EXISTS "ame_vision_state_select_auth" ON public.ame_vision_state;
DROP POLICY IF EXISTS "ame_vision_state_insert_auth" ON public.ame_vision_state;
DROP POLICY IF EXISTS "ame_vision_state_update_auth" ON public.ame_vision_state;
CREATE POLICY "ame_vision_state_all_anon" ON public.ame_vision_state FOR ALL USING (true) WITH CHECK (true);
