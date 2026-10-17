# PRD: OBN NATION Phase 1, the Listing Cloud

Status: draft v0.1 · Owner: Bassey (Ighodalo Labs) · Client: OBN NATION · Date: 11 Oct 2026
Sources: `docs/source-notes.md`. Items marked **(assumed)** need client confirmation.

## 1. Problem

OBN NATION collects listings by hand over WhatsApp and Xender. Admins copy photos and details around. It is slow, easy to get wrong, and it burns out admins. Contact details travel loosely, so there is no control over who sees what.

## 2. Goal

Replace manual intake with one structured pipeline. A seller submits once. The right regional admin reviews. Approved listings land in a shared regional pool. Seller contact details stay private to the admin in charge.

**Success (the Phase 1 gate):**
- No internal Xender/WhatsApp file routing left.
- At least 500 reject-edit-resubmit loops delivered automatically.
- Zero duplicate listings from resubmits.

## 3. Users

| User | What they need |
|------|----------------|
| **Seller** | List an item fast on a cheap phone. No password. Fix a rejected listing easily. |
| **Regional admin** | See their region's queue. Approve or reject. Share a personal link. Run sales for their own listings. |
| **Global admin** | See everything. Reassign listings. Revoke or blacklist admins. |
| **OBN NATION director/CTO** | Control who has access. Trust that data is private. |

## 4. Scope

### In scope (Phase 1)
1. Landing page: About section and a button to the Listing Cloud. Zoho Mail DNS.
2. Seller sign-in with WhatsApp OTP. No password.
3. Three-step listing form, with photo and video upload.
4. In-browser compression of media to under 10MB before upload.
5. Routing by region: Port Harcourt, Delta, Ekiti.
6. Admin review dashboard with the consensus rule.
7. Rejection flow with WhatsApp template and single-use edit link.
8. Admin referral links and direct assignment.
9. Shared regional pool of approved listings with database-level masking of seller details.
10. Global Admin tier: view all, reassign.
11. Global Admin screen: revoke and blacklist admins.

### Out of scope
Pricing engine, chatbot, public feed, escrow/payments, logistics, Farm Square, translations (Phases 2–6). Meta/WhatsApp business verification is OBN NATION's job.

## 5. Functional requirements

### 5.1 Seller sign-in
- FR-1: Seller enters a phone number and receives a WhatsApp OTP. Correct code signs them in. No password screen, ever.
- FR-2: A seller record is created on first verified sign-in. The same phone always maps to the same seller.
- FR-3: Blacklisted phone numbers cannot sign in as admins (see 5.8).

### 5.2 Listing form (three steps, single column, mobile first)
Fields are **(assumed)** until the client confirms. Each step shows only after the last is complete.
- Step 1, **The item:** region (Port Harcourt / Delta / Ekiti), category, title, short description.
- Step 2, **Condition:** age of item (new sealed, new open box, premium used, neatly used, fairly used) and functional status (working perfectly, minor issues, not working). Picked with icons, not text blocks.
- Step 3, **Price and media:** asking price (₦), 1–6 photos, optional 1 video, seller name and contact confirm.
- FR-4: Progress is kept if the seller leaves and comes back in the same session.
- FR-5: Submit creates one listing in `pending` status.

### 5.3 Media
- FR-6: Photos and video are compressed **in the browser** to under 10MB each before upload (browser-image-compression, FFmpeg.wasm). If a file can't get under 10MB, show a clear message.
- FR-7: Files go to private Supabase Storage. Nothing is public in Phase 1.

### 5.4 Routing and assignment
- FR-8: A listing goes to the region the seller picked.
- FR-9: If the seller arrived through an admin's referral link (`/list?ref=CODE`), the listing is assigned to that admin (the **admin in charge**) and appears on that admin's dashboard.
- FR-10: With no referral code, the listing goes to the region's general queue. The first admin to claim or approve it becomes admin in charge **(assumed)**.
- FR-11: Every admin gets a unique referral code automatically when created.

### 5.5 Review and consensus
- FR-12: Active admins in the region see pending listings that are unassigned or assigned to them. Global admins see all.
- FR-13: Region with **2 or fewer** active admins: **1** approval makes the listing live. Region with **3 or more**: **2** approvals from different admins.
- FR-14: One admin cannot approve the same listing twice.
- FR-15: Rejection needs a reason. Any one rejection sends the listing back to the seller **(assumed)**.

### 5.6 Rejection, edit link and resubmit
- FR-16: On rejection, the seller gets a pre-formatted WhatsApp template with a unique edit link.
- FR-17: The edit link opens the same listing, pre-filled. It does not expire until used.
- FR-18: Resubmit updates the **same** listing (never creates a new one), moves it back to `pending`, and **burns the token at once**. Reusing the link fails.
- FR-19: Resubmitting twice quickly (double tap) must not create duplicates or two reviews.

### 5.7 Shared regional pool and masking
- FR-20: Approved listings show to **every active admin in that region** so any of them can advertise the region's stock.
- FR-21: Seller name and phone are stored apart from listing details and are readable only by the admin in charge, global admins, and the seller. Masking is enforced by the database (row-level security), not by the UI.
- FR-22: Sales of a listing stay with the admin in charge.

### 5.8 Global Admin
- FR-23: Global admins can view masked details on any listing.
- FR-24: Global admins can reassign a listing to another admin, with a reason. It is logged. A global admin's approval is enough on its own (override) **(assumed)**.
- FR-25: A management screen lists all admins with status (active, revoked, blacklisted).
- FR-26: **Revoke** takes effect immediately: the admin can no longer see or do anything.
- FR-27: **Blacklist** is permanent: login is blocked, the phone can never be re-added as an admin, and WhatsApp dashboard access is cut.
- FR-28: Revoke, blacklist and reassign each write an audit entry (who, what, when, why).

### 5.9 Landing page and DNS
- FR-29: The base domain shows a static, mobile-responsive page: short About Us (digital advertising and declutter platform) and one clear button to the Listing Cloud.
- FR-30: Zoho Mail DNS records (MX, SPF/TXT, DKIM) are set up and checked.

## 6. Non-functional requirements
- **Mobile first.** Works well on low-to-mid Android phones and slow networks. Single column. Lazy-load media.
- **Privacy.** Seller contact data never reaches the browser of anyone who isn't allowed to see it.
- **Security.** RLS on every table. Tokens stored hashed. OTP rate limits. No secrets in the repo.
- **Reliability.** Supabase Pro and Vercel Pro start at Milestone 2.
- **Auditability.** Sensitive admin actions are logged.
- **Cost.** Stay inside the approved budget. Compression happens on the user's device to protect storage and server time.

## 7. Key flows

**List an item:** landing page → "List an item" (with or without `?ref=`) → WhatsApp OTP → 3 steps → submit → "Under review".
**Review:** admin opens dashboard → pending queue → approve or reject → at enough approvals the listing is `approved` and joins the regional pool.
**Fix a rejection:** WhatsApp message → edit link → pre-filled form → resubmit → token burned → `pending` again.
**Remove an admin:** Global Admin → Admins → Revoke or Blacklist → access ends immediately.

## 8. Milestones (8 weeks)

- **M1, weeks 1–4:** database, OTP, form, compression and upload, admin dashboard, approval flow, edit/resubmit, referral links, masking, Global Admin, blacklist, landing page and DNS.
- **M2, weeks 5–8:** testing, fixes, upgrade to Pro plans, closed beta, go-live.

Honest risk: M1 holds a lot for one developer. Suggested build order is in `docs/build-plan.md`.

## 9. Risks

| Risk | Plan |
|------|------|
| WhatsApp templates need Meta approval and business verification (client side) | Ask the client to start now. Build with a stub sender until approved. |
| Large phone videos fail to compress in browser | Cap video length and size. Show a clear message. Test on cheap phones early. |
| Unclear business rules (see open questions) | Build on the stated assumptions. Confirm in one short call. |
| One developer, big M1 | Cut order: core pipeline first, Global Admin screens and landing page last. |

## 10. Open questions
See `docs/source-notes.md` section 7.
