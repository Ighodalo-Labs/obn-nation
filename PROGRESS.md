# PROGRESS

State file for people and AI tools. Update it at the end of every task.

## Current
T01 done. Next task: T02 (blocked on the Supabase account, see Gates). T03 and T04 do not need it and can go first.

## Milestone 1
Complete when doc 09 section 2 is true. Target: built by 15 Nov 2026, signed off by 18 Nov 2026.
Diagrams to view: https://claude.ai/artifact/N821x5YLKfqVmEoZQ6dZaM

## Follow-ups that need a live Supabase project
- Session refresh in the middleware (`getUser()` with request and response cookies) so a signed-in person is not dropped after the access token expires. Add and test in T06 once keys exist.
- Run the sign-in flow against the real project: send, verify, wrong code x5, expired code, blacklisted number.
- Run the full submit flow against the real project (create, upload, submit, retry after a dropped upload). Migration 0004 storage policy is skipped locally (no Storage schema), so check it live.
- Not built yet from doc 07: the 429 rate limit on `edit/upload-url` (needs a shared store, so add it with Vercel/Upstash or a small table). Old files removed during an edit stay in storage until a cleanup job exists (add to T17 hardening).
- Configure the Send SMS hook URL and secret, OTP expiry 600 s, min interval 60 s, and test phone numbers.

## Gates still open
- [x] GitHub repository pushed (Ighodalo-Labs/obn-nation, 2026-10-20)
- [ ] Supabase, Vercel, Twilio accounts created; keys in `.env.local`
- [ ] Meta business verification started (client)
- [ ] WhatsApp templates approved (client)
- [ ] Domain DNS access (client)
- [x] Logo (JPG on black) and About Us text received from client, 17 Oct 2026
- [ ] Transparent PNG or SVG logo (client)
- [x] Video REQUIRED (owner decision 20 Oct 2026; client had said optional on 17 Oct. Tell the client)
- [ ] Confirm the 3 contacts: which are regional admins and which region each covers (PRD section 5)
- [ ] Confirm +234 707 276 7227 can be registered as the WhatsApp API sender (not in use on the normal app)

## Tasks
### Week 1
- [x] T01 App scaffold and brand tokens (2026-10-20, branch feat/t01-scaffold)
- [ ] T02 Supabase project, migrations, CI for SQL tests
- [x] T03 Env validation and Supabase clients (2026-10-20)
- [x] T04 Edge middleware: ref cookie, guards, security headers (2026-10-20). Session cookie presence only; token refresh added in T05
- [x] T05 OTP routes, hook, stub WhatsApp sender (2026-10-20). Logic and routes are tested with fakes. Not yet run against a real Supabase project
- [x] T06 /list page and name capture (2026-10-20). Checked on a 360px screen with mocked API; not yet against real Supabase
### Week 2
- [x] T07 Form steps 1 and 2 complete, step 3 placeholder (2026-10-20). Rules tested; saved in browser session; checked on a 360px screen
- [x] T08 Compression wired into step 3 (2026-10-20). Browser test: 11.7 MB JPG to 639 KB WebP; 20 s 720p clip to 9.1 MB MP4; 75 s clip refused; HEIC refused. Not yet tried on a real phone (T19)
- [x] T09 Create/submit route, uploads, Under review screen (2026-10-20). `POST /api/listings/create` (two calls, idempotent by client_key, ref from cookie, checks uploaded files exist), retry-safe uploads, progress bar, daily-limit message. New migration 0004 lets a seller replace files in their own draft folder (needed for retry). 201 tests pass. Tested with fakes only; real run needs Supabase
- [x] T10 Referral region lock and assignment (2026-10-20). Migration 0005 `region_for_ref` (tested, ref_region_test.sql) lets the form lock the region from the cookie; the database still forces region and admin on save (already covered by rls_test). Video made required the same day (owner decision)
### Week 3
- [x] T11 Admin dashboard, claim, approve (2026-10-20). `/admin/dashboard` (tabs, cards, detail gallery and video, Claim, Approve with confirm, referral link with Copy and WhatsApp share, refresh on focus), `POST /api/listings/decide`. First-wins and masking are enforced and tested in the database. Reject button comes in T12. Screens not yet seen against a live project
- [x] T12 Reject modal, reject and reissue routes, WhatsApp notice (2026-10-20). Reason 5 to 500 characters with quick-pick chips; token hash only stored; if WhatsApp fails the rejection still stands and the card shows "Message not sent" with Send new link. 223 tests pass. WhatsApp runs in stub mode until Twilio and Meta are ready
- [x] T13 Edit page and resubmit (2026-10-20). `/list/edit?token=` pre-filled form with the reason banner, keep/remove/add photos and video, `edit/upload-url` and `resubmit` routes, friendly messages for used, expired, replaced and unknown links, noindex and no-referrer. 247 tests pass. Live check needed: signed uploads and burn-on-resubmit against real Supabase
- [x] T14 Pool with masking (2026-10-20). `/admin/pool`: 20 per page with Load more, category filter, title search, region filter for Global Admin, Copy ad text without seller details, "You are in charge" badge. Masking comes from the database view only. AdminNav added to admin screens
### Week 4
- [ ] T15 Global Admin screens and blacklist
- [ ] T16 Landing page, About Us, DNS
- [ ] T17 Cron, error pages, accessibility
### Weeks 5 to 8
- [ ] T18 Automated end-to-end tests
- [ ] T19 Cheap-phone testing
- [ ] T20 Pro plans and real WhatsApp templates
- [ ] T21 Closed beta and gate measurement

## Decisions log
- 2026-10-20 New migration `0003_otp_attempts.sql`: Supabase cannot tell a wrong code from an expired one and does not void a code after 5 wrong tries, so the server counts tries (PRD SI-5). Service role only. Tests in `supabase/tests/otp_attempts_test.sql`.
- 2026-10-20 `WHATSAPP_MODE=stub` sends nothing and never logs the code. Testers sign in with fixed codes from "Phone test OTPs" in the Supabase dashboard.
- 2026-10-20 Provider send limits (60 s between codes, sends per hour) come from the Supabase Auth settings, not our code. Set them in the dashboard: OTP expiry 600 s, minimum interval 60 s.
- 2026-10-20 CHANGED: owner says video is required (exactly 1). Docs, server and form updated. Client had said optional on 17 Oct, so the client must be told. Earlier note: video stayed optional (confirmed by client). An earlier client line read "Video shouldn't be optional"; the client then confirmed optional. No doc change needed (FM-4, BR-3, DF-16).
- 2026-10-17 About Us text replaced with the client's own text. Tagline now carries the three heart emojis.

## Blockers
(none)

## Weekly check-in
(week, KRs moved, blockers, rule changes, next outcome)

