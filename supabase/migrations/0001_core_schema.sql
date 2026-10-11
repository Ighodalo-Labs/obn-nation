-- OBN NATION · Phase 1 · core schema
-- Target: Supabase (Postgres 15+). See docs/PRD-phase1.md and docs/database.md.
-- Rules enforced here, in the database:
--   * region routing, referral assignment
--   * 1-or-2 approval consensus
--   * single-use edit tokens (double-tap safe)
--   * seller contact masking (row-level security)
--   * global admin override, revoke, blacklist, audit log

-- ───────────────────────── enums ─────────────────────────
create type admin_role        as enum ('regional_admin', 'global_admin');
create type admin_status      as enum ('active', 'revoked', 'blacklisted');
create type listing_status    as enum ('pending', 'approved', 'rejected');
create type media_kind        as enum ('photo', 'video');
create type item_age          as enum ('new_sealed', 'new_open_box', 'premium_used', 'neatly_used', 'fairly_used');
create type functional_status as enum ('working_perfectly', 'minor_issues', 'not_working');
create type review_decision   as enum ('approve', 'reject');

-- ───────────────────────── tables ─────────────────────────
create table regions (
  id    smallint generated always as identity primary key,
  slug  text unique not null,
  name  text not null
);
insert into regions (slug, name) values
  ('port-harcourt', 'Port Harcourt'),
  ('delta',         'Delta'),
  ('ekiti',         'Ekiti');

-- Sellers sign in with a WhatsApp OTP (Supabase Auth, phone). No password.
create table sellers (
  id         uuid primary key references auth.users (id) on delete cascade,
  phone      text unique not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  full_name  text,
  created_at timestamptz not null default now()
);

create table admins (
  id                uuid primary key references auth.users (id) on delete cascade,
  phone             text unique not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  full_name         text not null,
  role              admin_role   not null default 'regional_admin',
  region_id         smallint references regions (id),
  status            admin_status not null default 'active',
  referral_code     text unique not null
                    default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  status_reason     text,
  status_changed_at timestamptz,
  status_changed_by uuid references admins (id),
  created_at        timestamptz not null default now(),
  check (role = 'global_admin' or region_id is not null)
);
create index admins_region_idx on admins (region_id) where status = 'active';

-- Permanent block list. A phone in here can never become an admin again.
create table blacklist (
  phone          text primary key,
  former_admin   uuid references admins (id),
  reason         text not null,
  blacklisted_by uuid references admins (id),
  created_at     timestamptz not null default now()
);

create table listings (
  id                uuid primary key default gen_random_uuid(),
  seller_id         uuid not null references sellers (id),
  client_key        uuid not null,                       -- idempotency key from the form
  region_id         smallint not null references regions (id),
  admin_in_charge   uuid references admins (id),         -- who owns sales + sees contacts
  referral_code_used text,
  category          text not null,
  title             text not null check (char_length(title) between 3 and 120),
  description       text check (char_length(description) <= 2000),
  item_age          item_age not null,
  functional_status functional_status not null,
  price_ngn         numeric(14,2) not null check (price_ngn > 0),
  status            listing_status not null default 'pending',
  rejection_reason  text,
  revision          int not null default 1,
  submitted_at      timestamptz not null default now(),
  approved_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (seller_id, client_key)
);
create index listings_region_status_idx on listings (region_id, status);
create index listings_in_charge_idx     on listings (admin_in_charge);

-- Seller identity lives apart from the listing so it can be locked down.
create table listing_contacts (
  listing_id   uuid primary key references listings (id) on delete cascade,
  seller_name  text not null,
  seller_phone text not null
);

create table listing_media (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references listings (id) on delete cascade,
  kind         media_kind not null,
  storage_path text not null,
  size_bytes   bigint not null check (size_bytes between 1 and 10485760),  -- under 10MB
  position     smallint not null default 0,
  created_at   timestamptz not null default now(),
  unique (listing_id, position)
);

create table listing_decisions (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  admin_id   uuid not null references admins (id),
  revision   int  not null,
  decision   review_decision not null,
  reason     text,
  created_at timestamptz not null default now(),
  unique (listing_id, admin_id, revision),
  check (decision = 'approve' or coalesce(char_length(reason), 0) > 0)
);

-- Edit links: raw token is only ever in the WhatsApp message. We store its hash.
create table edit_tokens (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  revision   int  not null,
  token_hash text unique not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create unique index edit_tokens_one_open_per_listing on edit_tokens (listing_id) where used_at is null;

-- Outbox for WhatsApp templates. A worker sends these with the service role.
create table notifications (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          uuid references listings (id) on delete set null,
  to_phone            text not null,
  template            text not null,
  payload             jsonb not null default '{}',   -- worker clears the token after sending
  status              text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts            int  not null default 0,
  provider_message_id text,
  created_at          timestamptz not null default now(),
  sent_at             timestamptz
);
create index notifications_queue_idx on notifications (created_at) where status = 'queued';

create table audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  action     text not null,
  entity     text not null,
  entity_id  text,
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ───────────────────────── helper functions ─────────────────────────
-- security definer so they can read admins without tripping RLS on admins itself.
create function is_active_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admins a
    where a.id = auth.uid() and a.status = 'active'
      and not exists (select 1 from blacklist b where b.phone = a.phone)
  );
$$;

create function is_global_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select a.role = 'global_admin' from admins a
                   where a.id = auth.uid() and a.status = 'active'
                     and not exists (select 1 from blacklist b where b.phone = a.phone)), false);
$$;

create function my_region() returns smallint
language sql stable security definer set search_path = public as $$
  select a.region_id from admins a where a.id = auth.uid() and a.status = 'active';
$$;

create function is_admin_in_charge(p_listing uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_active_admin()
     and exists (select 1 from listings l where l.id = p_listing and l.admin_in_charge = auth.uid());
$$;

create function is_phone_blacklisted(p_phone text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blacklist where phone = p_phone);
$$;

-- 2 or fewer active regional admins -> 1 approval. 3 or more -> 2 approvals.
create function approvals_required(p_region smallint) returns int
language sql stable security definer set search_path = public as $$
  select case when count(*) <= 2 then 1 else 2 end
  from admins
  where region_id = p_region and role = 'regional_admin' and status = 'active';
$$;

create function log_audit(p_action text, p_entity text, p_entity_id text, p_meta jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into audit_log (actor_id, action, entity, entity_id, meta)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_meta);
$$;

-- ───────────────────────── triggers ─────────────────────────
-- A blacklisted phone can never be added as an admin.
create function trg_admin_block_blacklisted() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from blacklist where phone = new.phone) then
    raise exception 'phone_blacklisted' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger admins_block_blacklisted before insert on admins
  for each row execute function trg_admin_block_blacklisted();

-- Validate a review decision and stamp the current revision.
create function trg_decision_validate() returns trigger
language plpgsql security definer set search_path = public as $$
declare l listings; a admins;
begin
  select * into l from listings where id = new.listing_id for update;
  if not found then raise exception 'listing_not_found' using errcode = 'P0001'; end if;
  select * into a from admins where id = new.admin_id;
  if not found or a.status <> 'active' then raise exception 'admin_not_active' using errcode = 'P0001'; end if;
  if a.role = 'regional_admin' and a.region_id is distinct from l.region_id then
    raise exception 'wrong_region' using errcode = 'P0001';
  end if;
  if l.status <> 'pending' then raise exception 'listing_not_pending' using errcode = 'P0001'; end if;
  new.revision := l.revision;
  return new;
end $$;
create trigger decisions_validate before insert on listing_decisions
  for each row execute function trg_decision_validate();

-- Issue a single-use edit token and queue the WhatsApp rejection template.
create function issue_edit_token_and_notify(p_listing uuid) returns void
language plpgsql security definer set search_path = public as $$
declare l listings; raw text; c listing_contacts;
begin
  select * into l from listings where id = p_listing;
  select * into c from listing_contacts where listing_id = p_listing;
  raw := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into edit_tokens (listing_id, revision, token_hash)
  values (p_listing, l.revision, encode(sha256(convert_to(raw, 'utf8')), 'hex'));
  insert into notifications (listing_id, to_phone, template, payload)
  values (p_listing, c.seller_phone, 'listing_rejected',
          jsonb_build_object('token', raw, 'reason', l.rejection_reason, 'title', l.title));
end $$;

-- Apply a decision: reject, or approve once enough independent approvals exist.
create function trg_decision_apply() returns trigger
language plpgsql security definer set search_path = public as $$
declare l listings; a admins; n int; need int;
begin
  select * into l from listings where id = new.listing_id;
  select * into a from admins   where id = new.admin_id;

  if new.decision = 'reject' then
    update listings set status = 'rejected', rejection_reason = new.reason, updated_at = now()
     where id = l.id;
    perform issue_edit_token_and_notify(l.id);
    return null;
  end if;

  -- first regional admin to approve becomes admin in charge (if nobody is yet)
  if a.role = 'regional_admin' and l.admin_in_charge is null then
    update listings set admin_in_charge = a.id where id = l.id;
  end if;

  select count(*) into n from listing_decisions
   where listing_id = l.id and revision = l.revision and decision = 'approve';
  -- a global admin's approval is an override and is enough on its own
  need := case when a.role = 'global_admin' then 1 else approvals_required(l.region_id) end;

  if n >= need then
    update listings set status = 'approved', approved_at = now(), updated_at = now() where id = l.id;
  end if;
  return null;
end $$;
create trigger decisions_apply after insert on listing_decisions
  for each row execute function trg_decision_apply();

-- ───────────────────────── seller RPCs ─────────────────────────
-- Create a listing. Safe to call twice with the same p_client_key (double-tap).
create function create_listing(
  p_client_key        uuid,
  p_region_id         smallint,
  p_ref               text,
  p_seller_name       text,
  p_category          text,
  p_title             text,
  p_description       text,
  p_item_age          item_age,
  p_functional_status functional_status,
  p_price_ngn         numeric,
  p_media             jsonb default '[]'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  ph text; lid uuid; adm admins; in_charge uuid; m jsonb; i int := 0;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;

  select '+' || regexp_replace(u.phone, '[^0-9]', '', 'g') into ph from auth.users u where u.id = uid;
  if ph is null or ph = '+' then raise exception 'no_verified_phone' using errcode = 'P0001'; end if;

  insert into sellers (id, phone, full_name) values (uid, ph, p_seller_name)
  on conflict (id) do update set full_name = coalesce(excluded.full_name, sellers.full_name);

  -- already created with this key? return it (no duplicate).
  select id into lid from listings where seller_id = uid and client_key = p_client_key;
  if lid is not null then return lid; end if;

  if not exists (select 1 from regions where id = p_region_id) then
    raise exception 'unknown_region' using errcode = 'P0001';
  end if;

  -- referral: valid + active admin -> assigned. Anything else -> general routing.
  if p_ref is not null then
    select * into adm from admins
     where referral_code = p_ref and status = 'active'
       and not exists (select 1 from blacklist b where b.phone = admins.phone);
    if found then
      if adm.region_id is not null and adm.region_id <> p_region_id then
        raise exception 'referral_region_mismatch' using errcode = 'P0001';
      end if;
      in_charge := adm.id;
    end if;
  end if;

  insert into listings (seller_id, client_key, region_id, admin_in_charge, referral_code_used,
                        category, title, description, item_age, functional_status, price_ngn)
  values (uid, p_client_key, p_region_id, in_charge, p_ref,
          p_category, p_title, p_description, p_item_age, p_functional_status, p_price_ngn)
  returning id into lid;

  insert into listing_contacts (listing_id, seller_name, seller_phone)
  values (lid, coalesce(p_seller_name, 'Seller'), ph);

  for m in select * from jsonb_array_elements(coalesce(p_media, '[]')) loop
    insert into listing_media (listing_id, kind, storage_path, size_bytes, position)
    values (lid, (m->>'kind')::media_kind, m->>'storage_path', (m->>'size_bytes')::bigint, i);
    i := i + 1;
  end loop;

  return lid;
end $$;

-- Read a rejected listing for the edit page. The token is the credential.
create function get_listing_for_edit(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare t edit_tokens; l listings;
begin
  select * into t from edit_tokens
   where token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex') and used_at is null;
  if not found then raise exception 'invalid_or_used_token' using errcode = 'P0001'; end if;
  select * into l from listings where id = t.listing_id and status = 'rejected';
  if not found then raise exception 'invalid_or_used_token' using errcode = 'P0001'; end if;
  return jsonb_build_object(
    'id', l.id, 'region_id', l.region_id, 'category', l.category, 'title', l.title,
    'description', l.description, 'item_age', l.item_age, 'functional_status', l.functional_status,
    'price_ngn', l.price_ngn, 'rejection_reason', l.rejection_reason,
    'media', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'storage_path', storage_path,
                          'size_bytes', size_bytes, 'position', position) order by position)
                       from listing_media where listing_id = l.id), '[]'));
end $$;

-- Resubmit. Updates the SAME listing, goes back to pending, burns the token.
-- The row lock makes a double tap safe: the second call sees the burned token and fails.
create function resubmit_listing(
  p_token             text,
  p_category          text,
  p_title             text,
  p_description       text,
  p_item_age          item_age,
  p_functional_status functional_status,
  p_price_ngn         numeric,
  p_media             jsonb default null          -- null = keep existing media
) returns uuid
language plpgsql security definer set search_path = public as $$
declare t edit_tokens; m jsonb; i int := 0;
begin
  select * into t from edit_tokens
   where token_hash = encode(sha256(convert_to(p_token, 'utf8')), 'hex') for update;
  if not found or t.used_at is not null then
    raise exception 'invalid_or_used_token' using errcode = 'P0001';
  end if;

  update listings set
      category = p_category, title = p_title, description = p_description,
      item_age = p_item_age, functional_status = p_functional_status, price_ngn = p_price_ngn,
      status = 'pending', rejection_reason = null, revision = revision + 1,
      submitted_at = now(), updated_at = now()
   where id = t.listing_id and status = 'rejected';
  if not found then raise exception 'invalid_or_used_token' using errcode = 'P0001'; end if;

  update edit_tokens set used_at = now() where id = t.id;        -- burn

  if p_media is not null then
    delete from listing_media where listing_id = t.listing_id;
    for m in select * from jsonb_array_elements(p_media) loop
      insert into listing_media (listing_id, kind, storage_path, size_bytes, position)
      values (t.listing_id, (m->>'kind')::media_kind, m->>'storage_path', (m->>'size_bytes')::bigint, i);
      i := i + 1;
    end loop;
  end if;
  return t.listing_id;
end $$;

-- ───────────────────────── Global Admin RPCs ─────────────────────────
create function reassign_listing(p_listing uuid, p_new_admin uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare l listings; a admins;
begin
  if not is_global_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  select * into l from listings where id = p_listing for update;
  if not found then raise exception 'listing_not_found' using errcode = 'P0001'; end if;
  select * into a from admins where id = p_new_admin and status = 'active';
  if not found then raise exception 'target_admin_not_active' using errcode = 'P0001'; end if;
  if a.role = 'regional_admin' and a.region_id <> l.region_id then
    raise exception 'wrong_region' using errcode = 'P0001';
  end if;
  update listings set admin_in_charge = p_new_admin, updated_at = now() where id = p_listing;
  perform log_audit('listing.reassign', 'listing', p_listing::text,
          jsonb_build_object('from', l.admin_in_charge, 'to', p_new_admin, 'reason', p_reason));
end $$;

create function admin_revoke(p_admin uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_global_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_admin = auth.uid() then raise exception 'cannot_act_on_self' using errcode = 'P0001'; end if;
  update admins set status = 'revoked', status_reason = p_reason,
         status_changed_at = now(), status_changed_by = auth.uid()
   where id = p_admin and status = 'active';
  if not found then raise exception 'admin_not_active' using errcode = 'P0001'; end if;
  perform log_audit('admin.revoke', 'admin', p_admin::text, jsonb_build_object('reason', p_reason));
end $$;

create function admin_blacklist(p_admin uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare a admins;
begin
  if not is_global_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_admin = auth.uid() then raise exception 'cannot_act_on_self' using errcode = 'P0001'; end if;
  select * into a from admins where id = p_admin;
  if not found then raise exception 'admin_not_found' using errcode = 'P0001'; end if;
  update admins set status = 'blacklisted', status_reason = p_reason,
         status_changed_at = now(), status_changed_by = auth.uid()
   where id = p_admin;
  insert into blacklist (phone, former_admin, reason, blacklisted_by)
  values (a.phone, a.id, p_reason, auth.uid())
  on conflict (phone) do nothing;
  perform log_audit('admin.blacklist', 'admin', p_admin::text, jsonb_build_object('reason', p_reason));
  -- The app server must also ban the auth user (auth.admin.updateUserById ban_duration).
end $$;

-- ───────────────────────── row-level security ─────────────────────────
alter table regions           enable row level security;
alter table sellers           enable row level security;
alter table admins            enable row level security;
alter table blacklist         enable row level security;
alter table listings          enable row level security;
alter table listing_contacts  enable row level security;
alter table listing_media     enable row level security;
alter table listing_decisions enable row level security;
alter table edit_tokens       enable row level security;   -- no policies: functions only
alter table notifications     enable row level security;   -- no policies: service role only
alter table audit_log         enable row level security;

create policy regions_read on regions for select using (true);

create policy sellers_own on sellers for select using (id = auth.uid());

create policy admins_self_or_global on admins for select
  using (id = auth.uid() or is_global_admin());

create policy blacklist_global_read on blacklist for select using (is_global_admin());

-- Listing content: the seller, global admins, and every active admin in the region.
-- (Contact details are NOT in this table.)
create policy listings_read on listings for select using (
  seller_id = auth.uid()
  or is_global_admin()
  or (is_active_admin() and region_id = my_region())
);

-- Masked contact details: seller, admin in charge, global admins. Nobody else.
create policy contacts_read on listing_contacts for select using (
  is_global_admin()
  or is_admin_in_charge(listing_id)
  or exists (select 1 from listings l where l.id = listing_id and l.seller_id = auth.uid())
);

create policy media_read on listing_media for select using (
  exists (select 1 from listings l where l.id = listing_id)   -- inherits listings_read
);

create policy decisions_read on listing_decisions for select using (
  is_global_admin()
  or (is_active_admin() and exists (select 1 from listings l where l.id = listing_id))
);
create policy decisions_insert on listing_decisions for insert
  with check (admin_id = auth.uid() and is_active_admin());

create policy audit_global_read on audit_log for select using (is_global_admin());

-- ───────────────────────── privileges ─────────────────────────
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select on regions to anon, authenticated;
grant select on sellers, admins, blacklist, listings, listing_contacts,
                listing_media, listing_decisions, audit_log to authenticated;
grant insert on listing_decisions to authenticated;

grant execute on function is_active_admin(), is_global_admin(), my_region(),
                          is_admin_in_charge(uuid), approvals_required(smallint) to authenticated;
grant execute on function create_listing(uuid, smallint, text, text, text, text, text,
                                         item_age, functional_status, numeric, jsonb) to authenticated;
grant execute on function reassign_listing(uuid, uuid, text),
                          admin_revoke(uuid, text),
                          admin_blacklist(uuid, text) to authenticated;
-- Edit links work without a login: the token is the credential.
grant execute on function get_listing_for_edit(text) to anon, authenticated;
grant execute on function resubmit_listing(text, text, text, text, item_age,
                                           functional_status, numeric, jsonb) to anon, authenticated;
-- is_phone_blacklisted() is for the server (service role) to check before sending an OTP.
