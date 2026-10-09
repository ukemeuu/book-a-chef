-- ============================================================================
-- 20260101000000_stage0_00_environment_verification.sql
-- STATUS: NOT APPLIED — awaiting approval. See STAGE0_EVIDENCE.md
-- Purpose: Pre-flight assertions only. Safe to run. Changes nothing.
-- ============================================================================

-- Assert the live schema matches what the application code expects.
-- Any assertion failure means DO NOT run migrations 01-04.

DO $$
DECLARE
  missing text[] := '{}';
BEGIN
  -- Columns written by POST /api/bookings/create
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='bookings' AND column_name='service_format')
    THEN missing := missing || 'bookings.service_format'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='bookings' AND column_name='sourcing_preference')
    THEN missing := missing || 'bookings.sourcing_preference'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='bookings' AND column_name='preferred_stores')
    THEN missing := missing || 'bookings.preferred_stores'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='bookings' AND column_name='receipt_verified')
    THEN missing := missing || 'bookings.receipt_verified'; END IF;

  -- Columns read by utils/dispatch.ts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='bookings' AND column_name='cuisine_type')
    THEN missing := missing || 'bookings.cuisine_type'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='bookings' AND column_name='budget_per_person')
    THEN missing := missing || 'bookings.budget_per_person'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='bookings' AND column_name='assigned_at')
    THEN missing := missing || 'bookings.assigned_at'; END IF;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION
      'SCHEMA DRIFT DETECTED. Missing columns: %. Migration 01 will repair these. Stop and review before proceeding.',
      array_to_string(missing, ', ');
  END IF;

  RAISE NOTICE 'Environment verification PASSED — no drift detected.';
END $$;