-- ==============================================================================
-- BOOK A CHEF KENYA — COMPLETE STANDALONE PRODUCTION DATABASE SCHEMA
-- Execute this entire script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- ── 1. EXTENSIONS ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. ENUMS & CUSTOM TYPES ───────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('client', 'chef', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE application_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE chef_verification_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

-- ── 3. PROFILES TABLE (Extends Supabase Auth) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'client'::user_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 4. CHEFS TABLE ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chefs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    brand_name TEXT,
    slug TEXT UNIQUE,
    tagline TEXT,
    bio TEXT,
    culinary_philosophy TEXT,
    city TEXT DEFAULT 'Nairobi' NOT NULL,
    service_areas TEXT[] DEFAULT ARRAY['Westlands', 'Kilimani', 'Karen', 'Runda']::TEXT[],
    cuisines TEXT[] DEFAULT ARRAY['Swahili', 'Fine Dining']::TEXT[] NOT NULL,
    dietary_specialties TEXT[] DEFAULT ARRAY['Halal', 'Gluten-Free']::TEXT[],
    price_per_guest NUMERIC(10, 2) DEFAULT 4500.00 NOT NULL,
    min_guests INT DEFAULT 2 NOT NULL,
    max_guests INT DEFAULT 30 NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 5.00 NOT NULL,
    reviews_count INT DEFAULT 0 NOT NULL,
    verified BOOLEAN DEFAULT false NOT NULL,
    verification_status chef_verification_status DEFAULT 'pending'::chef_verification_status,
    avatar_url TEXT NOT NULL,
    cover_image_url TEXT NOT NULL,
    gallery_images TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_available BOOLEAN DEFAULT true NOT NULL,
    featured BOOLEAN DEFAULT false NOT NULL,
    is_placeholder BOOLEAN DEFAULT false,
    experience_years INT DEFAULT 5,
    travel_radius_km INT DEFAULT 25,
    min_notice_hours INT DEFAULT 48,
    phone TEXT,
    email TEXT,
    instagram_handle TEXT,
    partner_type TEXT DEFAULT 'independent',
    restaurant_name TEXT,
    allow_in_home BOOLEAN DEFAULT true,
    allow_delivery BOOLEAN DEFAULT true,
    service_formats TEXT[] DEFAULT ARRAY['in_home', 'delivery']::TEXT[],
    national_id_number TEXT,
    profile_completion_percentage INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 5. CHEF AVAILABILITY TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chef_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chef_id UUID REFERENCES public.chefs(id) ON DELETE CASCADE NOT NULL,
    working_days INT[] DEFAULT ARRAY[4, 5, 6]::INT[] NOT NULL, -- Thu, Fri, Sat by default
    start_time TIME DEFAULT '12:00:00' NOT NULL,
    end_time TIME DEFAULT '22:00:00' NOT NULL,
    max_bookings_per_day INT DEFAULT 2 NOT NULL,
    min_notice_hours INT DEFAULT 48 NOT NULL,
    max_advance_days INT DEFAULT 90 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE (chef_id)
);

CREATE TABLE IF NOT EXISTS public.chef_blocked_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chef_id UUID REFERENCES public.chefs(id) ON DELETE CASCADE NOT NULL,
    blocked_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE (chef_id, blocked_date)
);

-- ── 6. MENUS TABLE ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chef_id UUID REFERENCES public.chefs(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    tag TEXT DEFAULT 'Signature Menu',
    description TEXT,
    price_per_guest NUMERIC(10, 2) NOT NULL,
    courses JSONB DEFAULT '{"appetizer": {"name": "", "description": ""}, "main": {"name": "", "description": ""}, "dessert": {"name": "", "description": ""}}'::JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 7. BOOKINGS TABLE (13-State Machine) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    chef_id UUID REFERENCES public.chefs(id) ON DELETE CASCADE NOT NULL,
    menu_id UUID REFERENCES public.menus(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TEXT NOT NULL,
    guests_count INT NOT NULL,
    location_address TEXT NOT NULL,
    location_city TEXT DEFAULT 'Nairobi' NOT NULL,
    special_requests TEXT,
    dietary_notes TEXT,
    service_format TEXT DEFAULT 'in_home' NOT NULL,
    sourcing_preference TEXT DEFAULT 'chef_sourced' NOT NULL,
    preferred_stores TEXT,
    receipt_verified BOOLEAN DEFAULT false NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    deposit_amount NUMERIC(10, 2) NOT NULL,
    deposit_paid BOOLEAN DEFAULT false NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    deposit_paid_at TIMESTAMPTZ,
    chef_response_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    completed_at TIMESTAMPTZ,
    review_eligible BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 8. BOOKING STATUS HISTORY TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 9. PAYMENTS TABLE (M-Pesa Escrow Ledger) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'KES' NOT NULL,
    payment_type TEXT DEFAULT 'deposit' NOT NULL,
    mpesa_phone TEXT,
    mpesa_merchant_request_id TEXT,
    mpesa_checkout_request_id TEXT,
    mpesa_receipt_number TEXT,
    mpesa_transaction_date TEXT,
    status payment_status DEFAULT 'pending'::payment_status NOT NULL,
    callback_processed BOOLEAN DEFAULT false NOT NULL,
    callback_received_at TIMESTAMPTZ,
    failure_reason TEXT,
    initiated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE (mpesa_checkout_request_id)
);

-- ── 10. REVIEWS TABLE (Verified Reviews Only) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    chef_id UUID REFERENCES public.chefs(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    comment TEXT NOT NULL,
    occasion TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 11. CHEF APPLICATIONS TABLE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chef_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    brand_name TEXT,
    experience_years TEXT,
    city TEXT DEFAULT 'Nairobi',
    neighborhood TEXT,
    cuisines TEXT[] NOT NULL,
    dietary TEXT[],
    starting_price NUMERIC(10, 2),
    specialty_dish TEXT,
    bio TEXT,
    portfolio_links TEXT,
    food_handler_cert_url TEXT,
    national_id_number TEXT,
    partner_type TEXT DEFAULT 'chef',
    restaurant_name TEXT,
    restaurant_role TEXT,
    service_formats TEXT[] DEFAULT ARRAY['in_home', 'delivery']::TEXT[],
    status application_status DEFAULT 'pending'::application_status NOT NULL,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 12. MESSAGES TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    sender_name TEXT NOT NULL,
    sender_role user_role NOT NULL,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 13. NOTIFICATIONS TABLE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    is_read BOOLEAN DEFAULT false NOT NULL,
    email_sent BOOLEAN DEFAULT false NOT NULL,
    email_sent_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 14. AUDIT LOGS & DISPUTES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB DEFAULT '{}'::JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
    raised_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open' NOT NULL,
    resolution TEXT,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ── 15. PERFORMANCE & ANTI-DOUBLE-BOOKING INDEXES ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_chef_id ON public.bookings(chef_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_chefs_verified ON public.chefs(verified) WHERE verified = true;
CREATE INDEX IF NOT EXISTS idx_chefs_city ON public.chefs(city);
CREATE INDEX IF NOT EXISTS idx_reviews_chef_id ON public.reviews(chef_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);

-- Anti Double-Booking Unique Partial Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_no_double_book
    ON public.bookings(chef_id, booking_date, booking_time)
    WHERE status NOT IN ('declined', 'cancelled_by_customer', 'cancelled_by_chef', 'expired', 'refunded');

-- ── 16. DATABASE FUNCTIONS & AUTOMATED TRIGGERS ───────────────────────────────

-- A. Auto Profile Creation on Supabase Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role_val public.user_role;
    user_full_name TEXT;
    user_phone TEXT;
BEGIN
    -- Safely extract and validate role
    BEGIN
        IF NEW.raw_user_meta_data->>'role' IN ('client', 'chef', 'admin') THEN
            user_role_val := (NEW.raw_user_meta_data->>'role')::public.user_role;
        ELSE
            user_role_val := 'client'::public.user_role;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        user_role_val := 'client'::public.user_role;
    END;

    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'first_name',
        split_part(COALESCE(NEW.email, 'user'), '@', 1)
    );

    user_phone := NEW.raw_user_meta_data->>'phone';

    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        user_full_name,
        user_phone,
        user_role_val
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = TIMEZONE('utc', NOW());

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Prevent signup failure even if trigger encounters an edge case
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- B. Updated_at Trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_bookings_updated_at ON public.bookings;
CREATE TRIGGER set_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_chefs_updated_at ON public.chefs;
CREATE TRIGGER set_chefs_updated_at BEFORE UPDATE ON public.chefs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- C. Booking Status History Trigger
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

DROP TRIGGER IF EXISTS on_booking_status_changed ON public.bookings;
CREATE TRIGGER on_booking_status_changed AFTER UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.record_booking_status_change();

-- D. Review Eligibility Trigger
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

DROP TRIGGER IF EXISTS on_booking_completed ON public.bookings;
CREATE TRIGGER on_booking_completed BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_review_eligible();

-- ── 17. ROW LEVEL SECURITY (RLS) POLICIES ─────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Helper admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'::user_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles
DROP POLICY IF EXISTS "Own profile is fully readable" ON public.profiles;
CREATE POLICY "Own profile is fully readable" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() IS NULL OR public.is_admin());

-- Chefs
DROP POLICY IF EXISTS "Chefs are readable by everyone" ON public.chefs;
CREATE POLICY "Chefs are readable by everyone" ON public.chefs FOR SELECT USING (verified = true OR auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Chefs can update own record" ON public.chefs;
CREATE POLICY "Chefs can update own record" ON public.chefs FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert/delete chefs" ON public.chefs;
CREATE POLICY "Admins can insert/delete chefs" ON public.chefs FOR ALL USING (public.is_admin());

-- Chef Availability
DROP POLICY IF EXISTS "Chef availability is publicly readable" ON public.chef_availability;
CREATE POLICY "Chef availability is publicly readable" ON public.chef_availability FOR SELECT USING (true);

DROP POLICY IF EXISTS "Chefs manage own availability" ON public.chef_availability;
CREATE POLICY "Chefs manage own availability" ON public.chef_availability FOR ALL USING (
    EXISTS (SELECT 1 FROM public.chefs WHERE id = chef_availability.chef_id AND user_id = auth.uid()) OR public.is_admin()
);

-- Menus
DROP POLICY IF EXISTS "Menus are readable by everyone" ON public.menus;
CREATE POLICY "Menus are readable by everyone" ON public.menus FOR SELECT USING (true);

DROP POLICY IF EXISTS "Chefs can manage own menus" ON public.menus;
CREATE POLICY "Chefs can manage own menus" ON public.menus FOR ALL USING (
    EXISTS (SELECT 1 FROM public.chefs WHERE id = menus.chef_id AND user_id = auth.uid()) OR public.is_admin()
);

-- Bookings
DROP POLICY IF EXISTS "Users can read own bookings" ON public.bookings;
CREATE POLICY "Users can read own bookings" ON public.bookings FOR SELECT USING (
    auth.uid() = client_id OR
    EXISTS (SELECT 1 FROM public.chefs WHERE id = bookings.chef_id AND user_id = auth.uid()) OR
    public.is_admin()
);

DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
CREATE POLICY "Authenticated users can create bookings" ON public.bookings FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND auth.uid() = client_id
);

DROP POLICY IF EXISTS "Participants can update booking status" ON public.bookings;
CREATE POLICY "Participants can update booking status" ON public.bookings FOR UPDATE USING (
    auth.uid() = client_id OR
    EXISTS (SELECT 1 FROM public.chefs WHERE id = bookings.chef_id AND user_id = auth.uid()) OR
    public.is_admin()
);

-- Reviews
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Clients can review after completed booking" ON public.reviews;
CREATE POLICY "Clients can review after completed booking" ON public.reviews FOR INSERT WITH CHECK (
    auth.uid() = client_id AND
    EXISTS (
        SELECT 1 FROM public.bookings
        WHERE id = reviews.booking_id AND client_id = auth.uid() AND chef_id = reviews.chef_id AND status = 'completed'
    )
);

-- Applications
DROP POLICY IF EXISTS "Anyone can submit a chef application" ON public.chef_applications;
CREATE POLICY "Anyone can submit a chef application" ON public.chef_applications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view and manage applications" ON public.chef_applications;
CREATE POLICY "Admins can view and manage applications" ON public.chef_applications FOR ALL USING (public.is_admin());

-- Messages
DROP POLICY IF EXISTS "Participants can view and create messages" ON public.messages;
CREATE POLICY "Participants can view and create messages" ON public.messages FOR ALL USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id OR public.is_admin()
);

-- Notifications
DROP POLICY IF EXISTS "Users see own notifications" ON public.notifications;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id OR public.is_admin());

DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);

-- ── 18. INITIAL MASTER CHEFS SEED DATA ────────────────────────────────────────
INSERT INTO public.chefs (
    id, name, brand_name, slug, tagline, bio, culinary_philosophy, city, service_areas, cuisines, dietary_specialties, price_per_guest, min_guests, max_guests, rating, reviews_count, verified, verification_status, avatar_url, cover_image_url, gallery_images, is_available, featured, is_placeholder
) VALUES 
(
    'c1111111-1111-1111-1111-111111111111',
    'Chef Amina Hassan',
    'Taste of the Coast',
    'chef-amina-hassan',
    'Master of Coastal Swahili Degustation & Seafood',
    'With over 12 years of luxury resort and private villa dining in Mombasa and Diani, Chef Amina crafts authentic Swahili banquets with fresh ocean catches and coconut cream reductions.',
    'Purity of spice and respect for fresh seafood harvested at sunrise.',
    'Mombasa & Nairobi',
    ARRAY['Nyali', 'Diani Beach', 'Kilimani', 'Karen', 'Runda']::TEXT[],
    ARRAY['Swahili', 'Seafood', 'Coastal Fusion']::TEXT[],
    ARRAY['Halal', 'Gluten-Free', 'Pescatarian']::TEXT[],
    3800.00,
    2,
    20,
    4.98,
    94,
    true,
    'approved',
    'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=2070',
    ARRAY[
        'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=2070',
        'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=1000'
    ]::TEXT[],
    true,
    true,
    true
),
(
    'c2222222-2222-2222-2222-222222222222',
    'Chef David Omondi',
    'The Grill Master KE',
    'chef-david-omondi',
    'Artisanal Charcoal BBQ & Aged Cuts',
    'Former Executive Sous Chef at Nairobi luxury safari lodges. David specializes in slow-roasted artisanal meats, tamarind glazes, and modern Kenyan grill feasts.',
    'Open fire cooking elevates honest Kenyan cuts into fine dining experiences.',
    'Nairobi',
    ARRAY['Karen', 'Runda', 'Westlands', 'Lavington', 'Muthaiga']::TEXT[],
    ARRAY['Nyama Choma', 'BBQ', 'Kenyan Traditional']::TEXT[],
    ARRAY['Keto', 'Gluten-Free', 'Halal Available']::TEXT[],
    4200.00,
    4,
    30,
    4.97,
    72,
    true,
    'approved',
    'https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=2069',
    ARRAY[
        'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=2069'
    ]::TEXT[],
    true,
    true,
    true
),
(
    'c3333333-3333-3333-3333-333333333333',
    'Chef Sarah Wanjiku',
    'Atelier Wanjiku',
    'chef-sarah-wanjiku',
    'Refined Modern Continental & Italian',
    'Trained in European Michelin-starred kitchens, Chef Sarah creates bespoke 4-course plated degustations featuring handmade pasta and locally sourced organic ingredients.',
    'Simplicity, precise temperature control, and seasonal Kenyan highlands produce.',
    'Nairobi',
    ARRAY['Westlands', 'Gigiri', 'Spring Valley', 'Karen', 'Riverside']::TEXT[],
    ARRAY['Continental', 'Italian', 'Fine Dining']::TEXT[],
    ARRAY['Vegetarian', 'Gluten-Free']::TEXT[],
    5500.00,
    2,
    14,
    4.96,
    118,
    true,
    'approved',
    'https://images.unsplash.com/photo-1607631568010-a87245c0daf8?auto=format&fit=crop&q=80&w=1000',
    'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&q=80&w=2070',
    ARRAY[
        'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&q=80&w=2070'
    ]::TEXT[],
    true,
    true,
    true
)
ON CONFLICT (id) DO NOTHING;

-- ── 19. INITIAL MENUS SEED DATA ───────────────────────────────────────────────
INSERT INTO public.menus (id, chef_id, title, tag, description, price_per_guest, courses, is_active)
VALUES
(
    'a1111111-1111-1111-1111-111111111111',
    'c1111111-1111-1111-1111-111111111111',
    'Royal Swahili 4-Course Tasting Feast',
    'Signature Coastal Menu',
    'A coastal journey featuring coconut octopus, prawns pilau, and authentic spiced mahamri.',
    3800.00,
    '{"appetizer": {"name": "Crispy Samaki Bites", "description": "Tamarind-glazed red snapper morsels with lime zest"}, "main": {"name": "Swahili Coconut Prawns Pilau", "description": "Wild tiger prawns simmered in fragrant cardamom and basmati pilau"}, "dessert": {"name": "Mahamri & Cardamom Custard", "description": "Warm spiced Swahili pastry served with vanilla-infused coconut dip"}}'::JSONB,
    true
),
(
    'a2222222-2222-2222-2222-222222222222',
    'c2222222-2222-2222-2222-222222222222',
    'Artisanal Prime BBQ & Smoked Feast',
    'Craft Grill Package',
    'Prime grass-fed beef ribs slow-smoked over acacia wood, served with rosemary roasted potatoes.',
    4200.00,
    '{"appetizer": {"name": "Smoked Beef Skewers", "description": "Tenderloin skewers with roasted bird-eye pepper glaze"}, "main": {"name": "Wood-Fired Acacia Ribs & Choma", "description": "Slow-smoked prime ribs with kachumbari and buttered greens"}, "dessert": {"name": "Grilled Pineapple Tart", "description": "Caramelized pineapple with homemade vanilla bean ice cream"}}'::JSONB,
    true
),
(
    'a3333333-3333-3333-3333-333333333333',
    'c3333333-3333-3333-3333-333333333333',
    'Modern Continental Degustation',
    'Executive 4-Course',
    'Michelin-inspired plated dining featuring hand-rolled pasta, seared beef fillet, and chocolate fondant.',
    5500.00,
    '{"appetizer": {"name": "Handmade Burrata Agnolotti", "description": "Truffle butter and baby spinach reduction"}, "main": {"name": "Grass-Fed Beef Tenderloin", "description": "Potato puree, charred asparagus, and red wine reduction"}, "dessert": {"name": "Dark Chocolate Fondant", "description": "Valrhona molten center with passion fruit coulis"}}'::JSONB,
    true
)
ON CONFLICT (id) DO NOTHING;

-- ── 20. INITIAL CHEF AVAILABILITY SEED DATA ───────────────────────────────────
INSERT INTO public.chef_availability (chef_id, working_days, start_time, end_time, max_bookings_per_day, min_notice_hours)
VALUES
('c1111111-1111-1111-1111-111111111111', ARRAY[4,5,6]::INT[], '12:00:00', '22:00:00', 2, 48),
('c2222222-2222-2222-2222-222222222222', ARRAY[4,5,6]::INT[], '12:00:00', '22:00:00', 2, 48),
('c3333333-3333-3333-3333-333333333333', ARRAY[4,5,6]::INT[], '12:00:00', '22:00:00', 2, 48)
ON CONFLICT (chef_id) DO NOTHING;

-- ── 21. SUPABASE STORAGE BUCKET FOR CHEF PHOTOS ───────────────────────────────
-- Creates the public 'chef-photos' bucket for admin-uploaded chef portraits and dish images.
-- The bucket is public so uploaded images render without auth headers on the frontend.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chef-photos',
    'chef-photos',
    true,                          -- Public bucket (CDN-served)
    10485760,                      -- 10 MB file size limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit;

-- Allow admins (authenticated with admin role) to upload to chef-photos
DROP POLICY IF EXISTS "Admins can upload chef photos" ON storage.objects;
CREATE POLICY "Admins can upload chef photos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'chef-photos'
        AND auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to update/delete their uploaded photos
DROP POLICY IF EXISTS "Admins can manage chef photos" ON storage.objects;
CREATE POLICY "Admins can manage chef photos"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'chef-photos'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow public to READ photos (required for frontend image tags)
DROP POLICY IF EXISTS "Chef photos are publicly viewable" ON storage.objects;
CREATE POLICY "Chef photos are publicly viewable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'chef-photos');

-- ── 22. ADMIN ACCOUNT PROMOTION HELPER ────────────────────────────────────────
-- To promote your account to admin, run this with your registered email address:
-- (Uncomment and replace the email address)
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE email = 'your@email.com';
--
-- After running, sign out of the website and sign back in as Admin.

-- ── 23. RESTAURANT PARTNERSHIP, DELIVERY PRIVACY & CHEF ONBOARDING GATING (v30) ──
ALTER TABLE public.chefs ADD COLUMN IF NOT EXISTS partner_type TEXT DEFAULT 'independent';
ALTER TABLE public.chefs ADD COLUMN IF NOT EXISTS restaurant_name TEXT;
ALTER TABLE public.chefs ADD COLUMN IF NOT EXISTS allow_in_home BOOLEAN DEFAULT true;
ALTER TABLE public.chefs ADD COLUMN IF NOT EXISTS allow_delivery BOOLEAN DEFAULT true;
ALTER TABLE public.chefs ADD COLUMN IF NOT EXISTS service_formats TEXT[] DEFAULT ARRAY['in_home', 'delivery']::TEXT[];
ALTER TABLE public.chefs ADD COLUMN IF NOT EXISTS national_id_number TEXT;
ALTER TABLE public.chefs ADD COLUMN IF NOT EXISTS profile_completion_percentage INT DEFAULT 0;

ALTER TABLE public.chef_applications ADD COLUMN IF NOT EXISTS national_id_number TEXT;
ALTER TABLE public.chef_applications ADD COLUMN IF NOT EXISTS partner_type TEXT DEFAULT 'chef';
ALTER TABLE public.chef_applications ADD COLUMN IF NOT EXISTS restaurant_name TEXT;
ALTER TABLE public.chef_applications ADD COLUMN IF NOT EXISTS restaurant_role TEXT;
ALTER TABLE public.chef_applications ADD COLUMN IF NOT EXISTS service_formats TEXT[] DEFAULT ARRAY['in_home', 'delivery']::TEXT[];


