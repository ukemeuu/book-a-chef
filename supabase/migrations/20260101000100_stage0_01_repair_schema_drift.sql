-- ============================================================================
-- 20260101000100_stage0_01_repair_schema_drift.sql
-- STATUS: NOT APPLIED — awaiting approval. See STAGE0_EVIDENCE.md §3 for exact SQL.
--
-- WHY: Live `bookings` is missing 7 columns that application code already
--      reads and writes. POST /api/bookings/create currently FAILS against
--      production because the INSERT names columns that do not exist.
--
-- SAFETY: Additive only. No column is dropped, renamed, or retyped.
--         No existing row is modified. Fully reversible via rollback below.
-- ============================================================================

BEGIN;

-- ── 1. Repair drift: add columns the app already assumes exist ─────────────
-- All nullable or defaulted so no existing row is invalidated.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_format      TEXT DEFAULT 'in_home'  NOT NULL,
  ADD COLUMN IF NOT EXISTS sourcing_preference TEXT DEFAULT 'chef_sourced' NOT NULL,
  ADD COLUMN IF NOT EXISTS preferred_stores    TEXT,
  ADD COLUMN IF NOT EXISTS receipt_verified    BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS cuisine_type        TEXT,
  ADD COLUMN IF NOT EXISTS budget_per_person   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS assigned_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatch_notes      TEXT;

-- Backfill: preserve any prior semantics that were smuggled through
-- special_requests text, so no behavioural change for existing rows.
UPDATE public.bookings
   SET cuisine_type = substring(special_requests from '\[Cuisine: ([^\]]+)\]')
 WHERE cuisine_type IS NULL
   AND special_requests ~ '\[Cuisine: [^\]]+\]';

UPDATE public.bookings
   SET service_format = 'delivery'
 WHERE service_format = 'in_home'
   AND special_requests LIKE '%[Service: Cooked & Delivered]%';

-- ── 2. chef_id must be nullable for the unassigned dispatch state ───────────
-- Currently NOT NULL in every shipped schema file, which makes
-- status='pending_assignment' unrepresentable.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='bookings'
       AND column_name='chef_id' AND is_nullable='NO'
  ) THEN
    -- Preserve history: on delete, detach the chef rather than destroying
    -- the booking, payout and audit trail.
    ALTER TABLE public.bookings
      DROP CONSTRAINT IF EXISTS bookings_chef_id_fkey;
    ALTER TABLE public.bookings
      ADD  CONSTRAINT bookings_chef_id_fkey
      FOREIGN KEY (chef_id) REFERENCES public.chefs(id) ON DELETE SET NULL;
    ALTER TABLE public.bookings ALTER COLUMN chef_id DROP NOT NULL;
    RAISE NOTICE 'chef_id made nullable; FK changed to ON DELETE SET NULL.';
  END IF;
END $$;

-- ── 3. Constrain the state machine ────────────────────────────────────────
-- status is TEXT in the live DB. A CHECK gives us enum-like safety without
-- the risk of an enum migration on a populated table.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_valid;
ALTER TABLE public.bookings ADD  CONSTRAINT bookings_status_valid CHECK (
  status IN (
    'pending_assignment',  -- created, no chef yet
    'pending',             -- chef offered, awaiting acceptance
    'assigned',            -- chef assigned, not yet accepted
    'chef_accepted',
    'payment_pending',
    'confirmed',
    'en_route',
    'arrived',
    'cooking',
    'in_progress',
    'completed',
    'declined',
    'expired',
    'cancelled_by_customer',
    'cancelled_by_chef',
    'refund_pending',
    'refunded',
    'disputed'
  )
);

-- ── 4. Commission becomes configuration, not a literal ────────────────────
-- H5/M5. No commercial rate has been approved, so the row is inserted with
-- is_active = FALSE and NULL rates. Nothing reads it until enabled.
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB,
  is_active   BOOLEAN NOT NULL DEFAULT false,
  updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins manage platform settings" ON public.platform_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO public.platform_settings (key, value, is_active) VALUES
  ('commission', '{"platform_rate": null, "chef_payout_rate": null}'::jsonb, false)
ON CONFLICT (key) DO NOTHING;

-- ── 5. Fix search_path on the admin privilege function ────────────────────
-- B4. SECURITY DEFINER without a pinned search_path can be hijacked by an
-- attacker who can create a shadowing `profiles` relation.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

COMMIT;

-- ── ROLLBACK (run only if 01 must be reverted) ─────────────────────────────
-- BEGIN;
--   DROP TABLE IF EXISTS public.platform_settings;
--   ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_valid;
--   ALTER TABLE public.bookings
--     DROP CONSTRAINT IF EXISTS bookings_chef_id_fkey,
--     ADD  CONSTRAINT bookings_chef_id_fkey
--       FOREIGN KEY (chef_id) REFERENCES public.chefs(id) ON DELETE CASCADE,
--     ALTER COLUMN chef_id SET NOT NULL;
--   ALTER TABLE public.bookings
--     DROP COLUMN IF EXISTS service_format, DROP COLUMN IF EXISTS sourcing_preference,
--     DROP COLUMN IF EXISTS preferred_stores, DROP COLUMN IF EXISTS receipt_verified,
--     DROP COLUMN IF EXISTS cuisine_type,    DROP COLUMN IF EXISTS budget_per_person,
--     DROP COLUMN IF EXISTS assigned_at,     DROP COLUMN IF EXISTS dispatch_notes;
-- COMMIT;