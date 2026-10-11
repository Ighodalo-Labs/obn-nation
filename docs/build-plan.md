# Build plan: Milestone 1 (weeks 1–4)

Order matters. Core pipeline first. Nice-to-haves last.

| Week | Build | Done when |
|------|-------|-----------|
| 1 | Repo, Supabase project, migration applied, WhatsApp OTP sign-in (Twilio), app shell, mobile layout | A phone can sign in with an OTP |
| 2 | Three-step listing form, in-browser compression, upload, referral link (`?ref=`), region routing | A seller submits a listing with photos and it appears as `pending` |
| 3 | Admin sign-in, region dashboard, approve/reject, consensus, rejection WhatsApp + edit link + resubmit | Full loop: submit → reject → edit → resubmit → approve |
| 4 | Global Admin screens (reassign, revoke, blacklist), landing page, Zoho DNS, polish | Everything in the M1 list works end to end |

Milestone 2 (weeks 5–8): test on cheap phones, fix bugs, upgrade to Supabase Pro and Vercel Pro, closed beta, go-live.

## Do first, outside the code
1. Ask the client to start **Meta business verification** and WhatsApp template approval now. It can take days and can block go-live.
2. Get the answers to the open questions in `docs/source-notes.md`.
3. Confirm the domain (`obnn.com` or another).
4. Confirm the CTO accepts V2 of the cost proposal.
