# Stage 0 Runbook — Supabase Operations

Ordered steps to unblock the staged migration. **Nothing here has been applied to
production.** Do not skip ahead — each step depends on the previous one.

Why the order matters: the service-role key unblocks *verification*. Verification
informs the backup, the backup makes staging safe, staging proves the migrations,
and only then does production change.

---

## Step 1 — Create a service-role (secret) key

**This is the only step that needs you in the Dashboard. I cannot do it.**

Supabase deprecated the `anon` / `service_role` JWTs at end of 2026 in favour of
`sb_publishable_` and `sb_secret_` keys. Both systems work until you disable the
legacy ones.

1. Open the Dashboard → select project **Book A Chef** (`mtmxezxpioelurgrujlk`)
2. **Project Settings → API Keys**
   *(there is no separate "Settings → API" page any more — API Keys replaced it)*
3. **Create new secret key** → name it something like `stage0-migration`
4. Copy the value. It appears **once** — if you lose it, delete and re-create.

### Then put it in `.env.local`

```bash
SUPABASE_SERVICE_ROLE_KEY=sb_secret_<the new value>
```

Keep it **unprefixed**. A `NEXT_PUBLIC_` prefix ships it to the browser.

### Verify it works

```bash
KEY=sb_secret_<value>
curl -s "https://mtmxezxpioelurgrujlk.supabase.co/rest/v1/chefs?select=id&limit=3" \
  -H "apikey: $KEY"
```

Expect a JSON array of chef IDs. If you get
`{"message":"Invalid API key"}` the value is wrong or not yet active.

**Note:** send secret keys on the `apikey` header. They are not JWTs, so
`Authorization: Bearer` is the wrong header and will fail misleadingly.

### About the key in our notes

`sb_secret_gCBL7UoVDDwuFfGIfIy1tA_3XWHHj8x4` returns
`{"message":"Invalid API key"}` on every table. It is dead — rotated or revoked.

**Treat it as compromised regardless.** It was pasted into a shared AI
conversation. After creating the new key, delete the old one from the same
API Keys page. Deleting a secret key is irreversible, so confirm the new key is
deployed first (steps 4–6 below).

---

## Step 2 — Verify production state (I can do this)

Once the key works I can finally answer the open questions:

- Do the 7 columns really exist in `bookings`?
  (`service_format`, `sourcing_preference`, `preferred_stores`,
  `receipt_verified`, `cuisine_type`, `budget_per_person`, `assigned_at`)
- How many real bookings and chefs exist?
- Does `dispatch_log` exist? (I expect not — it 404s today)

**Do not apply any migration before this step reports back.**

---

## Step 3 — Take a verified backup

Two layers. You want both.

### 3a. Point-in-time recovery (safety net)

**Database → Backups** in the Dashboard. Confirm:

- PITR is enabled, and
- the retention window matches how long you can tolerate losing writes.

Check how far back you can restore. This is your "something went badly wrong"
undo button.

### 3b. Logical dump (portable, restorable)

Connection string: **Project Settings → Database → Connection string** → copy the
**direct** connection string (not the pooler one), then:

```bash
# Find your Postgres password: Dashboard → Authentication → Users → your user → Reset
pg_dump "$PROD_DATABASE_URL" \
  --format=custom \
  --file=prod-backup-$(date +%Y%m%d-%H%M).dump
```

Store it **outside** this repo — it contains real customer PII.

**Verified** means you have restored it and queried it:

```bash
createdb prod_restore_test
pg_restore -d prod_restore_test prod-backup-<timestamp>.dump
psql prod_restore_test -c "\dt"                 # tables present?
psql prod_restore_test -c "SELECT count(*) FROM bookings;"
psql prod_restore_test -c "SELECT count(*) FROM chefs;"
```

An untested backup is a hope, not a backup. The row counts must match production.

---

## Step 4 — Create the staging project

1. Dashboard → **New project**
2. Name: `book-a-chef-staging`
3. Strong database password, **different region is fine** (not required)
4. Wait for provisioning
5. Note its URL and create a secret key there too

Do **not** copy production data into staging wholesale. Seed only what the
migration tests need — see `supabase/tests/`. Real customer PII in a second
project is more exposure, not less.

---

## Step 5 — Apply migrations to staging

Order is fixed. `00` asserts the environment and fails loudly if run out of
order — that is intentional, do not skip it.

```bash
# Link and push, or paste each file into Dashboard → SQL Editor in order:
#   20260101000000_stage0_00_environment_verification.sql
#   20260101000100_stage0_01_repair_schema_drift.sql
#   20260101000200_stage0_02_lock_down_rls.sql
#   20260101000300_stage0_03_atomic_assignment.sql
```

Expected on staging: `00` may report drift (that is what it is for). `01`–`03`
should all succeed.

---

## Step 6 — Run the concurrency tests against staging

```bash
export STAGE0_TEST_URL="https://<staging-ref>.supabase.co"
export STAGE0_ANON_KEY="<staging publishable key>"
export CHEF_JWT="<sign in as a chef, copy access_token>"
export CLIENT_JWT="<sign in as a customer, copy access_token>"

node supabase/tests/stage0_concurrency.test.mjs
```

The suite refuses to run against production unless `ALLOW_PROD_TESTS=1` is set
explicitently. **Leave it unset.**

T3–T5 skip silently without the JWTs. That means **a green run without JWTs
proves nothing** about the race fix — check you actually have 8/8 executing, not
8/8 skipped.

Get the JWTs from the browser: sign in → DevTools → Application → Local Storage
→ Supabase session → `access_token`.

---

## Step 7 — Apply to production

Only after 2, 3, and 6 all pass. Apply `00` → `01` first and stop.

**`01` alone fixes booking creation**, which is currently broken — the insert
fails on 7 missing columns and the route returns a fabricated success. That is
the revenue-blocking bug and it needs no waiting on the rest.

Then `02` and `03` in a separate, later deploy.

---

## Rollback

Each migration has its rollback in a trailing comment block.

**Warning on `02`:** its rollback re-opens the PII leak and restores the job
board. Only use it to clear a hard outage, then re-apply within one deploy
cycle. Never roll it back for convenience.

---

## What I will not do without explicit approval

- Apply any migration to production
- Deploy to production
- Touch payments
- Delete or modify customer records
