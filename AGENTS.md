# AGENTS.md: read this first

Project: OBN NATION ONLINE.COM, Phase 1 (the Listing Cloud). A trust-verified marketplace for second-hand goods in Nigeria. Built by Ighodalo Labs.

## What Phase 1 is
Sellers sign in with a code (Telegram bot now, WhatsApp later, one setting, see doc 11), submit a listing (photos and a video), and regional admins review it. Rejected sellers get a link by message to fix and resubmit. Approved listings join a regional pool where seller contacts are masked. A Global Admin governs everything.

## Where the truth is
Read in this order. Read only what your task needs.
1. `docs/phase-1/09_BUILD_PLAN_GOALS_AND_AGENT_LOOP.md`: the task list and the loop you must follow
2. `PROGRESS.md`: what is done, what is next, open gates, blockers
3. `docs/phase-1/02_PRD_PHASE_1.md`: requirements with IDs, brand, screens, business rules
4. `docs/phase-1/03_ERD_AND_DATABASE_SCHEMA.md` and `supabase/migrations/`: the data and the rules in SQL
5. `docs/phase-1/07_API_CONTRACTS_AND_INTEGRATIONS.md`: every endpoint, error codes, WhatsApp templates, compression code
6. `docs/phase-1/04` flows, `05` wireframes, `06` roles and permissions, `08` tests
7. `docs/phase-1/01_SYSTEM_ARCHITECTURE.md`: how the parts fit

If code and docs disagree, stop and report. Do not guess.

## Stack
Next.js 14 (App Router, TypeScript strict, Tailwind) on Vercel. Supabase: Postgres 15, Auth (phone OTP with a Send SMS hook), private Storage buckets `photos` and `videos`. Messaging through a Telegram bot or Twilio WhatsApp (`NEXT_PUBLIC_MESSAGE_CHANNEL`). Browser-side compression (`browser-image-compression`, FFmpeg.wasm self-hosted in `public/ffmpeg`).

## Hard rules
1. The database enforces the rules (RLS, triggers, functions). The app never replaces that. Do not weaken a policy to make a screen work.
2. Never edit an applied migration. Add a new numbered file in `supabase/migrations/`.
3. Run the SQL tests after any change in `supabase/` (steps in doc 03, section 10). All must pass: the 92 checks in `rls_test.sql` the checks in `otp_attempts_test.sql` and `ref_region_test.sql`.
4. The service-role key is used in server code only. It must never reach the browser.
5. Edit tokens: a random UUID goes to the seller, only its SHA-256 hash is stored. Never log a token or an OTP.
6. Masking: seller name and phone are masked everywhere except for the admin in charge and the Global Admin. Use the view `regional_listings_feed`.
7. Creating a listing must be idempotent through `(seller_id, client_key)`. A retry or a resubmit never inserts a second row.
8. Photos are WebP under 1 MB. Videos are MP4 under 10 MB and at most 60 seconds. Compress on the phone before upload.
9. Brand colours as fills with white text. Check contrast with the table in PRD 2.2.
10. No secrets in the repo. Use `.env.local` (copy `.env.example`).

## Commands
- Install and run: `cd apps/web && npm install && npm run dev`
- Checks: `npm run check` (typecheck, lint), `npm test`
- SQL tests: see doc 03, section 10 "Running the tests"

## Working style
- One task per session loop. Small commits on `feat/*` branches off `dev`.
- Write the test first when the task has logic.
- After each task: update `PROGRESS.md`, then stop and report what changed, what passed, and what the human must do next.
- Stop at a human gate or after 3 failed attempts on the same error. Write the blocker in `PROGRESS.md`.
- Keep answers short and in plain language.
