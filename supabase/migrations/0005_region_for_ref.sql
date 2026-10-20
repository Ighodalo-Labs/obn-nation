-- Tells the listing form which region a referral code belongs to, so the form can lock the region (PRD DF-1).
-- Returns only the region, and only for a code of an active, not blacklisted regional admin. No names, phones or ids.
-- The database still decides the real routing when the listing is saved (listings_before_insert); this is for the screen only.
create function public.region_for_ref(p_code text) returns public.region_type
language sql stable security definer set search_path = '' as $$
  select region from public.profiles
  where referral_code = lower(btrim(p_code)) and role = 'regional_admin' and is_active and not is_blacklisted
$$;
revoke execute on function public.region_for_ref(text) from public, anon, authenticated;
grant execute on function public.region_for_ref(text) to authenticated, service_role;
