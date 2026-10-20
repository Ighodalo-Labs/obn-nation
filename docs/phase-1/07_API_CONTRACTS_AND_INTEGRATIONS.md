# 07 · API Contracts and Integrations

Project: OBN NATION ONLINE.COM · Phase 1, the Listing Cloud · Version 1.0 · 17 Oct 2026
Related: [01 Architecture](01_SYSTEM_ARCHITECTURE.md) · [02 PRD](02_PRD_PHASE_1.md) · [03 Database](03_ERD_AND_DATABASE_SCHEMA.md) · [04 Flows](04_USER_AND_ADMIN_FLOWCHARTS.md)

This document is the contract between the web app, the server routes, the database and Twilio. Section 3 holds the exact JSON for the six required endpoints and the extra endpoints the flows need. Section 7 is a machine-readable OpenAPI 3.0 file (validated). Section 9 holds the TypeScript modules that run on the seller's phone and on the server.

---

## 1. Conventions

| Topic | Rule |
|---|---|
| Base path | `/api` on the OBN NATION domain |
| Format | JSON in and out, UTF-8, `Content-Type: application/json` required on every POST and PATCH |
| Auth | Supabase session in HttpOnly, Secure, SameSite=Lax cookies. Routes marked "token" use the edit link instead. Routes marked "internal" use a secret |
| CSRF | The `Origin` header must equal the app origin on POST and PATCH. Together with the JSON content type and SameSite=Lax this blocks cross-site form posts |
| Phone numbers | Input may be `0803…`, `803…` or `+234803…`. Output is always E.164, `+234` followed by 10 digits starting 7, 8 or 9 |
| IDs | UUID strings |
| Times | ISO 8601 in UTC, for example `2026-11-16T15:11:52Z` |
| Request id | Every response carries `x-request-id` and echoes it as `request_id` in error bodies. Never log OTP codes, tokens or message bodies |
| Idempotency | `listings/create` by `client_key`. `listings/resubmit` by single-use token. `admin/blacklist` is safe to repeat |
| Validation | Zod schemas on every route. Text is trimmed. Limits match the database constraints exactly |

### 1.1 Error body

Every non-2xx response has this shape:

```json
{
  "error": {
    "code": "invalid_phone",
    "message": "Enter a Nigerian phone number, for example 0803 123 4567.",
    "details": { "field": "phone" }
  },
  "request_id": "req_8f2c1a"
}
```

`code` is stable and machine-readable. `message` is safe to show to the user. `details` is optional.

### 1.2 Error code catalogue

| HTTP | `code` | When |
|---|---|---|
| 400 | `invalid_phone` | Not a valid Nigerian number |
| 400 | `invalid_code` | Wrong OTP. `details.tries_left` says how many remain |
| 400 | `validation_failed` | Body fails the schema. `details.fields` lists each field and reason |
| 401 | `unauthenticated` | No session, or session no longer valid |
| 403 | `phone_blocked` | The number is blacklisted |
| 403 | `account_blocked` | The signed-in person is revoked or blacklisted |
| 403 | `not_authorized` | The person may not do this to this listing or profile |
| 404 | `listing_not_found` | Missing, or not visible to the caller |
| 404 | `profile_not_found` | Missing, or not the right kind of profile |
| 404 | `token_invalid` | Unknown edit token |
| 409 | `invalid_state` | Wrong status for this action (for example approving twice) |
| 409 | `already_claimed` | Another admin took the listing first |
| 409 | `listing_locked` | Content cannot change in the current status |
| 409 | `already_admin` | The profile already has an admin role |
| 409 | `phone_blacklisted` | Admin creation refused for a blacklisted number |
| 410 | `code_expired` | OTP is expired or void |
| 410 | `token_used` | The edit link was already used |
| 410 | `token_expired` | The edit link is older than 30 days |
| 410 | `token_revoked` | A newer link replaced this one |
| 422 | `name_required` | The seller has not saved a name yet |
| 422 | `invalid_media_path` | A media path is outside the listing's own folder |
| 422 | `reason_required` | Reason shorter than 5 characters |
| 429 | `rate_limited` | Too many requests. `details.retry_after_seconds` and the `Retry-After` header |
| 429 | `too_many_attempts` | Too many wrong codes |
| 429 | `daily_limit_reached` | More than 10 new listings in 24 hours |
| 502 | `whatsapp_unavailable` | Twilio or WhatsApp did not accept the code message |
| 500 | `internal_error` | Anything unexpected. Nothing sensitive in the body |

### 1.3 Database error mapping

Route handlers translate database errors with this table ([03](03_ERD_AND_DATABASE_SCHEMA.md), section 6).

| Database error | HTTP | API `code` |
|---|---|---|
| `42501` | 403 | `not_authorized` (or `account_blocked` when the caller's profile is inactive) |
| `P0002` | 404 | `listing_not_found` or `profile_not_found` |
| `55000` | 409 | `invalid_state` |
| `55006` | 409 | `listing_locked` |
| `23514` with `reason_required` | 422 | `reason_required` |
| `23514` with `invalid_media_path` | 422 | `invalid_media_path` |
| `23514` with `seller_name_required` | 422 | `name_required` |
| `23514` other | 400 | `validation_failed` |
| `54000` | 429 | `daily_limit_reached` |
| `23505` | 409 | Handled per route (create treats it as "found") |
| `OB001` | 404 | `token_invalid` |
| `OB002` | 410 | `token_used` |
| `OB003` | 410 | `token_expired` |
| `OB004` | 410 | `token_revoked` |
| `OB005` | 409 | `already_claimed` |
| `OB006` | 409 | `already_admin` |

## 2. Endpoint index

| # | Method and path | Purpose | Auth |
|---|---|---|---|
| 1 | `POST /api/auth/otp/send` | Send a WhatsApp code | None |
| 2 | `POST /api/auth/otp/verify` | Check the code, start a session | None |
| 3 | `POST /api/listings/create` | Create or find a draft, then submit it | Session |
| 4 | `POST /api/listings/reject` | Reject a listing and message the seller | Admin session |
| 5 | `POST /api/listings/resubmit` | Fix a rejected listing with the edit link | Token |
| 6 | `POST /api/admin/blacklist` | Blacklist an admin permanently | Global Admin session |
| 7 | `PATCH /api/profile/name` | Save the signed-in person's name | Session |
| 8 | `POST /api/listings/reissue` | Send a new edit link | Admin session |
| 9 | `POST /api/listings/edit/upload-url` | Signed upload URLs for the edit page | Token |
| 10 | `POST /api/admin/create` | Add a regional or global admin | Global Admin session |
| 11 | `POST /api/hooks/send-otp` | Supabase Send SMS hook (internal) | Webhook signature |
| 12 | `GET /api/cron/purge-drafts` | Daily draft cleanup (internal) | Cron secret |

## 3. Endpoint contracts

### 3.1 `POST /api/auth/otp/send`

Sends a 6-digit code to the number as an approved WhatsApp authentication template.

Steps on the server: normalise the number, check it against blacklisted profiles, check rate limits, call Supabase Auth `signInWithOtp`, and let the Send SMS hook deliver the message.

Request:

```json
{ "phone": "08031234567" }
```

Success `200`:

```json
{
  "sent": true,
  "phone": "+2348031234567",
  "resend_after_seconds": 60,
  "expires_in_seconds": 600
}
```

Errors:

| Status | `code` | Example body |
|---|---|---|
| 400 | `invalid_phone` | `{"error":{"code":"invalid_phone","message":"Enter a Nigerian phone number, for example 0803 123 4567.","details":{"field":"phone"}},"request_id":"req_1"}` |
| 403 | `phone_blocked` | `{"error":{"code":"phone_blocked","message":"This number cannot be used on OBN NATION."},"request_id":"req_2"}` |
| 429 | `rate_limited` | `{"error":{"code":"rate_limited","message":"Please wait 42 seconds before asking for a new code.","details":{"retry_after_seconds":42}},"request_id":"req_3"}` |
| 502 | `whatsapp_unavailable` | `{"error":{"code":"whatsapp_unavailable","message":"We could not send the code. Check your number and try again."},"request_id":"req_4"}` |

### 3.2 `POST /api/auth/otp/verify`

Request:

```json
{ "phone": "+2348031234567", "code": "481923" }
```

Success `200`. Session cookies are set in the response headers.

```json
{
  "user": {
    "id": "b0000000-0000-4000-8000-000000000001",
    "role": "seller",
    "region": null,
    "needs_name": true
  },
  "next": "/list/form"
}
```

`next` is `/list/form` for sellers, `/admin/dashboard` for admins, or the validated `next` path sent earlier. `needs_name` is true until the person has saved a name of at least 2 characters.

Errors:

| Status | `code` | Example body |
|---|---|---|
| 400 | `invalid_code` | `{"error":{"code":"invalid_code","message":"That code is not right. 4 tries left.","details":{"tries_left":4}},"request_id":"req_5"}` |
| 403 | `phone_blocked` | as above |
| 410 | `code_expired` | `{"error":{"code":"code_expired","message":"This code has expired. Ask for a new one."},"request_id":"req_6"}` |
| 429 | `too_many_attempts` | `{"error":{"code":"too_many_attempts","message":"Too many wrong codes. Ask for a new one.","details":{"retry_after_seconds":0}},"request_id":"req_7"}` |

### 3.3 `POST /api/listings/create`

Creates or finds the seller's draft, then submits it. The same `client_key` always refers to the same listing, so retries are safe.

**Call 1: create the draft (`submit: false`).** Sends all text fields and how many files will follow.

Request:

```json
{
  "client_key": "11111111-1111-4111-8111-111111111111",
  "submit": false,
  "listing": {
    "region": "port_harcourt",
    "category": "fridges",
    "title": "Samsung double door fridge",
    "description": "Cools well. Two years old. Comes with shelves.",
    "price_ngn": 150000,
    "condition_age": "neatly_used",
    "condition_work": "working_perfectly",
    "brand": "Samsung",
    "model": "RT38",
    "size": "380 L"
  },
  "media_plan": { "photo_count": 3, "has_video": true }
}
```

Success `201` (new draft) or `200` (draft already existed):

```json
{
  "listing_id": "c1111111-1111-4111-8111-111111111111",
  "status": "draft",
  "created": true,
  "upload": {
    "photos": [
      "b0000000-0000-4000-8000-000000000001/c1111111-1111-4111-8111-111111111111/1.webp",
      "b0000000-0000-4000-8000-000000000001/c1111111-1111-4111-8111-111111111111/2.webp",
      "b0000000-0000-4000-8000-000000000001/c1111111-1111-4111-8111-111111111111/3.webp"
    ],
    "video": "b0000000-0000-4000-8000-000000000001/c1111111-1111-4111-8111-111111111111/video.mp4"
  }
}
```

The browser uploads each compressed file to the matching path with its own session (`photos` bucket for photos, `videos` bucket for video). The `ref` cookie is read here, on the server, and written into the row's `ref_code`. The browser never sends or chooses the admin.

**Call 2: submit (`submit: true`).** Same body, plus the media paths actually uploaded. `video_path` is `null` when there is no video.

```json
{
  "client_key": "11111111-1111-4111-8111-111111111111",
  "submit": true,
  "listing": { "region": "port_harcourt", "category": "fridges", "title": "Samsung double door fridge", "description": "Cools well. Two years old. Comes with shelves.", "price_ngn": 150000, "condition_age": "neatly_used", "condition_work": "working_perfectly", "brand": "Samsung", "model": "RT38", "size": "380 L" },
  "media": {
    "photo_paths": [
      "b0000000-0000-4000-8000-000000000001/c1111111-1111-4111-8111-111111111111/1.webp",
      "b0000000-0000-4000-8000-000000000001/c1111111-1111-4111-8111-111111111111/2.webp",
      "b0000000-0000-4000-8000-000000000001/c1111111-1111-4111-8111-111111111111/3.webp"
    ],
    "video_path": null
  }
}
```

Success `200`:

```json
{
  "listing_id": "c1111111-1111-4111-8111-111111111111",
  "status": "pending_review",
  "submitted_at": "2026-10-17T14:05:09Z"
}
```

If the listing was already submitted, the response is `200` with `"already_submitted": true` and the current status. Nothing changes.

Errors:

| Status | `code` | Meaning |
|---|---|---|
| 400 | `validation_failed` | `details.fields` lists problems, for example `[{"field":"title","reason":"Must be 3 to 80 characters"}]` |
| 401 | `unauthenticated` | Session missing |
| 403 | `account_blocked` | Revoked or blacklisted |
| 422 | `name_required` | Save a name first |
| 422 | `invalid_media_path` | A path is outside `<seller_id>/<listing_id>/` |
| 429 | `daily_limit_reached` | "You have reached today's limit of 10 listings. Please come back tomorrow." |

### 3.4 `POST /api/listings/reject`

Server steps: verify the session and read the caller's user id; make a UUID token and its SHA-256 hash; call `reject_listing` with the service role and the caller as `p_actor`; load the seller's phone and name with the service role; send the rejection template; return the result. The plain token exists only in memory for the length of this request.

Request:

```json
{
  "listing_id": "c1111111-1111-4111-8111-111111111111",
  "reason": "Photos are blurry. Please retake in daylight."
}
```

Success `200`:

```json
{
  "listing_id": "c1111111-1111-4111-8111-111111111111",
  "status": "rejected",
  "edit_link_expires_at": "2026-11-16T14:20:31Z",
  "notification": { "status": "sent", "twilio_sid": "SM0123456789abcdef0123456789abcdef" }
}
```

If the rejection is saved but Twilio fails, the status is still `200`, because the rejection happened. The admin sees "Message not sent" and a **Send new link** button, which calls `reissue`.

```json
{
  "listing_id": "c1111111-1111-4111-8111-111111111111",
  "status": "rejected",
  "edit_link_expires_at": "2026-11-16T14:20:31Z",
  "notification": { "status": "failed", "reason": "twilio_63016" }
}
```

Errors: `400 validation_failed` (reason shorter than 5 or longer than 500), `401 unauthenticated`, `403 not_authorized`, `404 listing_not_found`, `409 invalid_state` (already handled).

### 3.5 `POST /api/listings/resubmit`

No session. The token is the credential. Only changed fields are sent.

Request:

```json
{
  "token": "6f1c2b7e-3a42-4d8e-9f10-5b2c7a9d0e11",
  "listing": {
    "title": "Samsung double door fridge 380L",
    "price_ngn": 140000,
    "photo_paths": [
      "b0000000-0000-4000-8000-000000000001/c1111111-1111-4111-8111-111111111111/r1-1.webp",
      "b0000000-0000-4000-8000-000000000001/c1111111-1111-4111-8111-111111111111/r1-2.webp"
    ],
    "video_path": null
  }
}
```

Server steps: check the token shape, hash it, call `resubmit_listing(hash, fields)` with the service role. The function locks the token and the listing, updates the same row, sets `pending_review`, clears the rejection reason, adds one to `resubmit_count`, burns the token and writes the audit entry, all in one transaction.

Success `200`:

```json
{ "listing_id": "c1111111-1111-4111-8111-111111111111", "status": "pending_review" }
```

Errors:

| Status | `code` | Message to show |
|---|---|---|
| 400 | `validation_failed` | Field errors |
| 404 | `token_invalid` | "This link is not valid." |
| 410 | `token_used` | "This link has already been used. If you need to change something else, ask your admin for a new link." |
| 410 | `token_expired` | "This link has expired. Ask your admin to send a new one." |
| 410 | `token_revoked` | "This link was replaced by a newer message. Please use the latest one." |
| 409 | `invalid_state` | The listing is no longer waiting for changes |
| 422 | `invalid_media_path` | A path is outside the listing's folder. The token is not burned |

A double tap sends two requests. The first wins. The second finds the token used and returns `410 token_used`. No second update happens.

### 3.6 `POST /api/admin/blacklist`

Global Admin only. Permanent.

Server steps: verify the session; call `blacklist_admin(actor, profile, reason)` with the service role (the function re-checks that the actor is an active Global Admin); then ban the Auth user with the Supabase admin API (`ban_duration` set to a very long period). If the ban call fails, the database flag already blocks all data access, so the route still answers `200` and reports the ban status.

Request:

```json
{
  "profile_id": "a0000000-0000-4000-8000-000000000004",
  "reason": "Posed as the brand in a group chat"
}
```

Success `200`:

```json
{ "profile_id": "a0000000-0000-4000-8000-000000000004", "is_blacklisted": true, "auth_banned": true }
```

When the ban call failed:

```json
{
  "profile_id": "a0000000-0000-4000-8000-000000000004",
  "is_blacklisted": true,
  "auth_banned": false,
  "warning": "Blacklisted. Sign-in block is being retried. Repeat the request to retry."
}
```

Errors: `400 validation_failed`, `401 unauthenticated`, `403 not_authorized` (not a Global Admin), `404 profile_not_found` (not an admin), `422 reason_required`.

### 3.7 `PATCH /api/profile/name`

Request `{ "full_name": "Ada Obi" }`. Success `200` `{ "full_name": "Ada Obi" }`. Errors: `400 validation_failed` (2 to 80 characters), `401 unauthenticated`. Uses the signed-in person's own session, so only their own row can change.

### 3.8 `POST /api/listings/reissue`

Request `{ "listing_id": "c1111111-1111-4111-8111-111111111111" }`. Same server steps as reject, but calls `reissue_edit_link`. Success `200` with the same body shape as reject. Errors: `401`, `403 not_authorized`, `404 listing_not_found`, `409 invalid_state` (listing is not rejected).

### 3.9 `POST /api/listings/edit/upload-url`

For the edit page, where there is no session. After checking the token (without using it up), the server asks Supabase Storage for signed upload URLs into the listing's folder. New file names carry a resubmission prefix (`r1-1.webp`) so they never overwrite files that are still attached.

Request:

```json
{ "token": "6f1c2b7e-3a42-4d8e-9f10-5b2c7a9d0e11", "photo_count": 2, "has_video": false }
```

Success `200`:

```json
{
  "photos": [
    { "path": "b0000000-…/c1111111-…/r1-1.webp", "signed_url": "https://<project>.supabase.co/storage/v1/object/upload/sign/photos/…", "token": "…" },
    { "path": "b0000000-…/c1111111-…/r1-2.webp", "signed_url": "https://<project>.supabase.co/storage/v1/object/upload/sign/photos/…", "token": "…" }
  ],
  "video": null,
  "expires_in_seconds": 7200
}
```

Errors: `404 token_invalid`, `410 token_used | token_expired | token_revoked`, `429 rate_limited`.

### 3.10 `POST /api/admin/create`

Global Admin only. Finds the profile for the phone, or makes the login with the Supabase admin API (phone confirmed) so the profile exists, then calls `promote_to_admin` with the Global Admin's own session.

Request:

```json
{ "phone": "0811 000 0003", "full_name": "Tunde Bello", "role": "regional_admin", "region": "port_harcourt" }
```

Success `201`:

```json
{
  "profile_id": "a0000000-0000-4000-8000-000000000003",
  "role": "regional_admin",
  "region": "port_harcourt",
  "referral_code": "7c1e44ab",
  "referral_link": "/list?ref=7c1e44ab"
}
```

Errors: `400 validation_failed`, `403 not_authorized`, `409 phone_blacklisted`, `409 already_admin`.

### 3.11 `POST /api/hooks/send-otp` (internal)

Called by Supabase Auth, never by browsers. Set up under Authentication, Hooks, Send SMS hook in the Supabase dashboard with this URL and the hook secret. The route verifies the standard webhooks signature, refuses blacklisted numbers, and sends the OTP template with `sendOtp`.

Payload from Supabase (fields used):

```json
{ "user": { "id": "b0000000-0000-4000-8000-000000000001", "phone": "2348031234567" }, "sms": { "otp": "481923" } }
```

Success: `200` with `{}`. Refusal or failure: `400` with `{ "error": { "http_code": 400, "message": "Could not send the code." } }`, which Supabase turns into an error for the `otp/send` call (mapped to `502 whatsapp_unavailable`, or `403 phone_blocked` for blacklisted numbers).

### 3.12 `GET /api/cron/purge-drafts` (internal)

Header `Authorization: Bearer <CRON_SECRET>`. Calls `purge_stale_drafts(7)`, removes each returned folder from the `photos` and `videos` buckets, answers `{ "purged": 9 }`.

## 4. Direct database calls (no server route)

Signed-in admins call these with the Supabase client and their own session. Row Level Security and the function bodies decide the result.

| Call | Who | Notes |
|---|---|---|
| `from('regional_listings_feed').select(…)` | Admins | The masked feed. Filter by `status`, `category`, `region` |
| `rpc('claim_listing', { p_listing })` | Regional admin, Global Admin | Errors `OB005`, `42501`, `P0002`, `55000` |
| `rpc('approve_listing', { p_listing })` | Same | One approval makes it live |
| `rpc('reassign_listing', { p_listing, p_new_admin, p_reason })` | Global Admin | |
| `rpc('revoke_admin', { p_profile, p_reason })` | Global Admin | |
| `rpc('reinstate_admin', { p_profile })` | Global Admin | |
| `from('audit_log').select(…)` | Global Admin | Latest 200 |
| `from('profiles').select(…)` | Global Admin: all. Admin in charge: their sellers | |

## 5. WhatsApp templates (Twilio Content API)

Both templates must be submitted to Meta by OBN NATION's verified business account and approved before go-live. Until approval, development uses a stub sender that logs nothing sensitive.

| Template | Category | Variables | Text |
|---|---|---|---|
| `obn_otp` | Authentication | 1: code | Meta's standard authentication format: "{{1}} is your verification code." with a copy-code button and an expiry note. The wording is fixed by Meta for this category |
| `obn_listing_rejected` | Utility | 1: first name, 2: item title, 3: reason, 4: edit link | "Hi {{1}}, your OBN NATION listing "{{2}}" needs a small change: {{3}} Please fix it here. The link works once and stays open for 30 days: {{4}} Thank you, OBN NATION." |

Rules the code follows: variables never contain line breaks or tabs; the reason is cut to 300 characters; the template never ends with a variable; no marketing text is added. Environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_OTP_CONTENT_SID`, `TWILIO_REJECT_CONTENT_SID`.

Cost control: each message is a template message billed by Twilio plus Meta's conversation fee. The monthly line in the cost proposal is the ceiling. The first alert is at 80%.

## 6. Client-side compression

| Setting | Photos | Video |
|---|---|---|
| Library | `browser-image-compression` 2.0.2 | `@ffmpeg/ffmpeg` 0.12.10, `@ffmpeg/util` 0.12.1, `@ffmpeg/core` 0.12.6 (single thread) |
| Input accepted | JPEG, PNG, WebP up to 30 MB | MP4, MOV, WebM, 3GP up to 150 MB, at most 60 seconds (checked before encoding) |
| Output | WebP, under 1 MB (target 0.9 MB), longest edge tried at 1600, 1280, 1024, 800 pixels | MP4, H.264 and AAC mono at 64 kbit/s, under 10 MB (target 9 MB), 720p first pass then 480p |
| Count | 1 to 6 | 0 or 1 |
| Where it runs | Web worker in the browser | Web worker in the browser. Loaded only when a video is added |
| Failure | Clear message naming the file. Other photos kept | Clear message. The listing can still be submitted without video |

Setup notes:

1. Install the libraries with exact versions.
2. Copy `ffmpeg-core.js` and `ffmpeg-core.wasm` from `node_modules/@ffmpeg/core/dist/umd/` into `public/ffmpeg/` with an npm `postinstall` script, so the encoder is served from our own domain.
3. The single-thread core needs no `SharedArrayBuffer`, so no special cross-origin headers are required. The CSP needs `'wasm-unsafe-eval'` in `script-src` and `worker-src 'self' blob:` ([01](01_SYSTEM_ARCHITECTURE.md), section 6).
4. Serve the `.wasm` file with `Content-Type: application/wasm` and long-lived caching.
5. Test video on a low-end Android phone early. On weak phones a 60-second clip can take minutes; the progress bar and the cancel button are required.

## 7. OpenAPI 3.0 specification

```yaml
openapi: 3.0.3
info:
  title: OBN NATION Phase 1 API
  version: 1.0.0
  description: Server routes of the Listing Cloud. Claim, approve, reassign, revoke and reinstate are database function calls and are not listed here.
servers:
  - url: /api
tags:
  - name: auth
  - name: listings
  - name: admin
  - name: internal
paths:
  /auth/otp/send:
    post:
      tags: [auth]
      summary: Send a WhatsApp code
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/OtpSendRequest' }
            example: { phone: '08031234567' }
      responses:
        '200':
          description: Code sent
          content:
            application/json:
              schema: { $ref: '#/components/schemas/OtpSendResponse' }
              example: { sent: true, phone: '+2348031234567', resend_after_seconds: 60, expires_in_seconds: 600 }
        '400': { $ref: '#/components/responses/ValidationError' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '429': { $ref: '#/components/responses/RateLimited' }
        '502': { $ref: '#/components/responses/BadGateway' }
  /auth/otp/verify:
    post:
      tags: [auth]
      summary: Check the code and start a session
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/OtpVerifyRequest' }
            example: { phone: '+2348031234567', code: '481923' }
      responses:
        '200':
          description: Signed in. Session cookies are set.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/OtpVerifyResponse' }
              example: { user: { id: 'b0000000-0000-4000-8000-000000000001', role: seller, region: null, needs_name: true }, next: /list/form }
        '400': { $ref: '#/components/responses/ValidationError' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '410': { $ref: '#/components/responses/Gone' }
        '429': { $ref: '#/components/responses/RateLimited' }
  /profile/name:
    patch:
      tags: [auth]
      summary: Save the signed-in person's name
      security: [{ session: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [full_name]
              properties:
                full_name: { type: string, minLength: 2, maxLength: 80 }
            example: { full_name: Ada Obi }
      responses:
        '200':
          description: Saved
          content:
            application/json:
              schema:
                type: object
                properties:
                  full_name: { type: string }
        '400': { $ref: '#/components/responses/ValidationError' }
        '401': { $ref: '#/components/responses/Unauthenticated' }
  /listings/create:
    post:
      tags: [listings]
      summary: Create or find a draft, then submit it
      description: Call once with submit=false to create (or find) the draft and receive the upload paths. Upload the files. Call again with submit=true and the media paths. The same client_key always returns the same listing.
      security: [{ session: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateListingRequest' }
      responses:
        '200':
          description: Draft found, or submitted
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CreateListingResponse' }
        '201':
          description: Draft created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CreateListingResponse' }
        '400': { $ref: '#/components/responses/ValidationError' }
        '401': { $ref: '#/components/responses/Unauthenticated' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '422': { $ref: '#/components/responses/Unprocessable' }
        '429': { $ref: '#/components/responses/RateLimited' }
  /listings/reject:
    post:
      tags: [listings]
      summary: Reject a pending listing and message the seller
      security: [{ session: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/RejectRequest' }
            example: { listing_id: 'c1111111-1111-4111-8111-111111111111', reason: Photos are blurry. Please retake in daylight. }
      responses:
        '200':
          description: Rejected. The notification result says whether WhatsApp accepted the message.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/RejectResponse' }
        '400': { $ref: '#/components/responses/ValidationError' }
        '401': { $ref: '#/components/responses/Unauthenticated' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '404': { $ref: '#/components/responses/NotFound' }
        '409': { $ref: '#/components/responses/Conflict' }
  /listings/reissue:
    post:
      tags: [listings]
      summary: Send a new edit link for a rejected listing
      security: [{ session: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [listing_id]
              properties:
                listing_id: { type: string, format: uuid }
      responses:
        '200':
          description: New link made, older links revoked
          content:
            application/json:
              schema: { $ref: '#/components/schemas/RejectResponse' }
        '401': { $ref: '#/components/responses/Unauthenticated' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '404': { $ref: '#/components/responses/NotFound' }
        '409': { $ref: '#/components/responses/Conflict' }
  /listings/edit/upload-url:
    post:
      tags: [listings]
      summary: Get signed upload URLs for an edit link
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [token, photo_count, has_video]
              properties:
                token: { type: string, format: uuid }
                photo_count: { type: integer, minimum: 0, maximum: 6 }
                has_video: { type: boolean }
      responses:
        '200':
          description: Signed upload targets
          content:
            application/json:
              schema: { $ref: '#/components/schemas/UploadTargets' }
        '404': { $ref: '#/components/responses/NotFound' }
        '410': { $ref: '#/components/responses/Gone' }
        '429': { $ref: '#/components/responses/RateLimited' }
  /listings/resubmit:
    post:
      tags: [listings]
      summary: Fix a rejected listing with the edit link
      description: Updates the same listing and burns the token in one transaction. A second call with the same token fails with token_used and changes nothing.
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/ResubmitRequest' }
      responses:
        '200':
          description: Back in review
          content:
            application/json:
              schema:
                type: object
                properties:
                  listing_id: { type: string, format: uuid }
                  status: { type: string, enum: [pending_review] }
        '400': { $ref: '#/components/responses/ValidationError' }
        '404': { $ref: '#/components/responses/NotFound' }
        '409': { $ref: '#/components/responses/Conflict' }
        '410': { $ref: '#/components/responses/Gone' }
        '422': { $ref: '#/components/responses/Unprocessable' }
  /admin/create:
    post:
      tags: [admin]
      summary: Add a regional or global admin
      security: [{ session: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateAdminRequest' }
      responses:
        '201':
          description: Admin created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CreateAdminResponse' }
        '400': { $ref: '#/components/responses/ValidationError' }
        '401': { $ref: '#/components/responses/Unauthenticated' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '409': { $ref: '#/components/responses/Conflict' }
  /admin/blacklist:
    post:
      tags: [admin]
      summary: Blacklist an admin permanently
      security: [{ session: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/BlacklistRequest' }
            example: { profile_id: 'a0000000-0000-4000-8000-000000000004', reason: Posed as the brand in a group chat }
      responses:
        '200':
          description: Blacklisted. Safe to repeat.
          content:
            application/json:
              schema: { $ref: '#/components/schemas/BlacklistResponse' }
        '400': { $ref: '#/components/responses/ValidationError' }
        '401': { $ref: '#/components/responses/Unauthenticated' }
        '403': { $ref: '#/components/responses/Forbidden' }
        '404': { $ref: '#/components/responses/NotFound' }
  /hooks/send-otp:
    post:
      tags: [internal]
      summary: Supabase Send SMS hook
      description: Called by Supabase Auth, not by browsers. Verifies the webhook signature, then sends the OTP template.
      security: [{ webhook: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                user: { type: object, properties: { id: { type: string }, phone: { type: string } } }
                sms: { type: object, properties: { otp: { type: string } } }
      responses:
        '200': { description: Sent }
        '400': { $ref: '#/components/responses/BadGateway' }
  /cron/purge-drafts:
    get:
      tags: [internal]
      summary: Delete drafts older than 7 days and their files
      security: [{ cron: [] }]
      responses:
        '200':
          description: Done
          content:
            application/json:
              schema:
                type: object
                properties:
                  purged: { type: integer }
        '401': { $ref: '#/components/responses/Unauthenticated' }
components:
  securitySchemes:
    session: { type: apiKey, in: cookie, name: sb-access-token }
    webhook: { type: http, scheme: bearer, description: Standard webhooks signature headers }
    cron: { type: http, scheme: bearer }
  schemas:
    Error:
      type: object
      required: [error, request_id]
      properties:
        error:
          type: object
          required: [code, message]
          properties:
            code: { type: string }
            message: { type: string }
            details: { type: object, additionalProperties: true }
        request_id: { type: string }
    OtpSendRequest:
      type: object
      required: [phone]
      properties:
        phone: { type: string, description: 'Nigerian number as 0803..., 803... or +234803...' }
    OtpSendResponse:
      type: object
      required: [sent, phone, resend_after_seconds, expires_in_seconds]
      properties:
        sent: { type: boolean }
        phone: { type: string, pattern: '^\+234[789][0-9]{9}$' }
        resend_after_seconds: { type: integer }
        expires_in_seconds: { type: integer }
    OtpVerifyRequest:
      type: object
      required: [phone, code]
      properties:
        phone: { type: string }
        code: { type: string, pattern: '^[0-9]{6}$' }
    OtpVerifyResponse:
      type: object
      required: [user, next]
      properties:
        user:
          type: object
          required: [id, role, needs_name]
          properties:
            id: { type: string, format: uuid }
            role: { type: string, enum: [seller, regional_admin, global_admin] }
            region: { type: string, nullable: true, enum: [port_harcourt, delta, ekiti, null] }
            needs_name: { type: boolean }
        next: { type: string }
    ListingFields:
      type: object
      required: [region, category, title, description, price_ngn, condition_age, condition_work]
      properties:
        region: { type: string, enum: [port_harcourt, delta, ekiti] }
        category: { type: string, enum: [phones, computers, tvs, fridges, generators, kitchen, furniture, other] }
        title: { type: string, minLength: 3, maxLength: 80 }
        description: { type: string, minLength: 10, maxLength: 1000 }
        price_ngn: { type: number, minimum: 1, maximum: 1000000000 }
        condition_age: { type: string, enum: [new_sealed, new_open_box, premium_used, neatly_used, fairly_used] }
        condition_work: { type: string, enum: [working_perfectly, minor_issues, not_working] }
        brand: { type: string, minLength: 1, maxLength: 60, nullable: true }
        model: { type: string, minLength: 1, maxLength: 60, nullable: true }
        size: { type: string, minLength: 1, maxLength: 60, nullable: true }
    CreateListingRequest:
      type: object
      required: [client_key, submit, listing]
      properties:
        client_key: { type: string, format: uuid }
        submit: { type: boolean }
        listing: { $ref: '#/components/schemas/ListingFields' }
        media_plan:
          type: object
          description: Needed when submit is false. How many files will be uploaded.
          properties:
            photo_count: { type: integer, minimum: 1, maximum: 6 }
            has_video: { type: boolean }
        media:
          type: object
          description: Needed when submit is true. Paths exactly as returned by the first call.
          properties:
            photo_paths: { type: array, minItems: 1, maxItems: 6, items: { type: string } }
            video_path: { type: string, nullable: true }
    CreateListingResponse:
      type: object
      required: [listing_id, status]
      properties:
        listing_id: { type: string, format: uuid }
        status: { type: string, enum: [draft, pending_review, rejected, approved] }
        created: { type: boolean }
        already_submitted: { type: boolean }
        submitted_at: { type: string, format: date-time }
        upload:
          type: object
          properties:
            photos: { type: array, items: { type: string } }
            video: { type: string, nullable: true }
    UploadTargets:
      type: object
      properties:
        photos:
          type: array
          items: { $ref: '#/components/schemas/UploadTarget' }
        video:
          nullable: true
          allOf: [{ $ref: '#/components/schemas/UploadTarget' }]
        expires_in_seconds: { type: integer }
    UploadTarget:
      type: object
      properties:
        path: { type: string }
        signed_url: { type: string }
        token: { type: string }
    RejectRequest:
      type: object
      required: [listing_id, reason]
      properties:
        listing_id: { type: string, format: uuid }
        reason: { type: string, minLength: 5, maxLength: 500 }
    RejectResponse:
      type: object
      required: [listing_id, edit_link_expires_at, notification]
      properties:
        listing_id: { type: string, format: uuid }
        status: { type: string, enum: [rejected] }
        edit_link_expires_at: { type: string, format: date-time }
        notification:
          type: object
          required: [status]
          properties:
            status: { type: string, enum: [sent, failed] }
            twilio_sid: { type: string }
            reason: { type: string }
    ResubmitRequest:
      type: object
      required: [token]
      properties:
        token: { type: string, format: uuid }
        listing:
          type: object
          description: Only the fields that changed.
          properties:
            category: { type: string }
            title: { type: string }
            description: { type: string }
            price_ngn: { type: number }
            condition_age: { type: string }
            condition_work: { type: string }
            brand: { type: string, nullable: true }
            model: { type: string, nullable: true }
            size: { type: string, nullable: true }
            photo_paths: { type: array, items: { type: string } }
            video_path: { type: string, nullable: true }
    CreateAdminRequest:
      type: object
      required: [phone, full_name, role]
      properties:
        phone: { type: string }
        full_name: { type: string, minLength: 2, maxLength: 80 }
        role: { type: string, enum: [regional_admin, global_admin] }
        region: { type: string, enum: [port_harcourt, delta, ekiti] }
    CreateAdminResponse:
      type: object
      properties:
        profile_id: { type: string, format: uuid }
        role: { type: string }
        region: { type: string, nullable: true }
        referral_code: { type: string, nullable: true }
        referral_link: { type: string, nullable: true }
    BlacklistRequest:
      type: object
      required: [profile_id, reason]
      properties:
        profile_id: { type: string, format: uuid }
        reason: { type: string, minLength: 5, maxLength: 500 }
    BlacklistResponse:
      type: object
      required: [profile_id, is_blacklisted, auth_banned]
      properties:
        profile_id: { type: string, format: uuid }
        is_blacklisted: { type: boolean }
        auth_banned: { type: boolean }
        warning: { type: string }
  responses:
    ValidationError:
      description: Invalid input
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    Unauthenticated:
      description: No valid session
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    Forbidden:
      description: Not allowed
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    NotFound:
      description: Not found, or not visible to this caller
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    Conflict:
      description: Wrong state for this action
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    Gone:
      description: Code or link is used, expired or replaced
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    Unprocessable:
      description: Input is well formed but breaks a business rule
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    RateLimited:
      description: Too many requests
      headers:
        Retry-After: { schema: { type: integer } }
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    BadGateway:
      description: WhatsApp or another upstream service failed
      content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
```

## 8. Module overview

| File | Runs on | Purpose |
|---|---|---|
| `apps/web/lib/compression/images.ts` | Browser | Photo compression to WebP under 1 MB |
| `apps/web/lib/compression/video.ts` | Browser | Video check and compression to MP4 under 10 MB |
| `apps/web/lib/edit-token.ts` | Server | Make a token, its hash and the link; validate token shape |
| `apps/web/lib/whatsapp.ts` | Server | Send the OTP and rejection templates through Twilio |

All four compile under TypeScript 5.5 in strict mode (`noUnusedLocals` and `noUnusedParameters` on) against the pinned library versions.

## 9. TypeScript modules

### 9.1 `lib/compression/images.ts`

```ts
import imageCompression from 'browser-image-compression';

/** Supabase bucket "photos" refuses anything above 1 MiB. We aim lower so we never sit on the edge. */
export const IMAGE_BUCKET_LIMIT_BYTES = 1_048_576;
export const IMAGE_TARGET_MB = 0.9; // browser-image-compression counts MB as 1024 * 1024 bytes
export const IMAGE_MAX_INPUT_BYTES = 30 * 1024 * 1024;
export const IMAGE_MAX_COUNT = 6;

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Longest edge in pixels. We try each size in turn until the file fits under the limit. */
const EDGE_STEPS = [1600, 1280, 1024, 800] as const;

export type ImageErrorCode =
  | 'unsupported_type'
  | 'input_too_large'
  | 'too_many_files'
  | 'cannot_fit_under_limit'
  | 'decode_failed';

export class ImageCompressionError extends Error {
  constructor(
    public readonly code: ImageErrorCode,
    /** Plain message that is safe to show to the seller. */
    message: string,
    public readonly fileName?: string,
  ) {
    super(message);
    this.name = 'ImageCompressionError';
  }
}

export interface CompressImageOptions {
  /** Used to name the output file: "<index>.webp". */
  index: number;
  signal?: AbortSignal;
  /** Called with 0-100 for this one file. */
  onProgress?: (percent: number) => void;
}

function assertAcceptable(file: File): void {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    throw new ImageCompressionError(
      'unsupported_type',
      'Please choose a JPG, PNG or WebP photo.',
      file.name,
    );
  }
  if (file.size > IMAGE_MAX_INPUT_BYTES) {
    throw new ImageCompressionError(
      'input_too_large',
      'This photo is too big to process. Please pick a smaller one.',
      file.name,
    );
  }
}

/** Compress one photo to WebP under 1 MB. Returns a new File named "<index>.webp". */
export async function compressImage(file: File, options: CompressImageOptions): Promise<File> {
  assertAcceptable(file);

  for (const edge of EDGE_STEPS) {
    let output: File;
    try {
      output = await imageCompression(file, {
        maxSizeMB: IMAGE_TARGET_MB,
        maxWidthOrHeight: edge,
        fileType: 'image/webp',
        initialQuality: 0.8,
        useWebWorker: true,
        alwaysKeepResolution: false,
        signal: options.signal,
        onProgress: options.onProgress,
      });
    } catch (err) {
      if (options.signal?.aborted) throw err;
      throw new ImageCompressionError(
        'decode_failed',
        'We could not read this photo. Try another one.',
        file.name,
      );
    }
    if (output.size < IMAGE_BUCKET_LIMIT_BYTES) {
      return new File([output], `${options.index}.webp`, {
        type: 'image/webp',
        lastModified: Date.now(),
      });
    }
  }

  throw new ImageCompressionError(
    'cannot_fit_under_limit',
    'This photo is still too big after shrinking. Please pick another one.',
    file.name,
  );
}

export interface CompressImagesOptions {
  signal?: AbortSignal;
  /** Overall progress, 0-100, across all files. */
  onProgress?: (percent: number) => void;
  /** Called after each file finishes. */
  onFileDone?: (index: number, result: File) => void;
}

/**
 * Compress up to six photos, one at a time (parallel work crashes cheap phones).
 * Stops at the first failure and throws an ImageCompressionError that names the file.
 */
export async function compressImages(files: File[], options: CompressImagesOptions = {}): Promise<File[]> {
  if (files.length > IMAGE_MAX_COUNT) {
    throw new ImageCompressionError('too_many_files', `You can add up to ${IMAGE_MAX_COUNT} photos.`);
  }
  const results: File[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const done = await compressImage(files[i], {
      index: i + 1,
      signal: options.signal,
      onProgress: (p) => options.onProgress?.(Math.round(((i + p / 100) / files.length) * 100)),
    });
    results.push(done);
    options.onFileDone?.(i, done);
  }
  options.onProgress?.(100);
  return results;
}
```

### 9.2 `lib/compression/video.ts`

```ts
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

/** Supabase bucket "videos" refuses anything above 10 MiB. We aim for 9 MiB. */
export const VIDEO_BUCKET_LIMIT_BYTES = 10 * 1024 * 1024;
export const VIDEO_TARGET_BYTES = 9 * 1024 * 1024;
export const VIDEO_MAX_SECONDS = 60;
export const VIDEO_MAX_INPUT_BYTES = 150 * 1024 * 1024;

const AUDIO_BITRATE = 64_000;
/** Self-hosted single-thread core in /public/ffmpeg. Single thread needs no special browser headers. */
const CORE_BASE_URL = '/ffmpeg';
const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp'] as const;

export type VideoErrorCode =
  | 'unsupported_type'
  | 'input_too_large'
  | 'too_long'
  | 'unreadable'
  | 'cannot_fit_under_limit'
  | 'engine_failed'
  | 'cancelled';

export class VideoCompressionError extends Error {
  constructor(public readonly code: VideoErrorCode, message: string) {
    super(message);
    this.name = 'VideoCompressionError';
  }
}

export interface CompressVideoOptions {
  signal?: AbortSignal;
  /** 0-100 while encoding. */
  onProgress?: (percent: number) => void;
}

let enginePromise: Promise<FFmpeg> | null = null;

/** Download the encoder once per page visit (about 30 MB). Only called when a seller adds a video. */
function loadEngine(): Promise<FFmpeg> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const ffmpeg = new FFmpeg();
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      return ffmpeg;
    })().catch(() => {
      enginePromise = null; // allow a retry on the next attempt
      throw new VideoCompressionError(
        'engine_failed',
        'The video tool could not load. Check your network and try again.',
      );
    });
  }
  return enginePromise;
}

/** Read the length of a video in seconds without decoding it. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute('src');
      video.load();
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const seconds = video.duration;
      cleanup();
      if (Number.isFinite(seconds) && seconds > 0) resolve(seconds);
      else reject(new VideoCompressionError('unreadable', 'We could not read this video.'));
    };
    video.onerror = () => {
      cleanup();
      reject(new VideoCompressionError('unreadable', 'We could not read this video.'));
    };
    video.src = url;
  });
}

/** Check type, size and length before spending time on encoding. Returns the duration in seconds. */
export async function validateVideo(file: File): Promise<number> {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    throw new VideoCompressionError('unsupported_type', 'Please choose an MP4 or phone video.');
  }
  if (file.size > VIDEO_MAX_INPUT_BYTES) {
    throw new VideoCompressionError(
      'input_too_large',
      'This video is too big to process on your phone. Record a shorter one or lower the quality.',
    );
  }
  const seconds = await readVideoDuration(file);
  if (seconds > VIDEO_MAX_SECONDS + 0.5) {
    throw new VideoCompressionError('too_long', `Videos can be at most ${VIDEO_MAX_SECONDS} seconds.`);
  }
  return seconds;
}

interface Pass {
  height: number;
  videoBitrate: number;
}

function planPasses(seconds: number): Pass[] {
  const totalBits = VIDEO_TARGET_BYTES * 8;
  const first = Math.max(150_000, Math.floor(totalBits / seconds) - AUDIO_BITRATE);
  return [
    { height: 720, videoBitrate: first },
    { height: 480, videoBitrate: Math.max(120_000, Math.floor(first * 0.7)) },
  ];
}

/**
 * Turn any phone video of up to 60 seconds into an MP4 (H.264 + AAC) under 10 MB.
 * Returns a File named "video.mp4". Throws VideoCompressionError with a message fit to show the seller.
 */
export async function compressVideo(file: File, options: CompressVideoOptions = {}): Promise<File> {
  const seconds = await validateVideo(file);
  const ffmpeg = await loadEngine();

  const onProgress = ({ progress }: { progress: number }) => {
    options.onProgress?.(Math.min(99, Math.max(0, Math.round(progress * 100))));
  };
  const onAbort = () => ffmpeg.terminate();
  ffmpeg.on('progress', onProgress);
  options.signal?.addEventListener('abort', onAbort, { once: true });

  const inputName = 'input';
  const outputName = 'output.mp4';

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    for (const pass of planPasses(seconds)) {
      const code = await ffmpeg.exec([
        '-i', inputName,
        '-vf', `scale=-2:'min(${pass.height},ih)'`,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-b:v', String(pass.videoBitrate),
        '-maxrate', String(Math.floor(pass.videoBitrate * 1.2)),
        '-bufsize', String(pass.videoBitrate * 2),
        '-c:a', 'aac',
        '-b:a', String(AUDIO_BITRATE),
        '-ac', '1',
        '-movflags', '+faststart',
        '-y', outputName,
      ]);
      if (code !== 0) {
        throw new VideoCompressionError('unreadable', 'We could not process this video. Try another one.');
      }
      const data = await ffmpeg.readFile(outputName);
      if (typeof data === 'string') {
        throw new VideoCompressionError('engine_failed', 'The video tool returned an unexpected result.');
      }
      if (data.byteLength < VIDEO_BUCKET_LIMIT_BYTES) {
        options.onProgress?.(100);
        return new File([new Uint8Array(data)], 'video.mp4', { type: 'video/mp4', lastModified: Date.now() });
      }
      await ffmpeg.deleteFile(outputName);
    }

    throw new VideoCompressionError(
      'cannot_fit_under_limit',
      'This video is still too big after shrinking. Please use a shorter one.',
    );
  } catch (err) {
    if (options.signal?.aborted) {
      enginePromise = null; // terminate() kills the worker, so load a fresh engine next time
      throw new VideoCompressionError('cancelled', 'Video upload cancelled.');
    }
    if (err instanceof VideoCompressionError) throw err;
    throw new VideoCompressionError('engine_failed', 'Something went wrong while shrinking the video. Try again.');
  } finally {
    ffmpeg.off('progress', onProgress);
    options.signal?.removeEventListener('abort', onAbort);
    try { await ffmpeg.deleteFile(inputName); } catch { /* engine may already be terminated */ }
    try { await ffmpeg.deleteFile(outputName); } catch { /* nothing to delete */ }
  }
}
```

### 9.3 `lib/edit-token.ts`

```ts
import { createHash, randomUUID } from 'node:crypto';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface NewEditToken {
  /** The UUID that goes in the WhatsApp link. Never store it. */
  token: string;
  /** SHA-256 of the token as 64 lowercase hex characters. This is what the database stores. */
  hash: string;
  /** Full link for the seller. */
  link: string;
}

export function isValidTokenShape(value: unknown): value is string {
  return typeof value === 'string' && UUID_V4.test(value);
}

/** SHA-256 hex of a token. Call isValidTokenShape first on anything that came from a request. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token.toLowerCase(), 'utf8').digest('hex');
}

export function newEditToken(appBaseUrl: string): NewEditToken {
  const token = randomUUID();
  const base = appBaseUrl.replace(/\/+$/, '');
  return { token, hash: hashToken(token), link: `${base}/list/edit?token=${token}` };
}
```

### 9.4 `lib/whatsapp.ts`

```ts
import twilio from 'twilio';

export type SendResult =
  | { status: 'sent'; sid: string }
  | { status: 'failed'; reason: string };

interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  /** Your approved WhatsApp sender, for example "+2348000000000". */
  from: string;
  /** Content SID of the approved authentication template (OTP). */
  otpContentSid: string;
  /** Content SID of the approved utility template (rejection notice). */
  rejectionContentSid: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WhatsAppConfig {
  const need = (key: string): string => {
    const value = env[key];
    if (!value) throw new Error(`Missing environment variable ${key}`);
    return value;
  };
  return {
    accountSid: need('TWILIO_ACCOUNT_SID'),
    authToken: need('TWILIO_AUTH_TOKEN'),
    from: need('TWILIO_WHATSAPP_FROM'),
    otpContentSid: need('TWILIO_OTP_CONTENT_SID'),
    rejectionContentSid: need('TWILIO_REJECT_CONTENT_SID'),
  };
}

/** WhatsApp template variables cannot contain line breaks or tabs, and long text gets cut. */
export function cleanVariable(value: string, max = 200): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

async function sendTemplate(
  config: WhatsAppConfig,
  toPhone: string,
  contentSid: string,
  variables: Record<string, string>,
): Promise<SendResult> {
  try {
    const client = twilio(config.accountSid, config.authToken);
    const message = await client.messages.create({
      from: `whatsapp:${config.from}`,
      to: `whatsapp:${toPhone}`,
      contentSid,
      contentVariables: JSON.stringify(variables),
    });
    return { status: 'sent', sid: message.sid };
  } catch (err) {
    // Log the Twilio error code only. Never log the message body, the code or the link.
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : 'unknown';
    return { status: 'failed', reason: `twilio_${code}` };
  }
}

/** Authentication template. Variable 1 is the 6-digit code. */
export function sendOtp(config: WhatsAppConfig, toPhone: string, code: string): Promise<SendResult> {
  return sendTemplate(config, toPhone, config.otpContentSid, { '1': code });
}

/** Utility template for a rejected listing. Variables: 1 first name, 2 item title, 3 reason, 4 edit link. */
export function sendRejectionNotice(
  config: WhatsAppConfig,
  toPhone: string,
  details: { firstName: string; title: string; reason: string; link: string },
): Promise<SendResult> {
  return sendTemplate(config, toPhone, config.rejectionContentSid, {
    '1': cleanVariable(details.firstName || 'there', 40),
    '2': cleanVariable(details.title, 80),
    '3': cleanVariable(details.reason, 300),
    '4': details.link,
  });
}
```

## 10. Usage example: compressing in the form

```ts
import { compressImages, ImageCompressionError } from '@/lib/compression/images';
import { compressVideo, VideoCompressionError } from '@/lib/compression/video';

export async function prepareMedia(photos: File[], video: File | null, onProgress: (label: string, percent: number) => void) {
  try {
    const photoFiles = await compressImages(photos, {
      onProgress: (p) => onProgress('Shrinking photos', p),
    });
    const videoFile = video
      ? await compressVideo(video, { onProgress: (p) => onProgress('Shrinking video', p) })
      : null; // a listing with no video is fine
    return { photoFiles, videoFile };
  } catch (err) {
    if (err instanceof ImageCompressionError || err instanceof VideoCompressionError) {
      throw new Error(err.message); // already written in plain words for the seller
    }
    throw err;
  }
}
```
