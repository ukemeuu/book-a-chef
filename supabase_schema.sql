-- ==============================================================================
-- CHEFNYUMBANI: PRODUCTION SUPABASE POSTGRESQL SCHEMA
-- ==============================================================================
-- This schema includes tables, UUID primary keys, foreign keys, timestamps,
-- search indexes, custom enums for statuses and roles, and Row Level Security.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Define Custom ENUMs
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('chef', 'customer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE course_type_enum AS ENUM ('starter', 'main', 'dessert', 'side');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- ==============================================================================
-- 3. TABLE DEFINITIONS
-- ==============================================================================

-- A. PROFILES TABLE (Extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'customer',
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. CHEFS TABLE (Extended profile data for chefs)
CREATE TABLE IF NOT EXISTS public.chefs (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    brand_name TEXT,
    bio TEXT,
    city TEXT NOT NULL,
    neighborhood TEXT,
    travel_radius_km INT DEFAULT 10,
    cuisines TEXT[] DEFAULT '{}', -- Array of cuisines for filtering
    dietary_options TEXT[] DEFAULT '{}',
    is_verified BOOLEAN DEFAULT FALSE,
    rating NUMERIC(3, 2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. MENUS TABLE (Belongs to a Chef)
CREATE TABLE IF NOT EXISTS public.menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price_per_person NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. MENU ITEMS (Courses within a Menu)
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
    course_type course_type_enum NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- E. AVAILABILITY SLOTS (Chef Calendar)
CREATE TABLE IF NOT EXISTS public.availability_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- F. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE RESTRICT,
    menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE RESTRICT,
    event_time TIMESTAMPTZ NOT NULL,
    guest_count INT NOT NULL CHECK (guest_count > 0),
    total_amount NUMERIC(10, 2) NOT NULL,
    deposit_amount NUMERIC(10, 2) NOT NULL,
    is_deposit_paid BOOLEAN DEFAULT FALSE,
    status booking_status DEFAULT 'pending',
    special_requests TEXT,
    location_address TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- G. PAYMENTS TABLE (Stripe & M-PESA)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'KES',
    status payment_status DEFAULT 'pending',
    provider TEXT NOT NULL, -- e.g., 'stripe', 'mpesa'
    provider_reference TEXT UNIQUE, -- e.g., M-PESA Receipt number or Stripe Session ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- H. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    chef_id UUID NOT NULL REFERENCES public.chefs(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- 4. TRIGGERS FOR UPDATED_AT
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chefs_updated_at BEFORE UPDATE ON chefs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON menus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON availability_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- 5. INDEXES FOR SEARCH & PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_chefs_city ON public.chefs(city);
CREATE INDEX IF NOT EXISTS idx_chefs_cuisines ON public.chefs USING GIN (cuisines);
CREATE INDEX IF NOT EXISTS idx_menus_price ON public.menus(price_per_person);
CREATE INDEX IF NOT EXISTS idx_bookings_chef_id ON public.bookings(chef_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_availability_chef_time ON public.availability_slots(chef_id, start_time);


-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Public can view chefs profiles implicitly through RPCs or direct ID grabs, but let's allow read-only profile access generally
CREATE POLICY "Public can view basic profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- CHEFS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Anyone can view chefs" ON public.chefs FOR SELECT USING (true);
CREATE POLICY "Chefs can insert their own extended profile" ON public.chefs FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Chefs can update their own profile" ON public.chefs FOR UPDATE USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- MENUS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Anyone can view active menus" ON public.menus FOR SELECT USING (is_active = true OR auth.uid() = chef_id);
CREATE POLICY "Chefs can insert their own menus" ON public.menus FOR INSERT WITH CHECK (auth.uid() = chef_id);
CREATE POLICY "Chefs can update their own menus" ON public.menus FOR UPDATE USING (auth.uid() = chef_id);
CREATE POLICY "Chefs can delete their own menus" ON public.menus FOR DELETE USING (auth.uid() = chef_id);

-- ------------------------------------------------------------------------------
-- MENU ITEMS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Anyone can view menu items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Chefs can insert items into their own menus" ON public.menu_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.menus WHERE id = menu_id AND chef_id = auth.uid())
);
CREATE POLICY "Chefs can update items in their own menus" ON public.menu_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.menus WHERE id = menu_id AND chef_id = auth.uid())
);
CREATE POLICY "Chefs can delete items in their own menus" ON public.menu_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.menus WHERE id = menu_id AND chef_id = auth.uid())
);

-- ------------------------------------------------------------------------------
-- AVAILABILITY SLOTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Anyone can view availability slots" ON public.availability_slots FOR SELECT USING (true);
CREATE POLICY "Chefs can manage their own availability" ON public.availability_slots FOR ALL USING (auth.uid() = chef_id);

-- ------------------------------------------------------------------------------
-- BOOKINGS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Customers can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Chefs can view bookings assigned to them" ON public.bookings FOR SELECT USING (auth.uid() = chef_id);
CREATE POLICY "Customers can create a booking" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
-- Both customer and chef might need to update a booking (e.g. chef accepts, customer modifies)
CREATE POLICY "Customers and Chefs can update bookings" ON public.bookings FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = chef_id);

-- ------------------------------------------------------------------------------
-- PAYMENTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Customers can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Chefs can view payments for their bookings" ON public.payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.chef_id = auth.uid())
);
-- Note: Insertments & Updates to Payments generally happen via secure Server/Edge Functions,
-- so passing insert access to authenticated user temporarily:
CREATE POLICY "Edge functions or customers can insert payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- ------------------------------------------------------------------------------
-- REVIEWS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customers can insert reviews for completed bookings" ON public.reviews FOR INSERT WITH CHECK (
    auth.uid() = customer_id AND 
    EXISTS (SELECT 1 FROM public.bookings WHERE id = booking_id AND status = 'completed')
);
CREATE POLICY "Customers can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Customers can delete their own reviews" ON public.reviews FOR DELETE USING (auth.uid() = customer_id);
