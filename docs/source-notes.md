# OBN NATION: everything from the source documents

Sources are in `docs/source/`. This file pulls every requirement, number and open question into one place.

## 1. The company and the idea

- **OBN NATION ONLINE.COM**. Tagline: "Connecting People". Director: Aghughu Omo-Odion Destiny.
- A trust-verified marketplace for second-hand goods: electronics, home appliances, household items. It runs on "declutter" sales.
- Today the business runs by hand on WhatsApp groups and Xender file sharing. Admins collect photos and details, then post them.
- Goal: automate that process, then build trust features (pricing, escrow, logistics) on top.
- Regions on day one: **Port Harcourt, Delta, Ekiti**.
- Later expansion: ECOWAS and AES countries.
- **Farm Square** is the farm-produce side (for example cocoyam thickener, tomatoes). It is built into the same backend as a module. It is **Phase 6**, the last phase.

## 2. The six phases (blueprint OBN-PDP-2026-V1)

Each phase = 3 months build + 1 month testing/rollout. A phase starts only when the one before it hits its targets.

| # | Phase | Blueprint dates | What it does |
|---|-------|-----------------|--------------|
| 1 | Listing Cloud | Aug–Nov 2026 | Replace WhatsApp/Xender intake. Regional admin review. |
| 2 | Pricing Engine | Dec 2026–Mar 2027 | Suggest a fair price by condition and region. Flag prices more than 25% over. |
| 3 | Chatbot Funnel | Apr–Jul 2027 | Sell/Buy landing page. Chatbot. Hand-off to the right regional WhatsApp/Telegram. |
| 4 | Escrow Feed | Aug–Nov 2027 | Public item feed. Escrow payments (Paystack/Flutterwave). Inspection and dispute flow. |
| 5 | Auto Logistics | Dec 2027–Mar 2028 | Driver onboarding. Drivers inspect items for buyers. Fixed inspection fee split. KYC (Smile ID/Dojah). |
| 6 | Farm Square | Apr–Jul 2028 | Dual agent dashboards (declutter + farm). "4-number rule" in chat. Language layer for francophone markets. |

**Phase gates (targets to pass):**
- P1→P2: 100% of internal Xender/WhatsApp routing gone. At least 500 edit-and-resubmit loops delivered. Zero duplicate entries from resubmits.
- P2→P3: price suggestions within ±5% of verified clearing prices. 40% less admin time on price haggling.
- P3→P4: 5,000+ interactions routed correctly. Landing page bounce rate under 25%.
- P4→P5: a set escrow volume cleared. Disputes resolved in under 12 hours.
- P5→P6: 85% coverage of metro zip codes in core states. Logistics loss under 0.5% of volume.
- P6: Farm Square live on shared infra. Zero revenue leakage through phone numbers in chat.

**Money model:** P1–3 flat listing/verification fees. P4 escrow commission. P5 cut of driver fee. P6 bulk trade commissions, premium visibility, franchise licence fees.

## 3. Phase 1 as specified in the blueprint

- **Form:** clean, three-step, single-column. Icons for "functional status" instead of text blocks.
- **Seller login:** no password. WhatsApp OTP only. Account creation is deferred.
- **Regional routing:** a state field (Port Harcourt / Delta / Ekiti) sends each listing to that region's admin dashboard.
- **Consensus rule (RBAC):** region with **2 or fewer** admins needs **1** approval. Region with **3 or more** needs **2** independent approvals.
- **Rejection loop:** a rejection sends a pre-written WhatsApp template. The link holds a **single-use token**. The form stays pre-filled until the seller hits Resubmit, then the token is burned.
- **Media:** compress to under 10MB.
- **Suggested APIs:** Termii or Twilio for WhatsApp/OTP. AWS S3 + Lambda or Google Cloud Storage for files.

## 4. What the cost proposals changed

- **Stack swapped** to Supabase + Vercel. Same capabilities, lower cost at this scale.
- **Twilio** for WhatsApp OTP and notices.
- **2 milestones, 8 weeks:** M1 weeks 1–4 build, M2 weeks 5–8 test, beta, go-live.
- **Pro plans (Supabase, Vercel) start at M2**, before real data.
- **V1 (approved):** development ₦777,600, infrastructure ₦130,444, total ₦998,848. Dev team was Kunmi (₦150k/milestone) and Bassey (₦100k/milestone) plus AI support.
- **V2 (sent to the boss):** one developer at ₦50,000 per milestone. Rate ₦1,329/$1 (9 Oct 2026). Total ₦539,769. Recurring ₦85,154 a month.
- An earlier draft used Claude Max, Twilio Verify at $0.0534 per verification, and left the WhatsApp notice fee as TBD. It is superseded.

## 5. CTO sign-off (19 July 2026): extra scope and rules

The CTO's office approved V1 on conditions. All of this is now in scope.

1. **Landing page + DNS.** A static, mobile page with an "About Us" section and a button to the Listing Cloud. Zoho Mail DNS records (MX, TXT and so on) on the domain.
2. **Compression in the browser** (FFmpeg.wasm, browser-image-compression). Not on the server. Protects Supabase storage and Vercel timeouts.
3. **Pro plans exactly at the start of M2.**
4. **Admin referral links.** Each admin gets a unique link, for example `obnn.com/list?ref=AdminID`. Listings from that link skip general routing and go to that admin's own dashboard.
5. **Shared regional pool + data masking.** Approved listings appear to every admin in the region. Lister identity and contact details are hidden at **database level** and visible only to the **admin in charge** (the one whose link was used).
6. **Sales stay with the admin in charge.**
7. **Global Admin tier.** Can see all masked details and reassign listings (if an admin goes missing or there is a dispute).
8. **Admin revoke + blacklist.** A Global Admin screen to instantly revoke an admin. Blacklisting permanently blocks their login and WhatsApp dashboard access, so they can't return or pose as the brand.
9. **Separate SLA quote.** Optional monthly retainer for 5–10 hours of support and bug fixing after launch. **Still owed to the CTO.**

Once the CTO confirms, funds are released for Milestone 1.

## 6. UX rules from the blueprint

**Do:** progressive disclosure. Mobile-first single column (95%+ of users are on low-to-mid phones). Lazy-loaded cards. Native date pickers, camera and location.
**Don't:** force account creation. Put long company text on working screens (use one About link). Show other regions' items unless the user toggles it. Show internal IDs, approval queues or admin identities to the public.

## 7. Open questions (need an answer from the client)

1. Who is "admin in charge" when a listing has **no** referral link? (Assumed: first admin to claim or approve it.)
2. Referral listings must go "directly to that admin", but big regions need **two** approvals. Does the second approval still come from another admin? (Assumed: yes.)
3. Can one rejection kill a listing, or does it need the same majority? (Assumed: any single rejection sends it back for edits.)
4. Exact **form fields** and categories. The documents only say "three steps", "functional status" and "age of item".
5. Do admins log in with WhatsApp OTP too? (Assumed: yes.)
6. Do edit links expire? The blueprint says "indefinitely".
7. WhatsApp templates must be approved by Meta, and business verification sits with OBN NATION. Who starts that, and when? This can block go-live.
8. What are the listing/verification fees in Phase 1? Not stated.
9. Real start date. The blueprint says 1 Aug 2026; today is 11 Oct 2026.
10. Domain name: `obnn.com` appears in the example link, but the document title says `ONLINE.COM`.

## 8. Client decisions received (Oct 2026)

These answer the open questions above and change some earlier rules. The Phase 1 documents in `docs/phase-1/` are the source of truth.

| Topic | Decision |
|---|---|
| Consensus | Dropped. A referral listing is single-approval by its assigned admin. An organic listing is claimed and approved by the first reviewing regional or global admin |
| Admin in charge without a referral link | The first admin to claim or approve it |
| Rejection | Any rejection needs a mandatory reason and sends a WhatsApp edit link |
| Edit link | Single use, valid 30 days, burned on resubmit (not when opened) |
| Form fields | Title, description, price (NGN), age of item (5 cards), working status (3 cards), optional brand, model, size |
| Categories | Phones, Computers, TVs, Fridges, Generators, Kitchen, Furniture, Other |
| Media | 1 to 6 photos under 1 MB each as WebP. Video optional (0 or 1), at most 60 s, under 10 MB, MP4 |
| Masking | Phone shown as `+234 ••• ••• ••36`, name as `A***`, to every admin who is not in charge |
| Global Admin | Aghughu Omo-Odion Destiny, 08053466836 |
| Brand | Red `#D32F2F`, green `#2E7D32`, blue `#1565C0`, dark background `#0A0A0A`. Tagline: OBN NATION — Connecting People |
