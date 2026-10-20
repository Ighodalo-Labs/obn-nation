# 02 · Product Requirements Document: Phase 1, the Listing Cloud

Project: OBN NATION ONLINE.COM · Client: OBN NATION · Director and Global Admin: Aghughu Omo-Odion Destiny
Owner: Ighodalo Labs · Developer: Boss Petite (GitHub: bosspetite) · Version 1.0 · 17 Oct 2026
Related: [01 Architecture](01_SYSTEM_ARCHITECTURE.md) · [03 Database](03_ERD_AND_DATABASE_SCHEMA.md) · [04 Flows](04_USER_AND_ADMIN_FLOWCHARTS.md) · [05 Wireframes](05_UI_WIREFRAMES_AND_IA.md) · [06 RBAC](06_RACI_AND_RBAC_MATRIX.md) · [07 API](07_API_CONTRACTS_AND_INTEGRATIONS.md) · [08 QA](08_QA_TEST_CASES_AND_ACCEPTANCE.md)

Priority labels: **Must** = needed for the Phase 1 gate. **Should** = included in the build if time allows inside Milestone 1.

---

## 1. Executive summary

OBN NATION is a trust-verified marketplace for second-hand goods in Nigeria. Today the business runs by hand. Sellers send photos and details over WhatsApp. Admins move files between phones with Xender, retype details and post them to groups. This is slow, error-prone and tiring for admins, and seller phone numbers travel loosely, so there is no control over who can see them.

Phase 1, the **Listing Cloud**, replaces that routine with one pipeline:

1. A seller signs in with a WhatsApp code (no password) and fills a three-step form with photos and a video.
2. The listing goes to the right regional admin for review. One approval from the admin in charge makes it live.
3. If something is wrong, the admin rejects it with a reason. The seller gets a WhatsApp message with a private link, fixes the same listing and resubmits. The link works once.
4. Approved listings join a shared regional pool that every admin in that region can see and advertise. Seller name and phone stay hidden from everyone except the admin in charge and the Global Admin. The database enforces this, not the screen.

### 1.1 Problem statement

| Today | Effect |
|---|---|
| Intake by WhatsApp and Xender | Files get lost, duplicated or mixed between sellers |
| Admins retype and repost | Hours of admin time and typing mistakes |
| No review rule | Quality depends on whoever posts |
| Phone numbers shared freely | Admins can leave and take sellers with them. No audit trail |
| Rejections done by chat | No tracking, no way to prove a listing was fixed |

### 1.2 Goals and the Phase 1 gate

The blueprint says Phase 2 starts only when Phase 1 meets these targets:

| Gate | Target | How it is measured |
|---|---|---|
| G1 | 100% of internal Xender and WhatsApp file routing removed | Admin confirmation and zero manual intake in the last 14 days of beta |
| G2 | At least 500 reject-edit-resubmit loops delivered automatically | `count(*)` of `audit_log` rows with action `listing.resubmit` |
| G3 | Zero duplicate listings from resubmits | `listings` per `(seller_id, client_key)` is unique, and resubmit never inserts. Verified by query and by the QA suite |

### 1.3 Out of scope

Pricing engine, chatbot, public item feed, escrow and payments, logistics, Farm Square and translations (Phases 2 to 6). A seller status page and an approval notice by WhatsApp are not in Phase 1 either; the only WhatsApp messages are the OTP and the rejection notice. Meta business verification and WhatsApp template approval are the client's responsibility.

## 2. Brand specification

### 2.1 Identity

| Item | Value |
|---|---|
| Name | OBN NATION (One Beta Nation) |
| Tagline | Connecting People ❤️💚💙 |
| Full lockup | OBN NATION — Connecting People ❤️💚💙 |
| Voice | Professional, friendly, approachable, trustworthy and community-oriented. Clear, human and persuasive without exaggeration. Short sentences. No jargon on seller screens |
| Colour meaning | Red: action, urgency and speed. Green: growth, financial freedom and agricultural roots. Blue: trust, verification and community stability. Use all three consistently |
| Language | English only in Phase 1 |

### 2.2 Colour tokens

Dark theme. Background `#0A0A0A`. The three brand colours are fills for buttons and badges with white text. They are **not** used as text on the dark background, because their contrast there is below 4.5:1. Where a brand colour must appear as text or an outline on dark, use the light tint.

| Token | Hex | Role | Contrast with white text on it | Contrast of the colour on `#0A0A0A` |
|---|---|---|---|---|
| `--color-bg` | `#0A0A0A` | Page background | n/a | n/a |
| `--color-surface` | `#171717` | Cards, sheets | white on it 17.9:1 | n/a |
| `--color-text` | `#FFFFFF` | Main text | 19.8:1 on background | n/a |
| `--color-text-muted` | `#A3A3A3` | Help text, labels | n/a | 7.9:1 |
| `--color-red` | `#D32F2F` | Primary action, reject, errors | 5.0:1 | 4.0:1 (large text and icons only) |
| `--color-green` | `#2E7D32` | Success, approve, "live" badge | 5.1:1 | 3.9:1 (large text and icons only) |
| `--color-blue` | `#1565C0` | Links in buttons, info, selected card border | 5.7:1 | 3.4:1 (large text and icons only) |
| `--color-red-tint` | `#EF5350` | Red text and outlines on dark | n/a | 5.7:1 |
| `--color-green-tint` | `#66BB6A` | Green text and outlines on dark | n/a | 8.4:1 |
| `--color-blue-tint` | `#42A5F5` | Blue text and outlines on dark | n/a | 7.5:1 |
| `--color-border` | `#2A2A2A` | Dividers, input outlines | n/a | n/a |

**Landing page exception (owner decision 20 Oct 2026).** The landing page `/` uses a light theme (paper `#F7F6F3`, ink `#141414`) with real product photos (Unsplash licence, credits in `apps/web/public/photos/CREDITS.md`) and scroll motion. Working screens stay dark. The brand colours still appear as fills and in the top strip. Replace the stock photos with the client's own when available.

Usage rules:

- One primary action per screen, in `--color-red` with white text. The sticky "List an item" button on the landing page is red.
- Approve is green. Reject is red. Neutral actions are outlined in `--color-border`.
- Selected condition cards use a `--color-blue-tint` border and a blue-tinted fill.
- Never use colour alone to carry meaning. Every status also has a text label and an icon.

### 2.3 Type and layout

| Item | Rule |
|---|---|
| Font | System font stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`). No web font download on slow networks |
| Sizes | Body 16px minimum. Headings 22 to 28px. Buttons 16px, semi-bold |
| Layout | Single column. Maximum content width 480px, centred on larger screens |
| Touch targets | At least 48 by 48px |
| Spacing | 8px grid. 16px screen gutter |
| Logo | Received 17 Oct 2026: `apps/web/public/brand/obn-logo-on-black.jpg` (flat JPG on black). The header shows the logo with the tagline beneath. A transparent PNG or SVG is still requested. The logo's own colours are darker than the screen tokens above; the tokens are tuned for contrast on dark. Fonts: the client asks for a clean, modern font that suits the logo. Phase 1 keeps the system font stack for speed on slow networks; revisit in Phase 2 |
| Motion | Short fades only. Respects "reduce motion" |

## 3. Gateway "About Us" copy

This is the client's own text (message B4, 15 Oct 2026). Use it word for word.

> **About OBN NATION**
>
> OBN NATION (One Beta Nation) is a Nigerian community-driven decluttering and asset-liquidation marketplace and advertising company. We connect people with products, services, opportunities and trusted transactions by helping individuals and businesses turn unused assets into value.
>
> Through our community networks, advertising channels and associate network, we help sellers reach potential buyers while making quality, affordable items more accessible to our communities. Our model combines community commerce, marketing and trust-focused transaction support.
>
> We believe that trust is an asset, reputation is capital, and integrity is a long-term business strategy. Our mission is to make buying, selling and decluttering easier by connecting people and creating value within our communities.

Button label: **List an item**.

## 4. Personas

| Persona | Who they are | What they need | Sees |
|---|---|---|---|
| **Guest Seller** | Someone in Port Harcourt, Delta or Ekiti with an item to sell. Uses a low-to-mid Android phone on a slow network. May arrive from an admin's link | List fast. No password. Fix a rejection without starting over | Own listings and their status only |
| **Attributed Regional Admin** | The regional admin **in charge** of a given listing: the one whose referral link was used, or who first claimed or approved it | Review quickly. See the seller's name and phone. Keep the sale | Full seller details for listings they are in charge of |
| **Non-Attributed Regional Admin** | Any other admin in the same region | See the region's approved stock so they can advertise it. Review unclaimed listings | Same listings, but seller name and phone are masked (`A***`, `+234 ••• ••• ••36`) |
| **Global Admin** | Aghughu Omo-Odion Destiny (08053466836) | Oversee everything. Reassign listings if an admin goes missing. Revoke or blacklist admins | Everything, unmasked, across all regions |

The words "attributed" and "non-attributed" always describe the relationship between **one admin and one listing**. The same person is attributed on some listings and non-attributed on others.

## 5. Business rules (decided by the client)

| # | Rule |
|---|---|
| BR-1 | Regions on day one: Port Harcourt, Delta, Ekiti |
| BR-2 | Categories: Phones, Computers, TVs, Fridges, Generators, Kitchen, Furniture, Other |
| BR-3 | The form has three steps. Photos: 1 to 6, each under 1 MB, WebP. Video: required, exactly 1, at most 60 seconds, under 10 MB, MP4 |
| BR-4 | A listing from an admin's referral link (`?ref=`) is single-approval by that admin |
| BR-5 | A listing without a referral link is organic. The first reviewing regional or global admin claims it and approves it |
| BR-6 | Rejection needs a reason. The seller gets a WhatsApp message through Twilio with a single-use edit link valid for 30 days. The link is not used up by opening it. It is burned when the seller resubmits |
| BR-7 | Resubmitting never creates a second record |
| BR-8 | In the approved regional pool, seller phone and name are masked for every admin who is not in charge of that listing |
| BR-9 | The Global Admin can override, reassign listings and permanently blacklist admins |
| BR-10 | Seller sign-in is by WhatsApp OTP only. No passwords |

**Contacts from the client (17 Oct 2026).** Delta: +234 814 715 2732. Ekiti: +234 916 238 8282. OBN NATION (main): +234 707 276 7227. Global Admin: Aghughu Omo-Odion Destiny, +234 805 346 6836. The client has not said which region the main number belongs to or which of these people are regional admins. Confirm before creating admin accounts (T11).

### 5.1 Defaults set by the build team (confirm during beta)

These were not specified, so the build uses the safest simple choice. Each is a setting or a one-line change.

| # | Default | Why |
|---|---|---|
| DF-1 | A referral listing always takes the referring admin's region, even if the seller picks another | The admin can only review their own region. The form locks the region when a link is used |
| DF-2 | Rejecting an unclaimed listing makes the rejecting admin the admin in charge | They are the first reviewing admin (BR-5) |
| DF-3 | A Global Admin who approves an unclaimed listing becomes the admin in charge | Someone must hold the seller contact. They can reassign afterwards |
| DF-4 | A Global Admin may approve or reject a listing assigned to another admin (override). The assignment does not change | BR-9 |
| DF-5 | Revoking or blacklisting an admin returns their **pending** listings to the open queue. Their **approved** listings stay assigned until the Global Admin reassigns them | Keeps contacts safe and the queue moving |
| DF-6 | Revocation can be undone (reinstate). Blacklisting cannot | "Permanent" for blacklist |
| DF-7 | An expired edit link can be replaced by the admin in charge or the Global Admin ("Send new link"). Older links stop working | Avoids a dead end after 30 days |
| DF-8 | A seller can create at most 10 new listings in 24 hours | Stops spam and runaway scripts |
| DF-9 | Drafts older than 7 days are deleted along with their files | Keeps storage clean |
| DF-10 | Sellers enter their name once, right after their first code, because the masked form needs a first letter | Required for `A***` |
| DF-11 | Phone numbers must be Nigerian (+234) in Phase 1 | Matches the three regions |
| DF-12 | Price is in naira, whole naira, from ₦1 to ₦1,000,000,000 | Sensible bounds |
| DF-13 | Admins are added by the Global Admin using the admin's phone number and region. The admin then signs in with a WhatsApp code like everyone else | No second login system |
| DF-14 | Content cannot change while a listing is under review or live | Prevents edits after approval |
| DF-15 | Every WhatsApp message (sign-in code and rejection notice) is sent from one sender: the OBN NATION number +234 707 276 7227 (client, 17 Oct 2026) | One trusted sender. The number must be registered with Meta and Twilio for the API. If it is still in use on the normal WhatsApp app, the client must move it first (see section 9) |
| DF-16 | Video is required, exactly 1 (owner decision, 20 Oct 2026; this replaces the client's 17 Oct answer of optional) | Buyers trust listings with a video. Cheap phones struggle with video, so keep the 60 s cap and the progress bar |

## 6. Functional requirements

Common rules for all routes:

- Every screen works as a single column on a 360px-wide phone.
- Every error message says what happened and what to do next, in plain words.
- Every submit button is disabled while its request is running, so double taps do nothing.
- Every request that fails because of the network shows a retry button and keeps what the user typed.

### 6.1 Route `/`: Gateway landing page and DNS

**Purpose.** Introduce OBN NATION and send people to the Listing Cloud. Static page, no data calls, works without sign-in.

| ID | Priority | Requirement |
|---|---|---|
| LP-1 | Must | Show the header (logo and tagline), the "About OBN NATION" card with the copy in section 3, and a sticky bottom button "List an item" that goes to `/list` |
| LP-2 | Must | The page is fully static. Largest content render under 2.5 seconds on a throttled slow-4G profile. No script is needed to read it |
| LP-3 | Must | If the URL has `?ref=CODE`, the middleware stores the code (section 6.2) and the page itself looks the same. The button keeps the code |
| LP-4 | Must | Page title "OBN NATION — Connecting People". Description meta tag with the first sentence of the About copy. Open Graph title and description set |
| LP-5 | Must | No working-screen text is added here. Long company text lives only on this page and is linked as "About" from other screens (blueprint rule) |

**Inputs.** Optional query `ref`. **Errors.** None; the page is static. An invalid `ref` is ignored silently.

**Zoho Mail DNS specification (FR-DNS)**

| ID | Priority | Requirement |
|---|---|---|
| DNS-1 | Must | Website records: apex `A` record to `76.76.21.21`, `www` `CNAME` to `cname.vercel-dns.com`, as Vercel shows in the project's domain settings at the time of setup |
| DNS-2 | Must | `MX` records to Zoho at priorities 10, 20 and 50 (`mx.zoho.com`, `mx2.zoho.com`, `mx3.zoho.com` for accounts in the Zoho `.com` data centre). If the client's Zoho account is in another data centre, use the hosts Zoho shows for that centre |
| DNS-3 | Must | `TXT` SPF on the apex: `v=spf1 include:zoho.com ~all` (matching the data centre, as Zoho shows) |
| DNS-4 | Must | `TXT` DKIM at the selector Zoho generates, for example `zmail._domainkey`, with the public key value copied from the Zoho admin console |
| DNS-5 | Must | `TXT` domain verification record that Zoho gives at setup |
| DNS-6 | Should | `TXT` DMARC at `_dmarc` with policy `v=DMARC1; p=none` first, tightened after two clean weeks |
| DNS-7 | Must | Acceptance: send a mail to and from a Zoho mailbox on the domain. In the received message headers SPF and DKIM both show PASS. The website still loads |

### 6.2 Route `/list`: Passwordless WhatsApp OTP entry

**Purpose.** The only door for sellers and admins. Collect the phone number, send a WhatsApp code, verify it, and keep the referral code through the whole process.

| ID | Priority | Requirement |
|---|---|---|
| SI-1 | Must | Show a phone field (Nigerian number) and a "Send code" button. Accept `0803…`, `803…` and `+234803…`; store as `+234803…` |
| SI-2 | Must | On send, the server checks the number is not blacklisted, then sends a 6-digit code as a WhatsApp message. The screen changes to a code field and a "Resend" button that unlocks after 60 seconds |
| SI-3 | Must | Correct code signs the user in. The next screen depends on the situation (see table below) |
| SI-4 | Must | No password field, no email field, no account page, ever |
| SI-5 | Must | The code is valid for 10 minutes. After 5 wrong tries the code is void and a new one must be requested |
| SI-6 | Must | **Referral persistence.** If the visitor arrives with `?ref=CODE` on `/` or `/list`, the middleware checks the code matches `^[a-f0-9]{8}$` and stores it in an HttpOnly, Secure, SameSite=Lax cookie `obn_ref` for 30 days. It survives the code step, a page refresh and a closed tab. A newer valid link replaces the older code. The code is read only on the server when the listing is created |
| SI-7 | Must | A first-time seller is asked for their name (2 to 80 characters) right after the code. The name is saved to their profile and is not asked again |
| SI-8 | Must | Admins sign in here too. If the visitor was sent from `/admin/*`, a `next` value returns them there after sign-in. Signed-in admins who open `/list` see a link "Go to admin" above the form |
| SI-9 | Must | A blacklisted number never receives a code. The screen says "This number cannot be used on OBN NATION." |
| SI-10 | Must | The WhatsApp code message uses the approved authentication template. If Twilio is down, the screen says the code could not be sent and offers retry. It never shows the code |

**Where each user goes after sign-in**

| User | Destination |
|---|---|
| Seller with a name | `/list/form` |
| Seller without a name | Name step, then `/list/form` |
| Regional or Global Admin with `next` | The `next` page |
| Regional or Global Admin without `next` | `/admin/dashboard` |

**Validation and error states**

| Situation | Message | HTTP |
|---|---|---|
| Not a Nigerian number | "Enter a Nigerian phone number, for example 0803 123 4567." | 400 |
| Blacklisted number | "This number cannot be used on OBN NATION." | 403 |
| Asked again within 60 seconds | "Please wait {n} seconds before asking for a new code." | 429 |
| Too many sends | "Too many tries. Please try again in 10 minutes." | 429 |
| Wrong code | "That code is not right. {k} tries left." | 400 |
| Code expired or void | "This code has expired. Ask for a new one." | 410 |
| WhatsApp could not deliver | "We could not send the code. Check your number and try again." | 502 |

**Edge cases.** The visitor changes the number after sending: the old code is void. The visitor has no WhatsApp on that number: the message cannot be delivered and the 502 message shows; the number must be a WhatsApp number (stated beneath the field). Two tabs open: the later sign-in wins and both stay signed in. An existing admin number used as seller: allowed, they sign in as their role.

### 6.3 Route `/list/form`: Three-step progressive form

**Purpose.** Capture the listing in three short steps. Each step appears only after the previous one is complete (progressive disclosure).

**Access.** Signed-in users with a name. Others are redirected to `/list`.

**Fields**

| Step | Field | Type | Rules |
|---|---|---|---|
| 1 | Region | Three large buttons: Port Harcourt, Delta, Ekiti | Required. Locked and pre-set when a valid referral code is active (DF-1) |
| 1 | Category | Eight icon tiles: Phones, Computers, TVs, Fridges, Generators, Kitchen, Furniture, Other | Required |
| 2 | Title | Text | Required, 3 to 80 characters |
| 2 | Description | Text area | Required, 10 to 1000 characters. Character counter shown |
| 2 | Brand | Text | Optional, 1 to 60 characters |
| 2 | Model | Text | Optional, 1 to 60 characters |
| 2 | Size | Text | Optional, 1 to 60 characters (for example "43 inch" or "2.5 kVA") |
| 2 | Age of item | Five radio cards with icons: New, sealed · New, open box · Premium used · Neatly used · Fairly used | Required |
| 2 | Working status | Three radio cards with icons: Working perfectly · Minor issues · Not working | Required |
| 2 | Price | Number, naira, digits only, shown with thousands separators | Required, ₦1 to ₦1,000,000,000 |
| 3 | Photos | Drop zone and camera button. Previews with a remove button and a size label | Required, 1 to 6. Each compressed to WebP under 1 MB in the browser |
| 3 | Video | Drop zone and camera button. Progress bar while compressing | Required, exactly 1. At most 60 seconds. Output MP4 under 10 MB |

| ID | Priority | Requirement |
|---|---|---|
| FM-1 | Must | Step 2 shows only after step 1 is valid. Step 3 only after step 2 is valid. A "Back" link returns without losing anything |
| FM-2 | Must | Typed answers are kept in the browser session, so a refresh, a phone call or switching apps does not wipe steps 1 and 2. Photos and video must be added again after a full page reload; the screen says so |
| FM-3 | Must | Photos are compressed on the phone before upload (images module in [07](07_API_CONTRACTS_AND_INTEGRATIONS.md)). If a file cannot be brought under 1 MB, that photo is rejected with a message and the others are kept |
| FM-4 | Must | Video is required. Submit stays disabled until one video is ready. A listing with no video is refused by the server |
| FM-5 | Must | A video longer than 60 seconds is refused before any encoding starts: "Videos can be at most 60 seconds." |
| FM-6 | Must | The video encoder (about 30 MB) loads only when a seller adds a video, never on first page load |
| FM-7 | Must | Submit runs three quiet steps: create a draft (idempotent), upload files to the returned paths one at a time with a progress bar, then submit. The seller sees one button and one progress bar |
| FM-8 | Must | The form generates a `client_key` once per listing and keeps it for the session. A retry after a failure reuses it, so the server never creates two listings |
| FM-9 | Must | On success the screen says "Under review" and "We will message you on WhatsApp if anything needs fixing." and offers "List another item". There is no listing number or admin name on the screen |
| FM-10 | Must | If the daily limit is hit, the screen says "You have reached today's limit of 10 listings. Please come back tomorrow." |
| FM-11 | Should | Cameras open directly from the photo and video buttons on phones (`capture` hint) |

**Error states**

| Situation | Message |
|---|---|
| Unsupported photo type (for example HEIC) | "Please choose a JPG, PNG or WebP photo." |
| Photo above 30 MB before compression | "This photo is too big to process. Please pick a smaller one." |
| More than 6 photos | "You can add up to 6 photos." |
| Zero photos on submit | "Add at least one photo." |
| Video over 60 seconds | "Videos can be at most 60 seconds." |
| Video input above 150 MB | "This video is too big to process on your phone. Record a shorter one or lower the quality." |
| Video still above 10 MB after two passes | "This video is still too big after shrinking. Please use a shorter one." |
| Upload interrupted | "Upload stopped. Tap Try again to continue." (resumes with the same `client_key`) |
| Session expired | The user is sent to `/list` and returns to the saved answers after sign-in |

**Edge cases.** Two listings with the same text are allowed; uniqueness is per `client_key`, not per content. A user opens the form in two tabs and submits both: two different `client_key` values create two listings, which is intended. Phone storage is full: the browser error is caught and shown as "Your phone has no space left." A seller uses an admin's link and later removes the cookie: the listing becomes organic.

### 6.4 Route `/list/edit?token=[UUID]`: Edit link, pre-fill and token burning

**Purpose.** Let a seller fix a rejected listing without signing in again. The WhatsApp link is the credential.

| ID | Priority | Requirement |
|---|---|---|
| ED-1 | Must | The server hashes the token (SHA-256) and looks it up. Valid means: found, not used, not revoked, not expired (30 days), and the listing is `rejected` |
| ED-2 | Must | A valid link opens the same three-step form pre-filled with the listing, with the rejection reason in a banner at the top. Opening the link does **not** use it up. The seller can leave and come back with the same link |
| ED-3 | Must | The seller may keep existing photos and video, remove them, or add new ones (same compression rules). Existing files are shown from signed URLs |
| ED-4 | Must | Resubmit updates the **same** listing, sets it back to `pending_review`, clears the rejection reason, adds 1 to `resubmit_count` and **burns the token in the same transaction** |
| ED-5 | Must | Using a burned token again shows: "This link has already been used. If you need to change something else, ask your admin for a new link." Nothing changes |
| ED-6 | Must | A double tap on Resubmit produces exactly one update. The second request finds the token used and is refused without side effects |
| ED-7 | Must | Expired link: "This link has expired. Ask your admin to send a new one." Revoked link (replaced by a newer one): "This link was replaced by a newer message. Please use the latest one." |
| ED-8 | Must | Unknown token: "This link is not valid." No hint whether a listing exists |
| ED-9 | Must | Uploads on this page use signed upload URLs issued only after the token is checked, into the listing's own folder |
| ED-10 | Must | The page is `noindex` and sends `Referrer-Policy: no-referrer` so the token cannot leak |

**Edge cases.** The listing was reassigned or the admin was revoked while the seller was editing: resubmit still works; the listing returns to the queue of whoever is now in charge, or the open queue. The seller resubmits with a photo path from another listing: the database refuses it and the token is not burned. The seller loses internet halfway: nothing is saved and the link still works.

### 6.5 Route `/admin/dashboard`: Review inbox and decision modal

**Purpose.** Let regional and global admins review listings that need a decision.

**Access.** Active, non-blacklisted regional or global admin. Anyone else is redirected to `/list`.

| ID | Priority | Requirement |
|---|---|---|
| AD-1 | Must | Tabs: **Needs review** (pending listings assigned to me, plus unclaimed listings in my region; Global Admin sees all pending), **Waiting for seller** (my rejected listings), **Done** (my approved listings, newest first) |
| AD-2 | Must | Each review card shows: first photo, title, price in naira, category, region, age and working status chips, "waiting for 3h" time, an "Assigned to you" or "Unclaimed" badge, and the seller line. The seller line shows the real name and phone only when the admin is in charge; otherwise `A***` and `+234 ••• ••• ••36` |
| AD-3 | Must | Tapping a card opens the full listing: all photos in a swipe gallery, video player if present, all fields |
| AD-4 | Must | Actions on a card: **Claim** (unclaimed only), **Approve**, **Reject**. Approve asks one confirmation. Approving an unclaimed listing claims it in the same step |
| AD-5 | Must | **Reject modal:** a required reason (5 to 500 characters) with quick-pick chips ("Photos are blurry", "Price looks too high", "Item not allowed", "Missing details") that fill the box. Submit calls `/api/listings/reject`, which saves the rejection and sends the WhatsApp message with the edit link |
| AD-6 | Must | If the rejection saved but WhatsApp failed, the card moves to "Waiting for seller" with a red "Message not sent" tag and a **Send new link** button (DF-7) |
| AD-7 | Must | Two admins acting on the same listing: the first action wins; the other sees "This listing was just handled by someone else" and the card refreshes |
| AD-8 | Must | A revoked or blacklisted admin loses access on the next request. Their open pages show "Your access has ended." |
| AD-9 | Must | The list refreshes when the tab regains focus and on a manual pull-down. No live websocket is needed in Phase 1 |
| AD-10 | Must | The admin's personal referral link (`/list?ref=CODE` on the OBN NATION domain) is shown with a Copy button and a WhatsApp share button |
| AD-11 | Should | A counter shows how many items are waiting in the region |

**Edge cases.** An admin opens a listing, goes idle, and it is approved by the Global Admin meanwhile: the action fails with the message in AD-7. A listing with a video that fails to play: the card shows a "Video unavailable" tile and the photos still work. An admin has no pending items: the empty state says "Nothing waiting. Share your link to get more listings."

### 6.6 Route `/admin/pool`: Shared regional inventory with masking

**Purpose.** Let every admin in a region see all approved stock of that region so any of them can advertise it.

| ID | Priority | Requirement |
|---|---|---|
| PL-1 | Must | Shows approved listings of the admin's region, newest first, 20 per page with a "Load more" button |
| PL-2 | Must | Each card shows photo, title, price, category, chips, and the seller line. For listings the admin is **not** in charge of: `A***` and `+234 ••• ••• ••36`. For listings they **are** in charge of: real name and phone and a green "You are in charge" badge |
| PL-3 | Must | Masking is enforced by the `regional_listings_feed` view. The browser never receives the real values for masked rows, not even hidden in the page data |
| PL-4 | Must | Filter by category and a title search |
| PL-5 | Must | Sales of a listing stay with the admin in charge. Non-attributed admins who want to sell it see the admin's first name and use the group chat to coordinate. They cannot see the seller's contact |
| PL-6 | Should | "Copy ad text" button builds a message from title, price, condition, region and category. It never contains seller details |
| PL-7 | Must | Global Admin sees all regions with a region filter and sees every seller unmasked |

**Edge cases.** A listing is reassigned while the pool is open: masking flips on the next refresh. An admin from another region opens the URL: sees an empty pool. The admin's region has no approved items: empty state "No approved listings yet."

### 6.7 Route `/admin/global`: Override, reassignment and blacklist control centre

**Access.** Global Admin only. Everyone else gets a "not found" page.

| ID | Priority | Requirement |
|---|---|---|
| GA-1 | Must | **Admins tab:** every admin with name, phone, region, status (Active, Revoked, Blacklisted), referral link, number of pending and approved listings in charge, and last action time |
| GA-2 | Must | **Add admin:** phone, name, role (Regional or Global), region (for Regional). The person can sign in with a WhatsApp code straight away and lands on the admin dashboard. A blacklisted phone is refused with "This number is blacklisted and cannot be added." |
| GA-3 | Must | **Revoke:** needs a reason of at least 5 characters. Takes effect immediately. The admin's pending listings go back to the open queue. A **Reinstate** button reverses it |
| GA-4 | Must | **Blacklist:** needs a reason and a typed confirmation (the admin's name). Permanent. Login is blocked, the Auth user is banned, the phone can never be added again, and the admin sees nothing on their next request |
| GA-5 | Must | **Listings tab:** every listing across regions with filters for region, status and admin in charge. Real seller name and phone are visible here |
| GA-6 | Must | **Reassign:** choose a listing, choose another active admin of the same region (or a Global Admin), enter a reason. The change appears in the audit log |
| GA-7 | Must | **Override:** the Global Admin can approve or reject any pending listing without changing who is in charge (DF-4) |
| GA-8 | Must | **Orphaned listings** (approved, but the admin in charge is revoked or blacklisted) are listed at the top of the Listings tab with a "Reassign" button |
| GA-9 | Must | **Audit tab:** latest 200 entries with who, what, when and why |
| GA-10 | Must | A Global Admin cannot revoke or blacklist themselves or another Global Admin from this screen |

**Edge cases.** The Global Admin blacklists an admin who is mid-review: the admin's next action fails with "Your access has ended." Repeating a blacklist request is safe and returns the same result. The Auth ban fails after the database flag is set: the response says "Blacklisted. Sign-in block is being retried." and the flag already blocks all data access.

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Devices | Low-to-mid Android (Chrome, Samsung Internet) on 3G and 4G. Safari on iOS 15 or later. Designed first at 360 by 640 |
| Performance | Landing page: LCP under 2.5 s on slow 4G. Form shell under 200 KB of JavaScript (gzipped), with FFmpeg loaded only on demand. One photo compressed in under 5 s on a mid-range phone. A 60-second video compressed in under 3 minutes on a mid-range phone, with progress shown |
| Accessibility | WCAG 2.1 AA: contrast per section 2.2, labels on every field, focus visible, 48px touch targets, errors announced to screen readers |
| Privacy | Seller phone and name never reach a browser that is not allowed to see them. Media is private. No analytics scripts on working screens |
| Security | See [01](01_SYSTEM_ARCHITECTURE.md) section 6 |
| Reliability | Submitting is idempotent. Every state change is one database transaction |
| Auditability | Every sensitive action writes an audit entry (who, what, when, why) |
| Data use | Compression happens before upload; the form shows the size of each file so sellers on small data plans can see it |
| Cost | Stay inside the approved budget. Pro plans start with Milestone 2 |

## 8. Milestones

| Milestone | Weeks | Content |
|---|---|---|
| M1 | 1 to 4 | Database and auth, WhatsApp sign-in, form with compression and upload, admin dashboard and approval, rejection and edit link, referral links, masking view, Global Admin screens, landing page and DNS |
| M2 | 5 to 8 | Testing and fixes, upgrade to Supabase Pro and Vercel Pro, closed beta, go-live, gate measurement |

Build order inside M1 is in `docs/build-plan.md`: core pipeline first, Global Admin screens and landing page last.

## 9. Dependencies and risks

| Dependency or risk | Owner | Plan |
|---|---|---|
| Meta business verification (pending, client confirmed 15 Oct) and WhatsApp template approval (authentication and utility) | OBN NATION | Start immediately. Build against a stub sender meanwhile |
| The sender number +234 707 276 7227 is also used for normal chats by the client | OBN NATION | Confirm that number can be registered for the API. A number active on the WhatsApp app usually has to be removed from it first, or a new dedicated number used. Check with Twilio before go-live |
| Domain control for DNS records | OBN NATION | Needed before the landing page and mail go live |
| Transparent PNG or SVG of the logo | OBN NATION | The flat JPG on black is used until it arrives |
| Cheap phones struggle with video | Developer | Required video, 60-second cap, progress bar, early device test |
| Twilio template costs rise with volume | Project Lead | Monthly spend report. Alert at 80% of the budget line |
| Admin churn | Global Admin | Revoke and blacklist tools, reassign tool, audit log |

## 10. Acceptance

Phase 1 is accepted when every **Must** requirement above passes its test in [08](08_QA_TEST_CASES_AND_ACCEPTANCE.md), the three gate targets in section 1.2 are met during the closed beta, and the Global Admin confirms the manual WhatsApp and Xender routine is no longer in use.
