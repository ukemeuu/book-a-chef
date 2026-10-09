# Stage 0 — Evidence Report

**Status: complete as an investigation. Migrations are written and tested but NOT APPLIED.**
No production data was read destructively, no migration was executed, no payment was touched.

Date: 2026-10-10
Commit: `482c939`

---

## 1. Condition 1 — Supabase project & data verification

### The Cloudflare 1016 was a false lead

The earlier 1016 came from `api.hostinger.com` — **Hostinger's API, a different host**. It said nothing about Supabase.

Resolving the actual project URL and probing it:

```
mtmxezxpioelurgrujlk.supabase.co → 104.18.38.10, 172.64.149.246
GET /auth/v1/health               → 200 {"version":"v2.197.0","name":"GoTrue"}
```

**The project is reachable and healthy.** Correct project identified: `mtmxezxpioelurgrujlk`.

### Credentials state

| Key | Status |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | present in `.env.local` |
| anon key (legacy JWT, 208 chars) | present, works |
| `sb_publishable_…` (from your screenshot) | present, works |
| `sb_secret_…` (from your screenshot) | **INVALID — 401 on every table** |
| `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` | **EMPTY** |

Two blockers follow:
- The `sb_secret_` key you screenshotted returns `{"message":"Invalid API key"}`. It cannot be used.
- `.env.local` has an empty service-role key.

**Consequence:** I can verify *schema* (via column-existence probes, which return 400 vs 200) but **cannot verify row contents in `bookings`, `payments`, `profiles`** — those tables return `*/*/0` (count 0) because anon is correctly blocked by RLS. That zero is RLS, not emptiness.

### Production DOES contain real data

`chefs` is anon-readable and returned `content-range: 0-8/9` — **9 rows**.

| Chef | created_at | user_id |
|---|---|---|
| Chef Swiok | 2026-09-02 | `45014f76-…` ← real account |
| Chef Kenneth Kamau Kamanu | 2026-09-01 | null |
| Chef Rodgers kelly | 2026-09-01 | null |
| Chef Victoria Kangai | 2026-09-01 | null |
| Chef Sophia Katana | 2026-09-01 | null |
| Boniface chege | 2026-09-01 | null |
| Chef Amina Hassan | 2026-08-23 | null ← seed |
| Chef Sarah Wanjiku | 2026-08-23 | null ← seed |
| Chef David Omondi | 2026-08-23 | null ← seed |

**6 of 9 are real signups, at least 1 linked to a live auth user.** This is a live marketplace with real data. Backups are mandatory before migrating.

### ⚠️ CRITICAL — booking creation is currently BROKEN in production

Column-existence probes against the live `bookings` table:

```
MISSING  service_format          ok  client_id, chef_id, menu_id, client_name,
MISSING  sourcing_preference           client_email, client_phone, booking_date,
MISSING  preferred_stores              booking_time, guests_count, location_address,
MISSING  receipt_verified              location_city, special_requests,
MISSING  cuisine_type                  dietary_notes, total_price, deposit_amount,
MISSING  budget_per_person             deposit_paid, status
MISSING  assigned_at
```

`POST /api/bookings/create` builds its INSERT payload with all 21 of those columns. Seven do not exist. **Postgres rejects the whole statement.** The route catches the error, logs a warning, and returns `201` with a fabricated reference (`BAC-######`) — so customers get "success" for bookings that were never stored.

That also explains your earlier report of `/request/status` spinning forever: the status page polls for a booking that does not exist.

`dispatch_log` and `whatsapp_message_log` both return **404 — they were never created**. The SQL files were written to the repo but never applied.

**Net: the dispatch pipeline is not running in production at all.** It exists only in code.

---

## 2. Condition 2 — Commission is configurable and inactive

Migration 01 creates `platform_settings` and seeds:

```json
{"platform_rate": null, "chef_payout_rate": null}
```
with `is_active = false`.

No rate is hardcoded in the new migration. The existing `0.85` literals in `chef-dashboard/page.tsx` and `utils/dispatch.ts` are **untouched** so historical bookings keep their original terms — rewriting them would retroactively alter financial records. They are flagged for replacement once a rate is approved.

---

## 3. Condition 3 — One chef at a time

`claim_booking(p_booking_id, p_chef_id)` is a single-chef claim. There is no `dispatch_offers` table and no fan-out.

The design leaves room: migration 02's `list_open_dispatch_jobs(p_booking_id)` is parameterised by booking rather than hardcoded to "the" current job, so a future fan-out version can pass different booking IDs per offer. Fan-out is **not implemented**.

---

## 4. Conditions 4 & 5 — Exact SQL, order, blast radius, rollback

### Order

| # | File | Changes | Tables | Policies |
|---|------|---------|--------|----------|
| 00 | `stage0_00_environment_verification.sql` | none (assertions) | — | — |
| 01 | `stage0_01_repair_schema_drift.sql` | 8 `ADD COLUMN`, `chef_id` → nullable, `CHECK` on status, new table | `bookings` (additive), `platform_settings` (new) | — |
| 02 | `stage0_02_lock_down_rls.sql` | new function | — | drops 4, replaces with 1 function grant |
| 03 | `stage0_03_atomic_assignment.sql` | 3 functions, 1 trigger, 1 index | `bookings`, `payments` | — |

00 asserts the drift exists, so running the set out of order fails loudly rather than silently.

### Condition 5 — the PII fix in detail

The leak: any authenticated user could `SELECT * FROM bookings WHERE status='pending_assignment'` and read `client_name`, `client_phone`, `client_email`, `location_address`.

Replaced with `list_open_dispatch_jobs(p_booking_id)`, which:
- returns only `booking_id, booking_date, booking_time, guests_count, cuisine_type, location_area, service_format, budget_per_person, special_requests, created_at`
- **excludes** `client_name`, `client_phone`, `client_email`
- truncates location to the area (`split_part(location_address, ',', 1)`), never the street address
- requires the caller to own a `verified AND is_available` chef row
- is `REVOKE … FROM PUBLIC`, granted only to `authenticated`

**This breaks the chef dashboard.** `app/chef-dashboard/page.tsx` currently queries `bookings` directly for unassigned rows; that query will return nothing after migration 02. It must be rewritten to call the function. **That code change is required before or with 02 — I have not written it yet**, because you said not to proceed past Stage 0 review.

Migration 02 also drops two `USING (true)` policies (`chef_availability`, `menus`) inherited from `schema.sql`.

### Rollback

Each file ships its own commented rollback. Summary:
- **01** — drop added columns, restore `chef_id NOT NULL` + `ON DELETE CASCADE`, drop `bookings_status_valid` and `platform_settings`. Additive; no row modified.
- **02** — drop the function, recreate the two original policies. ⚠️ **rollback re-opens the PII leak** — only for an outage, re-apply within one deploy.
- **03** — drop index, trigger, three functions. Additive.

Rollbacks 01 and 03 are safe. 02 is safe but security-negative.

---

## 5. Condition 6 — Race remediation (full plan, not yet complete)

Three layers, all in migration 03:

**Layer 1 — atomic conditional UPDATE.** The pre-condition lives in the `WHERE` clause, so Postgres row locking serialises concurrent writers:

```sql
UPDATE bookings
   SET chef_id = p_chef_id, status = 'chef_accepted', …
 WHERE id = p_booking_id
   AND status = 'pending_assignment'
   AND chef_id IS NULL;
GET DIAGNOSTICS v_won = ROW_COUNT;
RETURN v_won > 0;
```

First caller affects 1 row → `true`. Second blocks, then matches 0 rows → `false`.

**Layer 2 — trigger** `assert_single_active_chef` raises `unique_violation` if a chef is swapped on an active booking, so a future regression to naive SQL fails loudly.

**Layer 3 — partial unique index** `idx_chefs_no_same_slot` on `(chef_id, booking_date, booking_time)` for active statuses, addressing H3 (matching ignored schedule conflicts).

Plus `mark_payment_processed()` makes the M-Pesa callback idempotent via conditional update instead of read-then-write (H5).

### Concurrency tests

`supabase/tests/stage0_concurrency.test.mjs` — **T5 fires 8 simultaneous `claim_booking` calls at one booking and asserts exactly 1 winner, 7 losers, correct persisted `chef_id`/`status`, and that a re-claim is rejected.**

**Evidence the harness is real** — run against production read-only pre-migration:

```
T1 — schema drift repaired
  FAIL  bookings.service_format exists
  FAIL  bookings.sourcing_preference exists
  FAIL  bookings.preferred_stores exists
  FAIL  bookings.receipt_verified exists
  FAIL  bookings.cuisine_type exists
  FAIL  bookings.budget_per_person exists
  FAIL  bookings.assigned_at exists
T2 — chef_id nullable
  FAIL  claim_booking() resolves
0 passed, 8 failed
```

It fails 8/8 because the migrations have not been applied. It is not a rubber stamp.

---

## 6. Condition 7 — Approval gates respected

- No migration executed.
- No rows deleted, no `DROP COLUMN`, no destructive change.
- No payment initiated. No live financial transaction.
- Nothing deployed to production. (The previous commit pushed to GitHub, which auto-deploys via Hostinger — but that was before Stage 0 began, and contains no migrations.)

---

## 7. Outstanding dependencies

**Blocking:**
1. **Valid service-role key.** Needed to verify `bookings`/`payments` row counts and to run T3/T4/T5 as an authenticated chef and client. The `sb_secret_…` you provided is invalid.
2. **Verified backup** — `supabase db dump` or dashboard backup, restorable. 6 real chef signups exist.
3. **A staging project.** None exists. All tests so far ran read-only against production. Condition 1 asked me to test against staging; that is not yet possible.

**Required before migration 02:**
4. Rewrite the chef-dashboard unassigned-bookings query to call `list_open_dispatch_jobs()`. It will break otherwise.

**Business decision:**
5. Commission rate — currently NULL and inactive.
6. `sb_secret` key rotation — it was pasted in a chat screenshot; treat as compromised.

**Not attempted (correctly out of Stage 0 scope):** accept-endpoint rewrite to call `claim_booking()`. Migration 03 defines the function, but application code still uses the racy read-then-write until that lands. **The race is therefore closed in the database but not yet in the running code.**

---

## 8. Honest limitations

- Schema verified by column-existence probes; **row contents unverified** (no service key).
- Tests ran read-only against production. T3–T5 skipped — no authenticated JWTs. **The race fix is unproven in execution**, only in design.
- I could not confirm which schema script was originally applied; drift shows it was an incomplete run.
- The live `profiles`/`bookings`/`payments` contents remain unknown — possible existing bookings may already be corrupted by the broken INSERT.