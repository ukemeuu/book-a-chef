# Phase 1 — Audit & Migration Plan

Status: **audit complete**. No production code changed in this phase.

Scope: read-only inspection of the repository. Findings marked **BLOCKER** must be
fixed before any order-first work is built on top, because they undermine the
dispatch guarantees the new product depends on.

---

## 1. What exists today

| Layer | Implementation | Notes |
|---|---|---|
| Framework | Next.js 14.2.35 App Router, React 18, Tailwind 3.4 | `tsconfig` has `strict: false` |
| Auth | Supabase Auth, cookie-based via `@supabase/ssr` | Roles in `profiles.role` (`client`/`chef`/`admin`) |
| Route guard | `middleware.ts` on `/admin`, `/chef-dashboard`, `/dashboard`, `/login` | Public routes unguarded |
| DB | Postgres via Supabase | 7 SQL files, **no migration runner** |
| Payments | M-Pesa Daraja STK Push | Sandbox; credentials absent |
| Notifications | Resend (email) — defined but **zero call sites** | `sendEmail()` is dead code |
| WhatsApp | Meta Cloud API client built this session | Awaiting credentials + approved templates |
| Tests | **None.** No CI, no lint config | `next lint` prompts interactively |

### Booking state machine as actually written

`schema.sql` declares `bookings.status` as **TEXT**, but
`schema_v2_production.sql` defines a **`booking_status` ENUM**. Only the enum
lists `pending_assignment`; the TEXT column has no such constraint. Production
behaviour therefore depends on which script was actually applied — unverifiable
from the repo.

Statuses observed in code: `pending`, `pending_assignment`, `assigned`,
`chef_accepted`, `payment_pending`, `confirmed`, `in_progress`, `completed`,
`declined`, `cancelled_by_customer`, `cancelled_by_chef`, `expired`, `refunded`,
`disputed`.

---

## 2. BLOCKER findings

### B1 — Race condition allows two chefs to claim one booking
`app/api/bookings/[id]/accept/route.ts:90`

```ts
await supabase.from("bookings").update(updatePayload).eq("id", bookingId);
```

The update filters on `id` **only**. The status check that precedes it
(`booking.status !== "pending_assignment"`) runs on a value read earlier. Two
chefs calling this concurrently both read `pending_assignment`, both pass the
guard, both write. Last writer wins; the first chef is silently discarded and
never learns they were displaced.

The existing `idx_bookings_no_double_book` unique index does **not** prevent
this — it is keyed on `(chef_id, booking_date, booking_time)` and both writes
use different `chef_id` values.

### B2 — Same gap in the auto-assign path
`utils/dispatch.ts` reads the booking, scores candidates, then writes
`status = 'assigned'` filtered on `id` only. Same interleaving risk against a
concurrent chef claim and against admin override.

### B3 — Customer PII exposed to unauthenticated-equivalent readers
`supabase/concierge_inquiries_rls.sql:25` grants SELECT when
`status = 'pending_assignment' AND chef_id IS NULL` — to **any** authenticated
role, not just chefs. A signed-in customer can enumerate every unassigned
booking and read `client_name`, `client_phone`, `client_email`,
`location_address`. The chef dashboard relies on exactly this policy.

### B4 — `is_admin()` is `SECURITY DEFINER` without `search_path` pinning
`supabase/schema.sql:456`. An attacker who can create objects in a referenced
schema could shadow `profiles` and self-promote to `admin`. Low likelihood,
high blast radius — this function gates every admin read and write policy.

### B5 — Dead notification path
`utils/notifications.ts` `sendEmail()` has no call sites. Nothing emails
customers at any booking transition. The templates are written and unused.

---

## 3. HIGH findings

- **H1** — No migration runner. Seven overlapping SQL files, no ordering
  guarantee, `IF EXISTS` throughout. Applying them twice is not safe and
  applying them in the wrong order silently no-ops. Blocks every schema change
  below.
- **H2** — `dispatch_log` is an append-only audit trail, **not** an offer
  table. It has no `status`, `expires_at`, or `responded_at`. It cannot express
  "offered to 3 chefs, 2 declined, 1 accepted", which the dispatch lifecycle
  requires.
- **H3** — Matching scores cuisine/location/budget/rating but **ignores
  availability conflicts entirely**. `chef_availability` is fetched and
  `working_days` scored, but no check against existing bookings for that
  chef/date. A chef can be matched to two simultaneous events.
- **H4** — `total_price` and `deposit_amount` are computed **client-side** in
  the booking form and trusted server-side. `bookings/create` recomputes from
  `chef.price_per_guest`, but when `chef_id` is null it falls back to the
  client-supplied `budget_per_person`. Trivially manipulable.
- **H5** — Payment callback is idempotent on `mpesa_checkout_request_id` but
  the idempotency check is a read-then-write, not a conditional update. Two
  concurrent callbacks can both pass.
- **H6** — `bookings.chef_id` is `ON DELETE CASCADE` in all schema files. Deleting
  a chef silently deletes their bookings, payouts and history. Dangerous for a
  marketplace with financial records.
- **H7** — No quote object. The dispatch flow goes request → assigned →
  accepted → paid. No place to represent a price the chef proposes that the
  customer must approve (Mode B requirement).

---

## 4. MEDIUM findings

- **M1** — Public `/chefs` was replaced with a redirect to `/request`, and
  `app/chef/[id]/` was deleted. This **breaks indexed URLs and SEO** the brief
  explicitly asked to preserve. Restoration is required.
- **M2** — Rating has no provenance guard. `rating`/`reviews_count` on `chefs`
  are settable by anyone with profile update access; the readiness calc reads
  them.
- **M3** — Availability is `working_days INT[]` + a coarse window. Cannot
  express a real booked-out slot, so "available" is unverifiable.
- **M4** — No `CHECK` constraint on `status`. Any string is accepted; the enum
  and the TEXT column disagree.
- **M5** — Commissions (15%) and chef payout (85%) are literals scattered across
  UI and API code. Not configurable, and not agreed commercially.
- **M6** — Booking status history trigger writes `to_status`/`from_status` as
  TEXT with no actor for system transitions.
- **M7** — Zero test coverage. Every concurrency and authorisation claim in
  this document is currently unverified by execution.

---

## 5. Reusable assets (do not rebuild)

| Asset | Status |
|---|---|
| Supabase auth + cookie handling | Working. Reuse. |
| `chef_availability`, `chefs`, `menus`, `profiles`, `reviews` | Working. Reuse. |
| `bookings` table + status history trigger | Working, needs constraint work. |
| M-Pesa STK Push + callback parsing | Working (sandbox). Reuse, harden callback. |
| `booking_status_history` | Working audit trail. Extend with actor. |
| `audit_logs` | Working. Reuse for admin interventions. |
| `whatsapp_message_log` + retry endpoint | Built this session. Reuse. |
| `profileReadiness` 97% gate | Working. Reuse for chef go-live. |
| Cancellation policy engine (`cancel/route.ts`) | Working refund tiers. Reuse. |
| `INITIAL_CHEFS` fallback catalog | Keep — masks empty DB states. |

---

## 6. Migration plan — minimal-risk path

Deliberately **not** the 7-phase build in the brief. This gets the smallest
reliable version working first, as instructed.

### Stage 0 — Make the database trustworthy (prerequisite, do first)
1. Adopt a migration runner (Supabase CLI `supabase/migrations/`). Snapshot
   current schema before touching anything.
2. Resolve `status` TEXT-vs-ENUM: **keep TEXT**, add a `CHECK` constraint
   listing valid states. Avoids a risky enum migration.
3. Fix `is_admin()`: add `SET search_path = public`.
4. Tighten the unassigned-bookings SELECT policy to `chef` role only.
5. Change `bookings.chef_id` to `ON DELETE SET NULL`.

*Rollback:* all additive or policy-only. No data loss.

### Stage 1 — Close the dispatch race
6. Add partial unique index guaranteeing one active assignee:
   `CREATE UNIQUE INDEX ON bookings (id) WHERE status IN ('pending_assignment','assigned','chef_accepted')` — via a dedicated `active_assignment` guard table or conditional update.
7. Rewrite accept as a **conditional update**: `.eq("id", id).eq("status","pending_assignment").is("chef_id", null)` and assert exactly one row returned. Zero rows = someone else won → 409, not a silent overwrite.
8. Same pattern in `utils/dispatch.ts`.
9. Harden the M-Pesa callback to a conditional update on `callback_processed = false`.

*Rollback:* index can be dropped; endpoints revert independently.

### Stage 2 — Server-authoritative pricing
10. Move all price computation server-side. Reject or ignore client totals.
11. Centralise commission/payout in one config constant — flagged for commercial sign-off, not hardcoded further.

### Stage 3 — Introduce the offer lifecycle (H2, H7)
12. New `dispatch_offers` table: `booking_id`, `chef_id`, `status`, `expires_at`, `responded_at`, `offer_rank`. Plus `quotes` table for Mode B (`booking_id`, `version`, `amount`, `status`, `accepted_at`).
13. Dispatch writes offers instead of assigning directly. First-accept-wins, documented expiry, reassignment on decline.

### Stage 4 — Restore public profiles + SEO (M1)
14. Recreate `app/chef/[id]/page.tsx` as real indexable content with `generateMetadata`, canonical URLs, JSON-LD `Person`/`LocalBusiness`. Directory becomes secondary discovery, not the primary journey — per the brief.
15. Keep `/chefs` as a real page (not a redirect).

### Stage 5 — Tests before further build
16. Cover the B1–B5 blockers and H4/H5. Concurrency test must fire parallel accepts and assert exactly one winner.

---

## 7. Open questions — need your decision

These are business rules I will **not** invent:

1. **Commission rate.** 15% / 85% appears in code but was never commercially
   agreed. Confirm or replace.
2. **Deposit vs full payment.** Code treats the culinary fee as 100% due upfront
   ("Culinary Fee (Paid in Full)"). Confirm this is the intended model.
3. **Instant-book eligibility (Mode A).** Which packages qualify for automatic
   confirmation without chef acceptance? None are currently defined.
4. **Offer fan-out policy.** Offer to 1 chef, or a small group? Uber offers to
   several. Affects dispatch_offers design and double-claim handling.
5. **Recurring scope (Mode C).** Multiple dates, recurring schedules — needed
   before `bookings` can model them, or a separate table?
6. **Chef payout settlement.** M-Pesa B2B paybill to chefs is not built. Do
   payouts stay manual (as now) or is that in scope?
7. **Existing live data.** Is the production DB already populated? That
   determines whether Stage 0 can snapshot safely.

---

## 8. Honest limitations of this audit

- I inspected **repository code only**. I could not query the live Supabase
  project — the API returned Cloudflare error 1016 earlier in this session. So
  which schema was actually applied, and whether data exists, is **unknown**.
  Items H1/M4 and question 7 depend on that.
- No tests exist, so no finding here is machine-verified.
- Booking volume and chef count are unknown, which affects whether
  fan-out dispatch is even needed at launch.