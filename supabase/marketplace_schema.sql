-- ==============================================================================
-- BOOK A CHEF KENYA — MARKETPLACE SCHEMA
-- Adds chef favorites and marketplace query indexes.
-- Run AFTER schema.sql, uber_dispatch_schema.sql, dispatch_log.sql
-- ==============================================================================

-- ── 1. CHEF FAVORITES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chef_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    chef_id UUID REFERENCES public.chefs(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE (client_id, chef_id)
);

CREATE INDEX IF NOT EXISTS idx_chef_favorites_client ON public.chef_favorites(client_id);
CREATE INDEX IF NOT EXISTS idx_chef_favorites_chef ON public.chef_favorites(chef_id);

ALTER TABLE public.chef_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own favorites" ON public.chef_favorites;
CREATE POLICY "Users can manage own favorites" ON public.chef_favorites
    FOR ALL USING (auth.uid() = client_id);

-- ── 2. MARKETPLACE QUERY INDEXES ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chefs_featured ON public.chefs(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_chefs_price ON public.chefs(price_per_guest);
CREATE INDEX IF NOT EXISTS idx_chefs_rating ON public.chefs(rating);
CREATE INDEX IF NOT EXISTS idx_chefs_available ON public.chefs(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_menus_chef ON public.menus(chef_id);
CREATE INDEX IF NOT EXISTS idx_reviews_chef ON public.reviews(chef_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON public.reviews(created_at);

-- ── 3. HELPER: SLUG GENERATION ────────────────────────────────────────────────
-- Chefs created before the marketplace may have a NULL slug. Generate one
-- from the name so every listing is addressable at /chefs/[slug].
UPDATE public.chefs
SET slug = LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(COALESCE(name, id::text), '[^a-zA-Z0-9]+', '-', 'g'),
    '^-+|-+$', '', 'g'
))
WHERE slug IS NULL OR slug = '';

-- ── 4. HELPER: FEATURED CHEF FLAG ────────────────────────────────────────────
-- Ensure at least the top-rated verified chefs are featured for the home page.
UPDATE public.chefs
SET featured = true
WHERE verified = true
  AND rating >= 4.9
  AND featured = false;
