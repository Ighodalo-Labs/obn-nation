-- Run after stub_auth.sql and migrations 0001 to 0007. Prints "NEWSLETTER TESTS PASSED".
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on

create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as
$$ begin if not coalesce(cond, false) then raise exception 'FAIL: %', msg; end if; raise notice 'ok   - %', msg; end $$;
create or replace function pg_temp.state(cmd text) returns text language plpgsql as
$$ begin execute cmd; return '00000'; exception when others then return sqlstate; end $$;

select pg_temp.ok(public.newsletter_subscribe('ada@example.com', null, true, false) = 'subscribed', 'email only');
select pg_temp.ok(public.newsletter_subscribe(null, '+2348031234567', false, true) = 'subscribed', 'phone only');
select pg_temp.ok(public.newsletter_subscribe('bola@example.com', '+2348099999999', true, true) = 'subscribed', 'both');
select pg_temp.ok((select count(*) from public.newsletter_subscribers) = 3, 'three people stored');

select pg_temp.ok(public.newsletter_subscribe('ada@example.com', null, true, false) = 'subscribed', 'repeat email is accepted');
select pg_temp.ok((select count(*) from public.newsletter_subscribers) = 3, 'a repeat does not add a row');

-- same person adds a phone later: one row, now wants SMS too
select pg_temp.ok(public.newsletter_subscribe('ada@example.com', '+2348055555555', false, true) = 'subscribed', 'adds a phone to an existing email');
select pg_temp.ok((select count(*) from public.newsletter_subscribers) = 3, 'still three rows');
select pg_temp.ok((select wants_email and wants_sms and phone = '+2348055555555' from public.newsletter_subscribers where email = 'ada@example.com'), 'both choices kept');

-- unsubscribed person who signs up again is active again
update public.newsletter_subscribers set unsubscribed_at = now() where email = 'ada@example.com';
select public.newsletter_subscribe('ada@example.com', null, true, false);
select pg_temp.ok((select unsubscribed_at is null from public.newsletter_subscribers where email = 'ada@example.com'), 'signing up again clears unsubscribed');

-- bad data is refused
select pg_temp.ok(pg_temp.state($$select public.newsletter_subscribe('not-an-email', null, true, false)$$) = '23514', 'bad email refused');
select pg_temp.ok(pg_temp.state($$select public.newsletter_subscribe(null, '+441234567890', false, true)$$) = '23514', 'non-Nigerian phone refused');
select pg_temp.ok(pg_temp.state($$select public.newsletter_subscribe(null, null, true, true)$$) = '23514', 'nothing to store refused');
select pg_temp.ok(pg_temp.state($$select public.newsletter_subscribe('c@example.com', null, false, false)$$) = '23514', 'no choice refused');
select pg_temp.ok(pg_temp.state($$select public.newsletter_subscribe('C@Example.com', null, true, false)$$) = '23514', 'upper case email refused (the app lowercases first)');

-- privileges: only the service role
select pg_temp.ok(not has_table_privilege('anon', 'public.newsletter_subscribers', 'select'), 'anon cannot read');
select pg_temp.ok(not has_table_privilege('authenticated', 'public.newsletter_subscribers', 'select'), 'signed-in users cannot read');
select pg_temp.ok(not has_function_privilege('anon', 'public.newsletter_subscribe(text,text,boolean,boolean)', 'execute'), 'anon cannot call subscribe');
select pg_temp.ok(not has_function_privilege('authenticated', 'public.newsletter_subscribe(text,text,boolean,boolean)', 'execute'), 'signed-in users cannot call subscribe');
select pg_temp.ok(has_function_privilege('service_role', 'public.newsletter_subscribe(text,text,boolean,boolean)', 'execute'), 'service role can call subscribe');

\echo NEWSLETTER TESTS PASSED
