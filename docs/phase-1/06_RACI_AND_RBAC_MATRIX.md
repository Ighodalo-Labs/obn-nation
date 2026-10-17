# 06 · RACI and RBAC Matrix

Project: OBN NATION ONLINE.COM · Phase 1, the Listing Cloud · Version 1.0 · 17 Oct 2026
Related: [02 PRD](02_PRD_PHASE_1.md) · [03 Database](03_ERD_AND_DATABASE_SCHEMA.md) · [04 Flows](04_USER_AND_ADMIN_FLOWCHARTS.md)

---

## 1. Roles in the product (RBAC)

The database has three stored roles: `seller`, `regional_admin`, `global_admin`. For permissions, the regional admin role splits into two **relationships to a listing**:

| Matrix column | Who | How it is decided |
|---|---|---|
| **Guest Seller** | Any signed-in person acting as a seller, or a holder of an edit link | `seller_id` on the listing, or a live token |
| **Attributed Regional Admin** | The regional admin **in charge of this listing** | `listings.assigned_admin_id = this admin`. Set by referral link, claim, approve, reject or reassignment |
| **Non-Attributed Regional Admin** | Any other active admin of the same region | `profiles.role = regional_admin`, same `region`, not in charge of this listing |
| **Global Admin** | Aghughu Omo-Odion Destiny and any further Global Admin | `profiles.role = global_admin` |

A person who is a Non-Attributed Admin on one listing is an Attributed Admin on another. A revoked or blacklisted admin has **no** role for any column: every check requires an active, non-blacklisted profile.

Symbols: **✔** allowed · **✔ masked** allowed with seller name and phone masked · **✔ if unclaimed** allowed only while nobody is in charge, and doing it makes the person the admin in charge · **✖** not allowed · **n/a** does not apply.

## 2. RBAC permissions matrix

| # | Action | Guest Seller | Attributed Regional Admin | Non-Attributed Regional Admin | Global Admin | Enforced by |
|---|---|---|---|---|---|---|
| 1 | Open the landing page | ✔ | ✔ | ✔ | ✔ | Public static page |
| 2 | Sign in with WhatsApp OTP | ✔ | ✔ | ✔ | ✔ (blacklisted numbers ✖) | Send route, Auth hook, `profiles` |
| 3 | Create and submit a listing | ✔ own | ✔ (as a seller) | ✔ (as a seller) | ✔ (as a seller) | `listings_insert_seller` policy, daily-limit trigger |
| 4 | See own listings and their status | ✔ own only | ✔ own | ✔ own | ✔ | `listings_select_seller` |
| 5 | Fix a rejected listing with the edit link | ✔ (token holder) | ✖ | ✖ | ✖ | Token functions, `service_role` only |
| 6 | See pending listings in own region that nobody has claimed | ✖ | n/a | ✔ masked | ✔ | `listings_select_regional`, view |
| 7 | See pending referral listings assigned to an admin | ✖ | ✔ | ✖ | ✔ | `listings_select_assigned`, view |
| 8 | Claim an unclaimed pending listing | ✖ | n/a | ✔ | ✔ | `claim_listing` (row lock, first caller wins) |
| 9 | Approve a pending listing | ✖ | ✔ (one approval is enough) | ✔ if unclaimed | ✔ override | `approve_listing`, `_reviewer_ok` |
| 10 | Reject with a reason and send the edit link | ✖ | ✔ | ✔ if unclaimed | ✔ override | `/api/listings/reject`, `reject_listing` |
| 11 | Send a new edit link for a rejected listing | ✖ | ✔ | ✖ | ✔ | `reissue_edit_link` |
| 12 | See the seller's real name and phone | ✔ own details | ✔ | ✖ masked | ✔ | `regional_listings_feed`, `profiles_select` |
| 13 | See the approved regional pool | ✖ | ✔ | ✔ masked | ✔ all regions | `listings_select_regional`, view |
| 14 | See another region's listings | ✖ | ✖ | ✖ | ✔ | Region checks in policies and view |
| 15 | Run the sale of an approved listing | ✖ | ✔ (sales stay with the admin in charge) | ✖ (coordinate through the admin in charge) | ✔ | Business rule BR-8, contact masking |
| 16 | Reassign a listing to another admin | ✖ | ✖ | ✖ | ✔ with reason | `reassign_listing` |
| 17 | Add an admin or promote a seller | ✖ | ✖ | ✖ | ✔ | `/api/admin/create`, `promote_to_admin` |
| 18 | Revoke or reinstate an admin | ✖ | ✖ | ✖ | ✔ with reason | `revoke_admin`, `reinstate_admin` |
| 19 | Blacklist an admin (permanent) | ✖ | ✖ | ✖ | ✔ with reason | `/api/admin/blacklist`, `blacklist_admin`, `profiles_guard` |
| 20 | Read the audit log | ✖ | ✖ | ✖ | ✔ | `audit_select_global` |
| 21 | Upload photos and videos | ✔ own folder | ✔ own folder | ✔ own folder | ✔ own folder | Storage policy `media_insert_own` |
| 22 | View photos and videos of a listing | ✔ own | ✔ listings they can see | ✔ listings they can see | ✔ all | Storage policy `media_select` follows listing visibility |
| 23 | Read edit tokens | ✖ | ✖ | ✖ | ✖ | No policy; `service_role` only |
| 24 | Change listing status, assignment or role with a direct table update | ✖ | ✖ | ✖ | ✖ | Column grants and policies; only the functions above can |

### 2.1 What happens when access ends

| Event | Takes effect | Result |
|---|---|---|
| Admin revoked | Next database query | Every policy and function treats the person as unknown. Dashboard shows "Your access has ended." Their pending listings return to the open queue. Their approved listings stay assigned until reassigned. Reinstate restores access |
| Admin blacklisted | Next database query | Same as revoke, plus: OTP send is refused, the Auth user is banned, the profile can never be deleted or un-blacklisted, and `promote_to_admin` refuses the number |
| Edit link used, expired or replaced | Immediately | The token functions refuse it |

### 2.2 Who can approve or reject (decision table)

| Listing state | Caller | Allowed | Result |
|---|---|---|---|
| Pending, assigned to Admin A | Admin A | ✔ | Decision recorded |
| Pending, assigned to Admin A | Another admin of the region | ✖ | Not authorized |
| Pending, assigned to Admin A | Global Admin | ✔ | Decision recorded. Admin A stays in charge |
| Pending, unassigned | Any active admin of the region | ✔ | Caller becomes admin in charge, decision recorded |
| Pending, unassigned | Admin of another region | ✖ | Not authorized |
| Pending, unassigned | Global Admin | ✔ | Caller becomes admin in charge, decision recorded |
| Approved, rejected or draft | Anyone | ✖ | Invalid state, or not found |

### 2.3 Row visibility by status

| Status | Seller | In-charge admin | Other admins of the region | Global Admin |
|---|---|---|---|---|
| `draft` | Own | ✖ | ✖ | ✖ |
| `pending_review`, unassigned | Own | n/a | ✔ masked | ✔ |
| `pending_review`, assigned | Own | ✔ | ✖ | ✔ |
| `rejected` | Own | ✔ | ✖ | ✔ |
| `approved` | Own | ✔ | ✔ masked | ✔ |

## 3. RACI for Phase 1 execution

Roles: **PL** Project Lead (Ighodalo Labs Lead) · **DEV** Solo Developer (Bassey) · **CTO** Acting CTO (A.I.G.) · **GA** Global Admin (Destiny) · **RA** Regional Admins.

R = does the work · A = answers for it and signs it off (exactly one per row) · C = consulted before · I = informed after. "A/R" means the same person does and answers for it.

| # | Activity | PL | DEV | CTO | GA | RA |
|---|---|---|---|---|---|---|
| 1 | Confirm business rules and sign off the PRD | R | C | C | A | I |
| 2 | Cost proposal and release of Milestone 1 funds | R | C | A | C | I |
| 3 | Architecture and database design | A | R | C | I | I |
| 4 | Meta business verification and WhatsApp template approval | C | C | I | A/R | I |
| 5 | Domain access and Zoho Mail DNS records | C | R | I | A | I |
| 6 | Logo, brand assets and About Us copy approval | C | I | I | A/R | I |
| 7 | Set up and pay for Supabase, Vercel, Twilio and the code repository | A | R | C | I | I |
| 8 | Build Milestone 1 features | A | R | C | I | I |
| 9 | Security and RLS review | C | R | A | I | I |
| 10 | Run the QA suite and fix defects | A | R | I | I | C |
| 11 | Upgrade to Supabase Pro and Vercel Pro at the start of Milestone 2 | C | R | A | I | I |
| 12 | Create the first Global Admin and add regional admins | C | R | I | A | I |
| 13 | Recruit closed-beta sellers and admins | C | I | I | A | R |
| 14 | Day-to-day review of listings during beta | I | I | I | A | R |
| 15 | Reassign, revoke and blacklist decisions | I | I | I | A/R | C |
| 16 | Measure the three Phase 1 gate targets | C | R | A | C | I |
| 17 | Fix defects found in the closed beta | A | R | I | I | C |
| 18 | Incident response during beta | A | R | C | I | I |
| 19 | Go-live decision | R | C | A | C | I |
| 20 | Documentation and handover | A | R | C | I | I |
| 21 | Post-launch support retainer quote (5 to 10 hours a month) | R | C | A | I | I |

### 3.1 Escalation

| Issue | First contact | Escalate to |
|---|---|---|
| Blocked on Meta or WhatsApp approval | Global Admin | Acting CTO |
| Scope change or extra cost | Project Lead | Acting CTO for approval, with a corrected quotation |
| Security concern or suspected leak | Developer | Project Lead and Acting CTO the same day |
| Admin misconduct | Regional Admin reports | Global Admin decides revoke or blacklist |
| Production outage | Developer | Project Lead, then Acting CTO |
