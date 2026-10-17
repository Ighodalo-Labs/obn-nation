# 08 · QA Test Cases and Phase 1 Acceptance

Project: OBN NATION ONLINE.COM · Phase 1, the Listing Cloud · Version 1.0 · 17 Oct 2026
Related: [02 PRD](02_PRD_PHASE_1.md) · [03 Database](03_ERD_AND_DATABASE_SCHEMA.md) · [04 Flows](04_USER_AND_ADMIN_FLOWCHARTS.md) · [06 RBAC](06_RACI_AND_RBAC_MATRIX.md)

---

## 1. How to use this suite

- **41 scenarios** below. Each has steps, an expected result and a severity.
- **Auto** shows whether the rule is already covered by the 92 automated database checks in `supabase/tests/rls_test.sql` (section 5 lists them). Everything marked "Manual" or "Manual + Auto" needs a person on a real phone or browser.
- A scenario passes only when **every** expected result happens. Record the build, the device and the date.
- Run the full suite before the closed beta, again before go-live, and after every change to the database or to the sign-in, review or token code.

### 1.1 Severity

| Level | Meaning | Release rule |
|---|---|---|
| **S1 Critical** | Privacy leak, duplicate listing, bypass of a permission, token replay, data loss | Blocks release. Fix and retest the whole area |
| **S2 High** | A core flow fails or a Must requirement is missed | Blocks release unless the Project Lead and Acting CTO accept the risk in writing |
| **S3 Medium** | Wrong message, layout or edge case with a workaround | Fix before go-live if time allows. Otherwise log and schedule |
| **S4 Low** | Cosmetic | Backlog |

### 1.2 Test setup

| Item | Setup |
|---|---|
| People | 1 Global Admin. 3 Port Harcourt admins (PH1, PH2, PH3). 1 Delta admin. 1 Ekiti admin. 3 sellers (S1 named, S2 named, S3 new with no name). 1 spare admin to blacklist |
| Referral links | One for each regional admin, copied from the admin dashboard |
| Devices | Low-end Android (2 GB RAM or less, Android Go if possible), mid-range Android, iPhone with Safari, a laptop with Chrome |
| Networks | Normal Wi-Fi, throttled "slow 4G", and a connection that can be switched off mid-upload |
| Media | 8 JPEGs of 4 to 8 MB. One HEIC and one GIF. Videos of 20 s, exactly 60 s (1080p) and 75 s. A 200 MB video |
| WhatsApp | A number with WhatsApp for each seller. The two Meta-approved templates active in Twilio |
| Time travel | A staging database where `expires_at` and `created_at` can be edited to simulate 30 days and 7 days |

## 2. Test scenarios

### 2.1 Sign-in and referral

| ID | Scenario | Steps | Expected result | Sev | Auto |
|---|---|---|---|---|---|
| QA-01 | Sign in with a valid number | 1) Open `/list`. 2) Enter `08031234567`. 3) Tap Send code. 4) Enter the WhatsApp code. 5) For a first-time number, enter a name | A WhatsApp message arrives within 30 seconds. The code signs the user in. A first-time user is asked for a name once, then lands on the form. Profile exists with phone `+2348031234567` and role seller. No password prompt appears anywhere | S2 | Manual + Auto |
| QA-02 | Wrong and expired codes | 1) Request a code. 2) Enter a wrong code 5 times. 3) Enter the right code. 4) Request a new code and wait over 10 minutes. 5) Enter it | Each wrong try shows how many remain. After the fifth, the right code is also refused and a new code is required. The expired code shows "This code has expired." Resend is blocked for 60 seconds | S2 | Manual |
| QA-03 | Blacklisted number cannot sign in | 1) Blacklist the spare admin. 2) On `/list` enter that admin's number. 3) Also call the Supabase `signInWithOtp` endpoint directly with that number | The screen says "This number cannot be used on OBN NATION." No WhatsApp message is sent either way. The direct call is refused by the Send SMS hook | S1 | Manual |
| QA-04 | Referral persistence across the OTP session | 1) In a fresh browser open `/list?ref=<PH1 code>`. 2) Close the tab. 3) Reopen `/list` with no code. 4) Sign in as S1. 5) Submit a listing (the form shows the region already set to Port Harcourt and locked). 6) Call the create API directly with region Delta. 7) Repeat with an invalid code `zzzzzzzz` | The cookie `obn_ref` is set for 30 days, HttpOnly. The listing is assigned to PH1. In step 6 the stored region is still Port Harcourt, because the server forces the referring admin's region. With the invalid code the listing is organic and unassigned. A newer valid link replaces the older code | S1 | Manual + Auto |

### 2.2 Listing form, media and idempotency

| ID | Scenario | Steps | Expected result | Sev | Auto |
|---|---|---|---|---|---|
| QA-05 | Submit with 0 photos | 1) Fill steps 1 and 2. 2) On step 3 add no photos. 3) Tap Submit. 4) Call the create API directly with an empty photo list and `submit: true` | The form shows "Add at least one photo." The direct call is refused (`validation_failed`). The database also refuses a non-draft row without photos | S2 | Manual + Auto |
| QA-06 | Submit with 0 videos (should pass) | 1) Fill the form with 2 photos and no video. 2) Submit | The listing is created as `pending_review` with `video_url` empty. No error, no prompt asking for a video | S2 | Manual + Auto |
| QA-07 | Video longer than 60 seconds (should fail) | 1) On step 3 pick the 75-second video | The message "Videos can be at most 60 seconds." appears at once, before the encoder loads or any encoding starts. The video is not attached. The rest of the form still works | S2 | Manual |
| QA-08 | A full-length video is compressed | 1) Pick the exactly-60-second 1080p video on the mid-range Android. 2) Wait. 3) Submit. 4) Download the stored file | A progress bar moves. The output is an MP4 under 10 MB (10,485,760 bytes) and plays. It is stored under `videos/<seller>/<listing>/video.mp4`. The encoder download happened only when the video button was tapped. Cancel works and leaves the form usable | S2 | Manual |
| QA-09 | Photo compression and the six-photo limit | 1) Add 6 JPEGs of 4 to 8 MB. 2) Try to add a 7th. 3) Check stored files | Each stored file is WebP and under 1,048,576 bytes. The 7th is refused with "You can add up to 6 photos." Each photo takes under 5 seconds on the mid-range phone. Sizes are shown beside the thumbnails | S2 | Manual |
| QA-10 | Unsupported or huge files | 1) Add the HEIC and GIF. 2) Add a photo over 30 MB. 3) Add the 200 MB video | Each is refused with its plain message ("Please choose a JPG, PNG or WebP photo.", "This photo is too big to process. Please pick a smaller one.", "This video is too big to process on your phone…"). Other attached files stay | S3 | Manual |
| QA-11 | Network drop and retry create exactly one listing | 1) Fill the form. 2) Tap Submit. 3) Switch the network off during upload. 4) Switch it on and tap Try again. 5) Also tap Submit twice quickly. 6) Count the seller's listings and storage folders | Exactly one listing exists. Retry resumes with the same `client_key`. Files are not duplicated. The listing ends as `pending_review` | S1 | Manual + Auto |
| QA-12 | Daily limit | 1) As one seller create 10 listings in a day. 2) Try an 11th | The 11th shows "You have reached today's limit of 10 listings. Please come back tomorrow." Retrying an earlier `client_key` is not blocked | S3 | Auto |

### 2.3 Review, routing and consensus

| ID | Scenario | Steps | Expected result | Sev | Auto |
|---|---|---|---|---|---|
| QA-13 | Referral listing: single approval by the assigned admin | 1) S2 submits via PH1's link. 2) Open dashboards of PH1, PH2, Global Admin. 3) PH2 tries to approve (API or database call). 4) PH1 approves | Only PH1 and the Global Admin see it. PH2 cannot see it and the direct approve call is refused. One approval by PH1 makes it `approved` with no second approval needed. It then appears in the regional pool | S1 | Auto + Manual |
| QA-14 | Organic listing: claim, then approve | 1) S1 submits with no link. 2) PH1, PH2, PH3 all see it (masked). 3) PH2 claims. 4) PH1 tries to claim and to approve. 5) PH2 approves | After the claim, PH1 and PH3 stop seeing it as pending. PH1's claim fails with "already claimed" and the approve is refused. PH2 approves and one approval is enough | S1 | Auto |
| QA-15 | Two admins act at the same moment | 1) Two admins open the same unclaimed listing. 2) Both tap Claim (or Approve) within one second, repeated 20 times with fresh listings | Exactly one wins each time. The loser sees "This listing was just handled by someone else". No listing ends with two admins or two decisions | S1 | Manual (scripted) |
| QA-16 | Region isolation | 1) The Ekiti admin opens dashboard and pool. 2) Calls the approve function on a PH listing. 3) Opens a PH media URL | Nothing from Port Harcourt appears. The call is refused. The media URL does not load | S1 | Auto |
| QA-17 | Global Admin override | 1) A listing is assigned to PH1. 2) The Global Admin approves it. 3) Another unclaimed listing: the Global Admin approves it | The first becomes `approved` and PH1 stays in charge. In the second, the Global Admin becomes the admin in charge. Both approvals appear in the audit log | S2 | Auto |
| QA-18 | Rejection needs a reason | 1) Open Reject. 2) Submit empty. 3) Submit "no". 4) Use a quick-pick chip. 5) Submit | Empty and short reasons are refused with a plain message. The chip fills the box. A reason of 5 or more characters is accepted and saved, and is shown to the seller | S2 | Auto + Manual |

### 2.4 Rejection, edit link and token life cycle

| ID | Scenario | Steps | Expected result | Sev | Auto |
|---|---|---|---|---|---|
| QA-19 | Rejection sends the WhatsApp link, and opening it does not burn it | 1) PH1 rejects a listing with a reason. 2) Seller receives the WhatsApp message. 3) Open the link. 4) Close it. 5) Open it again | The message contains the item title, the reason and a link. The page shows the form pre-filled with a banner showing the reason. The second visit still works. Database shows one live token with the hash, not the plain token | S1 | Manual + Auto |
| QA-20 | Resubmit updates the same listing and burns the token | 1) Open the link. 2) Change the price and one photo. 3) Tap Resubmit | The same listing id is updated, status `pending_review`, `resubmit_count = 1`, reason cleared, `used_at` set on the token. The listing count for the seller did not change. The audit log has a `listing.resubmit` row | S1 | Auto + Manual |
| QA-21 | Replay attack | 1) After QA-20 open the same link. 2) Send the resubmit API call again with the same token | The page says the link was already used. The API returns `410 token_used`. No field, status or file changes | S1 | Auto |
| QA-22 | Double tap on Resubmit | 1) Open a fresh link. 2) Tap Resubmit twice in under 200 ms. 3) Also send two API calls in parallel | One call returns 200. The other returns `410 token_used`. `resubmit_count` rose by exactly 1. One review entry exists | S1 | Manual (scripted) + Auto (logic) |
| QA-23 | Expired link and "Send new link" | 1) In staging set `expires_at` to a minute ago. 2) Open the link. 3) The admin taps Send new link. 4) Open the old link, then the new one | Old link: "This link has expired. Ask your admin to send a new one." After the new link, the old shows "replaced by a newer message". The new link works. Only one live token exists | S2 | Auto + Manual |
| QA-24 | Token tampering and guessing | 1) Change one character in the token. 2) Use a non-UUID string. 3) Use `' or 1=1 --`. 4) Send 40 random tokens in 10 minutes | All show "This link is not valid." with no hint whether a listing exists. After 30 tries in 10 minutes the rate limit answers 429. Nothing is written to the database | S1 | Manual |
| QA-25 | Foreign media path on resubmit | 1) Call resubmit with a photo path from another seller's folder | Refused (`invalid_media_path`). The token is **not** burned and the listing is unchanged | S1 | Auto |

### 2.5 Data masking and governance

| ID | Scenario | Steps | Expected result | Sev | Auto |
|---|---|---|---|---|---|
| QA-26 | Masking for a non-attributed admin | 1) Approve a listing as PH2 (seller S1, phone ending 01). 2) Sign in as PH1 (not in charge). 3) Open pool and review lists. 4) Inspect network responses and page source. 5) Query `profiles` for the seller | Name shows `A***` and phone shows `+234 ••• ••• ••01`. The real values appear nowhere in network traffic, HTML, JSON or the console. The `profiles` query returns no seller row | S1 | Auto + Manual |
| QA-27 | The attributed admin and Global Admin see real details | 1) Sign in as PH2 (in charge). 2) Sign in as the Global Admin | Both see the real name and phone. PH2's card shows the "You are in charge" badge | S1 | Auto |
| QA-28 | Reassign flips the masking and is audited | 1) The Global Admin reassigns the listing from PH2 to PH1 with a reason. 2) Refresh both admins' pools | PH1 now sees real details, PH2 sees masked. A reassignment without a reason, or to an Ekiti admin, is refused. The audit log shows who, what, when and why | S2 | Auto |
| QA-29 | Revoke and reinstate | 1) The Global Admin revokes PH3 with a reason. 2) PH3 refreshes and tries to act. 3) Reinstate PH3 | PH3's very next request returns nothing: "Your access has ended." Pending listings assigned to PH3 return to the open queue. Approved ones show under Orphaned. After reinstating, PH3 sees the region again | S1 | Auto |
| QA-30 | Blacklisted admin: login attempt and immediate RLS block | 1) Keep the spare admin signed in on a second device. 2) The Global Admin blacklists them. 3) On the second device refresh and try to approve, read the pool and upload. 4) Try to sign in again. 5) Try to add the same number as an admin. 6) Try to un-blacklist in SQL and to delete the login | Step 3: every read returns nothing and every write is refused at once, with the old session token still valid. Step 4: no code is sent. Step 5: refused ("blacklisted"). Step 6: both refused. The Auth user shows as banned. `blacklisted_by`, time and reason are recorded | S1 | Auto + Manual |
| QA-31 | Only the Global Admin can govern | 1) As a regional admin call the blacklist route, `reassign_listing`, `promote_to_admin`, `revoke_admin` and read `audit_log` | Route returns 403 `not_authorized`. The functions are refused. The audit log returns no rows | S1 | Auto |

### 2.6 Security, platform and quality

| ID | Scenario | Steps | Expected result | Sev | Auto |
|---|---|---|---|---|---|
| QA-32 | Direct API abuse by a signed-in user | 1) As a seller call the database API to set `status = 'approved'`, `assigned_admin_id`, `role = 'global_admin'`, `approved_by` | All refused or no rows changed. Roles and assignments change only through the defined functions | S1 | Auto |
| QA-33 | Anonymous access | 1) With only the public anon key, query `profiles`, `listings`, `regional_listings_feed`, `listing_tokens`, `audit_log` and the storage buckets | Permission denied or empty for every one | S1 | Auto |
| QA-34 | Storage privacy | 1) Open a photo URL without a signature. 2) Open a signed URL after it expires. 3) As S2 list S1's folder. 4) As PH1 open a photo of a listing assigned to the Ekiti admin | No public URL exists. Expired signature fails. S2 sees nothing of S1's folder. PH1 cannot open the Ekiti listing's photos but can open photos of listings visible to them | S1 | Auto + Manual |
| QA-35 | Landing page | 1) Open `/` on a throttled slow-4G profile at 360 px. 2) Scroll. 3) Tap the button | Largest content paints in under 2.5 s. No horizontal scroll. The About copy matches section 3 of the PRD exactly. The red button is sticky and opens `/list`. Page title and Open Graph tags are set | S2 | Manual |
| QA-36 | DNS and Zoho Mail | 1) Run `dig MX`, `dig TXT` on the domain. 2) Send mail to a Zoho mailbox and back to Gmail. 3) Open the original headers. 4) Load the website | MX points to Zoho at priorities 10, 20, 50. SPF and DKIM show PASS in the headers. The website still loads over HTTPS from Vercel | S2 | Manual |
| QA-37 | Accessibility | 1) Run an automated check (axe or Lighthouse). 2) Tab through the form with a keyboard. 3) Use TalkBack for the OTP and form. 4) Check contrast for each brand colour | No critical issues. Focus is always visible. Every field has a label. Errors are announced. Touch targets are at least 48 px. Brand colours are used as fills with white text, not as text on the dark background | S3 | Manual |
| QA-38 | Low-end device run | 1) On the low-end Android complete a listing with 3 photos and no video. 2) Repeat with a 20-second video | The form never freezes. Photos compress one at a time. The video is optional and can be cancelled. If the phone runs out of memory the page shows a clear message instead of a blank screen | S2 | Manual |
| QA-39 | Audit log completeness | 1) Perform claim, approve, reject, reissue, reassign, promote, revoke, reinstate, blacklist and a resubmit. 2) Read the audit log as the Global Admin | One row per action with actor, target, time and detail (reason, old and new admin). No OTP codes or tokens appear in any row | S2 | Auto (reassign) + Manual |
| QA-40 | Draft cleanup | 1) Make 3 drafts. 2) Age two of them past 7 days in staging. 3) Run the cron route | The two old drafts and their storage folders are deleted. The fresh draft and all submitted listings remain | S3 | Auto (database) + Manual |
| QA-41 | WhatsApp failure on rejection | 1) In staging switch the Twilio token to an invalid one. 2) Reject a listing | The rejection is saved. The card shows "Message not sent" and a Send new link button. After fixing the token, Send new link delivers, and only the new link works | S2 | Manual |

## 3. Phase 1 gate verification checklist

The blueprint says Phase 2 starts only when these are met. Measure during the closed beta, with real sellers and admins.

### G1 · 100% of internal Xender and WhatsApp file routing removed

| # | Check | Evidence | Done |
|---|---|---|---|
| G1.1 | For 14 consecutive days every new listing entered through the form | Count of new `listings` per day matches the admins' own count of new listings | ☐ |
| G1.2 | No admin forwarded photos or details through WhatsApp or Xender for intake | Signed statement from the Global Admin and each regional admin | ☐ |
| G1.3 | The old intake groups are closed or reduced to announcements | Screenshot of group settings | ☐ |
| G1.4 | Every admin works from the dashboard and pool | List of active admins and last action times | ☐ |

### G2 · At least 500 reject-edit-resubmit loops delivered automatically

```sql
select count(*) as completed_loops
from audit_log
where action = 'listing.resubmit';
```

| # | Check | Evidence | Done |
|---|---|---|---|
| G2.1 | The query above returns 500 or more | Query result with date | ☐ |
| G2.2 | The count equals the sum of `resubmit_count` on listings | `select coalesce(sum(resubmit_count),0) from listings;` gives the same number | ☐ |
| G2.3 | Rejection messages were delivered by Twilio | Twilio message log: delivered status for the same period | ☐ |
| G2.4 | No loop needed a manual fix by the developer | Support log is empty of "edit link" interventions | ☐ |

### G3 · Zero duplicate entries from resubmits

```sql
-- must return no rows
select seller_id, client_key, count(*)
from listings group by 1, 2 having count(*) > 1;

-- must be true
select (select coalesce(sum(resubmit_count),0) from listings)
     = (select count(*) from audit_log where action = 'listing.resubmit') as resubmits_never_insert;

-- review by hand: same seller, same title and price within 10 minutes
select a.id, b.id, a.seller_id, a.title, a.price_ngn
from listings a join listings b
  on a.seller_id = b.seller_id and a.id < b.id
 and a.title = b.title and a.price_ngn = b.price_ngn
 and abs(extract(epoch from (a.created_at - b.created_at))) < 600;
```

| # | Check | Evidence | Done |
|---|---|---|---|
| G3.1 | First query returns no rows | Result | ☐ |
| G3.2 | Second query returns true | Result | ☐ |
| G3.3 | Every pair from the third query is a deliberate second listing, confirmed with the seller or admin | Notes per pair | ☐ |
| G3.4 | QA-11, QA-20, QA-21 and QA-22 passed on the release build | Test record | ☐ |

### Other conditions for acceptance

| # | Check | Done |
|---|---|---|
| A1 | All **Must** requirements in the PRD pass, and every S1 and S2 scenario above passes on the release build | ☐ |
| A2 | The 92 automated database checks pass against the production schema | ☐ |
| A3 | Row Level Security is on for `profiles`, `listings`, `listing_tokens`, `audit_log`; the anon key can read nothing (QA-33) | ☐ |
| A4 | No secret is in the repository or in browser-visible environment variables | ☐ |
| A5 | Supabase Pro and Vercel Pro are active before real data arrives (start of Milestone 2) | ☐ |
| A6 | Both WhatsApp templates are approved by Meta and active in Twilio | ☐ |
| A7 | DNS records for the site and Zoho Mail verified (QA-36) | ☐ |
| A8 | The first Global Admin was created with `bootstrap_global_admin` and regional admins added from the console | ☐ |
| A9 | Backups are on and a restore was tried once on staging | ☐ |
| A10 | The Global Admin signs the acceptance note | ☐ |

## 4. Defect handling

| Step | Rule |
|---|---|
| Log | Title, scenario id, steps, device, build, screenshot or recording, severity |
| Triage | The developer sets severity within one working day. The Project Lead confirms S1 and S2 |
| Fix | S1 and S2 in the next build. Retest the scenario and its neighbours in the same section |
| Closure | The person who logged it confirms on the same device |
| Reporting | Weekly count by severity during the beta, sent to the Acting CTO |

## 5. Automated database checks (92)

Run with the commands in section 10 of [03](03_ERD_AND_DATABASE_SCHEMA.md). The suite stops at the first failure and ends with `ALL TESTS PASSED`.

| Area | Checks |
|---|---|
| Profiles and admin management | Auth user creates a seller profile with +phone · bootstrap makes the first global admin · seller cannot promote anyone · regional admin gets an 8-char referral code · cannot promote someone who is already an admin · regional admin needs a region |
| Listing creation and validation | Same client_key twice creates one listing · new listing is an unassigned draft · 0 photos rejected · media path in another seller's folder rejected · more than 6 photos rejected · price must be above zero · drafts stay drafts after failed submits · listing with photos and no video submits · seller cannot edit a listing under review · seller without a name cannot submit |
| Visibility and masking | PH admin sees unclaimed PH listing · name and phone masked on unclaimed listing · PH admin cannot read the seller profile · PH admin can read listing content · Ekiti admin sees nothing from Port Harcourt · global admin sees the real phone · other sellers see nothing |
| Claim and approve | Ekiti admin cannot approve a PH listing · first admin to claim becomes admin in charge · admin in charge sees real phone · admin in charge can read the seller profile · second admin cannot claim · other PH admin cannot approve a listing assigned elsewhere · claimed listing disappears from other admins · one approval makes it live · cannot approve twice · approved pool shows masked name to other PH admin · feed shows admin in charge by first name only · approved PH listing not in the Ekiti pool |
| Referral and override | Referral code assigns admin in charge and forces the admin region · listing with one video submits · other PH admin cannot see a referral listing under review · other PH admin cannot approve it · assigned admin sees seller details · Global Admin approves another admin's listing without taking over · Global Admin approving an unclaimed listing becomes in charge · only the assigned admin can reject a referral listing |
| Rejection and tokens | Rejection needs a real reason · rejection stores reason and one token hash · token lives 30 days · valid token returns the listing · resubmit updates the same listing · no duplicate after resubmit · resubmit moves back to pending with edits and video removed · token burned on resubmit · replay fails · used token cannot open the edit page · unknown token invalid · expired token refused · reissue revokes the older link · new link works · foreign media path refused · failed resubmit does not burn the token · second loop works |
| Privileges | Signed-in users cannot call reject · cannot read tokens · cannot call resubmit · nobody can change their own role · admins cannot approve with a direct update · regional admin cannot read the audit log · anonymous visitors read nothing |
| Governance | Regional admin cannot reassign · cannot reassign across regions · reassign needs a reason · global admin reassigns · previous admin sees it masked · reassign is audited · revoke releases pending listings · revoked admin sees nothing · revoked admin cannot act · reinstated admin sees the region again · only a global admin can blacklist · blacklist flips both flags · blacklisted admin reads nothing · blacklisted user cannot write · blacklisted admin cannot approve · blacklist cannot be undone by reinstate · blacklisted phone cannot be promoted · blacklist cannot be undone in SQL · deleting the login cannot free a blacklisted phone |
| Limits, cleanup, storage | Eleventh listing in 24 hours refused · stale drafts purged · seller sees only own files · seller cannot upload into another folder · regional admin opens photos of visible listings · other region admin cannot open the photos |

Not covered by automated checks and therefore manual: real WhatsApp delivery, Supabase Auth OTP behaviour, the Send SMS hook, the Auth ban, real Storage URLs, compression on real phones, concurrent requests at the same instant, page rendering and accessibility.
