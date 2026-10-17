-- Run after stub_auth.sql + both migrations, on a scratch database. Stops at the first failure.
-- Prints "ALL TESTS PASSED" at the end.
\set ON_ERROR_STOP on
\set QUIET on
\pset tuples_only on

create or replace function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as
$$ begin if not coalesce(cond, false) then raise exception 'FAIL: %', msg; end if; raise notice 'ok   - %', msg; end $$;

-- Runs a statement as the current role and returns its SQLSTATE ('00000' when it succeeds).
create or replace function pg_temp.state(cmd text) returns text language plpgsql as
$$ begin execute cmd; return '00000'; exception when others then return sqlstate; end $$;

-- ---------------------------------------------------------------- fixtures (superuser)
insert into auth.users (id, phone) values
 ('a0000000-0000-0000-0000-000000000001','2348110000001'),  -- global admin
 ('a0000000-0000-0000-0000-000000000002','2348110000002'),  -- PH admin 1
 ('a0000000-0000-0000-0000-000000000003','2348110000003'),  -- PH admin 2
 ('a0000000-0000-0000-0000-000000000004','2348110000004'),  -- PH admin 3 (blacklisted later)
 ('a0000000-0000-0000-0000-000000000005','2348110000005'),  -- Ekiti admin
 ('b0000000-0000-0000-0000-000000000001','2348120000001'),  -- seller 1 (Ada Obi)
 ('b0000000-0000-0000-0000-000000000002','2348120000002'),  -- seller 2 (Bola Ade)
 ('b0000000-0000-0000-0000-000000000003','2348120000003');  -- seller 3 (no name yet)
update profiles set full_name = 'Ada Obi'  where id = 'b0000000-0000-0000-0000-000000000001';
update profiles set full_name = 'Bola Ade' where id = 'b0000000-0000-0000-0000-000000000002';
update profiles set full_name = 'Tunde Bello' where id = 'a0000000-0000-0000-0000-000000000003';

\set g  '''a0000000-0000-0000-0000-000000000001'''
\set a1 '''a0000000-0000-0000-0000-000000000002'''
\set a2 '''a0000000-0000-0000-0000-000000000003'''
\set a3 '''a0000000-0000-0000-0000-000000000004'''
\set e1 '''a0000000-0000-0000-0000-000000000005'''
\set s1 '''b0000000-0000-0000-0000-000000000001'''
\set s2 '''b0000000-0000-0000-0000-000000000002'''
\set s3 '''b0000000-0000-0000-0000-000000000003'''

select pg_temp.ok((select phone from profiles where id = :s1::uuid) = '+2348120000001', 'auth user creates a seller profile with +phone');
select public.bootstrap_global_admin('+2348110000001') is not null as boot \gset
select pg_temp.ok((select role from profiles where id = :g::uuid) = 'global_admin', 'bootstrap makes the first global admin');

-- ---------------------------------------------------------------- admin management
set role authenticated; select set_config('request.jwt.claim.sub', :s2, false);
select pg_temp.ok(pg_temp.state(format('select public.promote_to_admin(%L::uuid, ''regional_admin'', ''delta'')', :a1)) = '42501', 'seller cannot promote anyone');
select set_config('request.jwt.claim.sub', :g, false);
select public.promote_to_admin(:a1::uuid, 'regional_admin', 'port_harcourt') as code1 \gset
select public.promote_to_admin(:a2::uuid, 'regional_admin', 'port_harcourt');
select public.promote_to_admin(:a3::uuid, 'regional_admin', 'port_harcourt');
select public.promote_to_admin(:e1::uuid, 'regional_admin', 'ekiti');
select pg_temp.ok(:'code1' ~ '^[a-f0-9]{8}$', 'regional admin gets an 8-char referral code');
select pg_temp.ok(pg_temp.state(format('select public.promote_to_admin(%L::uuid, ''regional_admin'', ''delta'')', :a1)) = 'OB006', 'cannot promote someone who is already an admin');
select pg_temp.ok(pg_temp.state(format('select public.promote_to_admin(%L::uuid, ''regional_admin'', null)', :s3)) = '23514', 'regional admin needs a region');
reset role;

-- ---------------------------------------------------------------- listing creation and validation
set role authenticated; select set_config('request.jwt.claim.sub', :s1, false);
insert into listings (client_key, seller_id, region, category, title, description, price_ngn, condition_age, condition_work, brand)
values ('11111111-1111-1111-1111-111111111111', :s1::uuid, 'port_harcourt', 'fridges', 'Samsung fridge', 'Double door, cools well', 150000, 'neatly_used', 'working_perfectly', 'Samsung');
insert into listings (client_key, seller_id, region, category, title, description, price_ngn, condition_age, condition_work)
values ('11111111-1111-1111-1111-111111111111', :s1::uuid, 'port_harcourt', 'fridges', 'Samsung fridge', 'Double door, cools well', 150000, 'neatly_used', 'working_perfectly')
on conflict (seller_id, client_key) do nothing;
select id as l1 from listings where seller_id = :s1::uuid \gset
select pg_temp.ok((select count(*) from listings) = 1, 'same client_key twice creates one listing (idempotent)');
select pg_temp.ok((select status from listings where id = :'l1') = 'draft' and (select assigned_admin_id from listings where id = :'l1') is null, 'new listing is an unassigned draft');
select pg_temp.ok(pg_temp.state(format('update listings set status=''pending_review'' where id=%L', :'l1')) = '23514', 'submitting with 0 photos is rejected');
select pg_temp.ok(pg_temp.state(format('update listings set photo_urls = array[%L], status=''pending_review'' where id=%L', :s2 || '/' || :'l1' || '/1.webp', :'l1')) = '23514', 'media path in another seller folder is rejected');
select pg_temp.ok(pg_temp.state(format($q$update listings set photo_urls = array['%1$s/%2$s/1.webp','%1$s/%2$s/2.webp','%1$s/%2$s/3.webp','%1$s/%2$s/4.webp','%1$s/%2$s/5.webp','%1$s/%2$s/6.webp','%1$s/%2$s/7.webp'], status='pending_review' where id=%2$L$q$, trim(both '''' from :s1), :'l1')) = '23514', 'more than 6 photos is rejected');
select pg_temp.ok(pg_temp.state('insert into listings (client_key, seller_id, region, category, title, description, price_ngn, condition_age, condition_work) values (gen_random_uuid(), ' || quote_literal(trim(both '''' from :s1)) || ', ''ekiti'', ''phones'', ''Phone'', ''A decent phone here'', 0, ''neatly_used'', ''minor_issues'')') = '23514', 'price must be above zero');
select pg_temp.ok((select count(*) from listings where status <> 'draft') = 0, 'drafts stay drafts after failed submits');
reset role;

-- submit l1 (no video: optional)
set role authenticated; select set_config('request.jwt.claim.sub', :s1, false);
select format('%s/%s/1.webp', trim(both '''' from :s1), :'l1') as p1,
       format('%s/%s/2.webp', trim(both '''' from :s1), :'l1') as p2 \gset
update listings set photo_urls = array[:'p1', :'p2'], status = 'pending_review' where id = :'l1';
select pg_temp.ok((select status from listings where id = :'l1') = 'pending_review' and (select video_url from listings where id = :'l1') is null and (select submitted_at from listings where id = :'l1') is not null, 'listing with photos and no video submits');
select pg_temp.ok(pg_temp.state(format('update listings set title=%L where id=%L', 'Changed title', :'l1')) = '00000' and (select title from listings where id = :'l1') = 'Samsung fridge', 'seller cannot edit a listing under review');

reset role;
-- seller 3 has no name: cannot submit (explicit id so the media path is valid)
select pg_temp.ok(pg_temp.state('insert into listings (id, client_key, seller_id, region, category, title, description, price_ngn, condition_age, condition_work, photo_urls, status) values (''c0000000-0000-0000-0000-000000000001'', gen_random_uuid(), ' || quote_literal(trim(both '''' from :s3)) || ', ''ekiti'', ''phones'', ''Phone'', ''A decent phone here'', 5000, ''neatly_used'', ''minor_issues'', array[' || quote_literal(trim(both '''' from :s3) || '/c0000000-0000-0000-0000-000000000001/1.webp') || '], ''pending_review'')') = '23514'
  and (select count(*) from listings where seller_id = :s3::uuid) = 0, 'seller without a name cannot submit');

-- ---------------------------------------------------------------- masking and visibility (organic listing l1, PH)
set role authenticated; select set_config('request.jwt.claim.sub', :a2, false);
select pg_temp.ok((select count(*) from regional_listings_feed where id = :'l1') = 1, 'PH admin sees unclaimed PH listing in feed');
select pg_temp.ok((select seller_name from regional_listings_feed where id = :'l1') = 'A***' and (select seller_phone from regional_listings_feed where id = :'l1') = '+234 ••• ••• ••01', 'unclaimed listing: seller name and phone are masked');
select pg_temp.ok((select count(*) from profiles where id = :s1::uuid) = 0, 'PH admin cannot read the seller profile directly');
select pg_temp.ok((select count(*) from listings where id = :'l1') = 1, 'PH admin can read listing content');
select set_config('request.jwt.claim.sub', :e1, false);
select pg_temp.ok((select count(*) from regional_listings_feed) = 0 and (select count(*) from listings) = 0, 'Ekiti admin sees nothing from Port Harcourt');
select set_config('request.jwt.claim.sub', :g, false);
select pg_temp.ok((select seller_phone from regional_listings_feed where id = :'l1') = '+2348120000001', 'global admin sees the real phone');
select set_config('request.jwt.claim.sub', :s2, false);
select pg_temp.ok((select count(*) from listings) = 0 and (select count(*) from regional_listings_feed) = 0, 'other sellers see nothing');
reset role;

-- ---------------------------------------------------------------- claim, approve (organic: first admin wins)
set role authenticated; select set_config('request.jwt.claim.sub', :e1, false);
select pg_temp.ok(pg_temp.state(format('select public.approve_listing(%L)', :'l1')) in ('P0002','42501'), 'Ekiti admin cannot approve a PH listing');
select set_config('request.jwt.claim.sub', :a2, false);
select public.claim_listing(:'l1'::uuid);
select pg_temp.ok((select assigned_admin_id from listings where id = :'l1') = :a2::uuid, 'first admin to claim becomes admin in charge');
select pg_temp.ok((select seller_phone from regional_listings_feed where id = :'l1') = '+2348120000001', 'admin in charge sees the real phone');
select pg_temp.ok((select count(*) from profiles where id = :s1::uuid) = 1, 'admin in charge can read the seller profile');
select set_config('request.jwt.claim.sub', :a1, false);
select pg_temp.ok(pg_temp.state(format('select public.claim_listing(%L)', :'l1')) = 'OB005', 'second admin cannot claim a claimed listing');
select pg_temp.ok(pg_temp.state(format('select public.approve_listing(%L)', :'l1')) = '42501', 'other PH admin cannot approve a listing assigned elsewhere');
select pg_temp.ok((select count(*) from regional_listings_feed where id = :'l1') = 0, 'claimed pending listing disappears from other admins');
select set_config('request.jwt.claim.sub', :a2, false);
select public.approve_listing(:'l1'::uuid);
select pg_temp.ok((select status from listings where id = :'l1') = 'approved' and (select approved_by from listings where id = :'l1') = :a2::uuid, 'one approval makes the listing live');
select pg_temp.ok(pg_temp.state(format('select public.approve_listing(%L)', :'l1')) = '55000', 'cannot approve twice');
select set_config('request.jwt.claim.sub', :a1, false);
select pg_temp.ok((select seller_name from regional_listings_feed where id = :'l1') = 'A***', 'approved pool: other PH admin sees masked name');
select pg_temp.ok((select admin_in_charge_name from regional_listings_feed where id = :'l1') = 'Tunde', 'feed shows the admin in charge by first name only');
select set_config('request.jwt.claim.sub', :e1, false);
select pg_temp.ok((select count(*) from regional_listings_feed) = 0, 'approved PH listing is not in the Ekiti pool');
reset role;

-- ---------------------------------------------------------------- referral listing (assigned to a1, single approval)
set role authenticated; select set_config('request.jwt.claim.sub', :s2, false);
insert into listings (client_key, seller_id, ref_code, region, category, title, description, price_ngn, condition_age, condition_work)
values ('22222222-2222-2222-2222-222222222222', :s2::uuid, upper(:'code1'), 'ekiti', 'tvs', 'LG 43 inch TV', 'Smart TV with remote', 90000, 'premium_used', 'working_perfectly');
select id as l2 from listings where seller_id = :s2::uuid \gset
select pg_temp.ok((select assigned_admin_id from listings where id = :'l2') = :a1::uuid and (select region from listings where id = :'l2') = 'port_harcourt', 'referral code assigns admin in charge and forces the admin region');
select format('%s/%s/1.webp', trim(both '''' from :s2), :'l2') as q1 \gset
select format('%s/%s/v.mp4', trim(both '''' from :s2), :'l2') as qv \gset
update listings set photo_urls = array[:'q1'], video_url = :'qv', status = 'pending_review' where id = :'l2';
select pg_temp.ok((select video_url from listings where id = :'l2') = :'qv', 'listing with one video submits');
select set_config('request.jwt.claim.sub', :a2, false);
select pg_temp.ok((select count(*) from regional_listings_feed where id = :'l2') = 0, 'other PH admin cannot see a referral listing under review');
select pg_temp.ok(pg_temp.state(format('select public.approve_listing(%L)', :'l2')) = '42501', 'other PH admin cannot approve a referral listing');
select set_config('request.jwt.claim.sub', :a1, false);
select pg_temp.ok((select seller_name from regional_listings_feed where id = :'l2') = 'Bola Ade', 'assigned admin sees seller details');
reset role;

-- ---------------------------------------------------------------- Global Admin override on review
set role authenticated; select set_config('request.jwt.claim.sub', :s1, false);
insert into listings (client_key, seller_id, ref_code, region, category, title, description, price_ngn, condition_age, condition_work)
values ('33333333-3333-3333-3333-333333333333', :s1::uuid, :'code1', 'port_harcourt', 'phones', 'Tecno Spark phone', 'Clean phone with box', 45000, 'neatly_used', 'working_perfectly'),
       ('44444444-4444-4444-4444-444444444444', :s1::uuid, null, 'port_harcourt', 'kitchen', 'Gas cooker', 'Four burner gas cooker', 60000, 'fairly_used', 'minor_issues');
select id as l3 from listings where client_key = '33333333-3333-3333-3333-333333333333' \gset
select id as l4 from listings where client_key = '44444444-4444-4444-4444-444444444444' \gset
select format('%s/%s/1.webp', trim(both '''' from :s1), :'l3') as p3, format('%s/%s/1.webp', trim(both '''' from :s1), :'l4') as p4 \gset
update listings set photo_urls = array[:'p3'], status = 'pending_review' where id = :'l3';
update listings set photo_urls = array[:'p4'], status = 'pending_review' where id = :'l4';
select set_config('request.jwt.claim.sub', :g, false);
select public.approve_listing(:'l3'::uuid);
select pg_temp.ok((select status from listings where id = :'l3') = 'approved' and (select assigned_admin_id from listings where id = :'l3') = :a1::uuid and (select approved_by from listings where id = :'l3') = :g::uuid, 'Global Admin can approve another admin''s listing without taking it over');
select public.approve_listing(:'l4'::uuid);
select pg_temp.ok((select assigned_admin_id from listings where id = :'l4') = :g::uuid, 'Global Admin approving an unclaimed listing becomes the admin in charge');
reset role;

-- ---------------------------------------------------------------- rejection, edit link, resubmit
set role service_role;
select encode(sha256('11111111-aaaa-4aaa-8aaa-000000000001'::bytea), 'hex') as h1 \gset
select pg_temp.ok(pg_temp.state(format('select public.reject_listing(%L, %L, %L, %L)', :a2, :'l2', 'bad photos please retake', :'h1')) = '42501', 'only the assigned admin can reject a referral listing');
select pg_temp.ok(pg_temp.state(format('select public.reject_listing(%L, %L, %L, %L)', :a1, :'l2', 'no', :'h1')) = '23514', 'rejection needs a real reason');
select public.reject_listing(:a1::uuid, :'l2'::uuid, 'Photos are blurry, please retake', :'h1');
select pg_temp.ok((select status from listings where id = :'l2') = 'rejected' and (select count(*) from listing_tokens where listing_id = :'l2'::uuid) = 1, 'rejection stores the reason and one token hash');
select pg_temp.ok((select expires_at - created_at from listing_tokens where token_hash = :'h1') = interval '30 days', 'token lives 30 days');
select pg_temp.ok(public.get_listing_for_edit(:'h1')->>'title' = 'LG 43 inch TV', 'valid token returns the listing to pre-fill the form');
select public.resubmit_listing(:'h1', jsonb_build_object('title','LG 43 inch Smart TV','photo_urls', jsonb_build_array(:'q1'), 'video_url', null)) as rid \gset
select pg_temp.ok(:'rid' = :'l2', 'resubmit updates the same listing');
select pg_temp.ok((select count(*) from listings where seller_id = :s2::uuid) = 1, 'no duplicate listing after resubmit');
select pg_temp.ok((select status from listings where id = :'l2') = 'pending_review' and (select title from listings where id = :'l2') = 'LG 43 inch Smart TV' and (select video_url from listings where id = :'l2') is null and (select resubmit_count from listings where id = :'l2') = 1, 'resubmit moves it back to pending with the edits (video removed)');
select pg_temp.ok((select used_at from listing_tokens where token_hash = :'h1') is not null, 'token is burned on resubmit');
select pg_temp.ok(pg_temp.state(format('select public.resubmit_listing(%L, ''{}''::jsonb)', :'h1')) = 'OB002', 'replaying the token fails');
select pg_temp.ok(pg_temp.state(format('select public.get_listing_for_edit(%L)', :'h1')) = 'OB002', 'used token cannot open the edit page');
select pg_temp.ok(pg_temp.state(format('select public.get_listing_for_edit(%L)', repeat('0', 64))) = 'OB001', 'unknown token is invalid');

-- expiry and reissue
select encode(sha256('22222222-bbbb-4bbb-8bbb-000000000002'::bytea), 'hex') as h2 \gset
select encode(sha256('33333333-cccc-4ccc-8ccc-000000000003'::bytea), 'hex') as h3 \gset
select public.reject_listing(:a1::uuid, :'l2'::uuid, 'Price looks too high for the model', :'h2');
update listing_tokens set expires_at = now() - interval '1 minute' where token_hash = :'h2';
select pg_temp.ok(pg_temp.state(format('select public.get_listing_for_edit(%L)', :'h2')) = 'OB003', 'expired token is refused');
select public.reissue_edit_link(:a1::uuid, :'l2'::uuid, :'h3');
select pg_temp.ok(pg_temp.state(format('select public.get_listing_for_edit(%L)', :'h2')) = 'OB004', 'reissue revokes the older link');
select pg_temp.ok(public.get_listing_for_edit(:'h3')->>'title' = 'LG 43 inch Smart TV', 'new link works');
select pg_temp.ok(pg_temp.state(format('select public.resubmit_listing(%L, %L::jsonb)', :'h3', '{"photo_urls":["x/y/z.webp"]}')) = '23514', 'resubmit cannot point at someone else''s media');
select pg_temp.ok((select used_at from listing_tokens where token_hash = :'h3') is null, 'failed resubmit does not burn the token');
select public.resubmit_listing(:'h3', '{}'::jsonb);
select pg_temp.ok((select status from listings where id = :'l2') = 'pending_review' and (select resubmit_count from listings where id = :'l2') = 2, 'second loop works with the new link');
reset role;

-- ---------------------------------------------------------------- privileges
set role authenticated; select set_config('request.jwt.claim.sub', :a1, false);
select pg_temp.ok(pg_temp.state(format('select public.reject_listing(%L,%L,%L,%L)', :a1, :'l2', 'because reasons', repeat('a', 64))) = '42501', 'signed-in users cannot call the server-only reject function');
select pg_temp.ok(pg_temp.state('select * from listing_tokens') = '42501', 'signed-in users cannot read tokens');
select pg_temp.ok(pg_temp.state('select public.resubmit_listing(repeat(''a'',64), ''{}''::jsonb)') = '42501', 'signed-in users cannot call resubmit');
select pg_temp.ok(pg_temp.state(format('update profiles set role = ''global_admin'' where id = %L', :a1)) = '42501', 'nobody can change their own role');
select pg_temp.state(format('update listings set status = ''approved'' where id = %L', :'l2')) as upd \gset
select pg_temp.ok((select status from listings where id = :'l2') = 'pending_review', 'admins cannot approve with a direct table update (no row changes)');
select pg_temp.ok((select count(*) from audit_log) = 0, 'regional admin cannot read the audit log');
reset role;
set role anon;
select pg_temp.ok(pg_temp.state('select * from regional_listings_feed') = '42501' and pg_temp.state('select * from listings') = '42501' and pg_temp.state('select * from profiles') = '42501', 'anonymous visitors read nothing');
reset role;

-- ---------------------------------------------------------------- global admin: reassign, revoke, blacklist
set role authenticated; select set_config('request.jwt.claim.sub', :a1, false);
select pg_temp.ok(pg_temp.state(format('select public.reassign_listing(%L, %L, %L)', :'l1', :a1, 'moving it over')) = '42501', 'regional admin cannot reassign');
select set_config('request.jwt.claim.sub', :g, false);
select pg_temp.ok(pg_temp.state(format('select public.reassign_listing(%L, %L, %L)', :'l1', :e1, 'wrong region admin')) = '23514', 'cannot reassign to an admin of another region');
select pg_temp.ok(pg_temp.state(format('select public.reassign_listing(%L, %L, %L)', :'l1', :a1, 'x')) = '23514', 'reassign needs a reason');
select public.reassign_listing(:'l1'::uuid, :a1::uuid, 'Original admin is unreachable');
select pg_temp.ok((select assigned_admin_id from listings where id = :'l1') = :a1::uuid, 'global admin reassigns an approved listing');
select set_config('request.jwt.claim.sub', :a2, false);
select pg_temp.ok((select seller_phone from regional_listings_feed where id = :'l1') like '+234 ••• ••• ••%', 'previous admin now sees it masked');
select set_config('request.jwt.claim.sub', :g, false);
select pg_temp.ok((select detail->>'reason' from audit_log where action = 'listing.reassign') = 'Original admin is unreachable', 'reassign is written to the audit log');

-- revoke a1: pending referral listing returns to the open queue; access ends at once
select public.revoke_admin(:a1::uuid, 'Left the team');
select pg_temp.ok((select assigned_admin_id from listings where id = :'l2') is null, 'revoked admin''s pending listings are released');
select set_config('request.jwt.claim.sub', :a1, false);
select pg_temp.ok((select count(*) from regional_listings_feed) = 0 and (select count(*) from listings) = 0, 'revoked admin sees nothing');
select pg_temp.ok(pg_temp.state(format('select public.claim_listing(%L)', :'l2')) in ('42501'), 'revoked admin cannot act');
select set_config('request.jwt.claim.sub', :g, false);
select public.reinstate_admin(:a1::uuid);
select set_config('request.jwt.claim.sub', :a1, false);
select pg_temp.ok((select count(*) from regional_listings_feed) >= 1, 'reinstated admin sees the region again');
reset role;

set role service_role;
select pg_temp.ok(pg_temp.state(format('select public.blacklist_admin(%L, %L, %L)', :a2, :a3, 'trying to blacklist')) = '42501', 'only a global admin can blacklist');
select public.blacklist_admin(:g::uuid, :a3::uuid, 'Posed as the brand in a group chat');
select public.blacklist_admin(:g::uuid, :a3::uuid, 'Posed as the brand in a group chat');   -- repeat is safe
reset role;
select pg_temp.ok((select is_blacklisted and not is_active from profiles where id = :a3::uuid), 'blacklist flips both flags');
set role authenticated; select set_config('request.jwt.claim.sub', :a3, false);
select pg_temp.ok((select count(*) from regional_listings_feed) = 0 and (select count(*) from listings) = 0 and (select count(*) from profiles) = 0, 'blacklisted admin reads nothing');
select pg_temp.ok(pg_temp.state('insert into listings (client_key, seller_id, region, category, title, description, price_ngn, condition_age, condition_work) values (gen_random_uuid(), ' || quote_literal(trim(both '''' from :a3)) || ', ''delta'', ''phones'', ''Phone'', ''A decent phone here'', 5000, ''neatly_used'', ''minor_issues'')') = '42501', 'blacklisted user cannot write');
select pg_temp.ok(pg_temp.state(format('select public.approve_listing(%L)', :'l1')) = '42501', 'blacklisted admin cannot approve');
select set_config('request.jwt.claim.sub', :g, false);
select pg_temp.ok(pg_temp.state(format('select public.reinstate_admin(%L)', :a3)) = '55006', 'blacklist cannot be undone by reinstate');
select pg_temp.ok(pg_temp.state(format('select public.promote_to_admin(%L, ''regional_admin'', ''delta'')', :a3)) = '42501', 'blacklisted phone cannot be promoted again');
reset role;
select pg_temp.ok(pg_temp.state(format('update profiles set is_blacklisted = false, is_active = true where id = %L', :a3)) = '55006', 'blacklist cannot be undone in SQL');
select pg_temp.ok(pg_temp.state(format('delete from auth.users where id = %L', :a3)) = '55006', 'deleting the login cannot free a blacklisted phone');

-- ---------------------------------------------------------------- limits and cleanup
set role authenticated; select set_config('request.jwt.claim.sub', :s2, false);
insert into listings (client_key, seller_id, region, category, title, description, price_ngn, condition_age, condition_work)
select gen_random_uuid(), :s2::uuid, 'delta', 'other', 'Item ' || g, 'Some item description', 1000, 'neatly_used', 'minor_issues' from generate_series(1, 9) g;
select pg_temp.ok(pg_temp.state('insert into listings (client_key, seller_id, region, category, title, description, price_ngn, condition_age, condition_work) values (gen_random_uuid(), ' || quote_literal(trim(both '''' from :s2)) || ', ''delta'', ''other'', ''One too many'', ''Some item description'', 1000, ''neatly_used'', ''minor_issues'')') = '54000', 'eleventh listing in 24h is refused');
reset role;
set session_replication_role = replica;
update listings set created_at = now() - interval '9 days' where title like 'Item %' and status = 'draft';
set session_replication_role = origin;
set role service_role;
select pg_temp.ok((select count(*) from public.purge_stale_drafts(7)) = 9, 'stale drafts are purged and their folders returned');
reset role;

-- ---------------------------------------------------------------- storage policies
insert into storage.objects (bucket_id, name) select 'photos', :'p1' union all select 'photos', :'q1';
set role authenticated; select set_config('request.jwt.claim.sub', :s1, false);
select pg_temp.ok((select count(*) from storage.objects) = 1, 'seller sees only files in their own folder');
select pg_temp.ok(pg_temp.state(format('insert into storage.objects (bucket_id, name) values (''photos'', %L)', :s2 || '/x/1.webp')) in ('42501'), 'seller cannot upload into another folder');
select set_config('request.jwt.claim.sub', :a2, false);
select pg_temp.ok((select count(*) from storage.objects where name = :'p1') = 1, 'regional admin can open photos of a listing they can see');
select set_config('request.jwt.claim.sub', :e1, false);
select pg_temp.ok((select count(*) from storage.objects) = 0, 'other region admin cannot open the photos');
reset role;

select 'ALL TESTS PASSED' as result;
