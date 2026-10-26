-- Reset before the closed beta. NOT a migration. Run by hand in the Supabase SQL Editor of the live project.
-- It deletes ALL listings and the whole audit log (before beta these are only test data),
-- then removes the test profiles you list below. It keeps every other profile, including the Global Admin.
-- Step 1: edit the phone list. Step 2: run PREVIEW and read it. Step 3: run the DELETE block.

-- ===== PREVIEW (safe, changes nothing) =====
select phone, role, region, full_name, is_blacklisted from public.profiles order by created_at;
select count(*) as listings_that_will_be_deleted from public.listings;

-- ===== DELETE (run only after the preview looks right) =====
begin;

create temp table doomed on commit drop as
  select id, phone from public.profiles
  where phone = any (array[
    '+2348100000002',   -- Regional Test Admin (old test number)
    '+2348100000003',   -- Test Seller Three (old test number)
    '+2349127289240'    -- real test seller. Add the other test numbers here, in the same format
  ]);

delete from public.audit_log;
delete from public.listings;                                    -- also removes their edit tokens

update public.profiles set revoked_by = null     where revoked_by     in (select id from doomed);
update public.profiles set blacklisted_by = null where blacklisted_by in (select id from doomed);

delete from public.telegram_link_requests where phone in (select phone from doomed);
delete from public.telegram_links         where phone in (select phone from doomed);
delete from public.otp_attempts           where phone in (select phone from doomed);
delete from auth.users                    where id    in (select id from doomed);   -- profiles go with them

select count(*) as profiles_removed from doomed;
commit;

-- Photos and videos of the deleted listings stay in Storage until the draft cleanup or a manual clear.
-- Then, once the client has signed in once and linked Telegram:  select public.bootstrap_global_admin('+2348053466836');
