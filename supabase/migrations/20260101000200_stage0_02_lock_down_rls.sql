-- ============================================================================
-- 20260101000200_stage0_02_lock_down_rls.sql
-- STATUS: NOT APPLIED — awaiting approval. See STAGE0_EVIDENCE.md §3 for exact SQL.
--
-- WHY: B3 (PII leak) and B4 (privilege function).
--
-- THE MODEL THIS MIGRATION ENCODES
--   Dispatch is PUSH, not a marketplace. A customer submits a request; the
--   matching engine assigns exactly ONE eligible chef and sets status =
--   'assigned'. That chef alone sees the job, and decides.
--
--   There is no open job board. Therefore there is deliberately NO function,
--   view, policy or API path anywhere that lists, counts or searches
--   unassigned bookings. Absence of a listing surface is the primary control;
--   RLS lockdown below is the second layer behind it.
--
--   Chefs read their own offers through the ordinary
--   "Only admins and assigned chefs can view bookings" policy, which already
--   permits a row whose chef_id maps to the caller's chefs.user_id. No
--   SECURITY DEFINER escape hatch is required for that, and none is granted.
-- ============================================================================

BEGIN;

-- ── 1. Remove the over-broad unassigned SELECT policy ──────────────────────
-- This single policy was the B3 leak. Its USING clause granted ANY
-- authenticated caller — including ordinary customers — visibility of
-- client_name, client_phone, client_email and location_address for EVERY
-- unassigned order. Dropping it removes both the leak and the listing surface.
DROP POLICY IF EXISTS "Chefs can view unassigned bookings" ON public.bookings;

-- ── 2. Remove the claim policy ────────────────────────────────────────────
-- "Chefs can claim unassigned pending_assignment bookings" let any chef grab
-- a specific unassigned order by ID, which both leaks PII and contradicts the
-- one-chef-at-a-time dispatch model. Atomic single-chef assignment is provided
-- instead by claim_booking() in migration 03.
DROP POLICY IF EXISTS "Chefs can claim unassigned bookings" ON public.bookings;

-- ── 3. Assert the remaining SELECT policy is still in place ───────────────
-- The offers query and the accepted-bookings query both depend on it. If a
-- prior manual run dropped it, chefs would silently lose all job visibility, so
-- fail loudly here rather than at runtime in the dashboard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'bookings'
      AND policyname = 'Only admins and assigned chefs can view bookings'
  ) THEN
    RAISE EXCEPTION
      'Expected policy "Only admins and assigned chefs can view bookings" on '
      'public.bookings is missing. Re-apply supabase/concierge_inquiries_rls.sql '
      'before continuing — otherwise chefs cannot see jobs offered to them.';
  END IF;
END $$;

-- ── 4. Lock the other over-broad paths ────────────────────────────────────
-- schema.sql shipped SELECT-true policies on chef_availability and menus.
DROP POLICY IF EXISTS "Chef availability is publicly readable" ON public.chef_availability;
DROP POLICY IF EXISTS "Menus are readable by everyone" ON public.menus;

DROP POLICY IF EXISTS "Admins can view and manage applications" ON public.chef_applications;
CREATE POLICY "Admins can view and manage applications" ON public.chef_applications
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMIT;

-- ── ROLLBACK ───────────────────────────────────────────────────────────────
-- WARNING: rolling back this migration re-opens the B3 PII leak and restores
-- the job board. Only do this to unblock a hard outage, and re-apply within
-- one deploy cycle. Do NOT roll back as a matter of convenience.
--
-- BEGIN;
--   CREATE POLICY "Chefs can view unassigned bookings" ON public.bookings
--     FOR SELECT
--     USING (
--         auth.role() = 'service_role' OR
--         public.is_admin() OR
--         (status = 'pending_assignment' AND chef_id IS NULL) OR
--         EXISTS (
--             SELECT 1 FROM public.chefs
--             WHERE id = bookings.chef_id AND user_id = auth.uid()
--         ) OR
--         (client_id IS NOT NULL AND auth.uid() = client_id)
--     );
--   CREATE POLICY "Chefs can claim unassigned bookings" ON public.bookings
--     FOR UPDATE
--     USING (
--         auth.role() = 'service_role' OR
--         public.is_admin() OR
--         (status = 'pending_assignment' AND chef_id IS NULL) OR
--         EXISTS (
--             SELECT 1 FROM public.chefs
--             WHERE id = bookings.chef_id AND user_id = auth.uid()
--         ) OR
--         (client_id IS NOT NULL AND auth.uid() = client_id)
--     );
--   CREATE POLICY "Chef availability is publicly readable" ON public.chef_availability
--     FOR SELECT USING (true);
--   CREATE POLICY "Menus are readable by everyone" ON public.menus FOR SELECT USING (true);
-- COMMIT;
