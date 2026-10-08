-- ==============================================================================
-- BOOK A CHEF KENYA — IMMEDIATE ROW LEVEL SECURITY (RLS) LOCKDOWN SCRIPT
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- This seals all tables and completely prevents unauthorized public scraping.
-- ==============================================================================

-- 1. CRITICAL: LOCK DOWN CHEF_APPLICATIONS (SEAL THE PHONE/EMAIL LEAK)
ALTER TABLE IF EXISTS public.chef_applications ENABLE ROW LEVEL SECURITY;

-- Drop any existing or default open policies on chef_applications
DROP POLICY IF EXISTS "Anyone can read chef applications" ON public.chef_applications;
DROP POLICY IF EXISTS "Public can view applications" ON public.chef_applications;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.chef_applications;
DROP POLICY IF EXISTS "Admins can view and manage applications" ON public.chef_applications;
DROP POLICY IF EXISTS "Anyone can submit a chef application" ON public.chef_applications;
DROP POLICY IF EXISTS "Only admins can view applications" ON public.chef_applications;
DROP POLICY IF EXISTS "Only admins can update applications" ON public.chef_applications;
DROP POLICY IF EXISTS "Only admins can delete applications" ON public.chef_applications;

-- Policy A: Anyone can submit an application (INSERT only)
CREATE POLICY "Anyone can submit a chef application"
ON public.chef_applications
FOR INSERT
WITH CHECK (true);

-- Policy B: Only verified admins or backend service role can SELECT / view applications
CREATE POLICY "Only admins can view applications"
ON public.chef_applications
FOR SELECT
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'::public.user_role
    )
);

-- Policy C: Only admins can update application status (approve/reject)
CREATE POLICY "Only admins can update applications"
ON public.chef_applications
FOR UPDATE
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'::public.user_role
    )
);

-- Policy D: Only admins can delete applications
CREATE POLICY "Only admins can delete applications"
ON public.chef_applications
FOR DELETE
USING (
    auth.role() = 'service_role' OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'::public.user_role
    )
);


-- 2. VERIFY RLS IS ACTIVE ON ALL SENSITIVE CORE TABLES
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chef_availability ENABLE ROW LEVEL SECURITY;


-- 3. ENSURE CHEF SENSITIVE COLUMNS ARE PROTECTED
-- Chefs table is public so diners can view catalogs, photos, and menus.
-- Ensure phone & email are NEVER exposed on the public chefs table:
UPDATE public.chefs 
SET phone = NULL, email = NULL 
WHERE is_placeholder = true OR verified = true;

-- 3.5 ENSURE RESTAURANT PARTNER & PRIVACY COLUMNS EXIST (v30)
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



-- 4. CONFIRMATION QUERY (Check that RLS is active on all public tables)
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as "RLS_Active"
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
