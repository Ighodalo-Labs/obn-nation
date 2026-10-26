-- 0006: link a phone number to a Telegram chat (CR-01, doc 11).
-- A bot cannot message a person first, so a number is linked once: the person presses Start
-- on a one-time link, then shares their own contact. Service role only, like otp_attempts.

create table public.telegram_links (
  phone            text primary key check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  chat_id          bigint not null,
  telegram_user_id bigint not null unique,
  username         text,
  linked_at        timestamptz not null default now()
);
alter table public.telegram_links enable row level security;   -- no policies: only the service role reaches it

create table public.telegram_link_requests (
  nonce      text primary key check (nonce ~ '^[0-9a-f]{32}$'),
  phone      text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  tg_chat_id bigint,
  tg_user_id bigint,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '15 minutes',
  used_at    timestamptz
);
alter table public.telegram_link_requests enable row level security;
create index telegram_link_requests_phone_idx on public.telegram_link_requests (phone);
create index telegram_link_requests_chat_idx on public.telegram_link_requests (tg_chat_id) where used_at is null;

-- A new pending link for this number. A live one is reused, so repeated taps do not pile up rows.
create function public.telegram_request_link(p_phone text) returns text
language plpgsql security definer set search_path = public as $$
declare v_nonce text;
begin
  delete from public.telegram_link_requests where expires_at < now() - interval '1 hour';
  select nonce into v_nonce from public.telegram_link_requests
   where phone = p_phone and used_at is null and expires_at > now()
   order by created_at desc limit 1;
  if v_nonce is not null then return v_nonce; end if;
  v_nonce := replace(gen_random_uuid()::text, '-', '');
  insert into public.telegram_link_requests (nonce, phone) values (v_nonce, p_phone);
  return v_nonce;
end $$;

-- The person pressed Start on the one-time link. Remember which chat and account it came from.
create function public.telegram_attach_start(p_nonce text, p_chat bigint, p_user bigint) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_n integer;
begin
  update public.telegram_link_requests set tg_chat_id = p_chat, tg_user_id = p_user
   where nonce = p_nonce and used_at is null and expires_at > now();
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- The person shared their contact. The caller has already checked contact.user_id = from.id.
-- Returns 'linked', 'phone_mismatch' (the shared number is not the one typed on the site) or 'no_request'.
create function public.telegram_complete_link(p_chat bigint, p_user bigint, p_contact_phone text, p_username text) returns text
language plpgsql security definer set search_path = public as $$
declare r public.telegram_link_requests;
begin
  select * into r from public.telegram_link_requests
   where tg_chat_id = p_chat and tg_user_id = p_user and used_at is null and expires_at > now()
   order by created_at desc limit 1 for update;
  if not found then return 'no_request'; end if;
  if r.phone <> p_contact_phone then return 'phone_mismatch'; end if;
  -- One Telegram account per number and one number per account: a relink replaces the old row.
  delete from public.telegram_links where phone = r.phone or telegram_user_id = p_user;
  insert into public.telegram_links (phone, chat_id, telegram_user_id, username) values (r.phone, p_chat, p_user, p_username);
  update public.telegram_link_requests set used_at = now() where nonce = r.nonce;
  return 'linked';
end $$;

-- The browser asks "did the link finish?". The nonce is 128 bits of random, so it is the secret.
create function public.telegram_link_done(p_nonce text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.telegram_link_requests where nonce = p_nonce and used_at is not null and expires_at > now() - interval '1 hour');
$$;

-- Where to send messages for this number. Null means not linked.
create function public.telegram_chat_for(p_phone text) returns bigint
language sql stable security definer set search_path = public as $$
  select chat_id from public.telegram_links where phone = p_phone;
$$;

revoke all on public.telegram_links, public.telegram_link_requests from public, anon, authenticated;
revoke execute on function public.telegram_request_link(text), public.telegram_attach_start(text, bigint, bigint),
  public.telegram_complete_link(bigint, bigint, text, text), public.telegram_link_done(text),
  public.telegram_chat_for(text) from public, anon, authenticated;
grant all on public.telegram_links, public.telegram_link_requests to service_role;
grant execute on function public.telegram_request_link(text), public.telegram_attach_start(text, bigint, bigint),
  public.telegram_complete_link(bigint, bigint, text, text), public.telegram_link_done(text),
  public.telegram_chat_for(text) to service_role;
