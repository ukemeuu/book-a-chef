-- ==============================================================================
-- BOOK A CHEF KENYA — DIRECTORY SCHEMA
-- Review-count sync, slug generation, and directory helpers.
-- Run AFTER marketplace_schema.sql
-- ==============================================================================

-- ── 1. FIX DENORMALIZED REVIEW COUNTS ─────────────────────────────────────────
-- `chefs.reviews_count` is a denormalized counter that drifted from the
-- `reviews` table (profiles showed "94 reviews" while the reviews table was
-- empty). Recompute it from the source of truth.

UPDATE public.chefs c
SET reviews_count = COALESCE(sub.count, 0)
FROM (
    SELECT chef_id, COUNT(*)::int AS count
    FROM public.reviews
    GROUP BY chef_id
) sub
WHERE c.id = sub.chef_id;

-- Any chef with no matching reviews must read 0, not a stale number.
UPDATE public.chefs
SET reviews_count = 0
WHERE reviews_count != 0
  AND id NOT IN (SELECT chef_id FROM public.reviews);

-- ── 2. KEEP REVIEW COUNTS IN SYNC GOING FORWARD ───────────────────────────────
-- Whenever a review is added or removed, adjust the chef's counter so the
-- public profile can never again disagree with the reviews table.

CREATE OR REPLACE FUNCTION public.sync_chef_reviews_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.chefs
        SET reviews_count = reviews_count + 1
        WHERE id = NEW.chef_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.chefs
        SET reviews_count = GREATEST(reviews_count - 1, 0)
        WHERE id = OLD.chef_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_chef_reviews_count ON public.reviews;
CREATE TRIGGER sync_chef_reviews_count
    AFTER INSERT OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.sync_chef_reviews_count();

-- ── 3. ENSURE EVERY CHEF HAS A SLUG ───────────────────────────────────────────
-- Directory profiles are addressed at /chefs/[slug]. Generate one from the
-- name for any legacy listing that still has none.

UPDATE public.chefs
SET slug = LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(COALESCE(name, id::text), '[^a-zA-Z0-9]+', '-', 'g'),
    '^-+|-+$', '', 'g'
))
WHERE slug IS NULL OR slug = '';

-- ── 4. ENSURE THE FAVOURITES TABLE EXISTS ─────────────────────────────────────
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

-- ── 5. LET CHEFS UPLOAD THEIR OWN PHOTOS ─────────────────────────────────────
-- The original storage policy only allowed admins. Chefs need to upload their
-- own portrait, cover, and dish photos from the chef dashboard, so allow any
-- authenticated chef to add objects to the public chef-photos bucket.

DROP POLICY IF EXISTS "Chefs can upload own photos" ON storage.objects;
CREATE POLICY "Chefs can upload own photos"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'chef-photos'
        AND auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'chef'
        )
    );

DROP POLICY IF EXISTS "Chefs can update own photos" ON storage.objects;
CREATE POLICY "Chefs can update own photos"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'chef-photos'
        AND auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'chef'
        )
    );
