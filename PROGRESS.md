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
- Configure the Send SMS hook URL and secret, OTP expiry 600 s, min interval 60 s, and test phone numbers.

## Gates still open
- [x] GitHub repository pushed (Ighodalo-Labs/obn-nation, 2026-10-20)
- [ ] Supabase, Vercel, Twilio accounts created; keys in `.env.local`
- [ ] Meta business verification started (client)
- [ ] WhatsApp templates approved (client)
- [ ] Domain DNS access (client)
- [x] Logo (JPG on black) and About Us text received from client, 17 Oct 2026
- [ ] Transparent PNG or SVG logo (client)
- [x] Video optional (client confirmed 17 Oct 2026)
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
- [ ] T08 Compression wiring
- [ ] T09 Create/submit route, uploads, Under review screen
- [ ] T10 Referral region lock and assignment
### Week 3
- [ ] T11 Admin dashboard, claim, approve
- [ ] T12 Reject, WhatsApp notice, reissue
- [ ] T13 Edit page and resubmit
- [ ] T14 Regional pool with masking
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
- 2026-10-17 CLOSED: video stays optional (confirmed by client). An earlier client line read "Video shouldn't be optional"; the client then confirmed optional. No doc change needed (FM-4, BR-3, DF-16).
- 2026-10-17 About Us text replaced with the client's own text. Tagline now carries the three heart emojis.

## Blockers
(none)

## Weekly check-in
(week, KRs moved, blockers, rule changes, next outcome)

