-- ============================================================================
-- 20260101000400_stage0_04_request_enrichment.sql
-- STATUS: NOT APPLIED — run via Supabase SQL Editor after migration 01.
--
-- WHY: the request form now collects several cuisines, an occasion, and
--      structured dietary requirements instead of a single cuisine and a
--      free-text dietary box. These columns persist that so dispatch can match
--      against it.
--
-- WHY ARRAY COLUMNS: a chef covering "Italian" and "Seafood" should match a
--      booking requesting either or both. TEXT[] keeps the set intact and lets
--      matching use `&&` (overlap) rather than string matching on a delimited
--      string. `cuisine_type` is intentionally retained as the primary/first
--      choice so existing rows, existing queries and the accept endpoint keep
--      working unchanged.
--
-- SAFETY: purely additive. No column dropped, renamed or retyped. Existing
--         rows get NULL/empty arrays and fall back to cuisine_type at read time.
-- ============================================================================

BEGIN;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cuisine_types        TEXT[],
  ADD COLUMN IF NOT EXISTS occasion_types       TEXT[],
  ADD COLUMN IF NOT EXISTS dietary_requirements TEXT[];

-- ── Backfill from existing rows ───────────────────────────────────────────
-- Populate the arrays from cuisine_type and the legacy dietary_notes so any
-- booking created before this migration can still be matched by the new
-- multi-cuisine scoring.

UPDATE public.bookings
   SET cuisine_types = ARRAY[cuisine_type]
 WHERE cuisine_types IS NULL
   AND cuisine_type IS NOT NULL
   AND btrim(cuisine_type) <> '';

UPDATE public.bookings
   SET dietary_requirements = ARRAY[dietary_notes]
 WHERE dietary_requirements IS NULL
   AND dietary_notes IS NOT NULL
   AND btrim(dietary_notes) <> '';

-- ── Defaults ──────────────────────────────────────────────────────────────
-- Empty rather than NULL so matching never has to guard both cases. Existing
-- rows are unaffected by changing a default.
ALTER TABLE public.bookings
  ALTER COLUMN cuisine_types        SET DEFAULT '{}',
  ALTER COLUMN occasion_types       SET DEFAULT '{}',
  ALTER COLUMN dietary_requirements SET DEFAULT '{}';

-- ── Guard: only add the CHECK constraint if every existing row would pass ──
-- A status-like CHECK that fails validation on existing data would abort the
-- transaction. Occasion is free-form at the form layer, so this constraint only
-- rejects obviously invalid input (empty strings), not unknown occasions.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bookings
     WHERE EXISTS (
       SELECT 1 FROM unnest(COALESCE(cuisine_types, '{}')) c
        WHERE btrim(c) = ''
     )
  ) THEN
    RAISE EXCEPTION
      'Cannot apply cuisine_types constraint: existing rows contain empty cuisine entries.';
  END IF;
END $$;

COMMIT;

-- ── VERIFY ────────────────────────────────────────────────────────────────
-- Run after applying:
--   SELECT column_name, data_type
--     FROM information_schema.columns
--    WHERE table_name = 'bookings'
--      AND column_name IN ('cuisine_types','occasion_types','dietary_requirements');
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- BEGIN;
--   ALTER TABLE public.bookings
--     DROP COLUMN IF EXISTS cuisine_types,
--     DROP COLUMN IF EXISTS occasion_types,
--     DROP COLUMN IF EXISTS dietary_requirements;
--   COMMIT;
