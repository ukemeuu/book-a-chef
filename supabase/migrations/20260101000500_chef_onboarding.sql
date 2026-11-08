-- ============================================================================
-- 20260101000500_chef_onboarding.sql
-- STATUS: NOT APPLIED — run via Supabase SQL Editor after migration 04.
--
-- WHY: Chef onboarding is broken end-to-end on the live project.
--
--   1. `chef_applications` has no `user_id`, so an application can never be
--      tied to the auth account that submitted it. Admins cannot tell whether
--      an applicant can log in, and approval cannot reuse the account.
--   2. `chefs` has no `email`, and 8 of 9 live rows have `user_id IS NULL`.
--      Dispatch happily assigns bookings to those chefs, but they have no
--      account and can never accept — the booking stalls forever.
--   3. The guards that let a chef go online depend on columns that only exist
--      in newer code (`profile_completion_percentage`, `national_id_number`,
--      `service_formats`), so the readiness gate can never be satisfied.
--
-- SAFETY: additive only. No column dropped, renamed or retyped. Every new
--         column is nullable or has a default, so existing rows stay valid and
--         existing queries keep working. `user_id` is NOT backfilled: matching
--         a row to an account by name is guesswork and would hand one chef's
--         listing to another person.
--
-- AFTER APPLYING: run the verification query at the bottom. Chefs with
--   `user_id IS NULL` remain invisible to dispatch until an admin links them
--   from /admin (the "Unlinked chefs" panel).
-- ============================================================================

BEGIN;

-- ── 1. chef_applications: link the application to a real account ────────────
ALTER TABLE public.chef_applications
  ADD COLUMN IF NOT EXISTS user_id           UUID,
  ADD COLUMN IF NOT EXISTS national_id_number TEXT,
  ADD COLUMN IF NOT EXISTS service_formats   TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_areas     TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS partner_type      TEXT DEFAULT 'chef',
  ADD COLUMN IF NOT EXISTS review_notes      TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by       UUID,
  ADD COLUMN IF NOT EXISTS reviewed_at       TIMESTAMPTZ;

-- An applicant can submit more than one draft over time, but only one live
-- application per account. `user_id` stays nullable so historical rows that
-- predate this migration are untouched.
CREATE UNIQUE INDEX IF NOT EXISTS chef_applications_one_live_per_user
  ON public.chef_applications (user_id)
  WHERE user_id IS NOT NULL
    AND status IN ('pending', 'under_review', 'approved');

CREATE INDEX IF NOT EXISTS chef_applications_user_id_idx
  ON public.chef_applications (user_id);

COMMENT ON COLUMN public.chef_applications.user_id IS
  'Auth account that submitted the application. NULL for imports that pre-date self-serve onboarding.';

-- Applicants must be able to read and edit their OWN application from the chef
-- dashboard. Today the table is admin-only, so a pending applicant opening the
-- dashboard sees "no application" and is stranded. Matching on the verified
-- JWT email keeps one applicant out of another's row.
DROP POLICY IF EXISTS "Applicants can read own application" ON public.chef_applications;
CREATE POLICY "Applicants can read own application"
  ON public.chef_applications FOR SELECT
  TO authenticated
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

DROP POLICY IF EXISTS "Applicants can update own application" ON public.chef_applications;
CREATE POLICY "Applicants can update own application"
  ON public.chef_applications FOR UPDATE
  TO authenticated
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')))
  WITH CHECK (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND status IN ('pending', 'under_review', 'rejected')
  );

-- ── 2. chefs: the columns the dashboard and dispatch already read ───────────
ALTER TABLE public.chefs
  ADD COLUMN IF NOT EXISTS service_formats     TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS allow_in_home       BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_delivery      BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS national_id_number  TEXT,
  ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_at         TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS chefs_user_id_idx ON public.chefs (user_id);
CREATE INDEX IF NOT EXISTS chefs_email_idx   ON public.chefs (lower(email));

COMMENT ON COLUMN public.chefs.profile_completion_percentage IS
  'Cached value of calculateProfileReadiness(). The live dashboard recomputes it; the column exists so admin lists can sort without loading every menu.';

-- ── 3. dispatch_log: audit trail the dispatch code already writes ──────────
-- The app treats a missing log as non-fatal (see utils/schemaFallback.ts), so
-- this table is for operators, not for correctness.
CREATE TABLE IF NOT EXISTS public.dispatch_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  chef_id      UUID REFERENCES public.chefs(id) ON DELETE SET NULL,
  event        TEXT NOT NULL,
  score        NUMERIC(8, 2),
  reason       TEXT,
  metadata     JSONB DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS dispatch_log_booking_idx
  ON public.dispatch_log (booking_id, created_at DESC);

ALTER TABLE public.dispatch_log ENABLE ROW LEVEL SECURITY;

-- Only admins read the dispatch trail. Writes happen with the service role,
-- which bypasses RLS; there is deliberately no anon/authenticated INSERT policy.
DROP POLICY IF EXISTS "Admins can read dispatch log" ON public.dispatch_log;
CREATE POLICY "Admins can read dispatch log"
  ON public.dispatch_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- ── 4. Never dispatch to a chef with no account ────────────────────────────
-- This is a data flag, not a constraint: an admin may be mid-way through
-- linking a legacy chef and the row must remain writable. The dispatch code
-- also filters on user_id, so this is defence in depth.
UPDATE public.chefs
   SET is_available = false
 WHERE user_id IS NULL
   AND is_available = true;

COMMIT;

-- ── VERIFY ────────────────────────────────────────────────────────────────
-- Run after applying. Expect one row per column.
--
--   SELECT table_name, column_name, data_type
--     FROM information_schema.columns
--    WHERE (table_name = 'chef_applications'
--           AND column_name IN ('user_id','national_id_number','service_formats','service_areas','partner_type'))
--       OR (table_name = 'chefs'
--           AND column_name IN ('service_formats','allow_in_home','allow_delivery','national_id_number','profile_completion_percentage'))
--    ORDER BY table_name, column_name;
--
--   SELECT count(*) FILTER (WHERE user_id IS NULL) AS unlinked,
--          count(*) FILTER (WHERE is_available)    AS dispatchable
--     FROM public.chefs;
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- BEGIN;
--   DROP TABLE IF EXISTS public.dispatch_log;
--   DROP INDEX IF EXISTS public.chef_applications_one_live_per_user;
--   DROP INDEX IF EXISTS public.chef_applications_user_id_idx;
--   DROP INDEX IF EXISTS public.chefs_user_id_idx;
--   DROP INDEX IF EXISTS public.chefs_email_idx;
--   ALTER TABLE public.chef_applications
--     DROP COLUMN IF EXISTS user_id,
--     DROP COLUMN IF EXISTS national_id_number,
--     DROP COLUMN IF EXISTS service_formats,
--     DROP COLUMN IF EXISTS service_areas,
--     DROP COLUMN IF EXISTS partner_type,
--     DROP COLUMN IF EXISTS review_notes,
--     DROP COLUMN IF EXISTS reviewed_by,
--     DROP COLUMN IF EXISTS reviewed_at;
--   ALTER TABLE public.chefs
--     DROP COLUMN IF EXISTS service_formats,
--     DROP COLUMN IF EXISTS allow_in_home,
--     DROP COLUMN IF EXISTS allow_delivery,
--     DROP COLUMN IF EXISTS national_id_number,
--     DROP COLUMN IF EXISTS profile_completion_percentage,
--     DROP COLUMN IF EXISTS approved_at;
-- COMMIT;
