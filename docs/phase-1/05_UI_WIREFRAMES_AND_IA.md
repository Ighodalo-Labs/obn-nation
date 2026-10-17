# 05 · UI Wireframes and Information Architecture

Project: OBN NATION ONLINE.COM · Phase 1, the Listing Cloud · Version 1.0 · 17 Oct 2026
Related: [02 PRD](02_PRD_PHASE_1.md) · [04 Flows](04_USER_AND_ADMIN_FLOWCHARTS.md) · [06 RBAC](06_RACI_AND_RBAC_MATRIX.md) · [07 API](07_API_CONTRACTS_AND_INTEGRATIONS.md)

The wireframes show layout, order and behaviour on a 360 by 640 phone. Colours and type follow section 2 of the PRD: dark background `#0A0A0A`, red primary button, green approve, blue selected state. Boxes are drawn as plain text so they render anywhere.

---

## 1. Information architecture

### 1.1 Site map

```text
OBN NATION
├── /                         Gateway landing page          public, static
├── /list                     WhatsApp OTP sign-in          public, sets the obn_ref cookie
│   ├── /list/form            Three-step listing form       signed in, named
│   └── /list/edit?token=…    Fix a rejected listing        edit token, no session
├── /admin                    redirects to /admin/dashboard
│   ├── /admin/dashboard      Review inbox                  regional admin or Global Admin
│   ├── /admin/pool           Shared regional pool          regional admin or Global Admin
│   └── /admin/global         Governance console            Global Admin only
└── /api                      Serverless endpoints (section 1.3)
```

### 1.2 Auth gates

| Route | Who may open it | Gate | If the gate fails |
|---|---|---|---|
| `/` | Anyone | None | n/a |
| `/list` | Anyone | None. Signed-in users see a shortcut to the form or to `/admin` | n/a |
| `/list/form` | Signed-in seller or admin with a name | Session cookie and `full_name` set | Redirect to `/list` (and the name step if the name is missing) |
| `/list/edit?token=` | Holder of a live token | Token hash lookup on the server. No session needed | Friendly message for used, expired, revoked or unknown links |
| `/admin/dashboard` | Active regional admin or Global Admin | Session and profile check in middleware, repeated by the database on every query | Redirect to `/list?next=/admin/dashboard`. A revoked or blacklisted admin sees "Your access has ended." |
| `/admin/pool` | Same | Same | Same |
| `/admin/global` | Active Global Admin | Session and role check | Not-found page for everyone else |

Gates in the web app are a courtesy to the user. The real gates are in the database ([03](03_ERD_AND_DATABASE_SCHEMA.md), section 8).

### 1.3 Edge and API endpoints

| Endpoint | Used by | Auth |
|---|---|---|
| `POST /api/auth/otp/send` | `/list` | None (rate limited) |
| `POST /api/auth/otp/verify` | `/list` | None (rate limited) |
| `POST /api/hooks/send-otp` | Supabase Auth hook | Signed webhook |
| `PATCH /api/profile/name` | `/list` name step | Session |
| `POST /api/listings/create` | `/list/form` | Session |
| `POST /api/listings/edit/upload-url` | `/list/edit` | Edit token |
| `POST /api/listings/resubmit` | `/list/edit` | Edit token |
| `POST /api/listings/reject` | `/admin/dashboard` | Admin session |
| `POST /api/listings/reissue` | `/admin/dashboard`, `/admin/global` | Admin session |
| `POST /api/admin/create` | `/admin/global` | Global Admin session |
| `POST /api/admin/blacklist` | `/admin/global` | Global Admin session |
| `GET /api/cron/purge-drafts` | Vercel Cron | `CRON_SECRET` |

Claim, approve, reassign, revoke and reinstate are database function calls made with the admin's own session (see [07](07_API_CONTRACTS_AND_INTEGRATIONS.md), section 4). Full contracts are in [07](07_API_CONTRACTS_AND_INTEGRATIONS.md).

### 1.4 Main paths between screens

| From | Action | To |
|---|---|---|
| Landing | Tap "List an item" | OTP modal on `/list` |
| OTP modal | Correct code (named seller) | Step 1 of the form |
| OTP modal | Correct code (first time) | Name step, then Step 1 |
| OTP modal | Correct code (admin) | `/admin/dashboard` |
| Step 1 | Next | Step 2 |
| Step 2 | Next | Step 3 |
| Step 3 | Submit | "Under review" confirmation |
| WhatsApp link | Open | `/list/edit` with the form pre-filled |
| Edit page | Resubmit | "Under review" confirmation |
| Dashboard | Tab to Pool | `/admin/pool` |
| Dashboard (Global Admin) | Tab to Global | `/admin/global` |

## 2. Screen wireframes

Legend: `░` is the dimmed page behind a modal. `●` filled step or selected option, `○` empty step. `_` is the text cursor. `▒` is an image. `[…]` is a button or chip.

### Screen 1 · Gateway landing page  (route /)

```text
            Phone 360 x 640
┌──────────────────────────────────────┐
│ [LOGO]  OBN NATION                   │
│         Connecting People            │
│──────────────────────────────────────│
│                                      │
│ ┌─ About OBN NATION ─────────────┐   │
│ │                                │   │
│ │ OBN NATION (One Beta Nation)   │   │
│ │ is a Nigerian community-driven │   │
│ │ decluttering and asset-        │   │
│ │ liquidation marketplace. ...   │   │
│ │                                │   │
│ │ Through our community networks │   │
│ │ we help sellers reach buyers.  │   │
│ │ ...                            │   │
│ │                                │   │
│ │ Trust is an asset. ...         │   │
│ │                                │   │
│ └────────────────────────────────┘   │
│                                      │
│                                      │
│──────────────────────────────────────│
│ ┌────────────────────────────────┐   │
│ │        List an item  ▶         │   │
│ └────────────────────────────────┘   │
│  (sticky: stays at the bottom)       │
└──────────────────────────────────────┘
```

### Screen 2 · WhatsApp OTP modal  (route /list), three states

```text
            A. Phone number
┌──────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│  Sign in with WhatsApp               │
│                                      │
│ ┌────────────────────────────────┐   │
│ │ Phone number                   │   │
│ │ +234 | 803 123 4567_           │   │
│ │                                │   │
│ └────────────────────────────────┘   │
│  Use a number that has WhatsApp.     │
│                                      │
│ ┌────────────────────────────────┐   │
│ │           Send code            │   │
│ └────────────────────────────────┘   │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──────────────────────────────────────┘
```

```text
                B. Code
┌──────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│  Enter your code                     │
│  Sent to WhatsApp +234 803 *** 4567  │
│                                      │
│   [ 4 ] [ 8 ] [ 1 ] [ _ ] [   ] [   ]│
│                                      │
│  Resend in 0:42     Change number    │
│                                      │
│ ┌────────────────────────────────┐   │
│ │             Verify             │   │
│ └────────────────────────────────┘   │
│  3 tries left                        │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──────────────────────────────────────┘
```

```text
      C. Name (first sign-in only)
┌──────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│  One last thing                      │
│  What should we call you?            │
│                                      │
│ ┌────────────────────────────────┐   │
│ │ Your name                      │   │
│ │ Ada Obi_                       │   │
│ └────────────────────────────────┘   │
│  Shown to admins only.               │
│                                      │
│ ┌────────────────────────────────┐   │
│ │            Continue            │   │
│ └────────────────────────────────┘   │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──────────────────────────────────────┘
```

### Screen 3 · Step 1: region and category  (route /list/form)

```text
            Phone 360 x 640
┌──────────────────────────────────────┐
│  Step 1 of 3   ● ○ ○                 │
│  What are you selling?               │
│                                      │
│  Where are you?                      │
│ ┌────────────────────────────────┐   │
│ │ (●) Port Harcourt   ( ) Delta  │   │
│ │ ( ) Ekiti                      │   │
│ └────────────────────────────────┘   │
│  (locked if you used a link)         │
│                                      │
│  Category                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │  [ph]│ │  [pc]│ │  [tv]│ │  [fr]│ │
│  │ Phone│ │ Comp.│ │  TVs │ │ Fridg│ │
│  └──────┘ └──────┘ └──────┘ └──────┘ │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │  [gn]│ │  [kt]│ │  [sf]│ │  ... │ │
│  │ Gener│ │ Kitch│ │ Furn.│ │ Other│ │
│  └──────┘ └──────┘ └──────┘ └──────┘ │
│                                      │
│                                      │
│ ┌────────────────────────────────┐   │
│ │            Next  ▶             │   │
│ └────────────────────────────────┘   │
└──────────────────────────────────────┘
```

### Screen 4 · Step 2: details, condition cards and price

```text
       Phone 360 x 640 (scrolls)
┌──────────────────────────────────────┐
│  Step 2 of 3   ● ● ○                 │
│                                      │
│ ┌────────────────────────────────┐   │
│ │ Title                          │   │
│ │ Samsung double door fridge_    │   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ Description        12 / 1000   │   │
│ │ Cools well. 2 years old. Comes │   │
│ │ with shelves.                  │   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ Brand (optional)  Samsung      │   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ Model (optional)  RT38         │   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ Size (optional)   380 L        │   │
│ └────────────────────────────────┘   │
│  Age of item                         │
│ ┌────────────────────────────────┐   │
│ │ ( ) New, sealed                │   │
│ │ ( ) New, open box              │   │
│ │ ( ) Premium used               │   │
│ │ (●) Neatly used                │   │
│ │ ( ) Fairly used                │   │
│ └────────────────────────────────┘   │
│  Working status                      │
│ ┌────────┐ ┌────────┐ ┌──────────┐   │
│ │ ✔ Works│ │ ⚠ Minor│ │  ✖ Not   │   │
│ └────────┘ └────────┘ └──────────┘   │
│   perfectly    issues    working     │
│ ┌────────────────────────────────┐   │
│ │ Price   ₦ | 150,000_           │   │
│ └────────────────────────────────┘   │
│ ┌──────────────┐ ┌───────────────┐   │
│ │    ◀ Back    │ │     Next ▶    │   │
│ └──────────────┘ └───────────────┘   │
└──────────────────────────────────────┘
```

### Screen 5 · Step 3: photo drop zone and optional video

```text
       Phone 360 x 640 (scrolls)
┌──────────────────────────────────────┐
│  Step 3 of 3   ● ● ●                 │
│                                      │
│  Photos (1 to 6)                     │
│ ┌────────────────────────────────┐   │
│ │ [+ Camera]  [+ Gallery]        │   │
│ │ 3 of 6 photos added            │   │
│ └────────────────────────────────┘   │
│  ┌────────┐ ┌────────┐ ┌────────┐    │
│  │ ▒▒▒▒   │ │ ▒▒▒▒   │ │ ▒▒▒▒   │    │
│  │ ▒▒▒▒   │ │ ▒▒▒▒   │ │ ▒▒▒▒   │    │
│  │ 412KB ✕│ │ 412KB ✕│ │ 412KB ✕│    │
│  └────────┘ └────────┘ └────────┘    │
│  Each photo is shrunk to under 1 MB  │
│                                      │
│  Video (optional, up to 60 seconds)  │
│ ┌────────────────────────────────┐   │
│ │ [+ Record]  [+ Gallery]        │   │
│ │ Shrinking video ...   62%      │   │
│ │ [█████████████░░░░░░░░]        │   │
│ │             Cancel             │   │
│ └────────────────────────────────┘   │
│  Result: MP4 under 10 MB             │
│                                      │
│ ┌────────────────────────────────┐   │
│ │         Submit listing         │   │
│ └────────────────────────────────┘   │
│  After tapping: Uploading 2 of 4 ... │
│  [██████████░░░░░░░░░░]              │
└──────────────────────────────────────┘
```

### Screen 6 · Regional admin review queue card  (route /admin/dashboard)

```text
            Phone 360 x 640
┌──────────────────────────────────────┐
│  Review (7) │ Waiting (2) │ Done     │
│──────────────────────────────────────│
│ ┌────────────────────────────────┐   │
│ │ ┌─────┐ Samsung double door    │   │
│ │ │▒▒▒▒▒│ fridge                 │   │
│ │ │▒▒▒▒▒│ ₦150,000               │   │
│ │ └─────┘ Fridges · Port Harcourt│   │
│ │ [Neatly used]                  │   │
│ │ [✔ Working perfectly]          │   │
│ │                                │   │
│ │ ● Unclaimed · waiting 3h       │   │
│ │ Seller: A*** +234 ••• ••• ••36 │   │
│ │                                │   │
│ └────────────────────────────────┘   │
│ ┌────────┐ ┌────────┐ ┌──────────┐   │
│ │ Claim  │ │ Approve│ │  Reject  │   │
│ └────────┘ └────────┘ └──────────┘   │
│                                      │
│  Your link: /list?ref=3fa9c1d2       │
│  [Copy]  [Share on WhatsApp]         │
└──────────────────────────────────────┘
```

### Screen 6b · Reject modal

```text
            Phone 360 x 640
┌──────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│  Reject this listing                 │
│                                      │
│ ┌────────────────────────────────┐   │
│ │ Reason for seller (required)   │   │
│ │ Photos are blurry. Retake in   │   │
│ │ daylight._                     │   │
│ │                       34 / 500 │   │
│ └────────────────────────────────┘   │
│  Quick picks:                        │
│  [Photos are blurry] [Price too high]│
│  [Item not allowed] [Missing details]│
│                                      │
│ ┌──────────────┐ ┌───────────────┐   │
│ │    Cancel    │ │ Reject + send │   │
│ └──────────────┘ └───────────────┘   │
│  The seller gets a WhatsApp message  │
│  with a link to fix and resubmit.    │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──────────────────────────────────────┘
```

### Screen 7 · Shared regional pool card, masked and unmasked

```text
            Phone 360 x 640
┌──────────────────────────────────────┐
│  Port Harcourt pool  Phones ▾        │
│──────────────────────────────────────│
│ ┌────────────────────────────────┐   │
│ │ ┌─────┐ LG 43 inch Smart TV    │   │
│ │ │▒▒▒▒▒│ ₦90,000                │   │
│ │ └─────┘ TVs · Premium used     │   │
│ │                                │   │
│ │ MASKED (not your listing)      │   │
│ │ Seller: B*** +234 ••• ••• ••02 │   │
│ │ In charge: Tunde               │   │
│ │ [Copy ad text]                 │   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ ┌─────┐ Samsung double door    │   │
│ │ │▒▒▒▒▒│ fridge  ₦150,000       │   │
│ │ └─────┘ Fridges · Neatly used  │   │
│ │                                │   │
│ │ ✔ You are in charge            │   │
│ │ Seller:  Ada Obi               │   │
│ │          +234 812 000 0001     │   │
│ │ [Copy ad text]                 │   │
│ └────────────────────────────────┘   │
│  [Load more]                         │
└──────────────────────────────────────┘
```

### Screen 8 · Global Admin management console  (route /admin/global)

```text
       Phone 360 x 640 (scrolls)
┌──────────────────────────────────────┐
│  Admins │ Listings │ Audit           │
│──────────────────────────────────────│
│ ┌────────────────────────────────┐   │
│ │          + Add admin           │   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ Tunde Bello            ● Active│   │
│ │ P.Harcourt · +234 811 000 0003 │   │
│ │ In charge: 4 pending, 12 live  │   │
│ │ Link: ?ref=7c1e44ab  [Copy]    │   │
│ │ [Reassign] [Revoke] [Blacklist]│   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ Chidi Eze             ◐ Revoked│   │
│ │ Delta · +234 811 000 0007      │   │
│ │ Reason: Left the team          │   │
│ │ [Reinstate]   [Blacklist]      │   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ Femi Ojo        ✖ Blacklisted  │   │
│ │ Ekiti · +234 811 000 0009      │   │
│ │ Permanent. Never added again.  │   │
│ └────────────────────────────────┘   │
│  ⚠ Orphaned: 3 live listings have no │
│    active admin    [Reassign]        │
└──────────────────────────────────────┘
```

### Screen 8b · Blacklist confirmation dialog

```text
            Phone 360 x 640
┌──────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│  Blacklist Chidi Eze?                │
│                                      │
│  This is permanent. They lose all    │
│  access and their number can never   │
│  be added again.                     │
│                                      │
│ ┌────────────────────────────────┐   │
│ │ Reason (required)              │   │
│ │ Posed as the brand in a chat_  │   │
│ └────────────────────────────────┘   │
│ ┌────────────────────────────────┐   │
│ │ Type the name to confirm       │   │
│ │ Chidi Eze_                     │   │
│ └────────────────────────────────┘   │
│ ┌──────────────┐ ┌───────────────┐   │
│ │    Cancel    │ │   Blacklist   │   │
│ └──────────────┘ └───────────────┘   │
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──────────────────────────────────────┘
```


## 3. Screen notes

| Screen | Notes |
|---|---|
| 1 Landing | Header and card are static HTML. The red button is sticky at the bottom. The full three-paragraph copy (the client's own text) is in section 3 of the PRD. Only one link to the product, no menu |
| 2 OTP modal | The phone field accepts `0803…`, `803…` and `+234803…`. Resend unlocks after 60 seconds. After 5 wrong codes the code is void. Name step shows only on first sign-in |
| 3 Step 1 | Region buttons are full-width on narrow phones. With a referral link the region is selected and locked, and a note says the link set it. Category tiles are 48px or taller icon buttons |
| 4 Step 2 | Brand, model and size are marked optional and can be skipped. Age and working status use cards with icons so a seller can pick without typing. Price formats with thousands separators as you type |
| 5 Step 3 | Each photo shows its size after compression. Removing a photo is one tap. The video area shows "No video is fine too" until used. The encoder downloads only when the video button is tapped |
| 6 Review card | The seller line is masked until the admin is in charge. After **Claim** the line shows the real name and phone. Reject opens the modal in 6b |
| 7 Pool | Masked row has no phone or name in the page data. "Copy ad text" never includes seller details |
| 8 Global console | Orphaned warning appears only when an approved listing has no active admin in charge. Blacklist always opens the dialog in 8b |

## 4. Screen states

| Screen | Empty | Loading | Error |
|---|---|---|---|
| Landing | n/a | n/a | n/a |
| OTP modal | n/a | Button shows a spinner and is disabled | Inline red text under the field, plain words |
| Form steps | n/a | Spinner on Next only while the region lock is checked | Inline per field. Summary at top if more than one |
| Step 3 upload | "Add at least one photo" | Progress bar per stage: shrinking, uploading | "Upload stopped. Tap Try again to continue." |
| Edit page | n/a | Skeleton of the form | Friendly card for used, expired, revoked or unknown link |
| Review queue | "Nothing waiting. Share your link to get more listings." | Three skeleton cards | Banner "Could not refresh" with a Retry button |
| Pool | "No approved listings yet." | Skeleton cards | Banner with Retry |
| Global console | "No admins yet. Add the first one." | Skeleton rows | Banner with Retry |

## 5. Shared components

| Component | Rule |
|---|---|
| Header | Logo (or text wordmark) and tagline. No navigation on seller screens |
| Step indicator | Three dots with text "Step 2 of 3". Not clickable forward |
| Radio card | 48px minimum height, icon, label, selected state uses blue border plus a check mark |
| Chip | Text label always present. Green for live, red for needs changes, blue for under review, grey for draft |
| Drop zone | Camera and gallery buttons first (phones), drag and drop second (desktop) |
| Progress bar | Shows a percentage in text as well as the bar |
| Modal | Opens as a bottom sheet on phones. Closes with a Cancel button, never with a tap outside while a request is running |
| Toast | Bottom, 4 seconds, polite screen-reader announcement |
