# Database guide (Phase 1)

Migration: `supabase/migrations/0001_core_schema.sql`. Tests: `supabase/tests/`.

## Tables

| Table | What it holds |
|-------|---------------|
| `regions` | Port Harcourt, Delta, Ekiti (seeded) |
| `sellers` | One row per verified phone. Created on first OTP sign-in. No password. |
| `admins` | Regional and global admins. Has `status` (active / revoked / blacklisted) and an auto-made `referral_code`. |
| `blacklist` | Phones that can never be admins again |
| `listings` | The listing itself: region, admin in charge, item details, status, revision |
| `listing_contacts` | Seller name and phone. **Kept apart on purpose** so it can be masked |
| `listing_media` | Photos and videos (path in storage, size under 10MB) |
| `listing_decisions` | Each admin's approve or reject, per revision |
| `edit_tokens` | Hashed single-use edit links |
| `notifications` | Outbox of WhatsApp templates for a worker to send |
| `audit_log` | Revoke, blacklist, reassign: who, what, why |

## Flow in one line
`pending` → (enough approvals) → `approved`, or (any rejection) → `rejected` → seller edits via link → `pending` again with `revision + 1`.

## Who can see what

| Data | Seller | Admin (same region) | Admin in charge | Global admin | Other region |
|------|:-----:|:-----:|:-----:|:-----:|:-----:|
| Listing content and photos | own | yes | yes | yes | no |
| Seller name and phone | own | **no** | yes | yes | no |
| Approve / reject | no | yes | yes | yes | no |
| Reassign, revoke, blacklist, audit log | no | no | no | yes | no |

Revoked and blacklisted admins fall to the "no" column everywhere, immediately.

## Rules the database enforces
- **Consensus:** region with 2 or fewer active regional admins needs 1 approval. 3 or more needs 2 different admins. A global admin's approval is enough alone.
- **Referral:** a valid, active admin code assigns the listing to that admin. Invalid or revoked codes fall back to the general queue.
- **No duplicates:** `(seller_id, client_key)` is unique, so a double tap on Submit returns the same listing. Resubmit updates the same row and locks the token row, so a second tap fails.
- **Edit token:** stored as a SHA-256 hash. Raw token is only in the queued WhatsApp message. Worker should clear `payload.token` once sent.
- **Blacklist:** status change, blacklist row, audit entry, and block on re-adding the phone. The app server must also ban the auth user (`auth.admin.updateUserById`) so the login itself stops.

## Run the tests
```bash
createdb obn_test
psql obn_test -f supabase/tests/stub_auth.sql   # stand-in for Supabase auth
psql obn_test -f supabase/migrations/0001_core_schema.sql
psql obn_test -f supabase/tests/rls_test.sql    # prints "ALL TESTS PASSED"
```
Not covered yet: two requests hitting resubmit at the exact same instant (the row lock should handle it; test with real concurrency later).

## Assumptions to confirm (see PRD)
Form fields and categories, who is in charge with no referral, and whether one rejection is enough.
