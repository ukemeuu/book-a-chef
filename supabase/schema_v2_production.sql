-- ==============================================================================
-- BOOK A CHEF — PRODUCTION SCHEMA v2
-- Run this in Supabase SQL Editor AFTER the original schema.sql
-- This migration extends and corrects the base schema for production.
-- ==============================================================================

-- ── 1. EXTENSIONS ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. ENUMS ──────────────────────────────────────────────────────────────────

-- Extended booking status state machine
DO $$ BEGIN
    -- Drop old enum and recreate with full state machine
    ALTER TYPE booking_status RENAME TO booking_status_old;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM (
        'pending',           -- Customer submitted; awaiting chef review
        'chef_accepted',     -- Chef accepted; awaiting deposit payment
        'payment_pending',   -- M-Pesa STK push sent; awaiting callback
        'confirmed',         -- Deposit received; booking confirmed
        'in_progress',       -- Chef has arrived; service underway
        'completed',         -- Service completed; review eligible
        'declined',          -- Chef declined the request
        'cancelled_by_customer', -- Customer cancelled
        'cancelled_by_chef',     -- Chef cancelled
        'expired',           -- Timed out without action
        'refund_pending',    -- Refund initiated
        'refunded',          -- Refund completed
        'disputed'           -- Under admin dispute resolution
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Chef verification status
DO $$ BEGIN
    CREATE TYPE chef_verification_status AS ENUM (
        'pending',
        'under_review',
        'approved',
        'rejected',
        'suspended'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment status
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed',
        'refunded',
        'partially_refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Notification type
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'booking_requested',
        'booking_accepted',
        'booking_declined',
        'booking_confirmed',
        'booking_cancelled',
        'booking_completed',
        'booking_reminder',
        'payment_received',
        'payment_failed',
        'review_request',
        'chef_approved',
        'chef_rejected',
        'system'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ── 3. FIX CHEFS TABLE ────────────────────────────────────────────────────────
-- verified DEFAULT false — admins must explicitly approve each chef
ALTER TABLE public.chefs ALTER COLUMN verified SET DEFAULT false;

-- Add missing columns to chefs table
ALTER TABLE public.chefs
    ADD COLUMN IF NOT EXISTS verification_status chef_verification_status DEFAULT 'pending'::chef_verification_status,
    ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS min_guests INT DEFAULT 2,
    ADD COLUMN IF NOT EXISTS max_guests INT DEFAULT 30,
    ADD COLUMN IF NOT EXISTS travel_radius_km INT DEFAULT 25,
    ADD COLUMN IF NOT EXISTS min_notice_hours INT DEFAULT 48,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
    ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN DEFAULT false;

-- ── 4. EXTENDED BOOKING STATUS ────────────────────────────────────────────────
-- Migrate old status column to new enum values (pending/confirmed/in_progress/completed/cancelled stay the same)
ALTER TABLE public.bookings
    ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.bookings
    ALTER COLUMN status TYPE TEXT;

-- Now set new default
ALTER TABLE public.bookings
    ALTER COLUMN status SET DEFAULT 'pending';

-- Add missing booking columns
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS chef_response_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS review_eligible BOOLEAN DEFAULT false;

-- ── 5. CHEF AVAILABILITY TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chef_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chef_id UUID REFERENCES public.chefs(id) ON DELETE CASCADE NOT NULL,
    -- Recurring weekly schedule (0=Sunday, 1=Monday, ..., 6=Saturday)
    working_days INT[] DEFAULT ARRAY[5, 6]::INT[] NOT NULL, -- Fri, Sat by default
    -- Working hours
    start_time TIME DEFAULT '12:00:00' NOT NULL,
    end_time TIME DEFAULT '22:00:00' NOT NULL,
    -- Booking limits
    max_bookings_per_day INT DEFAULT 1 NOT NULL,
    -- Advance booking window
    min_notice_hours INT DEFAULT 48 NOT NULL, -- Minimum hours before booking
    max_advance_days INT DEFAULT 90 NOT NULL,  -- How far in advance to book
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE (chef_id)
);

-- Blocked dates (holidays, personal time off, private events)
CREATE TABLE IF NOT EXISTS public.chef_blocked_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chef_id UUID REFERENCES public.chefs(id) ON DELETE CASCADE NOT NULL,
    blocked_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE (chef_id, blocked_date)
);

-- ── 6. PAYMENTS TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- Amount details
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'KES' NOT NULL,
    payment_type TEXT DEFAULT 'deposit' NOT NULL, -- 'deposit' | 'balance' | 'refund'
    -- M-Pesa specific
    mpesa_phone TEXT,                    -- Phone number used for STK push
    mpesa_merchant_request_id TEXT,      -- Safaricom MerchantRequestID
    mpesa_checkout_request_id TEXT,      -- Safaricom CheckoutRequestID (for status queries)
    mpesa_receipt_number TEXT,           -- Returned on success callback (M-Pesa receipt)
    mpesa_transaction_date TEXT,         -- As returned by Daraja
    -- Status tracking
    status payment_status DEFAULT 'pending'::payment_status NOT NULL,
    -- Idempotency: track if callback was already processed
    callback_processed BOOLEAN DEFAULT false NOT NULL,
    callback_received_at TIMESTAMPTZ,
    failure_reason TEXT,
    -- Timestamps
    initiated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    -- Prevent duplicate callback processing
    UNIQUE (mpesa_checkout_request_id)
);

-- ── 7. NOTIFICATIONS TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    -- Related entity
    entity_type TEXT,    -- 'booking' | 'payment' | 'review' | 'application'
    entity_id UUID,
    -- Delivery tracking
    is_read BOOLEAN DEFAULT false NOT NULL,
    email_sent BOOLEAN DEFAULT false NOT NULL,
    email_sent_at TIMESTAMPTZ,
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 8. AUDIT LOGS TABLE ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,              -- e.g. 'booking_created', 'chef_approved', 'payment_received'
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    entity_type TEXT,                  -- 'booking' | 'chef' | 'payment' | 'review'
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::JSONB,
    ip_address TEXT,                   -- Stored only for security/fraud detection
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 9. DISPUTES TABLE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    raised_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open' NOT NULL, -- 'open' | 'under_review' | 'resolved' | 'closed'
    resolution TEXT,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 10. BOOKING STATUS HISTORY ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 11. INDEXES ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_chef_id ON public.bookings(chef_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_chef_date ON public.bookings(chef_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_chefs_verified ON public.chefs(verified) WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_chefs_available ON public.chefs(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_chefs_city ON public.chefs(city);
CREATE INDEX IF NOT EXISTS idx_reviews_chef_id ON public.reviews(chef_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_checkout_id ON public.payments(mpesa_checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- ── 12. UNIQUE CONSTRAINT: Prevent double-booking ────────────────────────────
-- A chef can only have one active booking per date+time slot
-- (pending, chef_accepted, payment_pending, confirmed, in_progress)
-- NOTE: Since we're using TEXT for status now, use a partial index approach
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_no_double_book
    ON public.bookings(chef_id, booking_date, booking_time)
    WHERE status NOT IN (
        'declined',
        'cancelled_by_customer',
        'cancelled_by_chef',
        'expired',
        'refunded'
    );

-- ── 13. UPDATED_AT TRIGGERS ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_chefs_updated_at
    BEFORE UPDATE ON public.chefs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_chef_availability_updated_at
    BEFORE UPDATE ON public.chef_availability
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── 14. BOOKING STATUS HISTORY TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.booking_status_history(booking_id, from_status, to_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_booking_status_changed
    AFTER UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.record_booking_status_change();

-- ── 15. REVIEW ELIGIBILITY TRIGGER ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_review_eligible()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.review_eligible = true;
        NEW.completed_at = TIMEZONE('utc', NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_completed
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.set_review_eligible();

-- ── 16. RLS ON NEW TABLES ────────────────────────────────────────────────────
ALTER TABLE public.chef_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

-- Chef availability — public read (needed for booking UX), chef/admin write
CREATE POLICY "Chef availability is publicly readable" ON public.chef_availability
    FOR SELECT USING (true);
CREATE POLICY "Chefs manage own availability" ON public.chef_availability
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.chefs WHERE id = chef_availability.chef_id AND user_id = auth.uid())
        OR public.is_admin()
    );

-- Blocked dates — same pattern
CREATE POLICY "Blocked dates readable by everyone" ON public.chef_blocked_dates
    FOR SELECT USING (true);
CREATE POLICY "Chefs manage own blocked dates" ON public.chef_blocked_dates
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.chefs WHERE id = chef_blocked_dates.chef_id AND user_id = auth.uid())
        OR public.is_admin()
    );

-- Payments — clients see own, chefs see their booking payments, admins see all
CREATE POLICY "Users see relevant payments" ON public.payments
    FOR SELECT USING (
        auth.uid() = client_id
        OR EXISTS (
            SELECT 1 FROM public.bookings b
            JOIN public.chefs c ON c.id = b.chef_id
            WHERE b.id = payments.booking_id AND c.user_id = auth.uid()
        )
        OR public.is_admin()
    );
-- Payments are created server-side only (via service role key)
-- No client insert policy — API routes use service role

-- Notifications — users see only their own
CREATE POLICY "Users see own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = recipient_id OR public.is_admin());
CREATE POLICY "Users update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = recipient_id);

-- Audit logs — admin only read
CREATE POLICY "Admins can read audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_admin());

-- Disputes — participants + admin
CREATE POLICY "Dispute participants can view" ON public.disputes
    FOR SELECT USING (
        auth.uid() = raised_by
        OR EXISTS (
            SELECT 1 FROM public.bookings b
            JOIN public.chefs c ON c.id = b.chef_id
            WHERE b.id = disputes.booking_id AND (b.client_id = auth.uid() OR c.user_id = auth.uid())
        )
        OR public.is_admin()
    );

-- Booking history — participants + admin
CREATE POLICY "Booking history visible to participants" ON public.booking_status_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            JOIN public.chefs c ON c.id = b.chef_id
            WHERE b.id = booking_status_history.booking_id
            AND (b.client_id = auth.uid() OR c.user_id = auth.uid())
        )
        OR public.is_admin()
    );

-- ── 17. FIX EXISTING RLS POLICIES ────────────────────────────────────────────

-- PROFILES: Remove the policy that exposes all profile data publicly
DROP POLICY IF EXISTS "Public profiles are readable by everyone" ON public.profiles;

-- Only expose safe fields publicly via a view; full profile only to owner/admin
CREATE POLICY "Own profile is fully readable" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- BOOKINGS: Fix insert policy — must be authenticated
DROP POLICY IF EXISTS "Clients can create bookings" ON public.bookings;
CREATE POLICY "Authenticated users can create bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = client_id);

-- REVIEWS: Fix insert — must have completed booking
DROP POLICY IF EXISTS "Clients can create reviews for completed bookings" ON public.reviews;
CREATE POLICY "Clients can review after completed booking" ON public.reviews
    FOR INSERT WITH CHECK (
        auth.uid() = client_id
        AND EXISTS (
            SELECT 1 FROM public.bookings
            WHERE id = reviews.booking_id
              AND client_id = auth.uid()
              AND chef_id = reviews.chef_id
              AND status = 'completed'
              AND review_eligible = true
        )
        -- Prevent duplicate reviews per booking
        AND NOT EXISTS (
            SELECT 1 FROM public.reviews
            WHERE booking_id = reviews.booking_id AND client_id = auth.uid()
        )
    );

-- ── 18. PUBLIC CHEFS VIEW (safe for anonymous users) ─────────────────────────
CREATE OR REPLACE VIEW public.public_chefs AS
    SELECT
        id, name, brand_name, slug, tagline, bio,
        city, service_areas, cuisines, dietary_specialties,
        price_per_guest, min_guests, max_guests,
        rating, reviews_count, verified,
        avatar_url, cover_image_url, gallery_images,
        is_available, featured, is_placeholder,
        experience_years, instagram_handle
    FROM public.chefs
    WHERE verified = true AND is_available = true;

-- Grant anon read access to the view
GRANT SELECT ON public.public_chefs TO anon;
GRANT SELECT ON public.public_chefs TO authenticated;

-- ── 19. INSERT PLACEHOLDER CHEFS AS CLEARLY MARKED ───────────────────────────
-- Update existing chefs to mark them as placeholders
UPDATE public.chefs SET is_placeholder = true WHERE is_placeholder IS NULL OR is_placeholder = false;

-- ── 20. DEFAULT CHEF AVAILABILITY FOR ALL EXISTING CHEFS ────────────────────
INSERT INTO public.chef_availability (chef_id, working_days, start_time, end_time, max_bookings_per_day, min_notice_hours)
SELECT id, ARRAY[4,5,6]::INT[], '12:00:00', '22:00:00', 2, 48
FROM public.chefs
ON CONFLICT (chef_id) DO NOTHING;
