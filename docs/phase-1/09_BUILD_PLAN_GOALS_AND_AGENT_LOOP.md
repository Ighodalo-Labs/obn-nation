# 09 · Build Plan, Goals (OKRs) and the Agent Loop

Project: OBN NATION ONLINE.COM · Phase 1, the Listing Cloud · Version 1.0 · 17 Oct 2026
Related: [02 PRD](02_PRD_PHASE_1.md) · [07 API](07_API_CONTRACTS_AND_INTEGRATIONS.md) · [08 QA](08_QA_TEST_CASES_AND_ACCEPTANCE.md) · `../../AGENTS.md` · `../../PROGRESS.md`

This document is the work plan. It is written for a person and for an AI coding tool. The tool reads `AGENTS.md` first, then picks the next unchecked task in `PROGRESS.md`.

---

## 1. Goals (OKRs)

### O1 · Ship the core loop by the end of week 4
A seller can sign in, submit a listing, get rejected, fix it and resubmit. An admin can claim, approve and reject. A Global Admin can govern.

| KR | Target | How we check |
|---|---|---|
| KR1.1 | Tasks T01 to T17 are done and section 2 (M1 complete) is true by 15 Nov 2026 | `PROGRESS.md` |
| KR1.2 | QA scenarios QA-01 to QA-31 pass on a staging deploy | Doc 08 |
| KR1.3 | One full loop (submit, reject, WhatsApp link, edit, resubmit, approve) works on a real phone | Manual run, recorded |

### O2 · Keep quality high from day one
| KR | Target | How we check |
|---|---|---|
| KR2.1 | 92 of 92 database checks pass on every change to `supabase/` | CI job `db-tests` |
| KR2.2 | Zero TypeScript errors in strict mode, zero lint errors | CI job `check` |
| KR2.3 | No secret in the repo. Service key never reaches the browser | Secret scan in CI, review of the client bundle |
| KR2.4 | Photo under 1 MB and video under 10 MB on the three test phones | Doc 08 section 2.2 |

### O3 · Meet the Phase 1 gate during closed beta (weeks 5 to 8)
| KR | Target | How we check |
|---|---|---|
| KR3.1 (G1) | 100% of manual Xender and WhatsApp routing removed | Global Admin confirms. Zero manual intake in the last 14 days |
| KR3.2 (G2) | At least 500 reject-edit-resubmit loops delivered automatically | Count of `audit_log` rows with action `listing.resubmit` |
| KR3.3 (G3) | Zero duplicate listings from resubmits | Query in doc 08, group G3 |

### O4 · Unblock the client side early
| KR | Target | Owner |
|---|---|---|
| KR4.1 | Meta business verification started in week 1 | OBN NATION |
| KR4.2 | Both WhatsApp templates approved before week 3 | OBN NATION |
| KR4.3 | Domain DNS access in hand before week 4 | OBN NATION |
| KR4.4 | Transparent PNG or SVG logo received before week 4 (JPG and About Us text are already in) | OBN NATION |

---

## 2. Milestone 1: what "complete" means

Milestone 1 (weeks 1 to 4) is complete when **every line below is true**. The person who signs it off is the Global Admin for the product side, and the CTO's office for the payment release.

### 2.1 What must work (from PRD section 8)

| # | M1 deliverable | Tasks | Proof |
|---|---|---|---|
| 1 | Database and security rules live on the real Supabase project | T02 | 92 of 92 checks pass. Migrations 0001 and 0002 applied |
| 2 | Passwordless WhatsApp sign-in for sellers and admins | T03 to T06 | QA-01 to QA-04 pass |
| 3 | Three-step listing form with on-phone compression and upload | T07 to T09 | QA-05 to QA-12 pass. Photo under 1 MB, video under 10 MB |
| 4 | Referral links and regional routing | T04, T10 | Listing from `?ref=` is assigned to that admin. QA-13 and QA-14 pass |
| 5 | Admin dashboard: claim, single approval, reject with reason | T11 | QA-15 to QA-18 pass. Two admins at once: the first wins |
| 6 | Rejection WhatsApp, 30-day edit link, resubmit | T12, T13 | QA-19 to QA-25 pass |
| 7 | Shared regional pool with masked seller details | T14 | Masking confirmed in the app and in the database |
| 8 | Global Admin screens: reassign, revoke, reinstate, create admin, blacklist | T15 | QA-26 to QA-31 pass |
| 9 | Landing page with the client's About Us text, and Zoho Mail DNS | T16 | Page live on the domain. Mail records verified |
| 10 | Draft cleanup, error pages, empty states | T17 | Every route has loading, empty and error states |

### 2.2 Quality bar

- `npm run check` and `npm test` pass with no errors.
- The SQL tests pass in CI on every change in `supabase/`.
- No secret in the repository. The service-role key is not in the browser bundle.
- The app is deployed to a staging URL on Vercel.
- The WhatsApp sender can be the stub until Meta approves the templates. Live WhatsApp is checked in Milestone 2 (T20).

### 2.3 The one end-to-end run

On a real Android phone, on the staging URL, someone completes this without help:

1. Open an admin's referral link and sign in with a code.
2. Submit a listing with 3 photos and 1 video.
3. As the admin, reject it with a reason.
4. Open the edit link, fix the listing, resubmit.
5. As the admin, approve it.
6. As another admin of the same region, see it in the pool with the seller masked.
7. As Global Admin, reassign it, then revoke and reinstate an admin.

Record the run (screen recording). Keep it in the repo's `docs/evidence/` folder or the project drive.

### 2.4 Sign-off

| Step | Who | Done when |
|---|---|---|
| Demo of the end-to-end run | Developer | Recording shared with the client |
| Client acceptance of M1 | Global Admin | Written yes in WhatsApp or email |
| Payment release for M1 | CTO's office | Per the cost proposal: funds are released on confirmation |
| Pro plans started | Developer | Supabase Pro and Vercel Pro active at the start of M2, as the CTO required |

M1 is **not** complete while any Must requirement in section 6 of the PRD for these routes fails its test in doc 08.

### 2.5 Target dates

These assume the Supabase, Vercel and Twilio accounts exist by Thursday 22 Oct 2026. Each day the accounts are late moves every date by one day.

| Week | Dates (2026) | Tasks | Ends with |
|---|---|---|---|
| 1 | 20 to 25 Oct | T01 to T06 | A phone signs in with a code |
| 2 | 26 Oct to 1 Nov | T07 to T10 | A seller submits a listing with media |
| 3 | 2 to 8 Nov | T11 to T14 | Full loop: submit, reject, edit, resubmit, approve |
| 4 | 9 to 15 Nov | T15 to T17 | Everything in section 2.1 works on staging |
| Sign-off | 16 to 18 Nov | Demo and acceptance | M1 accepted. M2 starts |

---

## 3. Work breakdown

Each task is small enough for one AI session and one commit. "Docs" lists what the tool must read. "Done when" is the check that closes the task.

### Week 1 · Foundation and sign-in

| ID | Task | Docs | Done when |
|---|---|---|---|
| T01 | Create the Next.js 14 app in `apps/web` (App Router, TypeScript strict, Tailwind). Load the brand tokens from PRD 2.2. Add lint, typecheck and test scripts | 02 s2, 01 | `npm run check` passes. Home page shows the wordmark in brand colours |
| T02 | Create the Supabase project. Apply `0001` and `0002`. Add the CI job that runs the SQL tests | 03, `supabase/` | CI shows 92 of 92 checks passing |
| T03 | Env validation and the three Supabase clients (browser, server with user session, server with service role) | 01, 07 s1 | App fails fast with a clear message if a variable is missing. Service key is only imported in server files |
| T04 | Edge middleware: set the `obn_ref` cookie (8 hex, 30 days, HttpOnly), guard `/admin/*` and `/list/form` | 02 s6.2, 06 | Unit tests for cookie rules and redirects |
| T05 | `lib/whatsapp.ts` with a stub sender (logs to server console in dev only). Routes `POST /api/auth/otp/send`, `/verify`, and the hook `POST /api/hooks/send-otp` | 07 s3.1, s3.2, s3.11, s5 | Phone signs in with the stub code. Blacklisted phone is refused. QA-01 to QA-04 pass |
| T06 | `/list` page and `PATCH /api/profile/name` | 02 s6.2, 05 | New seller is asked for a name once, then lands on `/list/form` |

### Week 2 · Listing form and upload

| ID | Task | Docs | Done when |
|---|---|---|---|
| T07 | Three-step form UI with field rules and error messages. Draft kept in memory between steps | 02 s6.3, 05 | Step rules match PRD. Keyboard and phone layout work |
| T08 | Compression: wire `images.ts` and `video.ts`. Self-host FFmpeg files by `postinstall` | 07 s6, s9 | A 6 MB photo becomes WebP under 1 MB. A 60 s clip becomes MP4 under 10 MB. Video over 60 s is refused |
| T09 | `POST /api/listings/create` (draft then submit), signed uploads, "Under review" screen, retry with the same `client_key` | 07 s3.3, 04 s1.2 | QA-05 to QA-12 pass. Retry never makes a second row |
| T10 | Referral: region locked from the cookie, assignment on submit | 02 s5, 06 | A listing sent through `?ref=` shows the admin's region and is assigned to that admin |

### Week 3 · Admin loop

| ID | Task | Docs | Done when |
|---|---|---|---|
| T11 | Admin sign-in and `/admin/dashboard`: inbox from `regional_listings_feed`, claim and approve | 02 s6.5, 03 | QA-13 to QA-18 pass. Two admins acting together: the first wins |
| T12 | Reject modal, `POST /api/listings/reject`, WhatsApp notice, `POST /api/listings/reissue` | 07 s3.4, s3.8, 04 s3 | Rejection needs a reason of 5 to 500 characters. A failed message shows "Send new link" |
| T13 | `/list/edit?token=`: pre-filled form, `upload-url`, `resubmit` | 02 s6.4, 07 s3.5, s3.9 | QA-19 to QA-25 pass. A used, expired or replaced link shows a friendly message |
| T14 | `/admin/pool` with masking | 02 s6.6 | Seller name and phone are masked unless you are the admin in charge or a Global Admin |

### Week 4 · Governance, landing page, polish

| ID | Task | Docs | Done when |
|---|---|---|---|
| T15 | `/admin/global`: reassign, revoke, reinstate, create admin, blacklist (server bans the Auth user) | 02 s6.7, 07 s3.6, s3.10 | QA-26 to QA-31 pass |
| T16 | Landing page `/` with About Us. Zoho DNS records | 02 s3, s6.1 | Page is live on the domain. Mail records verified |
| T17 | `GET /api/cron/purge-drafts`, error pages, empty states, accessibility pass | 07 s3.12, 02 s7 | All routes have loading, empty and error states. Contrast table respected |

### Weeks 5 to 8 · Milestone 2

| ID | Task | Done when |
|---|---|---|
| T18 | Automate the QA scenarios as Playwright end-to-end tests where they can be automated | Suite runs in CI against staging |
| T19 | Test on three cheap Android phones. Fix what breaks | Doc 08 section 2.6 signed off |
| T20 | Upgrade to Supabase Pro and Vercel Pro. Switch the WhatsApp sender from stub to the approved templates | Production checks pass |
| T21 | Closed beta, go-live, measure G1 to G3 | Doc 08 section 3 filled in |

---

## 4. Human gates (the tool must stop and ask)

An AI tool cannot do these. Each one needs you or the client.

| Gate | Needed by | Who |
|---|---|---|
| Create Supabase, Vercel and Twilio accounts and give the tool the keys through `.env.local` (never in chat) | T02 | You |
| Push the repository to GitHub | Before T02 CI | You (`Desmath3`) |
| Meta verification and the two template approvals | T20 (stub is used before) | Client |
| Domain DNS access | T16 | Client |
| Transparent PNG or SVG logo | T16 | Client |
| Answer: is video optional or required? Decided 20 Oct 2026: required | T07 | Done |
| First Global Admin signs in once, then run `bootstrap_global_admin('+2348053466836')` | T11 | You |
| Real-phone checks: WhatsApp delivery, compression, two admins at once | T19 | You |
| Any change to a business rule in PRD section 5 | Any time | Client, through you |

---

## 5. The agent loop

One loop, repeated for each task. It works the same in Claude Code and in Antigravity.

```
PICK    Take the first unchecked task in PROGRESS.md whose gate is clear.
READ    Read AGENTS.md, the task row above, and only the docs it lists.
PLAN    Write 5 to 10 lines: files to touch, tests to add, risks. Save to PROGRESS.md under "Current".
TEST    Write the failing test first when the task is code with logic.
BUILD   Make the smallest change that passes. Follow the rules in AGENTS.md.
CHECK   Run: npm run check, npm test, and the SQL tests if supabase/ changed.
REVIEW  Compare the change line by line with the requirement IDs. List anything not covered.
FIX     If a check fails, fix it. After 3 failed attempts on the same error, stop and write a BLOCKER.
SAVE    Commit on a feat/* branch. Update PROGRESS.md: tick the task, add the commit, note surprises.
STOP    If the next task is behind a human gate, stop and say exactly what is needed.
```

### 5.1 Rules for the loop

1. One task per loop. Do not start the next task before the commit.
2. The docs in `docs/phase-1/` are the truth. If code and docs disagree, stop and report. Do not guess and do not silently edit the docs.
3. Never change an applied migration. Add a new numbered migration.
4. Never put a secret in code, logs or chat. Keys live in `.env.local` and the host dashboards.
5. Never show a plain edit token or an OTP in a log or a response.
6. Keep every change testable. If you cannot test it, say why.
7. Ask a human only at a gate or a BLOCKER. Otherwise decide, and write the decision in `PROGRESS.md`.

### 5.2 Prompt to start a session

Paste this into Claude Code or Antigravity:

```
Read AGENTS.md. Then run the agent loop in docs/phase-1/09_BUILD_PLAN_GOALS_AND_AGENT_LOOP.md section 5.
Work on the next unchecked task in PROGRESS.md. Stop after that one task is committed
and tell me: what changed, what passed, what I must do next.
```

### 5.3 Prompt to run a longer stretch

```
Read AGENTS.md. Run the agent loop on the next tasks in PROGRESS.md, one at a time,
until you reach a human gate or a BLOCKER. After each task, commit and update PROGRESS.md.
At the end, give me a short report: tasks done, tests run, anything I must decide.
```

### 5.4 Prompt for a review pass (use a second session)

```
Read AGENTS.md. Do not write code. Review the last commit against the requirement IDs in the docs
it cites. List gaps, security problems and missing tests, most serious first.
```

A fresh session for review gives a view that is not tied to the builder's reasoning.

---

## 6. Weekly check-in (for you)

At the end of each week, answer four questions in `PROGRESS.md`:

1. Which KRs moved?
2. What blocked us, and who owns the next step?
3. Did any client answer change a rule? If yes, which doc changed?
4. What is the one outcome for next week?
