# Build plan: Milestone 1 (weeks 1–4)

Order matters. Core pipeline first. Nice-to-haves last.

| Week | Build | Done when |
|------|-------|-----------|
| 1 | Repo, Supabase project, migration applied, WhatsApp OTP sign-in (Twilio), app shell, mobile layout | A phone can sign in with an OTP |
| 2 | Three-step listing form, in-browser compression, upload, referral link (`?ref=`), region routing | A seller submits a listing with photos and it appears as `pending` |
| 3 | Admin sign-in, region dashboard, claim, single approval, reject with reason, rejection WhatsApp + 30-day edit link + resubmit | Full loop: submit → reject → edit → resubmit → approve |
| 4 | Global Admin screens (reassign, revoke, blacklist), landing page, Zoho DNS, polish | Everything in the M1 list works end to end |

Milestone 2 (weeks 5–8): test on cheap phones, fix bugs, upgrade to Supabase Pro and Vercel Pro, closed beta, go-live.

## Do first, outside the code
1. Ask the client to start **Meta business verification** and approval of the two WhatsApp templates (authentication and utility) now. It can take days and can block go-live.
2. Client answers are in (Oct 2026) and are written into `docs/phase-1/`. Where they differ from `docs/source-notes.md`, the Phase 1 documents win.
3. Confirm the domain and get DNS access (needed for the landing page and Zoho Mail).
4. Confirm the CTO accepts the cost proposal (V2 or later).
5. Create the Supabase, Vercel and Twilio accounts and the repository on the developer side.

## Build notes
- Copy `ffmpeg-core.js` and `ffmpeg-core.wasm` from `@ffmpeg/core@0.12.6` into `public/ffmpeg/` with a `postinstall` script (see doc 07, section 6).
- After the first Global Admin signs in once, run `select public.bootstrap_global_admin('+2348053466836');`.
