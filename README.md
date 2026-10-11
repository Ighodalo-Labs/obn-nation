# OBN NATION

Trust-verified marketplace for second-hand goods in Nigeria. Built by Ighodalo Labs.
Phase 1: the Listing Cloud (WhatsApp OTP sign-in, regional admin review, masked seller contacts).

## Layout
```
apps/web/            Next.js app: landing page, listing form, admin dashboards (to build)
supabase/migrations/ Database schema and security rules
supabase/tests/      SQL tests for the rules
docs/                PRD, database guide, build plan, notes from the client documents
docs/source/         Original documents from OBN NATION (blueprint, cost proposals, CTO sign-off)
```

## Start here
- `docs/PRD-phase1.md`: what we are building
- `docs/database.md`: tables, who sees what, how to run tests
- `docs/build-plan.md`: week-by-week order of work
- `docs/source-notes.md`: everything from the client documents, with open questions

## Stack
Next.js on Vercel · Supabase (Postgres, Auth, Storage) · Twilio WhatsApp · browser-side compression.

## Rules
- Never commit secrets. Copy `.env.example` to `.env.local`.
- `main` is always deployable. Work on `feat/*` branches off `dev`.
