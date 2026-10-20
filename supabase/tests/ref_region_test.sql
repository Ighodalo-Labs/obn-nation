-- Run after stub_auth.sql and migrations 0001 to 0005. Prints "REF REGION TESTS PASSED".
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as
$$ begin if not coalesce(cond, false) then raise exception 'FAIL: %', msg; end if; raise notice 'ok   - %', msg; end $$;
create or replace function pg_temp.state(cmd text) returns text language plpgsql as
$$ begin execute cmd; return '00000'; exception when others then return sqlstate; end $$;

insert into auth.users (id, phone) values
 ('c0000000-0000-0000-0000-000000000001','2348130000001'),
 ('c0000000-0000-0000-0000-000000000002','2348130000002'),
 ('c0000000-0000-0000-0000-000000000003','2348130000003'),
 ('c0000000-0000-0000-0000-000000000004','2348130000004');
select public.bootstrap_global_admin('+2348130000001');
update profiles set full_name = 'Glo' where id = 'c0000000-0000-0000-0000-000000000001';

set role authenticated; select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000001', false);
select public.promote_to_admin('c0000000-0000-0000-0000-000000000002'::uuid, 'regional_admin', 'delta') as code_d \gset
select public.promote_to_admin('c0000000-0000-0000-0000-000000000003'::uuid, 'regional_admin', 'ekiti') as code_e \gset

select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000004', false);
select pg_temp.ok(public.region_for_ref(:'code_d') = 'delta', 'a valid code gives the admin region');
select pg_temp.ok(public.region_for_ref(upper(:'code_e')) = 'ekiti', 'the code is matched without case');
select pg_temp.ok(public.region_for_ref('deadbeef') is null, 'an unknown code gives nothing');
select pg_temp.ok(public.region_for_ref('') is null, 'an empty code gives nothing');

reset role;
update profiles set is_active = false where id = 'c0000000-0000-0000-0000-000000000002';
set role authenticated; select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000004', false);
select pg_temp.ok(public.region_for_ref(:'code_d') is null, 'a revoked admin code gives nothing');

reset role; set role anon;
select pg_temp.ok(pg_temp.state($$select public.region_for_ref('deadbeef')$$) = '42501', 'signed-out visitors cannot call it');
reset role;
\echo REF REGION TESTS PASSED
