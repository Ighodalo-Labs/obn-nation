-- Run after stub_auth.sql and migrations 0001 to 0006. Prints "TELEGRAM TESTS PASSED".
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on

create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as
$$ begin if not coalesce(cond, false) then raise exception 'FAIL: %', msg; end if; raise notice 'ok   - %', msg; end $$;
create or replace function pg_temp.state(cmd text) returns text language plpgsql as
$$ begin execute cmd; return '00000'; exception when others then return sqlstate; end $$;

select pg_temp.ok(public.telegram_chat_for('+2348031234567') is null, 'an unlinked number has no chat');

create temp table t(k text primary key, v text);
insert into t values ('n1', public.telegram_request_link('+2348031234567'));
select pg_temp.ok((select v from t where k = 'n1') ~ '^[0-9a-f]{32}$', 'nonce is 32 hex characters');
select pg_temp.ok(public.telegram_request_link('+2348031234567') = (select v from t where k = 'n1'), 'a live request is reused');
select pg_temp.ok(public.telegram_request_link('+2348031234568') <> (select v from t where k = 'n1'), 'another number gets its own request');

-- contact shared before Start: nothing to link
select pg_temp.ok(public.telegram_complete_link(100, 200, '+2348031234567', 'ada') = 'no_request', 'contact without Start is refused');

select pg_temp.ok(not public.telegram_attach_start('00000000000000000000000000000000', 100, 200), 'unknown nonce does not attach');
select pg_temp.ok(public.telegram_attach_start((select v from t where k = 'n1'), 100, 200), 'Start attaches chat and account');
select pg_temp.ok(not public.telegram_link_done((select v from t where k = 'n1')), 'not done before the contact is shared');

-- wrong number: shared contact is not the one typed on the site
select pg_temp.ok(public.telegram_complete_link(100, 200, '+2348099999999', 'ada') = 'phone_mismatch', 'a different number is refused');
select pg_temp.ok(public.telegram_chat_for('+2348031234567') is null and public.telegram_chat_for('+2348099999999') is null, 'mismatch links nothing');

-- someone else (other account) cannot finish this request
select pg_temp.ok(public.telegram_complete_link(100, 999, '+2348031234567', 'eve') = 'no_request', 'another account cannot use the request');

select pg_temp.ok(public.telegram_complete_link(100, 200, '+2348031234567', 'ada') = 'linked', 'right number links');
select pg_temp.ok(public.telegram_chat_for('+2348031234567') = 100, 'chat is found for the number');
select pg_temp.ok(public.telegram_link_done((select v from t where k = 'n1')), 'browser sees it done');
select pg_temp.ok(public.telegram_complete_link(100, 200, '+2348031234567', 'ada') = 'no_request', 'a request works once');
select pg_temp.ok(not public.telegram_attach_start((select v from t where k = 'n1'), 100, 200), 'a used request cannot be attached again');

-- relink: same account, new number replaces the old row
insert into t values ('n2', public.telegram_request_link('+2348055555555'));
select public.telegram_attach_start((select v from t where k = 'n2'), 101, 200);
select pg_temp.ok(public.telegram_complete_link(101, 200, '+2348055555555', 'ada') = 'linked', 'same account links a new number');
select pg_temp.ok(public.telegram_chat_for('+2348031234567') is null, 'the old number is unlinked');
select pg_temp.ok(public.telegram_chat_for('+2348055555555') = 101, 'the new number is linked');

-- number moves to another account: replaces the row
insert into t values ('n3', public.telegram_request_link('+2348055555555'));
select public.telegram_attach_start((select v from t where k = 'n3'), 300, 400);
select pg_temp.ok(public.telegram_complete_link(300, 400, '+2348055555555', null) = 'linked', 'a number can move to another account');
select pg_temp.ok(public.telegram_chat_for('+2348055555555') = 300, 'the number now points to the new chat');
select pg_temp.ok((select count(*) from public.telegram_links) = 1, 'still one row per number and per account');

-- expiry
insert into t values ('n4', public.telegram_request_link('+2348066666666'));
update public.telegram_link_requests set expires_at = now() - interval '1 minute' where nonce = (select v from t where k = 'n4');
select pg_temp.ok(not public.telegram_attach_start((select v from t where k = 'n4'), 500, 600), 'an expired request cannot be attached');
select pg_temp.ok(public.telegram_request_link('+2348066666666') <> (select v from t where k = 'n4'), 'an expired request is replaced');

-- shape checks
select pg_temp.ok(pg_temp.state($$insert into public.telegram_links (phone, chat_id, telegram_user_id) values ('0803', 1, 1)$$) = '23514', 'bad phone is refused');
select pg_temp.ok(pg_temp.state($$insert into public.telegram_link_requests (nonce, phone) values ('abc', '+2348031234567')$$) = '23514', 'bad nonce is refused');

-- privileges: clients cannot touch any of it
set role authenticated;
select pg_temp.ok(pg_temp.state($$select * from public.telegram_links$$) = '42501', 'signed-in users cannot read links');
select pg_temp.ok(pg_temp.state($$select * from public.telegram_link_requests$$) = '42501', 'signed-in users cannot read requests');
select pg_temp.ok(pg_temp.state($$select public.telegram_chat_for('+2348055555555')$$) = '42501', 'signed-in users cannot call telegram_chat_for');
set role anon;
select pg_temp.ok(pg_temp.state($$select public.telegram_request_link('+2348031234567')$$) = '42501', 'anonymous cannot request a link');
reset role;

\echo TELEGRAM TESTS PASSED
