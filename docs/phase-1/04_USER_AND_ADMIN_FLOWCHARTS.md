# 04 · User and Admin Flowcharts and State Machines

Project: OBN NATION ONLINE.COM · Phase 1, the Listing Cloud · Version 1.0 · 17 Oct 2026
Related: [02 PRD](02_PRD_PHASE_1.md) · [03 Database](03_ERD_AND_DATABASE_SCHEMA.md) · [07 API](07_API_CONTRACTS_AND_INTEGRATIONS.md)

All diagrams are Mermaid and render on GitHub, in VS Code and in most Markdown previews. Each diagram is followed by notes that tie the steps to requirement IDs in the PRD.

---

## 1. Seller ingestion and passwordless WhatsApp OTP

### 1.1 Sign-in sequence

```mermaid
sequenceDiagram
  autonumber
  actor S as Seller
  participant W as Web app
  participant M as Edge middleware
  participant A as API route
  participant AU as Supabase Auth
  participant H as OTP hook route
  participant T as Twilio WhatsApp
  participant DB as Postgres

  S->>M: Opens /list?ref=CODE
  M->>M: Check CODE shape, set obn_ref cookie (30 days)
  M->>W: Serve /list
  S->>W: Enters phone number
  W->>A: POST /api/auth/otp/send
  A->>DB: Is this phone blacklisted?
  alt Blacklisted
    A-->>W: 403 phone_blocked
    W-->>S: This number cannot be used
  else Allowed
    A->>AU: signInWithOtp (phone)
    AU->>H: Send SMS hook with the code
    H->>T: Send approved OTP template
    T-->>S: WhatsApp message with 6-digit code
    A-->>W: 200 sent, resend after 60 seconds
  end
  S->>W: Types the code
  W->>A: POST /api/auth/otp/verify
  A->>AU: verifyOtp (phone, code)
  alt Wrong or expired
    AU-->>A: Error
    A-->>W: 400 invalid_code or 410 code_expired
  else Correct
    AU->>DB: First time only: create auth user
    DB->>DB: Trigger creates seller profile
    AU-->>A: Session
    A-->>W: 200 and session cookies, needs_name flag
    opt needs_name is true
      W->>A: PATCH /api/profile/name
      A->>DB: Update own full_name
    end
    W-->>S: Opens /list/form
  end
```

Notes:

- The referral cookie is set before sign-in and is never cleared by it (SI-6). The server reads it later when the listing is created.
- The code is a WhatsApp message built from the approved authentication template. No code is ever shown on screen or written to a log (SI-10).
- A blacklisted number is refused at step 6 and again inside the hook, so a direct call to Auth cannot bypass it.

### 1.2 Listing submission

```mermaid
flowchart TD
  S0(["Signed-in seller opens /list/form"]) --> S1["Step 1: pick region and category"]
  S1 -->|"ref cookie present"| S1a["Region is locked to the referring admin's region"]
  S1 --> V1{"Step 1 complete?"}
  S1a --> V1
  V1 -->|"No"| S1
  V1 -->|"Yes"| S2["Step 2: title, description, optional brand model size, age card, working card, price"]
  S2 --> V2{"Step 2 valid?"}
  V2 -->|"No: show field errors"| S2
  V2 -->|"Yes"| S3["Step 3: add 1 to 6 photos and 1 video"]
  S3 --> P["Compress photos to WebP under 1 MB on the phone"]
  S3 --> Q{"Video added?"}
  Q -->|"No"| R
  Q -->|"Yes"| Q1{"Longer than 60 seconds?"}
  Q1 -->|"Yes"| Q2["Refuse: videos can be at most 60 seconds"] --> S3
  Q1 -->|"No"| Q3["Load encoder, shrink to MP4 under 10 MB, show progress"]
  Q3 -->|"Still too big or failed"| Q4["Show message, seller removes video or picks another"] --> S3
  Q3 -->|"OK"| R
  P --> R{"At least 1 photo OK?"}
  R -->|"No"| S3
  R -->|"Yes"| T["Tap Submit"]
  T --> U["POST /api/listings/create with client_key: creates or finds the draft"]
  U --> W["Upload files one at a time to the returned paths"]
  W -->|"Network drops"| W1["Show Try again. Resume with the same client_key"] --> U
  W -->|"All uploaded"| X["POST /api/listings/create with submit: true"]
  X --> Y{"Daily limit reached?"}
  Y -->|"Yes"| Y1["Show limit message"]
  Y -->|"No"| Z["Status becomes pending_review. Trigger routes the listing"]
  Z --> Z1(["Screen: Under review"])
```

Notes: FM-1 to FM-10. Retrying never creates a second listing because the create call finds the draft by `(seller, client_key)`. Compression and the 60-second check happen on the phone before any upload.

## 2. Admin review, referral routing and consensus

"Consensus" in Phase 1 is a single sign-off. A referral listing is approved by its assigned admin. An organic listing is claimed and approved by the first reviewing admin of the region, or by the Global Admin.

```mermaid
flowchart TD
  A(["Listing becomes pending_review"]) --> B{"Valid referral code on the listing?"}

  B -->|"Yes: active regional admin found"| C["Assigned to that admin. Region forced to the admin's region"]
  B -->|"No, or code unknown, revoked or blacklisted"| D["Organic: region from the form. Nobody assigned"]

  C --> C1["Visible to the assigned admin and the Global Admin only"]
  D --> D1["Visible to every active admin of the region, seller details masked"]

  C1 --> E{"Assigned admin decides"}
  D1 --> F{"First admin to act"}

  F -->|"Claim"| G["Claimer becomes admin in charge. Other admins stop seeing the listing"]
  G --> E
  F -->|"Approve"| H["Claim and approve in one step"]
  F -->|"Reject with reason"| I["Claim and reject in one step"]

  E -->|"Approve"| J["status = approved. One approval is enough"]
  H --> J
  E -->|"Reject with reason"| K["status = rejected. Go to flow 3"]
  I --> K

  J --> L["Joins the shared regional pool"]
  L --> M["Every admin of the region sees it. Seller name and phone masked except for the admin in charge and the Global Admin"]

  GA["Global Admin"] -.->|"can approve, reject or reassign at any point"| E
  GA -.-> F

  X["Two admins act at the same moment"] -.-> Y["Row lock: first action wins. The other sees: this listing was just handled by someone else"]
```

Notes:

- AD-4 and AD-7 in the PRD. The lock lives in the database functions `claim_listing`, `approve_listing` and `reject_listing`.
- A Global Admin who approves an unclaimed listing becomes the admin in charge (DF-3). If the listing is already assigned, the assignment stays (DF-4).
- Revoking or blacklisting an admin sends that admin's pending listings back to the "organic" branch (DF-5).

## 3. Rejection, WhatsApp notice, token edit and resubmission

### 3.1 State machine

```mermaid
stateDiagram-v2
  [*] --> draft: Seller creates the draft
  draft --> pending_review: Submit with 1 to 6 photos
  pending_review --> approved: One approval by the admin in charge
  pending_review --> rejected: Rejection with a reason
  rejected --> pending_review: Resubmit with a valid token, token burned
  approved --> [*]
```

Illegal moves (for example `approved` back to `pending_review`) are refused by a database trigger.

### 3.2 Loop sequence

```mermaid
sequenceDiagram
  autonumber
  actor AD as Admin
  actor S as Seller
  participant W as Web app
  participant A as API route
  participant DB as Postgres
  participant T as Twilio WhatsApp

  AD->>W: Taps Reject and writes the reason
  W->>A: POST /api/listings/reject
  A->>A: Make token (UUID), keep SHA-256 hash
  A->>DB: reject_listing (actor, listing, reason, hash)
  DB->>DB: Lock row, check admin, revoke older links, store hash, status = rejected
  DB-->>A: Link expiry (30 days)
  A->>T: Send utility template with the edit link
  alt Delivered to Twilio
    T-->>S: WhatsApp: Your listing needs changes + link
    A-->>W: 200 notification sent
  else Twilio failed
    A-->>W: 200 notification failed
    W-->>AD: Message not sent. Send new link button
  end

  S->>W: Opens /list/edit?token=UUID
  W->>DB: get_listing_for_edit (hash)
  alt Used, expired, revoked or unknown
    DB-->>W: OB002, OB003, OB004 or OB001
    W-->>S: Friendly message, no changes
  else Valid
    DB-->>W: Listing JSON
    W-->>S: Pre-filled form and rejection reason. Link is not used up
  end

  S->>W: Fixes details, may add or remove photos, taps Resubmit
  W->>A: POST /api/listings/resubmit
  A->>DB: resubmit_listing (hash, fields)
  DB->>DB: Lock token then listing. Update the same row. status = pending_review. Burn token. Audit
  DB-->>A: listing_id
  A-->>W: 200 pending_review
  Note over S,DB: A second tap or a replay finds the token used (OB002) and changes nothing
```

### 3.3 Edit-link life cycle

```mermaid
stateDiagram-v2
  [*] --> live: Rejection creates the link
  live --> used: Seller resubmits
  live --> expired: 30 days pass
  live --> revoked: Admin sends a new link
  used --> [*]
  expired --> [*]
  revoked --> [*]
```

Only one link per listing is live at a time. Opening a live link does not change its state.

## 4. Global Admin: reassignment, revocation and blacklist

```mermaid
flowchart TD
  G(["Global Admin opens /admin/global"]) --> T{"Choose a tool"}

  T -->|"Reassign a listing"| R1["Pick listing, pick another active admin of the same region or a Global Admin"]
  R1 --> R2{"Reason of 5 or more characters?"}
  R2 -->|"No"| R1
  R2 -->|"Yes"| R3["reassign_listing: lock row, set admin in charge, write audit entry"]
  R3 --> R4["Old admin now sees the listing masked. New admin sees the seller details"]

  T -->|"Revoke an admin"| V1["Pick admin, enter reason"]
  V1 --> V2["revoke_admin: is_active = false at once"]
  V2 --> V3["Pending listings of that admin return to the open queue"]
  V3 --> V4["Admin's next request returns nothing: Your access has ended"]
  V4 --> V5{"Change of mind?"}
  V5 -->|"Yes"| V6["reinstate_admin: access returns"]
  V5 -->|"No"| V7["Stays revoked. Approved listings appear in Orphaned for reassignment"]

  T -->|"Blacklist an admin"| B1["Pick admin, enter reason, type the admin's name to confirm"]
  B1 --> B2["POST /api/admin/blacklist"]
  B2 --> B3["blacklist_admin: is_blacklisted = true, is_active = false, pending listings released, audit entry"]
  B3 --> B4["Server bans the Supabase Auth user so no new session can start"]
  B4 --> B5["OTP send refuses this number. promote_to_admin refuses it. Profile cannot be deleted or un-blacklisted"]
  B5 --> B6(["Permanent"])

  T -->|"Override a review"| O1["Approve or reject any pending listing. Admin in charge does not change"]

  V7 --> R1
```

Notes: GA-3 to GA-8 in the PRD. If the Auth ban fails after the database flag is set, the flag alone already blocks all data access, and the route reports that the ban is being retried. Repeating a blacklist request is safe.

## 5. Where each flow is tested

| Flow | QA scenarios in [08](08_QA_TEST_CASES_AND_ACCEPTANCE.md) |
|---|---|
| 1.1 Sign-in | QA-01 to QA-04 |
| 1.2 Submission | QA-05 to QA-12 |
| 2 Review and routing | QA-13 to QA-18 |
| 3 Rejection loop and tokens | QA-19 to QA-25 |
| 4 Governance | QA-26 to QA-31 |
