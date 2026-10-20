-- OBN NATION: all migrations in order, for one paste into the Supabase SQL Editor.
-- Generated from supabase/migrations/*.sql. Run once on an empty project.


-- ===== supabase/migrations/0001_core_schema.sql =====
-- OBN NATION Phase 1: core schema.
-- Matches the client decisions of Oct 2026 (profiles, listings, listing_tokens,
-- regional_listings_feed masking view, single-approval review, 30-day edit token).
-- Target: Supabase Postgres 15. Tested on Postgres 16 with supabase/tests/.

-- ============================================================ ENUMS
create type public.user_role      as enum ('seller', 'regional_admin', 'global_admin');
create type public.region_type    as enum ('port_harcourt', 'delta', 'ekiti');
create type public.listing_status as enum ('draft', 'pending_review', 'rejected', 'approved');
create type public.condition_age  as enum ('new_sealed', 'new_open_box', 'premium_used', 'neatly_used', 'fairly_used');
create type public.condition_work as enum ('working_perfectly', 'minor_issues', 'not_working');
create type public.item_category  as enum ('phones', 'computers', 'tvs', 'fridges', 'generators', 'kitchen', 'furniture', 'other');

-- ============================================================ TABLES
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  role           public.user_role not null default 'seller',
  full_name      text not null default '' check (char_length(full_name) <= 80),
  phone          text not null unique check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  region         public.region_type,
  referral_code  text unique check (referral_code ~ '^[a-f0-9]{8}$'),
  is_active      boolean not null default true,
  is_blacklisted boolean not null default false,
  revoked_at     timestamptz,
  revoked_by     uuid references public.profiles (id),
  blacklisted_at timestamptz,
  blacklisted_by uuid references public.profiles (id),
  status_reason  text check (status_reason is null or char_length(status_reason) <= 500),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint regional_admin_has_region check ((role = 'regional_admin') = (region is not null)),
  constraint referral_only_regional_admin check (role = 'regional_admin' or referral_code is null),
  constraint blacklist_implies_inactive check (not is_blacklisted or not is_active)
);

create table public.listings (
  id                uuid primary key default gen_random_uuid(),
  client_key        uuid not null,
  seller_id         uuid not null references public.profiles (id) on delete restrict,
  ref_code          text,
  assigned_admin_id uuid references public.profiles (id) on delete restrict,
  region            public.region_type not null,
  category          public.item_category not null,
  title             text not null check (char_length(title) between 3 and 80),
  description       text not null check (char_length(description) between 10 and 1000),
  price_ngn         numeric(14, 2) not null check (price_ngn > 0 and price_ngn <= 1000000000),
  condition_age     public.condition_age not null,
  condition_work    public.condition_work not null,
  brand             text check (brand is null or char_length(brand) between 1 and 60),
  model             text check (model is null or char_length(model) between 1 and 60),
  size              text check (size is null or char_length(size) between 1 and 60),
  photo_urls        text[] not null default '{}',   -- storage object paths in bucket "photos"
  video_url         text,                            -- storage object path in bucket "videos"; optional
  status            public.listing_status not null default 'draft',
  rejection_reason  text check (rejection_reason is null or char_length(rejection_reason) between 5 and 500),
  claimed_at        timestamptz,
  submitted_at      timestamptz,
  approved_at       timestamptz,
  approved_by       uuid references public.profiles (id),
  rejected_at       timestamptz,
  rejected_by       uuid references public.profiles (id),
  resubmit_count    integer not null default 0 check (resubmit_count >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint listings_idempotency unique (seller_id, client_key),
  constraint photos_max_six check (cardinality(photo_urls) <= 6),
  constraint submitted_has_photos check (status = 'draft' or cardinality(photo_urls) between 1 and 6),
  constraint rejected_has_reason check (status <> 'rejected' or rejection_reason is not null),
  constraint approved_has_approver check (status <> 'approved' or (approved_by is not null and approved_at is not null))
);

create table public.listing_tokens (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),   -- SHA-256 of the UUID in the link
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  used_at    timestamptz,
  revoked_at timestamptz
);
create unique index listing_tokens_one_live_per_listing
  on public.listing_tokens (listing_id) where used_at is null and revoked_at is null;

create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles (id),
  action     text not null,
  listing_id uuid references public.listings (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  detail     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================ INDEXES
create index listings_region_status_idx   on public.listings (region, status, created_at desc);
create index listings_admin_status_idx    on public.listings (assigned_admin_id, status) where assigned_admin_id is not null;
create index listings_seller_idx          on public.listings (seller_id, created_at desc);
create index listings_photo_urls_gin      on public.listings using gin (photo_urls);
create index listings_video_url_idx       on public.listings (video_url) where video_url is not null;
create index profiles_admin_region_idx    on public.profiles (role, region) where role = 'regional_admin';
create index listing_tokens_listing_idx   on public.listing_tokens (listing_id);
create index audit_log_listing_idx        on public.audit_log (listing_id, created_at desc);
create index audit_log_actor_idx          on public.audit_log (actor_id, created_at desc);

-- ============================================================ HELPER FUNCTIONS
-- All helpers are SECURITY DEFINER so policies on profiles never recurse into themselves.
create function public.is_usable() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.is_active and not p.is_blacklisted)
$$;

create function public.my_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.is_active and not p.is_blacklisted
$$;

create function public.my_region() returns public.region_type
language sql stable security definer set search_path = '' as $$
  select p.region from public.profiles p
  where p.id = auth.uid() and p.is_active and not p.is_blacklisted
$$;

create function public.is_global_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.role = 'global_admin' from public.profiles p
                   where p.id = auth.uid() and p.is_active and not p.is_blacklisted), false)
$$;

create function public.is_in_charge_of_seller(p_seller uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.listings l
                 where l.seller_id = p_seller and l.assigned_admin_id = auth.uid()
                   and l.status <> 'draft')
     and public.my_role() in ('regional_admin', 'global_admin')
$$;

create function public._audit(p_actor uuid, p_action text, p_listing uuid, p_profile uuid, p_detail jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, action, listing_id, profile_id, detail)
  values (p_actor, p_action, p_listing, p_profile, coalesce(p_detail, '{}'::jsonb))
$$;

-- May this person review this listing? Global admins always. Regional admins only in their
-- own region, and only if the listing is unassigned or assigned to them.
create function public._reviewer_ok(p_actor uuid, p_region public.region_type, p_assigned uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_actor and p.is_active and not p.is_blacklisted
      and (p.role = 'global_admin'
           or (p.role = 'regional_admin' and p.region = p_region
               and (p_assigned is null or p_assigned = p.id))))
$$;

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ============================================================ TRIGGERS
-- New auth user (first verified WhatsApp OTP) -> seller profile. Phone is unique, so a
-- blacklisted phone can never get a second account.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.phone is null or btrim(new.phone) = '' then
    raise exception 'phone_required' using errcode = '23514';
  end if;
  insert into public.profiles (id, phone)
  values (new.id, '+' || regexp_replace(btrim(new.phone), '^\+', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.profiles_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.is_blacklisted then
      raise exception 'blacklisted_profile_cannot_be_deleted' using errcode = '55006';
    end if;
    return old;
  end if;
  if old.is_blacklisted and not new.is_blacklisted then
    raise exception 'blacklist_is_permanent' using errcode = '55006';
  end if;
  if new.phone <> old.phone or new.id <> old.id then
    raise exception 'immutable_field' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger profiles_guard_upd before update on public.profiles
  for each row execute function public.profiles_guard();
create trigger profiles_guard_del before delete on public.profiles
  for each row execute function public.profiles_guard();
create trigger profiles_touch before update on public.profiles
  for each row execute function public.set_updated_at();

-- Media paths must live inside <seller_id>/<listing_id>/ so nobody can point at another seller's files.
create function public._media_paths_ok(p_seller uuid, p_listing uuid, p_photos text[], p_video text)
returns boolean language sql immutable as $$
  select not exists (select 1 from unnest(p_photos) u
                     where u not like (p_seller::text || '/' || p_listing::text || '/%'))
     and (p_video is null or p_video like (p_seller::text || '/' || p_listing::text || '/%'))
$$;

create function public.listings_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_admin public.profiles; v_count integer; v_name text;
begin
  -- Daily limit (assumed default: 10 new listings per seller per 24h). A retry of the same client_key is not counted.
  if not exists (select 1 from public.listings where seller_id = new.seller_id and client_key = new.client_key) then
    select count(*) into v_count from public.listings
    where seller_id = new.seller_id and created_at > now() - interval '24 hours';
    if v_count >= 10 then
      raise exception 'daily_listing_limit' using errcode = '54000';
    end if;
  end if;

  -- Routing is decided here, never by the client.
  new.assigned_admin_id := null; new.claimed_at := null;
  new.approved_at := null; new.approved_by := null;
  new.rejected_at := null; new.rejected_by := null;
  new.rejection_reason := null; new.resubmit_count := 0; new.submitted_at := null;

  if new.ref_code is not null then
    new.ref_code := lower(btrim(new.ref_code));
    select * into v_admin from public.profiles
    where referral_code = new.ref_code and role = 'regional_admin' and is_active and not is_blacklisted;
    if found then
      new.assigned_admin_id := v_admin.id;
      new.region := v_admin.region;          -- a referral listing always belongs to the admin's region
      new.claimed_at := now();
    end if;
  end if;

  if not public._media_paths_ok(new.seller_id, new.id, new.photo_urls, new.video_url) then
    raise exception 'invalid_media_path' using errcode = '23514';
  end if;

  if new.status = 'pending_review' then
    select full_name into v_name from public.profiles where id = new.seller_id;
    if char_length(btrim(coalesce(v_name, ''))) < 2 then
      raise exception 'seller_name_required' using errcode = '23514';
    end if;
    new.submitted_at := now();
  elsif new.status <> 'draft' then
    raise exception 'invalid_initial_status' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger listings_before_insert_trg before insert on public.listings
  for each row execute function public.listings_before_insert();

create function public.listings_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  if new.id <> old.id or new.seller_id <> old.seller_id or new.client_key <> old.client_key
     or new.ref_code is distinct from old.ref_code or new.created_at <> old.created_at then
    raise exception 'immutable_field' using errcode = '23514';
  end if;

  if new.status <> old.status and (old.status, new.status) not in (
       ('draft', 'pending_review'), ('pending_review', 'approved'),
       ('pending_review', 'rejected'), ('rejected', 'pending_review')) then
    raise exception 'invalid_transition' using errcode = '55000';
  end if;

  -- Content can change only while the listing is a draft or has been rejected.
  if old.status in ('pending_review', 'approved') and
     (new.category, new.title, new.description, new.price_ngn, new.condition_age, new.condition_work,
      new.brand, new.model, new.size, new.photo_urls, new.video_url, new.region)
     is distinct from
     (old.category, old.title, old.description, old.price_ngn, old.condition_age, old.condition_work,
      old.brand, old.model, old.size, old.photo_urls, old.video_url, old.region) then
    raise exception 'listing_locked' using errcode = '55006';
  end if;

  if not public._media_paths_ok(new.seller_id, new.id, new.photo_urls, new.video_url) then
    raise exception 'invalid_media_path' using errcode = '23514';
  end if;

  if old.status = 'draft' and new.status = 'pending_review' then
    select full_name into v_name from public.profiles where id = new.seller_id;
    if char_length(btrim(coalesce(v_name, ''))) < 2 then
      raise exception 'seller_name_required' using errcode = '23514';
    end if;
    new.submitted_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger listings_before_update_trg before update on public.listings
  for each row execute function public.listings_before_update();

-- ============================================================ REVIEW FUNCTIONS (signed-in admins)
create function public.claim_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare l public.listings; v_actor uuid := auth.uid();
begin
  select * into l from public.listings where id = p_listing for update;
  if not found or l.status = 'draft' then raise exception 'listing_not_found' using errcode = 'P0002'; end if;
  if l.assigned_admin_id is not null then raise exception 'already_claimed' using errcode = 'OB005'; end if;
  if not public._reviewer_ok(v_actor, l.region, null) then raise exception 'not_authorized' using errcode = '42501'; end if;
  if l.status <> 'pending_review' then raise exception 'invalid_state' using errcode = '55000'; end if;
  update public.listings set assigned_admin_id = v_actor, claimed_at = now() where id = l.id;
  perform public._audit(v_actor, 'listing.claim', l.id, null, '{}');
end $$;

-- One approval is enough. Whoever approves an unassigned listing becomes the admin in charge.
create function public.approve_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare l public.listings; v_actor uuid := auth.uid();
begin
  select * into l from public.listings where id = p_listing for update;
  if not found or l.status = 'draft' then raise exception 'listing_not_found' using errcode = 'P0002'; end if;
  if not public._reviewer_ok(v_actor, l.region, l.assigned_admin_id) then raise exception 'not_authorized' using errcode = '42501'; end if;
  if l.status <> 'pending_review' then raise exception 'invalid_state' using errcode = '55000'; end if;
  update public.listings
     set status = 'approved', approved_by = v_actor, approved_at = now(),
         assigned_admin_id = coalesce(assigned_admin_id, v_actor),
         claimed_at = coalesce(claimed_at, now())
   where id = l.id;
  perform public._audit(v_actor, 'listing.approve', l.id, null,
                        jsonb_build_object('claimed_on_approve', l.assigned_admin_id is null));
end $$;

create function public.reassign_listing(p_listing uuid, p_new_admin uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare l public.listings; v_actor uuid := auth.uid(); t public.profiles;
begin
  if not public.is_global_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 5 or char_length(p_reason) > 500 then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  select * into l from public.listings where id = p_listing for update;
  if not found or l.status = 'draft' then raise exception 'listing_not_found' using errcode = 'P0002'; end if;
  select * into t from public.profiles where id = p_new_admin;
  if not found or not t.is_active or t.is_blacklisted
     or t.role not in ('regional_admin', 'global_admin')
     or (t.role = 'regional_admin' and t.region <> l.region) then
    raise exception 'invalid_target_admin' using errcode = '23514';
  end if;
  update public.listings set assigned_admin_id = p_new_admin, claimed_at = coalesce(claimed_at, now()) where id = l.id;
  perform public._audit(v_actor, 'listing.reassign', l.id, p_new_admin,
        jsonb_build_object('from', l.assigned_admin_id, 'to', p_new_admin, 'reason', btrim(p_reason)));
end $$;

-- ============================================================ GLOBAL ADMIN FUNCTIONS (signed-in)
create function public.promote_to_admin(p_profile uuid, p_role public.user_role, p_region public.region_type default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); t public.profiles; v_code text;
begin
  if not public.is_global_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
  if p_role not in ('regional_admin', 'global_admin') then raise exception 'invalid_role' using errcode = '23514'; end if;
  if p_role = 'regional_admin' and p_region is null then raise exception 'region_required' using errcode = '23514'; end if;
  select * into t from public.profiles where id = p_profile for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if t.is_blacklisted then raise exception 'blacklisted' using errcode = '42501'; end if;
  if t.role <> 'seller' then raise exception 'already_admin' using errcode = 'OB006'; end if;
  if p_role = 'regional_admin' then
    v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    update public.profiles set role = 'regional_admin', region = p_region, referral_code = v_code, is_active = true
     where id = t.id;
  else
    update public.profiles set role = 'global_admin', region = null, referral_code = null, is_active = true
     where id = t.id;
  end if;
  perform public._audit(v_actor, 'admin.promote', null, t.id,
        jsonb_build_object('role', p_role, 'region', p_region));
  return v_code;
end $$;

create function public.revoke_admin(p_profile uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); t public.profiles; v_released integer;
begin
  if not public.is_global_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 5 or char_length(p_reason) > 500 then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  select * into t from public.profiles where id = p_profile for update;
  if not found or t.role <> 'regional_admin' then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if t.is_blacklisted then raise exception 'blacklisted' using errcode = '55006'; end if;
  update public.profiles
     set is_active = false, revoked_at = now(), revoked_by = v_actor, status_reason = btrim(p_reason)
   where id = t.id;
  update public.listings set assigned_admin_id = null, claimed_at = null
   where assigned_admin_id = t.id and status = 'pending_review';
  get diagnostics v_released = row_count;
  perform public._audit(v_actor, 'admin.revoke', null, t.id,
        jsonb_build_object('reason', btrim(p_reason), 'pending_released', v_released));
end $$;

create function public.reinstate_admin(p_profile uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); t public.profiles;
begin
  if not public.is_global_admin() then raise exception 'not_authorized' using errcode = '42501'; end if;
  select * into t from public.profiles where id = p_profile for update;
  if not found or t.role <> 'regional_admin' then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if t.is_blacklisted then raise exception 'blacklisted' using errcode = '55006'; end if;
  if t.is_active then raise exception 'invalid_state' using errcode = '55000'; end if;
  update public.profiles set is_active = true, revoked_at = null, revoked_by = null, status_reason = null where id = t.id;
  perform public._audit(v_actor, 'admin.reinstate', null, t.id, '{}');
end $$;

-- ============================================================ SERVER-ONLY FUNCTIONS (service_role)
-- These are called from Next.js route handlers after the route has verified the caller's JWT.
-- The route passes the verified user id as p_actor; the function re-checks that user in the database.
create function public.reject_listing(p_actor uuid, p_listing uuid, p_reason text, p_token_hash text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare l public.listings; v_expires timestamptz;
begin
  if p_reason is null or char_length(btrim(p_reason)) < 5 or char_length(p_reason) > 500 then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  select * into l from public.listings where id = p_listing for update;
  if not found or l.status = 'draft' then raise exception 'listing_not_found' using errcode = 'P0002'; end if;
  if not public._reviewer_ok(p_actor, l.region, l.assigned_admin_id) then raise exception 'not_authorized' using errcode = '42501'; end if;
  if l.status <> 'pending_review' then raise exception 'invalid_state' using errcode = '55000'; end if;
  update public.listing_tokens set revoked_at = now()
   where listing_id = l.id and used_at is null and revoked_at is null;
  insert into public.listing_tokens (listing_id, token_hash, created_by)
  values (l.id, p_token_hash, p_actor) returning expires_at into v_expires;
  update public.listings
     set status = 'rejected', rejection_reason = btrim(p_reason), rejected_by = p_actor, rejected_at = now(),
         assigned_admin_id = coalesce(assigned_admin_id, p_actor), claimed_at = coalesce(claimed_at, now())
   where id = l.id;
  perform public._audit(p_actor, 'listing.reject', l.id, null, jsonb_build_object('reason', btrim(p_reason)));
  return v_expires;
end $$;

create function public.reissue_edit_link(p_actor uuid, p_listing uuid, p_token_hash text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare l public.listings; v_expires timestamptz;
begin
  select * into l from public.listings where id = p_listing for update;
  if not found or l.status = 'draft' then raise exception 'listing_not_found' using errcode = 'P0002'; end if;
  if not public._reviewer_ok(p_actor, l.region, l.assigned_admin_id) then raise exception 'not_authorized' using errcode = '42501'; end if;
  if l.status <> 'rejected' then raise exception 'invalid_state' using errcode = '55000'; end if;
  update public.listing_tokens set revoked_at = now()
   where listing_id = l.id and used_at is null and revoked_at is null;
  insert into public.listing_tokens (listing_id, token_hash, created_by)
  values (l.id, p_token_hash, p_actor) returning expires_at into v_expires;
  perform public._audit(p_actor, 'listing.reissue_link', l.id, null, '{}');
  return v_expires;
end $$;

create function public.blacklist_admin(p_actor uuid, p_profile uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare a public.profiles; t public.profiles; v_released integer;
begin
  select * into a from public.profiles where id = p_actor;
  if not found or a.role <> 'global_admin' or not a.is_active or a.is_blacklisted then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 5 or char_length(p_reason) > 500 then
    raise exception 'reason_required' using errcode = '23514';
  end if;
  select * into t from public.profiles where id = p_profile for update;
  if not found or t.role <> 'regional_admin' then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  if t.is_blacklisted then return; end if;   -- already done; safe to repeat
  update public.profiles
     set is_blacklisted = true, is_active = false, blacklisted_at = now(), blacklisted_by = p_actor,
         status_reason = btrim(p_reason)
   where id = t.id;
  update public.listings set assigned_admin_id = null, claimed_at = null
   where assigned_admin_id = t.id and status = 'pending_review';
  get diagnostics v_released = row_count;
  perform public._audit(p_actor, 'admin.blacklist', null, t.id,
        jsonb_build_object('reason', btrim(p_reason), 'pending_released', v_released));
end $$;

create function public.get_listing_for_edit(p_token_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare tok public.listing_tokens; l public.listings;
begin
  select * into tok from public.listing_tokens where token_hash = p_token_hash;
  if not found then raise exception 'token_invalid' using errcode = 'OB001'; end if;
  if tok.revoked_at is not null then raise exception 'token_revoked' using errcode = 'OB004'; end if;
  if tok.used_at is not null then raise exception 'token_used' using errcode = 'OB002'; end if;
  if tok.expires_at <= now() then raise exception 'token_expired' using errcode = 'OB003'; end if;
  select * into l from public.listings where id = tok.listing_id;
  if l.status <> 'rejected' then raise exception 'invalid_state' using errcode = '55000'; end if;
  return jsonb_build_object(
    'listing_id', l.id, 'seller_id', l.seller_id, 'region', l.region, 'category', l.category,
    'title', l.title, 'description', l.description, 'price_ngn', l.price_ngn,
    'condition_age', l.condition_age, 'condition_work', l.condition_work,
    'brand', l.brand, 'model', l.model, 'size', l.size,
    'photo_urls', to_jsonb(l.photo_urls), 'video_url', l.video_url,
    'rejection_reason', l.rejection_reason, 'expires_at', tok.expires_at);
end $$;

-- Resubmit updates the SAME listing and burns the token in one transaction. The row locks make a
-- double tap safe: the second call waits, finds the token used, and fails with OB002.
create function public.resubmit_listing(p_token_hash text, p_fields jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare tok public.listing_tokens; l public.listings;
begin
  select * into tok from public.listing_tokens where token_hash = p_token_hash for update;
  if not found then raise exception 'token_invalid' using errcode = 'OB001'; end if;
  if tok.revoked_at is not null then raise exception 'token_revoked' using errcode = 'OB004'; end if;
  if tok.used_at is not null then raise exception 'token_used' using errcode = 'OB002'; end if;
  if tok.expires_at <= now() then raise exception 'token_expired' using errcode = 'OB003'; end if;
  select * into l from public.listings where id = tok.listing_id for update;
  if l.status <> 'rejected' then raise exception 'invalid_state' using errcode = '55000'; end if;

  update public.listings set
    category       = case when p_fields ? 'category'       then (p_fields->>'category')::public.item_category       else category end,
    title          = case when p_fields ? 'title'          then p_fields->>'title'                                  else title end,
    description    = case when p_fields ? 'description'    then p_fields->>'description'                            else description end,
    price_ngn      = case when p_fields ? 'price_ngn'      then (p_fields->>'price_ngn')::numeric                   else price_ngn end,
    condition_age  = case when p_fields ? 'condition_age'  then (p_fields->>'condition_age')::public.condition_age  else condition_age end,
    condition_work = case when p_fields ? 'condition_work' then (p_fields->>'condition_work')::public.condition_work else condition_work end,
    brand          = case when p_fields ? 'brand'          then nullif(btrim(p_fields->>'brand'), '')               else brand end,
    model          = case when p_fields ? 'model'          then nullif(btrim(p_fields->>'model'), '')               else model end,
    size           = case when p_fields ? 'size'           then nullif(btrim(p_fields->>'size'), '')                else size end,
    photo_urls     = case when p_fields ? 'photo_urls'     then array(select jsonb_array_elements_text(p_fields->'photo_urls')) else photo_urls end,
    video_url      = case when p_fields ? 'video_url'      then nullif(p_fields->>'video_url', '')                  else video_url end,
    status = 'pending_review', rejection_reason = null,
    resubmit_count = resubmit_count + 1, submitted_at = now()
  where id = l.id;

  update public.listing_tokens set used_at = now() where id = tok.id;
  perform public._audit(null, 'listing.resubmit', l.id, l.seller_id,
        jsonb_build_object('resubmit_count', l.resubmit_count + 1));
  return l.id;
end $$;

-- Deletes drafts older than p_days and returns the storage folder of each so the server can remove the files.
create function public.purge_stale_drafts(p_days integer default 7) returns setof text
language sql security definer set search_path = '' as $$
  delete from public.listings
   where status = 'draft' and created_at < now() - make_interval(days => p_days)
  returning seller_id::text || '/' || id::text || '/'
$$;

-- Run once, by hand, in the Supabase SQL editor after the owner signs in with WhatsApp OTP.
create function public.bootstrap_global_admin(p_phone text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  update public.profiles set role = 'global_admin', region = null, referral_code = null, is_active = true
   where phone = p_phone and not is_blacklisted returning id into v_id;
  if v_id is null then raise exception 'profile_not_found_sign_in_once_first' using errcode = 'P0002'; end if;
  perform public._audit(v_id, 'admin.bootstrap_global', null, v_id, '{}');
  return v_id;
end $$;

-- ============================================================ MASKING VIEW
-- The only way a regional admin can read seller name and phone of a listing they are not in charge of,
-- and they only ever get the masked form. It runs with the owner's rights and filters rows itself.
create view public.regional_listings_feed with (security_invoker = false) as
select
  l.id, l.region, l.category, l.title, l.description, l.price_ngn,
  l.condition_age, l.condition_work, l.brand, l.model, l.size,
  l.photo_urls, l.video_url, l.status, l.created_at, l.submitted_at, l.approved_at,
  l.assigned_admin_id,
  split_part(btrim(a.full_name), ' ', 1)                   as admin_in_charge_name,
  v.unmasked                                               as contact_visible,
  case when v.unmasked then sp.full_name
       else left(btrim(sp.full_name), 1) || '***' end      as seller_name,
  case when v.unmasked then sp.phone
       when sp.phone like '+234%' then '+234 ••• ••• ••' || right(sp.phone, 2)
       else '••• ••• ••' || right(sp.phone, 2) end         as seller_phone
from public.listings l
join public.profiles sp on sp.id = l.seller_id
left join public.profiles a on a.id = l.assigned_admin_id
cross join lateral (
  select coalesce(l.assigned_admin_id = (select auth.uid()), false) or (select public.is_global_admin()) as unmasked
) v
where (select public.is_usable())
  and l.status <> 'draft'
  and ( (select public.is_global_admin())
        or ( (select public.my_role()) = 'regional_admin'
             and ( l.assigned_admin_id = (select auth.uid())
                   or ( l.region = (select public.my_region())
                        and ( l.status = 'approved'
                              or (l.status = 'pending_review' and l.assigned_admin_id is null) ) ) ) ) );

-- ============================================================ ROW LEVEL SECURITY
alter table public.profiles       enable row level security;
alter table public.listings       enable row level security;
alter table public.listing_tokens enable row level security;
alter table public.audit_log      enable row level security;

-- profiles: own row, global admin sees all, an admin sees sellers of listings they are in charge of.
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_usable() and (id = auth.uid() or public.is_global_admin() or public.is_in_charge_of_seller(id)));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid() and public.is_usable()) with check (id = auth.uid());   -- column grant limits this to full_name

-- listings: no personal data lives here, so admins can read listing content directly.
create policy listings_select_seller on public.listings for select to authenticated
  using (seller_id = auth.uid() and public.is_usable());
create policy listings_select_assigned on public.listings for select to authenticated
  using (assigned_admin_id = auth.uid() and status <> 'draft' and public.my_role() in ('regional_admin', 'global_admin'));
create policy listings_select_global on public.listings for select to authenticated
  using (public.is_global_admin() and status <> 'draft');
create policy listings_select_regional on public.listings for select to authenticated
  using (public.my_role() = 'regional_admin' and region = public.my_region()
         and (status = 'approved' or (status = 'pending_review' and assigned_admin_id is null)));
create policy listings_insert_seller on public.listings for insert to authenticated
  with check (seller_id = auth.uid() and public.is_usable() and status in ('draft', 'pending_review'));
create policy listings_update_seller_draft on public.listings for update to authenticated
  using (seller_id = auth.uid() and status = 'draft' and public.is_usable())
  with check (seller_id = auth.uid() and status in ('draft', 'pending_review'));
create policy listings_delete_seller_draft on public.listings for delete to authenticated
  using (seller_id = auth.uid() and status = 'draft' and public.is_usable());

-- audit_log: global admin reads; writes only through the functions above.
create policy audit_select_global on public.audit_log for select to authenticated
  using (public.is_global_admin());

-- listing_tokens: no policy for signed-in users at all. Only service_role (RLS bypass) touches it.

-- ============================================================ PRIVILEGES
revoke all on all tables    in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, delete on public.listings to authenticated;
grant insert (client_key, seller_id, ref_code, region, category, title, description, price_ngn,
              condition_age, condition_work, brand, model, size, photo_urls, video_url, status)
  on public.listings to authenticated;
grant update (category, title, description, price_ngn, condition_age, condition_work,
              brand, model, size, photo_urls, video_url, status)
  on public.listings to authenticated;
grant select on public.audit_log to authenticated;
grant select on public.regional_listings_feed to authenticated;

grant execute on function public.is_usable(), public.my_role(), public.my_region(),
  public.is_global_admin(), public.is_in_charge_of_seller(uuid) to authenticated;
grant execute on function public.claim_listing(uuid), public.approve_listing(uuid),
  public.reassign_listing(uuid, uuid, text),
  public.promote_to_admin(uuid, public.user_role, public.region_type),
  public.revoke_admin(uuid, text), public.reinstate_admin(uuid) to authenticated;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on function public.reject_listing(uuid, uuid, text, text),
  public.reissue_edit_link(uuid, uuid, text), public.blacklist_admin(uuid, uuid, text),
  public.get_listing_for_edit(text), public.resubmit_listing(text, jsonb),
  public.purge_stale_drafts(integer) to service_role;

-- ===== supabase/migrations/0002_storage.sql =====
-- Private buckets for listing media. Guarded so it is skipped where Supabase Storage is absent.
-- Object path layout (both buckets): <seller_id>/<listing_id>/<file>
--   photos: WebP, under 1MB each     videos: MP4, under 10MB, one per listing (optional)
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('photos', 'photos', false, 1048576,  array['image/webp']),
      ('videos', 'videos', false, 10485760, array['video/mp4'])
    on conflict (id) do nothing;

    -- Sellers upload only into their own folder.
    create policy media_insert_own on storage.objects for insert to authenticated
      with check (bucket_id in ('photos', 'videos')
                  and (storage.foldername(name))[1] = auth.uid()::text
                  and public.is_usable());

    -- Read: your own folder, or any file attached to a listing you are allowed to see.
    -- The subquery on public.listings runs with the caller's rights, so listing RLS decides.
    create policy media_select on storage.objects for select to authenticated
      using (bucket_id in ('photos', 'videos') and public.is_usable() and (
        (storage.foldername(name))[1] = auth.uid()::text
        or exists (select 1 from public.listings l
                   where (bucket_id = 'photos' and storage.objects.name = any (l.photo_urls))
                      or (bucket_id = 'videos' and storage.objects.name = l.video_url))));
    -- No update or delete policy for users. Cleanup runs on the server with service_role.
  end if;
end $$;

-- ===== supabase/migrations/0003_otp_attempts.sql =====
-- 0003: wrong-code counter and send time for the WhatsApp OTP flow (PRD SI-5).
-- Supabase Auth cannot tell "wrong" from "expired" and does not void a code after 5 tries,
-- so the server keeps this small counter. Service role only. No phone is ever shown to a client.

create table public.otp_attempts (
  phone       text primary key check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  wrong_count integer not null default 0 check (wrong_count >= 0),
  sent_at     timestamptz not null default now()
);
alter table public.otp_attempts enable row level security;   -- no policies: only the service role reaches it

-- A new code was sent: restart the count and the 10-minute clock.
create function public.otp_mark_sent(p_phone text) returns void
language sql security definer set search_path = public as $$
  insert into public.otp_attempts (phone, wrong_count, sent_at) values (p_phone, 0, now())
  on conflict (phone) do update set wrong_count = 0, sent_at = now();
$$;

-- State of the current code. No row means no code was sent: treated as expired.
create function public.otp_state(p_phone text, p_ttl_seconds integer default 600)
returns table (tries_left integer, expired boolean)
language sql stable security definer set search_path = public as $$
  select greatest(5 - o.wrong_count, 0),
         (now() - o.sent_at) > make_interval(secs => p_ttl_seconds)
    from public.otp_attempts o where o.phone = p_phone
  union all
  select 0, true where not exists (select 1 from public.otp_attempts where phone = p_phone)
$$;

-- A wrong code was typed. Returns how many tries are left (0 means the code is void).
create function public.otp_register_wrong(p_phone text) returns integer
language plpgsql security definer set search_path = public as $$
declare v_left integer;
begin
  update public.otp_attempts set wrong_count = wrong_count + 1 where phone = p_phone
  returning greatest(5 - wrong_count, 0) into v_left;
  return coalesce(v_left, 0);
end $$;

-- Sign-in succeeded: forget the code.
create function public.otp_clear(p_phone text) returns void
language sql security definer set search_path = public as $$
  delete from public.otp_attempts where phone = p_phone;
$$;

revoke all on public.otp_attempts from public, anon, authenticated;
revoke execute on function public.otp_mark_sent(text), public.otp_state(text, integer),
  public.otp_register_wrong(text), public.otp_clear(text) from public, anon, authenticated;
grant all on public.otp_attempts to service_role;
grant execute on function public.otp_mark_sent(text), public.otp_state(text, integer),
  public.otp_register_wrong(text), public.otp_clear(text) to service_role;

-- ===== supabase/migrations/0004_storage_replace_draft_files.sql =====
-- Lets a seller replace a file in their own DRAFT listing folder.
-- Why: a retry after a dropped connection uploads the same path again (upsert). Without this policy that retry fails.
-- Once the listing is submitted the files are locked: the policy only matches while the listing is a draft.
-- Object path layout: <seller_id>/<listing_id>/<file>. Guarded so it is skipped where Supabase Storage is absent.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    create policy media_update_own_draft on storage.objects for update to authenticated
      using (bucket_id in ('photos', 'videos')
             and (storage.foldername(name))[1] = auth.uid()::text
             and public.is_usable()
             and exists (select 1 from public.listings l
                         where l.id::text = (storage.foldername(name))[2]
                           and l.seller_id = auth.uid() and l.status = 'draft'))
      with check (bucket_id in ('photos', 'videos')
             and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;

-- ===== supabase/migrations/0005_region_for_ref.sql =====
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
