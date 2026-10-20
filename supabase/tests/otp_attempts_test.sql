-- Run after stub_auth.sql and migrations 0001 to 0003. Prints "OTP TESTS PASSED".
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on

create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as
$$ begin if not coalesce(cond, false) then raise exception 'FAIL: %', msg; end if; raise notice 'ok   - %', msg; end $$;
create or replace function pg_temp.state(cmd text) returns text language plpgsql as
$$ begin execute cmd; return '00000'; exception when others then return sqlstate; end $$;

select pg_temp.ok((select count(*) from public.otp_state('+2348031234567')) = 1
  and (select expired from public.otp_state('+2348031234567')), 'no code sent means expired');

select public.otp_mark_sent('+2348031234567');
select pg_temp.ok((select tries_left from public.otp_state('+2348031234567')) = 5
  and not (select expired from public.otp_state('+2348031234567')), 'a fresh code has 5 tries and is not expired');

select pg_temp.ok(public.otp_register_wrong('+2348031234567') = 4, 'first wrong code leaves 4 tries');
select public.otp_register_wrong('+2348031234567'); select public.otp_register_wrong('+2348031234567');
select public.otp_register_wrong('+2348031234567');
select pg_temp.ok(public.otp_register_wrong('+2348031234567') = 0, 'fifth wrong code voids the code');
select pg_temp.ok(public.otp_register_wrong('+2348031234567') = 0, 'more wrong codes stay at 0');
select pg_temp.ok((select tries_left from public.otp_state('+2348031234567')) = 0, 'state shows 0 tries left');

select public.otp_mark_sent('+2348031234567');
select pg_temp.ok((select tries_left from public.otp_state('+2348031234567')) = 5, 'sending a new code resets the count');

update public.otp_attempts set sent_at = now() - interval '11 minutes' where phone = '+2348031234567';
select pg_temp.ok((select expired from public.otp_state('+2348031234567')), 'a code older than 10 minutes is expired');
select pg_temp.ok(not (select expired from public.otp_state('+2348031234567', 1200)), 'the lifetime is a parameter');

select pg_temp.ok(public.otp_register_wrong('+2348039999999') = 0, 'wrong code for a number with no code creates nothing');
select pg_temp.ok((select count(*) from public.otp_attempts where phone = '+2348039999999') = 0, 'and leaves no row behind');

select public.otp_clear('+2348031234567');
select pg_temp.ok((select count(*) from public.otp_attempts) = 0, 'success clears the row');

select pg_temp.ok(pg_temp.state($$insert into public.otp_attempts (phone) values ('12345')$$) = '23514', 'phone shape is enforced');

-- privileges
set role authenticated;
select pg_temp.ok(pg_temp.state($$select * from public.otp_attempts$$) = '42501', 'signed-in users cannot read the table');
select pg_temp.ok(pg_temp.state($$select public.otp_mark_sent('+2348031234567')$$) = '42501', 'signed-in users cannot call otp_mark_sent');
select pg_temp.ok(pg_temp.state($$select public.otp_register_wrong('+2348031234567')$$) = '42501', 'signed-in users cannot call otp_register_wrong');
reset role;
set role anon;
select pg_temp.ok(pg_temp.state($$select * from public.otp_attempts$$) = '42501', 'anonymous callers cannot read the table');
select pg_temp.ok(pg_temp.state($$select public.otp_state('+2348031234567')$$) = '42501', 'anonymous callers cannot call otp_state');
reset role;
set role service_role;
select pg_temp.ok(pg_temp.state($$select public.otp_mark_sent('+2348031234567')$$) = '00000', 'service role can call otp_mark_sent');
reset role;

select 'OTP TESTS PASSED';
