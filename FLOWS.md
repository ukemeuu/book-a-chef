# Book A Chef Kenya — User, Chef & Admin Flows

This document describes what the platform **actually does today**, end to end:
from a customer signing up, through dispatch and payment, to how a chef who
emails or WhatsApps us becomes a live, dispatchable account, and how an admin
runs the whole thing.

It is written against the code in this repo and the live Supabase schema. Where
the two disagree, that is called out in [Schema drift](#10-schema-drift--pending-migration)
— read that section before deploying.

---

## 1. Actors

| Actor | Auth role | Lands on | Can do |
|---|---|---|---|
| Customer | `client` | `/dashboard` | Request a chef, track status, pay via M-Pesa, cancel, review |
| Chef applicant | `chef` | `/chef-dashboard` (applicant workspace) | Complete/resubmit application, see review state |
| Active chef | `chef` | `/chef-dashboard` | Go online, accept/decline jobs, contact client, complete job |
| Admin | `admin` | `/admin` | Review applications, onboard/link chefs, dispatch, manage bookings |

`middleware.ts` guards `/admin`, `/chef-dashboard`, `/dashboard`, and `/login`,
and redirects each role to its **own** surface. A signed-in user hitting the
wrong dashboard is moved, not shown an empty screen.

---

## 2. Customer flow: first visit → booked chef

### 2.1 Registration / sign-in

1. Customer lands on `/` and taps **Request a Chef**.
2. `/request` requires an account. Signed-out users are sent to
   `/login?redirect=/request`.
3. On `/login`:
   - **Create Account** → Supabase `signUp` → `profiles` row is upserted with
     `role='client'` → auto sign-in → `/dashboard`.
   - **Sign In** → role is read from `profiles` (falling back to JWT metadata)
     and the user is routed to `/admin`, `/chef-dashboard`, or `/dashboard`.
   - `?redirect=` is honoured only for **in-app paths** (`/...`), never an
     external URL.
   - `?role=chef` (set by middleware) shows the chef variant of the page and
     routes the user to the chef portal, not the customer dashboard.
4. **Forgot password** emails a recovery link that lands on `/reset-password`.
   That page exchanges the recovery session and sets a new password, then
   routes to the correct dashboard by role.

### 2.2 Submitting a request

`/request` collects: event date, time, location, cuisine, guests, budget,
service format, sourcing preference, dietary notes.

On submit → `POST /api/bookings/create`:

1. Requires a signed-in user (401 otherwise).
2. Validates date (present, not in the past beyond a small grace), guest count,
   and required fields.
3. **Ignores any client-supplied `status`, `chef_id`, or price.** Pricing and
   the initial status are computed server-side.
4. Inserts the booking with `status='pending_assignment'`, `chef_id=null`,
   `client_id=<user>`, plus structured request facets in `dispatch_notes`.
5. Persists through `runWithSchemaFallback`, so a schema-drifted column is
   dropped instead of silently discarding the whole booking.
6. Returns the **real booking id** and a `wa.me` concierge link. The client
   never invents a reference — `/request` redirects using the id.
7. Fires `notifyRequestReceived` (WhatsApp, best-effort) and triggers
   `matchChefToBooking()`.

### 2.3 Automatic dispatch

`utils/dispatch.ts` is the single matching engine (also used by
`/api/dispatch/match` and admin re-matching).

1. **Candidate filter**
   - `user_id IS NOT NULL` — a listing with no login can never be dispatched.
   - Chef is available (`is_available = true`).
   - Not already committed to an overlapping job; respects
     `max_bookings_per_day` and same-day load.
2. **Scoring** (higher wins)

   | Signal | Points |
   |---|---|
   | Cuisine match | 40 |
   | Location / service area | 30 |
   | Budget fit | 20 |
   | Rating | 10 |
   | Availability | 10 |

3. **Atomic claim** — the booking is updated with `chef_id` and
   `status='assigned'` **only while it is still `pending_assignment` with a
   null `chef_id`**. If another process got there first, the engine moves to the
   next candidate instead of double-assigning.
4. Writes a `dispatch_log` row through `safeDispatchLog` (non-fatal when the
   table is absent).
5. Notifies the chef in-app and over WhatsApp (`notifyChefOfNewRequest`),
   and the customer once a chef is assigned (`notifyChefAssigned`).
6. If **no** chef matches, the booking stays `pending_assignment` and stays in
   the admin dispatch queue.

### 2.4 Live tracking

- `/request/status?id=<booking uuid>` polls
  `GET /api/dispatch/status?booking_id=...` every 5 seconds.
- The endpoint is auth-guarded: only the booking's client, the assigned chef,
  or an admin may read it (it exposes the chef's phone).
- Status → UI stage: `pending_assignment` → Finding your chef;
  `assigned`/`chef_accepted`/`confirmed` → Chef assigned; `en_route` → On the
  way; `cooking`/`in_progress` → Cooking.
- Legacy links carrying only a short `?ref=` are resolved by matching the UUID
  prefix **within the caller's own bookings**, then the URL is rewritten with
  the full `id`. No more "latest booking" mix-ups.
- Signed-out visitors are bounced to login with a `redirect` back to the same
  tracker URL.

### 2.5 Chef accepts → payment

1. Chef accepts (`POST /api/bookings/[id]/accept`). The status moves
   `assigned → chef_accepted` in one conditional update; a concurrent accept
   gets a 409.
2. Customer is notified in-app and on WhatsApp, and receives a WhatsApp handoff
   link to the concierge/chef.
3. Customer opens `/dashboard` and pays via **M-Pesa**:
   `POST /api/payments/mpesa/initiate`
   - Server re-reads the booking, checks ownership, confirms the deposit is
     unpaid, and only allows payment for `pending`, `assigned`,
     `chef_accepted`, or `payment_pending`.
   - Amount comes from `bookings.deposit_amount` — never from the client.
   - The `payments` row is written **before** returning; if that write fails the
     user is told to contact support instead of being left in limbo.
   - Booking moves to `payment_pending`.
4. Safaricom calls `POST /api/payments/mpesa/callback`:
   - Claims the payment row atomically
     (`callback_processed: false → true`) so duplicate/overlapping retries
     cannot confirm twice.
   - On success: payment `completed`, booking `confirmed` + `deposit_paid`,
     in-app notification, audit log, WhatsApp receipt.
   - On failure: payment `failed`; booking reverts to `chef_accepted` **only if
     it is still `payment_pending`**.
   - Always returns HTTP 200 to Safaricom.
   - If M-Pesa keys are absent, `/initiate` returns `mode: "manual_pending"`
     and records the request instead of pretending a prompt was sent.

### 2.6 Service → review

- Chef marks the job complete from the chef dashboard:
  `POST /api/bookings/[id]/complete` (assigned chef or admin, only from a live
  service state, schema-tolerant) → `status='completed'`, which unlocks the
  customer review.
- Customer can review a completed booking once:
  `POST /api/reviews/submit`
  - Must be signed in, must own the booking, booking must be `completed`,
    rating 1–5, no duplicate.
  - Insert uses the user session; the chef's aggregate `rating` /
    `reviews_count` is recalculated with the service-role client (or the user
    client as a fallback) because client RLS cannot write `chefs`.
- Cancellation: `POST /api/bookings/[id]/cancel` → `cancelled_by_customer`.
  Chef decline on a committed job → `cancelled_by_chef` and re-match.

### 2.7 Customer state machine

```
pending_assignment ──dispatch──▶ assigned ──chef accepts──▶ chef_accepted
        │                            │                            │
        │                     chef declines                M-Pesa success
        ▼                            ▼                            ▼
   (stays queued)          pending_assignment              confirmed
                                                                 │
                                                  en_route → cooking →
                                                          completed
        └──────────── cancel ──────────▶ cancelled_by_customer
                                      └▶ cancelled_by_chef (re-match)
```

---

## 2A. Customer flow: browse & book directly (marketplace)

The marketplace is the public, browsable side. Customers can discover chefs,
view their profiles, and book directly — no request form required.

### 2A.1 Browse chefs (`/chefs`)

- Public page. No auth required.
- Fetches `GET /api/chefs` with filters:
  - `cuisine` — exact match on the `cuisines` array
  - `location` — partial match on `city` or `service_areas`
  - `min_price` / `max_price` — price band
  - `available=true` — only chefs currently online
  - `featured=true` — only featured chefs
  - `search` — free-text on name, brand, tagline
  - `sort` — `rating` (default), `reviews`, `price_asc`, `price_desc`, `newest`
- Renders an Airbnb-style grid of chef cards (cover, name, rating, cuisines, price).
- Signed-in clients can favourite a chef (heart toggle) → `POST /api/chefs/[slug]/favorite`.
- Favourites are stored in `chef_favorites` and shown in `/dashboard` → Favourites tab.

### 2A.2 View chef profile (`/chefs/[slug]`)

- Public, server-rendered page (SEO-friendly).
- Only verified chefs are addressable — unverified listings return 404.
- Shows: cover, avatar, bio, culinary philosophy, cuisines, dietary, service areas,
  gallery, menus, reviews, availability, blocked dates.
- Availability combines `chef_availability` (weekly pattern) + `chef_blocked_dates`
  + active bookings (`busyDates`).
- CTA: "Book this chef" → `/book/[slug]`.

### 2A.3 Book directly (`/book/[slug]`)

1. Requires auth (redirects to `/login?redirect=/book/[slug]`).
2. Customer picks: menu, date, time, guests, service format, occasion, dietary,
   special requests, contact details.
3. Date picker disables: past dates, blocked dates, busy dates, and days outside
   the chef's working pattern.
4. Submit → `POST /api/bookings/create` with `chef_id` + `menu_id`.
   - Status is set to `assigned` (not `pending_assignment`) because the chef is known.
   - Pricing is computed server-side from the menu's `price_per_guest`.
5. Chef receives an offer in their dashboard → accepts via
   `POST /api/bookings/[id]/accept` → `chef_accepted`.
6. Customer pays via M-Pesa escrow → `confirmed`.

### 2A.4 Favourites

- `chef_favorites` table: `(client_id, chef_id)` unique pair.
- RLS: users can only manage their own favourites.
- Toggled via `POST /api/chefs/[slug]/favorite` (no body — the slug identifies the chef).
- Shown in `/dashboard` → Favourites tab.

---

## 3. Chef flow: first contact → live, paid jobs

This is the flow that was previously broken. The goal: **a chef who reaches out
should never need a manual account created for them, and should land in a
working portal on their first attempt.**

### 3.1 Entry point

`/apply` — a 3-step, account-first form. No restaurant branch, no fake success
screen, no dead-end "we'll email you".

| Step | Collects |
|---|---|
| 1. Account | Full name, email, phone, password |
| 2. Kitchen | City, neighbourhood, cuisines, dietary specialties, years of experience, specialty dish |
| 3. Business | Service formats (in-home / delivery), service areas, rate per guest, bio, national ID (for vetting) |

If someone is already signed in, the application is attached to that account
rather than creating a second one.

### 3.2 Submit → one atomic onboarding call

`POST /api/chef/apply`:

1. Validates the form and normalises email/phone.
2. Creates the Supabase auth user if needed (`email_confirm` handled per
   environment) — or reuses the existing user for this email.
3. Upserts `profiles` with `role='chef'`, name, and phone.
4. Creates the `chef_applications` row with `status='pending'`.
5. Vetting fields the live table lacks (`national_id_number`, `service_formats`,
   `service_areas`, `user_id`) are packed into `portfolio_links` under the
   `__bookachef_meta__:` prefix by `utils/chefApplication.ts`, so **no data is
   lost before the migration is applied**. Once the migration lands, the real
   columns are used.
6. If the account has a password, signs the applicant in; otherwise tells them
   exactly how to get in (existing account / email confirmation).
7. Redirects to `/chef-dashboard?welcome=1`.

Failure modes are explicit:
- Email already registered → "sign in to continue / use the link we sent",
  never a silent duplicate.
- Duplicate application → links to the existing one instead of creating a copy.

### 3.3 Applicant workspace (`/chef-dashboard`)

While `status='pending'` (or `under_review`/`rejected`), the dashboard shows the
application, its completeness score, and what is missing.

- Reads the application via `GET /api/chef/application` (keyed by `user_id`,
  falling back to email for legacy rows).
- **Save progress** and **Resubmit** call `PATCH /api/chef/application`
  (`meta`, `resubmit`), so a chef can improve a rejected application without
  contacting support.
- Completeness is 12 items (`applicationCompleteness`); the national ID counts
  toward readiness.
- There is **no** fallback to `INITIAL_CHEFS` and no fabricated chef record. If
  there is no listing, the page says so.

### 3.4 Admin approval → the account becomes dispatchable

Admin taps **Approve** in `/admin` → `POST /api/admin/chef-actions`
`action: "approve"`.

The server:

1. Reuses or creates the auth account (`ensureChefAccount`) and ensures
   `profiles.role='chef'`.
2. Reuses an existing `chefs` row by `user_id` or email, otherwise inserts a new
   listing built from the application (`buildChefFromApplication`): name, brand,
   cuisines, service areas, price, bio, `verification_status='approved'`,
   `approved_at`, `national_id_number`, `service_formats`, and **`user_id`**.
3. Creates a default signature menu from the specialty dish when the chef has
   none.
4. Marks the application `approved` with `reviewed_by` / `reviewed_at`.
5. Inserts an in-app notification.
6. Returns `invite_url` (Supabase invite/recovery link) plus a ready-to-send
   **WhatsApp invite** (`whatsapp_url`) so the chef can set a password and sign
   in immediately.

New listings are created with **`is_available = false`**. They are not
dispatchable until the chef signs in and goes online — approval never drops an
unprepared chef into live jobs.

### 3.5 Going live

1. Chef signs in → middleware sends them to `/chef-dashboard`.
2. Dashboard resolves the listing by `user_id` first, then email.
3. Chef completes the profile (bio, gallery, pricing, menus, service formats).
4. **Readiness gate:** ≥ 97% completion is required to switch online
   (`utils/profileReadiness.ts`, enforced server-side in
   `/api/chef/update-profile`; the route now returns a real 500 on write failure
   and reports dropped fields).
5. Chef toggles **Online** → `is_available = true`.
6. Dispatch can now match them.

### 3.6 Handling jobs

- Dashboard lists dispatched offers (`assigned` to this chef) and committed
  jobs.
- **Accept** → `POST /api/bookings/[id]/accept` → `chef_accepted`; customer is
  prompted to pay; a WhatsApp handoff link is returned.
- **Decline** → `POST /api/bookings/[id]/decline`:
  - Offer (uncommitted): booking resets to `pending_assignment`, `chef_id`
    cleared, dispatch re-runs.
  - Committed job: `cancelled_by_chef`, customer notified, re-match triggered.
- **Complete** → `status='completed'`, which unlocks the customer review.
- Unlinked legacy chefs see a **"Link my login"** prompt that opens a WhatsApp
  message to the concierge instead of a dead end.

### 3.7 Chef state machine

```
application pending ──admin approve──▶ listing created (is_available=false)
        │                                      │
   resubmit / reject                    chef signs in + ≥97% profile
        │                                      │
        ▼                                      ▼
   rejected ──resubmit──▶ pending         is_available=true
                                               │
                                    dispatch → assigned
                                               │
                                 accept ──▶ chef_accepted ──▶ (service)
                                 decline ──▶ pending_assignment (re-match)
```

---

## 4. Admin flow

### 4.1 Access

- `/admin` is guarded by middleware: must be signed in **and** `role='admin'`.
- Non-admins are redirected to their own dashboard with `?error=unauthorized`.
- Every state-changing action goes through `/api/admin/chef-actions` or a
  bookings API which re-checks the admin role server-side. The UI is not the
  security boundary.

### 4.2 Chef pipeline

1. **Applications tab** — live list with status from the database (no inference
   from names), completeness, and vetting details.
2. **Approve** → creates/links account, listing, menu, notification, and returns
   WhatsApp + invite links.
3. **Invite** → ensures the account exists and returns the invite link without
   publishing a listing.
4. **Decline / Revert** → sets application status (`rejected`, `pending`,
   `under_review`) with `reviewed_by`/`reviewed_at`.
5. **Manual add** → requires email and phone; calls `action: "create_listing"`,
   which creates the account and listing in one step.
6. **Unlinked chefs panel** — lists listings with `user_id IS NULL`; **Link
   login** calls `action: "link_chef"` to attach an auth account. This is how
   the 8 legacy chefs become dispatchable.
7. **Availability** — `action: "set_available"`; the dispatch dropdown disables
   chefs without a login.

### 4.3 Dispatch & bookings

- Unassigned `pending_assignment` bookings are listed with a chef picker.
- Manual assignment is an **atomic conditional update** on
  `status='pending_assignment' AND chef_id IS NULL`, and sets `assigned_at`.
  A booking someone else just claimed returns a conflict instead of being
  silently overwritten.
- Admin can re-trigger matching (`/api/dispatch/match`), see live status, and
  open a WhatsApp thread with the customer or chef using the full booking id.

### 4.4 Payments

- Payment state lives in `payments`, keyed by `mpesa_checkout_request_id`.
- Admin sees `pending → completed | failed`, the M-Pesa receipt, and the
  booking's `deposit_paid`.
- Supports `receipt_verified` for manual reconciliation.

---

## 5. Notification matrix

Events are WhatsApp-first, with in-app `notifications` rows as the durable log.
Every send is recorded in `whatsapp_message_log` (deduped on booking + template
+ recipient) so failures can be retried. **No notification failure can block a
booking, acceptance, or payment.**

| Event | Customer | Chef | Admin |
|---|---|---|---|
| Booking created | `REQUEST_RECEIVED` + tracker link | — | queue |
| Chef assigned | `CHEF_ASSIGNED` + tracker link | `NEW_REQUEST` | — |
| Chef accepts | `CHEF_ACCEPTED` + handoff link | — | — |
| Payment received | `PAYMENT_RECEIVED` | — | audit log |
| Chef declines | status change notice | — | re-match |
| Application approved | — | invite + WhatsApp link | — |

Tracker links use the **full booking id** (`/request/status?id=<uuid>`). The
status page also accepts legacy `?ref=` links and rewrites them.

---

## 6. Key API surface

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/chefs` | GET | Marketplace listing with filters + sort |
| `/api/chefs/[slug]` | GET | Public chef profile (menus, reviews, availability) |
| `/api/chefs/[slug]/favorite` | GET/POST | Check / toggle favourite |
| `/api/chefs/[slug]/availability` | GET | Weekly pattern + blocked + busy dates |
| `/api/bookings/create` | POST | Create booking, server-side status/price, dispatch |
| `/api/bookings/[id]/accept` | POST | Atomic chef accept |
| `/api/bookings/[id]/decline` | POST | Offer reset + re-match / committed cancel |
| `/api/bookings/[id]/cancel` | POST | Customer cancellation |
| `/api/bookings/[id]/complete` | POST | Assigned chef/admin marks a served job complete |
| `/api/dispatch/match` | POST | Re-run matching (admin or owner) |
| `/api/dispatch/status` | GET | Auth-guarded live status + chef contact |
| `/api/chef/apply` | POST | Account + profile + application in one call |
| `/api/chef/application` | GET/PATCH | Applicant workspace read/save/resubmit |
| `/api/chef/update-profile` | POST | Profile save + 97% go-live gate |
| `/api/admin/chef-actions` | POST | `approve`, `invite`, `decline`, `create_listing`, `link_chef`, `set_status`, `set_available` |
| `/api/payments/mpesa/initiate` | POST | STK push with server-side amount |
| `/api/payments/mpesa/callback` | POST | Idempotent payment confirmation |
| `/api/reviews/submit` | POST | Verified review + chef aggregate update |

---

## 7. Authorization rules that matter

- Every privileged API route checks the **session role server-side**; the admin
  UI hides controls but is not trusted.
- `bookings/create` ignores client-supplied `status`, `chef_id`, and totals.
- `dispatch/status` only returns data to the booking owner, assigned chef, or
  admin.
- `chef/update-profile` requires the listing to belong to the caller (`user_id`
  or email) unless the caller is an admin.
- Service-role key is **server-only**. `createAdminClient()` returns `null`
  when it is absent, and callers degrade gracefully.
- Reviews are only accepted for the reviewer's own `completed` booking.

---

## 8. Failure & recovery paths

| Situation | Behaviour |
|---|---|
| No chef matches | Booking stays `pending_assignment`; admin queue + WhatsApp alert |
| Chef declines an offer | `pending_assignment`, chef cleared, auto re-match |
| Chef declines a committed job | `cancelled_by_chef`, customer notified, re-match |
| Duplicate accept | Second request gets 409 |
| Duplicate M-Pesa callback | Atomic claim; second callback exits 200 without side effects |
| Payment fails | `failed`; booking reverts only from `payment_pending` |
| M-Pesa not configured | `mode: "manual_pending"`, no fake prompt |
| Email provider down | Notifications record failure but booking flow continues |
| Chef has no login | Cannot be dispatched; shown in "Link login" panel |
| Applicant already has an account | Sign-in path returned; no duplicate user |
| Application rejected | Chef can edit and resubmit from the dashboard |
| Schema column missing | Write retried without the column; dropped fields reported |
| `dispatch_log` absent | Logging skipped; dispatch still succeeds |

---

## 9. Database objects touched

`profiles`, `chefs`, `menus`, `bookings`, `chef_applications`, `payments`,
`reviews`, `notifications`, `audit_logs`, `whatsapp_message_log`,
`dispatch_log`, `chef_availability`, `chef_favorites`, `chef_blocked_dates`.

Migration order:

```
schema.sql
→ uber_dispatch_schema.sql
→ dispatch_log.sql
→ concierge_inquiries_rls.sql
→ marketplace_schema.sql                          ← chef_favorites + indexes
→ migrations/20260101000500_chef_onboarding.sql   ← pending on production
```

---

## 10. Schema drift & pending migration

The live project is **ahead** of the repo in some places and **behind** in
others. The app is written to work in both states:

- Already live on `bookings`: `service_format`, `sourcing_preference`,
  `preferred_stores`, `receipt_verified`, `cuisine_type`, `budget_per_person`,
  `assigned_at`, `dispatch_notes`.
- Still live-missing (migration `20260101000500_chef_onboarding.sql`):
  - `chef_applications`: `user_id`, `national_id_number`, `service_formats`,
    `service_areas`, `partner_type`, `review_notes`, `reviewed_by`,
    `reviewed_at`
  - `chefs`: `service_formats`, `allow_in_home`, `allow_delivery`,
    `national_id_number`, `profile_completion_percentage`, `approved_at`
  - `dispatch_log` table
  - self-service RLS policies for applicants
  - `user_id IS NULL → is_available=false` normalisation

Until that migration is applied:

- `runWithSchemaFallback` keeps writes working by dropping unknown columns.
- Vetting/service-format data is preserved in `chef_applications.portfolio_links`
  under `__bookachef_meta__:`.
- `dispatch_log` writes are skipped safely.

**Recommended deployment:**

1. Set `SUPABASE_SERVICE_ROLE_KEY` in the production environment (required for
   account creation, linking, and payment processing).
2. Apply the migration in the Supabase SQL editor.
3. Run a backfill: for every `chefs` row with `user_id IS NULL`, either link an
   account via the admin panel or set `is_available=false`.
4. Verify one end-to-end booking in staging, then promote.

---

## 11. Still manual (by design, for now)

- M-Pesa receipt reconciliation when Safaricom keys are absent (`manual_pending`).
- Refunds and dispute handling — handled by the concierge over WhatsApp.
- Payout scheduling to chefs — no automated payout run yet.
- Profile photo moderation.
