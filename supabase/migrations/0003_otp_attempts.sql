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
