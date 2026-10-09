-- ============================================================================
-- 20260101000300_stage0_03_atomic_assignment.sql
-- STATUS: NOT APPLIED — awaiting approval. See STAGE0_EVIDENCE.md §3 for exact SQL.
--
-- WHY: B1 (critical). Two chefs can claim one booking concurrently because the
--      current accept path does read-then-write filtered on id only. Both
--      writers pass the guard and both succeed; last write wins silently.
--
-- DESIGN: A conditional UPDATE whose WHERE clause encodes the pre-condition.
--          Postgres row locking guarantees exactly one UPDATE affects a row
--          when the same row is targeted concurrently, so the loser gets
--          zero rows back and can be told "already taken".
--
--          No triggers, no SELECT-then-UPDATE in application code.
-- ============================================================================

BEGIN;

-- ── 1. Core atomic claim ──────────────────────────────────────────────────
-- Returns TRUE only for the single caller that won the race.
CREATE OR REPLACE FUNCTION public.claim_booking(p_booking_id UUID, p_chef_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_won BOOLEAN := false;
BEGIN
  -- Conditional update IS the lock. A second concurrent caller blocks here
  -- until the first commits, then matches zero rows because the predicate
  -- no longer holds.
  UPDATE public.bookings
     SET chef_id         = p_chef_id,
         status          = 'chef_accepted',
         chef_response_at = TIMEZONE('utc', NOW()),
         assigned_at     = TIMEZONE('utc', NOW()),
         updated_at      = TIMEZONE('utc', NOW())
   WHERE id          = p_booking_id
     AND status      = 'pending_assignment'
     AND chef_id IS NULL;

  GET DIAGNOSTICS v_won = ROW_COUNT;
  RETURN v_won > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_booking(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_booking(UUID, UUID) TO authenticated;

-- ── 2. Database-level guard against two active assignees ───────────────────
-- Defence in depth: even if application code regresses to a naive UPDATE,
-- this constraint makes a duplicate active assignment physically impossible.
CREATE OR REPLACE FUNCTION public.assert_single_active_chef()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.chef_id IS NOT NULL
     AND NEW.status IN ('pending','assigned','chef_accepted','payment_pending','confirmed','en_route','in_progress')
     AND OLD.chef_id IS DISTINCT FROM NEW.chef_id THEN
    RAISE EXCEPTION
      'Concurrent assignment blocked: booking % already has an active chef.', NEW.id
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_active_chef ON public.bookings;
CREATE TRIGGER trg_single_active_chef
  BEFORE UPDATE OF chef_id, status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.assert_single_active_chef();

-- ── 3. Chef cannot hold two bookings on the same date/time ─────────────────
-- H3: matching currently ignores schedule conflicts. The existing index in
-- schema.sql predates nullable chef_id and does not cover this.
CREATE UNIQUE INDEX IF NOT EXISTS idx_chefs_no_same_slot
  ON public.bookings (chef_id, booking_date, booking_time)
  WHERE chef_id IS NOT NULL
    AND status IN ('assigned','chef_accepted','payment_pending','confirmed','en_route','in_progress');

-- ── 4. Idempotent payment callback ────────────────────────────────────────
-- H5: the callback's idempotency check is read-then-write. Make the transition
--      conditional so duplicate Safaricom callbacks cannot double-apply.
CREATE OR REPLACE FUNCTION public.mark_payment_processed(
  p_checkout_request_id TEXT,
  p_status             TEXT,
  p_receipt            TEXT,
  p_transaction_date   TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_won BOOLEAN := false;
BEGIN
  UPDATE public.payments
     SET callback_processed  = true,
         callback_received_at = TIMEZONE('utc', NOW()),
         status              = p_status::payment_status,
         mpesa_receipt_number   = COALESCE(p_receipt, mpesa_receipt_number),
         mpesa_transaction_date = COALESCE(p_transaction_date, mpesa_transaction_date),
         updated_at          = TIMEZONE('utc', NOW())
   WHERE mpesa_checkout_request_id = p_checkout_request_id
     AND callback_processed = false;

  GET DIAGNOSTICS v_won = ROW_COUNT;
  RETURN v_won > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_payment_processed(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_payment_processed(TEXT, TEXT, TEXT, TEXT)
  TO service_role;

COMMIT;

-- ── ROLLBACK ───────────────────────────────────────────────────────────────
-- BEGIN;
--   DROP INDEX IF EXISTS public.idx_chefs_no_same_slot;
--   DROP TRIGGER IF EXISTS trg_single_active_chef ON public.bookings;
--   DROP FUNCTION IF EXISTS public.assert_single_active_chef();
--   DROP FUNCTION IF EXISTS public.claim_booking(UUID, UUID);
--   DROP FUNCTION IF EXISTS public.mark_payment_processed(TEXT, TEXT, TEXT, TEXT);
-- COMMIT;
-- All four are additive; dropping them restores prior behaviour with no data
-- loss. Existing rows are untouched.