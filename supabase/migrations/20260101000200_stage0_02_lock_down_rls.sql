-- ============================================================================
-- 20260101000200_stage0_02_lock_down_rls.sql
-- STATUS: NOT APPLIED — awaiting approval. See STAGE0_EVIDENCE.md §3 for exact SQL.
--
-- WHY: B3 (PII leak) and B4 (privilege function). The current unassigned
--      bookings SELECT policy grants ANY authenticated role (including
--      customers) visibility of client_name, client_phone, client_email and
--      location_address for every unassigned order.
--
-- MODEL: Public discovery is NOT required by the brief's Phase 3, so no
--        unauthenticated grant is created here. Job discovery becomes a
--        SECURITY DEFINER function that returns an allow-listed projection
--        and only for rows whose chef record matches the caller.
-- ============================================================================

BEGIN;

-- ── 1. Remove the over-broad unassigned SELECT policy ──────────────────────
DROP POLICY IF EXISTS "Chefs can view unassigned bookings" ON public.bookings;
DROP POLICY IF EXISTS "Chefs can claim unassigned bookings" ON public.bookings;

-- ── 2. Replace with a narrow, allow-listed projection function ─────────────
-- Returns ONLY the fields an eligible chef needs to decide whether to accept.
-- Deliberately EXCLUDES client_name, client_phone, client_email.
-- Contact details are released later, in a separate function, only once the
-- chef has actually accepted.
CREATE OR REPLACE FUNCTION public.list_open_dispatch_jobs(p_booking_id UUID)
RETURNS TABLE (
  booking_id        UUID,
  booking_date      DATE,
  booking_time      TEXT,
  guests_count      INT,
  cuisine_type      TEXT,
  location_area     TEXT,
  service_format    TEXT,
  budget_per_person NUMERIC,
  special_requests  TEXT,
  created_at        TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT
    b.id,
    b.booking_date,
    b.booking_time,
    b.guests_count,
    b.cuisine_type,
    -- Area only — never the full street address.
    COALESCE(split_part(b.location_address, ',', 1), b.location_address),
    b.service_format,
    b.budget_per_person,
    b.special_requests,
    b.created_at
  FROM public.bookings b
  WHERE b.id = p_booking_id
    AND b.status = 'pending_assignment'
    AND b.chef_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.chefs c
      WHERE c.user_id = auth.uid()
        AND c.verified = true
        AND c.is_available = true
    );
$$;

-- RLS still applies to the underlying tables; SECURITY DEFINER is used only
-- to reach past the caller's inability to SELECT bookings rows. The function
-- itself is not executable by anonymous users.
REVOKE ALL ON FUNCTION public.list_open_dispatch_jobs(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_open_dispatch_jobs(UUID) TO authenticated;

-- ── 3. Lock the other over-broad paths ────────────────────────────────────
-- schema.sql shipped a SELECT-true policy on chef_availability and menus.
DROP POLICY IF EXISTS "Chef availability is publicly readable" ON public.chef_availability;
DROP POLICY IF EXISTS "Menus are readable by everyone" ON public.menus;

DROP POLICY IF EXISTS "Admins can view and manage applications" ON public.chef_applications;
CREATE POLICY "Admins can view and manage applications" ON public.chef_applications
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMIT;

-- ── ROLLBACK ───────────────────────────────────────────────────────────────
-- BEGIN;
--   DROP FUNCTION IF EXISTS public.list_open_dispatch_jobs(UUID);
--   DROP POLICY IF EXISTS "Chefs can view unassigned bookings" ON public.bookings;
--   DROP POLICY IF EXISTS "Chefs can claim unassigned bookings" ON public.bookings;
--   CREATE POLICY "Chefs can view unassigned bookings" ON public.bookings
--     FOR SELECT USING (status='pending_assignment' AND chef_id IS NULL);
--   CREATE POLICY "Chefs can claim unassigned bookings" ON public.bookings
--     FOR UPDATE USING (status='pending_assignment' AND chef_id IS NULL);
--   CREATE POLICY "Chef availability is publicly readable" ON public.chef_availability
--     FOR SELECT USING (true);
--   CREATE POLICY "Menus are readable by everyone" ON public.menus FOR SELECT USING (true);
-- COMMIT;
--
-- WARNING: rolling back re-opens the B3 PII leak. Only do this to unblock an
--          outage, and re-apply within one deploy cycle.