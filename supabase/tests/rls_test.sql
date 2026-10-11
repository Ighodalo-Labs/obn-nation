-- Run against a scratch database after stub_auth.sql + migrations. Raises on first failure.
\set ON_ERROR_STOP on
\set QUIET on
create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as
$$ begin if not coalesce(cond,false) then raise exception 'FAIL: %', msg; end if; raise notice 'ok   - %', msg; end $$;

-- fixtures (as superuser)
insert into auth.users (id, phone) values
 ('a0000000-0000-0000-0000-000000000001','2348110000001'), -- global admin
 ('a0000000-0000-0000-0000-000000000002','2348110000002'), -- PH admin 1
 ('a0000000-0000-0000-0000-000000000003','2348110000003'), -- PH admin 2
 ('a0000000-0000-0000-0000-000000000004','2348110000004'), -- PH admin 3
 ('a0000000-0000-0000-0000-000000000005','2348110000005'), -- Ekiti admin
 ('b0000000-0000-0000-0000-000000000001','2348120000001'), -- seller 1
 ('b0000000-0000-0000-0000-000000000002','2348120000002'); -- seller 2
insert into admins (id, phone, full_name, role, region_id) values
 ('a0000000-0000-0000-0000-000000000001','+2348110000001','Global','global_admin',null),
 ('a0000000-0000-0000-0000-000000000002','+2348110000002','PH1','regional_admin',1),
 ('a0000000-0000-0000-0000-000000000003','+2348110000003','PH2','regional_admin',1),
 ('a0000000-0000-0000-0000-000000000005','+2348110000005','EK1','regional_admin',3);

\set g  '''a0000000-0000-0000-0000-000000000001'''
\set a1 '''a0000000-0000-0000-0000-000000000002'''
\set a2 '''a0000000-0000-0000-0000-000000000003'''
\set a3 '''a0000000-0000-0000-0000-000000000004'''
\set e1 '''a0000000-0000-0000-0000-000000000005'''
\set s1 '''b0000000-0000-0000-0000-000000000001'''
\set s2 '''b0000000-0000-0000-0000-000000000002'''

-- 1. seller creates a listing via referral link of PH1
select referral_code as ref1 from admins where id = :a1::uuid \gset
set role authenticated; select set_config('request.jwt.claim.sub', :s1, false);
select pg_temp.ok(true,'start');
create temp table t as select create_listing(
  '11111111-1111-1111-1111-111111111111', 1::smallint,
  :'ref1',
  'Ada','Electronics','Samsung fridge','Works fine','neatly_used','working_perfectly', 150000,
  '[{"kind":"photo","storage_path":"s1/a.jpg","size_bytes":500000}]'::jsonb) as id;
reset role;
select pg_temp.ok((select admin_in_charge from listings where id=(select id from t)) = :a1::uuid, 'referral assigns admin in charge');

-- 2. idempotent: same client_key does not duplicate
set role authenticated; select set_config('request.jwt.claim.sub', :s1, false);
select create_listing('11111111-1111-1111-1111-111111111111',1::smallint,null,'Ada','Electronics','Samsung fridge','x','neatly_used','working_perfectly',150000);
reset role;
select pg_temp.ok((select count(*) from listings)=1, 'double submit creates no duplicate');

-- 3. masking: PH2 sees listing, NOT contact; PH1 (in charge) sees contact; Ekiti sees nothing; global sees contact
set role authenticated; select set_config('request.jwt.claim.sub', :a2, false);
select pg_temp.ok((select count(*) from listings)=1, 'other PH admin sees listing content');
select pg_temp.ok((select count(*) from listing_contacts)=0, 'other PH admin cannot see contact (masked)');
select set_config('request.jwt.claim.sub', :a1, false);
select pg_temp.ok((select count(*) from listing_contacts)=1, 'admin in charge sees contact');
select set_config('request.jwt.claim.sub', :e1, false);
select pg_temp.ok((select count(*) from listings)=0, 'other region sees nothing');
select set_config('request.jwt.claim.sub', :g, false);
select pg_temp.ok((select count(*) from listing_contacts)=1, 'global admin sees contact');
select set_config('request.jwt.claim.sub', :s2, false);
select pg_temp.ok((select count(*) from listings)=0 and (select count(*) from listing_contacts)=0, 'other seller sees nothing');
reset role;

-- 4. consensus: PH has 2 active admins -> 1 approval enough
set role authenticated; select set_config('request.jwt.claim.sub', :a2, false);
insert into listing_decisions (listing_id, admin_id, decision) select id, :a2::uuid, 'approve' from t;
reset role;
select pg_temp.ok((select status from listings where id=(select id from t))='approved', '2 or fewer admins: one approval publishes');

-- 5. wrong region cannot decide
set role authenticated; select set_config('request.jwt.claim.sub', :s1, false);
create temp table t2 as select create_listing('22222222-2222-2222-2222-222222222222',1::smallint,null,'Ada','Phones','iPhone','x','fairly_used','minor_issues',90000) as id;
reset role;
do $$ begin
  set local role authenticated; perform set_config('request.jwt.claim.sub','a0000000-0000-0000-0000-000000000005',true);
  begin insert into listing_decisions (listing_id, admin_id, decision) select id, 'a0000000-0000-0000-0000-000000000005','approve' from t2;
    raise exception 'FAIL: wrong region allowed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok   - wrong region blocked (%)', sqlerrm; end;
end $$;

-- 6. no admin in charge yet -> first approver becomes in charge; with 3 admins 2 approvals needed
insert into auth.users (id, phone) values ('a0000000-0000-0000-0000-000000000004','2348110000004') on conflict do nothing;
insert into admins (id, phone, full_name, role, region_id) values ('a0000000-0000-0000-0000-000000000004','+2348110000004','PH3','regional_admin',1);
set role authenticated; select set_config('request.jwt.claim.sub', :a1, false);
insert into listing_decisions (listing_id, admin_id, decision) select id, :a1::uuid, 'approve' from t2;
reset role;
select pg_temp.ok((select status from listings where id=(select id from t2))='pending', '3 admins: one approval is not enough');
select pg_temp.ok((select admin_in_charge from listings where id=(select id from t2))=:a1::uuid, 'first approver becomes admin in charge');
set role authenticated; select set_config('request.jwt.claim.sub', :a2, false);
insert into listing_decisions (listing_id, admin_id, decision) select id, :a2::uuid, 'approve' from t2;
reset role;
select pg_temp.ok((select status from listings where id=(select id from t2))='approved', '3 admins: second approval publishes');

-- 7. reject -> token + notification; resubmit burns token; replay fails; no duplicate row
set role authenticated; select set_config('request.jwt.claim.sub', :s1, false);
create temp table t3 as select create_listing('33333333-3333-3333-3333-333333333333',1::smallint,null,'Ada','Home','Blender','x','neatly_used','working_perfectly',20000) as id;
select set_config('request.jwt.claim.sub', :a3, false);
insert into listing_decisions (listing_id, admin_id, decision, reason) select id, :a3::uuid, 'reject', 'Photo is blurry' from t3;
reset role;
select pg_temp.ok((select status from listings where id=(select id from t3))='rejected', 'rejection sets status');
select pg_temp.ok((select count(*) from notifications where template='listing_rejected')=1, 'rejection queues WhatsApp template');
create temp table tok as select payload->>'token' as tk from notifications where template='listing_rejected';
select pg_temp.ok((select (get_listing_for_edit(tk))->>'title' from tok)='Blender', 'edit link returns pre-filled listing');
select resubmit_listing((select tk from tok),'Home','Blender (clear photo)','x','neatly_used','working_perfectly',20000, null);
select pg_temp.ok((select status from listings where id=(select id from t3))='pending' and (select revision from listings where id=(select id from t3))=2, 'resubmit -> pending, revision 2');
select pg_temp.ok((select count(*) from listings where title like 'Blender%')=1, 'resubmit makes no duplicate listing');
do $$ begin
  begin perform resubmit_listing((select tk from tok),'Home','Again','x','neatly_used','working_perfectly',1,null);
    raise exception 'FAIL: token reuse allowed';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok   - token cannot be reused (%)', sqlerrm; end;
end $$;

-- 8. revoke + blacklist
set role authenticated; select set_config('request.jwt.claim.sub', :a1, false);
do $$ begin begin perform admin_revoke('a0000000-0000-0000-0000-000000000003','x'); raise exception 'FAIL: non-global revoke';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok   - regional admin cannot revoke (%)', sqlerrm; end; end $$;
select set_config('request.jwt.claim.sub', :g, false);
select admin_blacklist(:a1::uuid, 'Left the organisation');
select admin_revoke(:a2::uuid, 'Retired');
reset role;
select pg_temp.ok((select status from admins where id=:a1::uuid)='blacklisted', 'blacklist sets status');
set role authenticated; select set_config('request.jwt.claim.sub', :a1, false);
select pg_temp.ok((select count(*) from listings)=0 and (select count(*) from listing_contacts)=0, 'blacklisted admin loses all data access');
select set_config('request.jwt.claim.sub', :a2, false);
select pg_temp.ok((select count(*) from listings)=0, 'revoked admin loses all data access');
reset role;
do $$ begin
  begin insert into auth.users (id, phone) values ('a0000000-0000-0000-0000-0000000000ff','2348110000002') ;
  exception when others then null; end;
  begin insert into admins (id, phone, full_name, role, region_id) values (gen_random_uuid(),'+2348110000002','Re-add','regional_admin',1);
    raise exception 'FAIL: blacklisted phone re-added';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok   - re-adding a blacklisted/blocked phone fails (%)', sqlerrm; end;
end $$;
select pg_temp.ok((select count(*) from audit_log)=2, 'audit log has 2 entries');

-- 9. reassign by global admin; clients cannot touch notifications/edit_tokens
set role authenticated; select set_config('request.jwt.claim.sub', :g, false);
select reassign_listing((select id from t), :a3::uuid, 'Original admin left');
reset role;
select pg_temp.ok((select admin_in_charge from listings where id=(select id from t))=:a3::uuid, 'global admin reassigns listing');
set role authenticated; select set_config('request.jwt.claim.sub', :a3, false);
do $$ begin begin perform count(*) from notifications; raise exception 'FAIL: notifications readable';
  exception when others then if sqlerrm like 'FAIL%' then raise; end if; raise notice 'ok   - clients cannot read notifications'; end; end $$;
reset role;
\echo ALL TESTS PASSED
