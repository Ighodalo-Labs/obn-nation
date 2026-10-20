# OBN NATION

Trust-verified marketplace for second-hand goods in Nigeria. Built by Boss Petite (GitHub: bosspetite) in the Ighodalo Labs organisation.
Phase 1: the Listing Cloud (WhatsApp OTP sign-in, regional admin review, masked seller contacts).

## Layout
```
apps/web/            Next.js app (to build). lib/ already holds the compression and server helper modules
supabase/migrations/ Database schema and security rules (tested)
supabase/tests/      SQL tests: 92 checks, run with the steps in docs/phase-1/03
docs/phase-1/        The nine Phase 1 engineering documents (start here)
docs/source/         Original documents from OBN NATION (blueprint, cost proposals, CTO sign-off)
docs/archive/        Earlier v0.1 PRD and database notes, superseded
```

## Start here
- `docs/phase-1/01_SYSTEM_ARCHITECTURE.md`: parts, security, phases 1 to 6
- `docs/phase-1/02_PRD_PHASE_1.md`: what we are building, brand, every screen
- `docs/phase-1/03_ERD_AND_DATABASE_SCHEMA.md`: tables, rules, the full SQL
- `docs/phase-1/04_USER_AND_ADMIN_FLOWCHARTS.md`: flows and state machines
- `docs/phase-1/05_UI_WIREFRAMES_AND_IA.md`: site map and phone wireframes
- `docs/phase-1/06_RACI_AND_RBAC_MATRIX.md`: who can do what, who does what
- `docs/phase-1/07_API_CONTRACTS_AND_INTEGRATIONS.md`: API, Twilio, compression code
- `docs/phase-1/08_QA_TEST_CASES_AND_ACCEPTANCE.md`: tests and the Phase 1 gate
- `docs/phase-1/09_BUILD_PLAN_GOALS_AND_AGENT_LOOP.md`: goals (OKRs), tasks T01 to T21, the AI agent loop
- `AGENTS.md` and `PROGRESS.md`: instructions and live status for AI tools (Claude Code, Antigravity)
- `docs/phase-1/ai-context/PHASE1_SINGLE_FILE_BRIEF.md`: one file to paste into any AI chat
- `docs/build-plan.md`: week-by-week order of work
- `docs/source-notes.md`: everything from the client documents

## Stack
Next.js on Vercel · Supabase (Postgres, Auth, Storage) · Twilio WhatsApp · browser-side compression.

## Rules
- Never commit secrets. Copy `.env.example` to `.env.local`.
- `main` is always deployable. Work on `feat/*` branches off `dev`.
