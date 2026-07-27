-- Remove todas as policies existentes e recria com acesso anon
do $$ declare
  rec record;
begin
  for rec in (
    select schemaname, tablename, policyname
    from pg_policies
    where tablename in ('profiles','contacts','trips','referrals','finance_entries','proposals','marketing_tasks','audit_log','ame_vision_state','companies','company_settings','drivers','vehicles','pricing_rules','trip_reviews','trip_contents','finance_categories','conversations','messages','follow_ups','lead_status_log','trip_status_log')
  ) loop
    execute format('drop policy if exists %I on %I.%I', rec.policyname, rec.schemaname, rec.tablename);
  end loop;
end $$;

-- Recria com permissão total
create policy "all_anon" on public.profiles for all using (true) with check (true);
create policy "all_anon" on public.contacts for all using (true) with check (true);
create policy "all_anon" on public.trips for all using (true) with check (true);
create policy "all_anon" on public.referrals for all using (true) with check (true);
create policy "all_anon" on public.finance_entries for all using (true) with check (true);
create policy "all_anon" on public.proposals for all using (true) with check (true);
create policy "all_anon" on public.marketing_tasks for all using (true) with check (true);
create policy "all_anon" on public.audit_log for all using (true) with check (true);
create policy "all_anon" on public.ame_vision_state for all using (true) with check (true);
create policy "all_anon" on public.companies for all using (true) with check (true);
create policy "all_anon" on public.company_settings for all using (true) with check (true);
create policy "all_anon" on public.drivers for all using (true) with check (true);
create policy "all_anon" on public.vehicles for all using (true) with check (true);
create policy "all_anon" on public.pricing_rules for all using (true) with check (true);
create policy "all_anon" on public.trip_reviews for all using (true) with check (true);
create policy "all_anon" on public.trip_contents for all using (true) with check (true);
create policy "all_anon" on public.finance_categories for all using (true) with check (true);
create policy "all_anon" on public.conversations for all using (true) with check (true);
create policy "all_anon" on public.messages for all using (true) with check (true);
create policy "all_anon" on public.follow_ups for all using (true) with check (true);
create policy "all_anon" on public.lead_status_log for all using (true) with check (true);
create policy "all_anon" on public.trip_status_log for all using (true) with check (true);
