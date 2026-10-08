-- ==============================================================================
-- BOOK A CHEF KENYA — DISPATCH LOG TABLE
-- Tracks every matching attempt for on-demand chef dispatch.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.dispatch_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    chef_id UUID REFERENCES public.chefs(id) ON DELETE CASCADE NOT NULL,
    matched_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    match_score NUMERIC(5, 2),
    auto_assigned BOOLEAN DEFAULT false NOT NULL,
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    decline_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dispatch_log_booking_id ON public.dispatch_log(booking_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_log_chef_id ON public.dispatch_log(chef_id);

-- RLS: service_role only (dispatched by server-side matching logic)
ALTER TABLE public.dispatch_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage dispatch_log" ON public.dispatch_log;
CREATE POLICY "Service role can manage dispatch_log" ON public.dispatch_log
    FOR ALL USING (auth.role() = 'service_role');

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_dispatch_log_updated_at ON public.dispatch_log;
CREATE TRIGGER set_dispatch_log_updated_at BEFORE UPDATE ON public.dispatch_log
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

SELECT 'dispatch_log table created successfully' as status;
