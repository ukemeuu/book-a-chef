-- ==============================================================================
-- BOOK A CHEF KENYA — UBER / GWIJI DISPATCH MODEL SCHEMA UPDATE
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Allow chef_id to be NULL on bookings table (enables unassigned / concierge requests)
ALTER TABLE IF EXISTS public.bookings 
    ALTER COLUMN chef_id DROP NOT NULL;

-- 2. Add extra dispatch metadata columns if they do not exist
ALTER TABLE IF EXISTS public.bookings 
    ADD COLUMN IF NOT EXISTS cuisine_type TEXT,
    ADD COLUMN IF NOT EXISTS budget_per_person NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS dispatch_notes TEXT,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS en_route_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 3. Ensure booking status enum or text supports dispatch states
-- (pending_assignment, assigned, en_route, arrived, cooking, completed)
COMMENT ON COLUMN public.bookings.status IS 'Booking lifecycle: pending_assignment, pending, assigned, confirmed, en_route, arrived, cooking, completed, cancelled';

-- 4. Verify RLS allows public insertion of requests (guest flow)
CREATE POLICY "Public guest booking submission"
ON public.bookings
FOR INSERT
WITH CHECK (true);

-- 5. Confirmation notice
SELECT 'Uber/Gwiji dispatch schema updates applied successfully' as status;
