-- 0007: newsletter sign-ups by email and SMS (review OBN-M1-UAT-001). Milestone 1 only collects them.
-- Service role only, like telegram_links. Nothing is sent yet.

create table public.newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text check (email is null or (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254)),
  phone           text check (phone is null or phone ~ '^\+234[789][0-9]{9}$'),
  wants_email     boolean not null default false,
  wants_sms       boolean not null default false,
  source          text not null default 'footer',
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz,
  check (email is not null or phone is not null),
  check (not wants_email or email is not null),
  check (not wants_sms or phone is not null),
  check (wants_email or wants_sms)
);
alter table public.newsletter_subscribers enable row level security;   -- no policies: only the service role reaches it
create unique index newsletter_subscribers_email_idx on public.newsletter_subscribers (email) where email is not null;
create unique index newsletter_subscribers_phone_idx on public.newsletter_subscribers (phone) where phone is not null;

-- Adds a subscriber, or updates the one that already has this email or phone. A repeat sign-up is not an error.
create function public.newsletter_subscribe(p_email text, p_phone text, p_wants_email boolean, p_wants_sms boolean) returns text
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.newsletter_subscribers
   where (p_email is not null and email = p_email) or (p_phone is not null and phone = p_phone)
   order by created_at limit 1;
  if v_id is null then
    insert into public.newsletter_subscribers (email, phone, wants_email, wants_sms)
    values (p_email, p_phone, p_wants_email, p_wants_sms);
  else
    update public.newsletter_subscribers
       set email       = coalesce(p_email, email),
           phone       = coalesce(p_phone, phone),
           wants_email = wants_email or p_wants_email,
           wants_sms   = wants_sms or p_wants_sms,
           unsubscribed_at = null
     where id = v_id;
  end if;
  return 'subscribed';
end $$;

revoke all on public.newsletter_subscribers from public, anon, authenticated;
revoke execute on function public.newsletter_subscribe(text, text, boolean, boolean) from public, anon, authenticated;
grant all on public.newsletter_subscribers to service_role;
grant execute on function public.newsletter_subscribe(text, text, boolean, boolean) to service_role;
