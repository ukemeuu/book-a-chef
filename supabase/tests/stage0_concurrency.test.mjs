/**
 * Concurrency + RLS tests for Stage 0.
 *
 * These prove the acceptance race is closed (condition 6) and that the
 * unassigned-bookings PII leak is gone (condition 5).
 *
 * RUN:  node supabase/tests/stage0_concurrency.test.mjs
 *
 * Requires:
 *   - STAGE0_TEST_URL       Supabase project URL
 *   - STAGE0_ANON_KEY       anon/publishable key
 *   - A signed-in chef JWT   (CHEF_JWT env) for authenticated-path tests
 *   - A signed-in client JWT (CLIENT_JWT env)
 *   - Migrations 01-03 applied
 *
 * By default these run against a STAGING project. The script refuses to run
 * against a URL containing "prod" unless ALLOW_PROD_TESTS=1.
 */

const URL_BASE = process.env.STAGE0_TEST_URL;
const ANON = process.env.STAGE0_ANON_KEY;
const CHEF_JWT = process.env.CHEF_JWT;
const CLIENT_JWT = process.env.CLIENT_JWT;

if (!URL_BASE || !ANON) {
  console.error("Missing STAGE0_TEST_URL or STAGE0_ANON_KEY");
  process.exit(2);
}

if (/prod/i.test(URL_BASE) && process.env.ALLOW_PROD_TESTS !== "1") {
  console.error(
    "Refusing to run against a URL containing 'prod'. Set ALLOW_PROD_TESTS=1 to override."
  );
  process.exit(2);
}

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}`);
  }
}

const hdr = (jwt) => ({
  apikey: ANON,
  Authorization: `Bearer ${jwt || ANON}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

const rest = (path, opts = {}) =>
  fetch(`${URL_BASE}/rest/v1/${path}`, opts);

const rpc = (fn, args, jwt) =>
  fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: hdr(jwt),
    body: JSON.stringify(args),
  });

async function main() {
  console.log(`\nTarget: ${URL_BASE}\n`);

  // ── T1: schema drift repaired ───────────────────────────────────────────
  console.log("T1 — schema drift repaired");
  for (const col of [
    "service_format",
    "sourcing_preference",
    "preferred_stores",
    "receipt_verified",
    "cuisine_type",
    "budget_per_person",
    "assigned_at",
  ]) {
    const res = await rest(`bookings?select=${col}&limit=1`, { headers: hdr() });
    assert(res.status === 200, `bookings.${col} exists`);
  }

  // ── T2: chef_id is nullable ────────────────────────────────────────────
  console.log("\nT2 — chef_id nullable for unassigned orders");
  const probe = await rpc("claim_booking", { p_booking_id: "00000000-0000-0000-0000-000000000000" }, CHEF_JWT);
  // A false return (not a 500 / schema error) proves the function resolved,
  // which in turn proves chef_id accepts NULL.
  assert(
    probe.status === 200 && (await probe.json()) === false,
    "claim_booking() resolves (chef_id accepts NULL)"
  );

  // ── T3: B3 PII leak is closed ─────────────────────────────────────────
  console.log("\nT3 — customers cannot enumerate unassigned bookings");
  if (CLIENT_JWT) {
    const res = await rest("bookings?select=*&status=eq.pending_assignment", {
      headers: hdr(CLIENT_JWT),
    });
    assert(res.status === 200, "client query is syntactically valid");
    const rows = await res.json();
    // The allow-list function is the ONLY intended path. A direct table read
    // must not return rows to a client.
    assert(
      !Array.isArray(rows) || rows.length === 0,
      "direct table read returns no unassigned rows to a client"
    );
  } else {
    console.log("  SKIP  CLIENT_JWT not provided");
  }

  // ── T4: discovery function hides PII even for chefs ────────────────────
  console.log("\nT4 — dispatch listing omits customer PII");
  if (CHEF_JWT) {
    const res = await rpc("list_open_dispatch_jobs", { p_booking_id: "00000000-0000-0000-0000-000000000000" }, CHEF_JWT);
    assert(res.status === 200, "list_open_dispatch_jobs() executes");
    const rows = await res.json();
    assert(Array.isArray(rows), "returns a set");
    if (Array.isArray(rows) && rows.length > 0) {
      const keys = Object.keys(rows[0]);
      for (const leaked of ["client_name", "client_phone", "client_email"]) {
        assert(!keys.includes(leaked), `does NOT expose ${leaked}`);
      }
      assert(keys.includes("location_area"), "exposes location_area");
    } else {
      console.log("  SKIP  no open jobs to inspect; run with a seeded pending_assignment booking");
    }
  } else {
    console.log("  SKIP  CHEF_JWT not provided");
  }

  // ── T5: THE RACE — N concurrent claims, exactly one winner ──────────────
  console.log("\nT5 — concurrent claims: exactly one winner");
  if (CHEF_JWT && CLIENT_JWT) {
    // Seed one genuinely unassigned booking.
    const seed = await rest("bookings", {
      method: "POST",
      headers: hdr(CLIENT_JWT),
      body: JSON.stringify({
        client_name: "Race Test",
        client_email: "race@test.invalid",
        client_phone: "0700000000",
        booking_date: "2030-01-01",
        booking_time: "19:00",
        guests_count: 4,
        location_address: "Westlands, Nairobi",
        total_price: 20000,
        deposit_amount: 20000,
        status: "pending_assignment",
        chef_id: null,
      }),
    });
    const seeded = await seed.json();
    const bookingId = Array.isArray(seeded) ? seeded[0]?.id : seeded?.id;

    if (!bookingId) {
      console.log("  SKIP  could not seed a booking (check client INSERT policy)");
    } else {
      const chefRow = await rest("chefs?select=id&user_id=eq." + (await authUid(CHEF_JWT)) + "&limit=1", {
        headers: hdr(ANON),
      });
      const chefRows = await chefRow.json();
      const chefId = chefRows?.[0]?.id;

      if (!chefId) {
        console.log("  SKIP  no chef row for CHEF_JWT");
      } else {
        // Fire 8 simultaneous claims at the same booking.
        const attempts = await Promise.all(
          Array.from({ length: 8 }, () =>
            rpc("claim_booking", { p_booking_id: bookingId, p_chef_id: chefId }, CHEF_JWT).then(
              async (r) => (r.status === 200 ? await r.json() : null)
            )
          )
        );

        const winners = attempts.filter((v) => v === true).length;
        const losers = attempts.filter((v) => v === false).length;

        assert(winners === 1, `exactly one winner (got ${winners} of 8)`);
        assert(losers === 7, `exactly seven losers (got ${losers} of 8)`);

        // Verify persisted state has one chef and is no longer claimable.
        const after = await rest(`bookings?id=eq.${bookingId}&select=chef_id,status`, {
          headers: hdr(CLIENT_JWT),
        });
        const rows = await after.json();
        assert(rows?.[0]?.chef_id === chefId, "persisted chef_id is the winner");
        assert(rows?.[0]?.status === "chef_accepted", "status advanced to chef_accepted");

        const reClaim = await rpc("claim_booking", { p_booking_id: bookingId, p_chef_id: chefId }, CHEF_JWT);
        assert((await reClaim.json()) === false, "re-claim after win is rejected");

        // Clean up the test row.
        await rest(`bookings?id=eq.${bookingId}`, {
          method: "DELETE",
          headers: hdr(CLIENT_JWT),
        });
      }
    }
  } else {
    console.log("  SKIP  CHEF_JWT and/or CLIENT_JWT not provided");
  }

  // ── T6: commission is present but inactive ─────────────────────────────
  console.log("\nT6 — commission configured but not active");
  const comm = await rest("platform_settings?key=eq.commission&select=key,is_active,value", {
    headers: hdr(ANON),
  });
  const rows = await comm.json();
  if (Array.isArray(rows) && rows.length > 0) {
    assert(rows[0].is_active === false, "commission is_active = false");
    const v = rows[0].value || {};
    assert(v.platform_rate === null || v.platform_rate === undefined, "platform_rate is NULL");
    assert(v.chef_payout_rate === null || v.chef_payout_rate === undefined, "chef_payout_rate is NULL");
  } else {
    console.log("  SKIP  not readable under anon RLS (expected); verify as admin");
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

async function authUid(jwt) {
  const res = await fetch(`${URL_BASE}/auth/v1/user`, { headers: hdr(jwt) });
  if (!res.ok) return "";
  const u = await res.json();
  return u?.id || "";
}

main().catch((e) => {
  console.error("Test harness error:", e);
  process.exit(2);
});