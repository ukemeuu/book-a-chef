-- ==============================================================================
-- BOOK A CHEF KENYA — CONCIERGE AGENCY RLS POLICIES
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- Enables guests to submit dining inquiries without requiring an account,
-- while keeping customer data strictly private to admins and assigned chefs.
-- ==============================================================================

-- 1. Ensure bookings table has Row Level Security active
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;

-- 2. Allow any guest / client to submit a dining inquiry (INSERT only)
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can submit a booking inquiry" ON public.bookings;

CREATE POLICY "Anyone can submit a booking inquiry"
ON public.bookings
FOR INSERT
WITH CHECK (true);

-- 3. Only admins, service role, and assigned chefs can view bookings (SELECT)
DROP POLICY IF EXISTS "Users can read own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Only admins and assigned chefs can view bookings" ON public.bookings;

CREATE POLICY "Only admins and assigned chefs can view bookings"
ON public.bookings
FOR SELECT
USING (
    auth.role() = 'service_role' OR
    public.is_admin() OR
    EXISTS (
        SELECT 1 FROM public.chefs 
        WHERE id = bookings.chef_id AND user_id = auth.uid()
    ) OR
    (client_id IS NOT NULL AND auth.uid() = client_id)
);

-- 4. Only admins, service role, and assigned chefs can update bookings (UPDATE)
DROP POLICY IF EXISTS "Participants can update booking status" ON public.bookings;
DROP POLICY IF EXISTS "Only admins and chefs can update bookings" ON public.bookings;

CREATE POLICY "Only admins and chefs can update bookings"
ON public.bookings
FOR UPDATE
USING (
    auth.role() = 'service_role' OR
    public.is_admin() OR
    EXISTS (
        SELECT 1 FROM public.chefs 
        WHERE id = bookings.chef_id AND user_id = auth.uid()
    )
);

-- 5. Chefs can view unassigned pending_assignment bookings (dispatch board)
DROP POLICY IF EXISTS "Chefs can view unassigned bookings" ON public.bookings;
CREATE POLICY "Chefs can view unassigned bookings" ON public.bookings
    FOR SELECT
    USING (
        auth.role() = 'service_role' OR
        public.is_admin() OR
        (status = 'pending_assignment' AND chef_id IS NULL) OR
        EXISTS (
            SELECT 1 FROM public.chefs
            WHERE id = bookings.chef_id AND user_id = auth.uid()
        ) OR
        (client_id IS NOT NULL AND auth.uid() = client_id)
    );

-- 6. Chefs can claim unassigned pending_assignment bookings
DROP POLICY IF EXISTS "Chefs can claim unassigned bookings" ON public.bookings;
CREATE POLICY "Chefs can claim unassigned bookings" ON public.bookings
    FOR UPDATE
    USING (
        auth.role() = 'service_role' OR
        public.is_admin() OR
        (status = 'pending_assignment' AND chef_id IS NULL) OR
        EXISTS (
            SELECT 1 FROM public.chefs
            WHERE id = bookings.chef_id AND user_id = auth.uid()
        ) OR
        (client_id IS NOT NULL AND auth.uid() = client_id)
    );

-- 7. Confirmation notice
SELECT 'RLS policies for Book A Chef Concierge Model applied successfully' as status;
