-- ==============================================================================
-- BOOK A CHEF KENYA — WHATSAPP MESSAGE LOG
-- Delivery ledger for outbound WhatsApp template messages.
-- Run this in your Supabase SQL Editor AFTER dispatch_log.sql:
-- https://supabase.com/dashboard/project/_/sql
--
-- Every outbound attempt is recorded here so failed sends can be retried
-- and delivery can be audited. Booking flows never block on notifications,
-- so this table is the only source of truth for "did the customer get told?".
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_message_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    recipient_phone TEXT,
    recipient_name TEXT,
    recipient_role TEXT NOT NULL DEFAULT 'customer'
        CHECK (recipient_role IN ('customer', 'chef', 'concierge')),
    template_name TEXT NOT NULL,
    message_body TEXT,
    -- Exact template placeholder values, stored so a retry replays the
    -- identical message instead of trying to reconstruct it from prose.
    parameters JSONB DEFAULT '[]'::JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
    error_detail TEXT,
    whatsapp_message_id TEXT,
    attempts INT NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Retry sweep: find failed/pending rows that have not been retried yet.
CREATE INDEX IF NOT EXISTS idx_wa_log_retry
    ON public.whatsapp_message_log(status, created_at)
    WHERE status IN ('pending', 'failed');

-- Per-booking audit trail.
CREATE INDEX IF NOT EXISTS idx_wa_log_booking
    ON public.whatsapp_message_log(booking_id, created_at DESC);

-- Avoid duplicate sends when an event fires twice (webhook + cron, etc).
CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_log_dedupe
    ON public.whatsapp_message_log (booking_id, template_name, recipient_phone)
    WHERE booking_id IS NOT NULL AND recipient_phone IS NOT NULL;

-- RLS: service role only. Admins read via service-role client.
ALTER TABLE public.whatsapp_message_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages whatsapp_message_log" ON public.whatsapp_message_log;
CREATE POLICY "Service role manages whatsapp_message_log" ON public.whatsapp_message_log
    FOR ALL USING (auth.role() = 'service_role');

-- updated_at trigger
DROP TRIGGER IF EXISTS set_wa_log_updated_at ON public.whatsapp_message_log;
CREATE TRIGGER set_wa_log_updated_at BEFORE UPDATE ON public.whatsapp_message_log
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Helpful retry view ────────────────────────────────────────────────────────
-- Failed messages that a cron job or admin action can sweep and resend.
CREATE OR REPLACE VIEW public.whatsapp_retry_queue AS
SELECT
    id,
    booking_id,
    recipient_phone,
    recipient_name,
    template_name,
    message_body,
    error_detail,
    attempts,
    created_at
FROM public.whatsapp_message_log
WHERE status IN ('pending', 'failed')
ORDER BY created_at ASC;

SELECT 'whatsapp_message_log table created successfully' as status;